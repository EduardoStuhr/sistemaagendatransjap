import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';

// Normaliza texto de cabeçalho (remove quebras de linha, espaços extras, lowercase)
function norm(str) {
  return String(str ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Mapeia cabeçalhos flexíveis para campos internos
function mapHeader(header) {
  const h = norm(header);
  if (h.includes('data'))                         return 'data';
  if (h.includes('centro') || h.includes('obra')) return 'centroCusto';
  if (h.includes('tipo') && h.includes('desp'))   return 'tipoDespesa';
  if (h.includes('setor'))                        return 'setorDespesa';
  if (h.includes('nº') || h.includes('num') || (h.includes('n') && h.includes('frota') && h.length < 12)) return 'numFrota';
  if (h.includes('tipo') && h.includes('frota'))  return 'tipoFrota';
  if (h.includes('descri') && h.includes('frota'))return 'descricaoFrota';
  if (h.includes('fornecedor'))                   return 'fornecedor';
  if (h.includes('descri') && h.includes('serv')) return 'descricao';
  if (h.includes('valor'))                        return 'valor';
  return null;
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  // Número serial do Excel (dias desde 1899-12-30)
  if (typeof val === 'number') {
    const ms = (val - 25569) * 86400 * 1000;
    const d  = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  // String dd/mm/aaaa ou dd-mm-aaaa
  if (typeof val === 'string') {
    const m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
      return new Date(Date.UTC(year, parseInt(m[2]) - 1, parseInt(m[1])));
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseValor(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

// POST /api/despesas/upload
export async function uploadPlanilha(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 2) return res.status(400).json({ error: 'Planilha vazia ou sem dados' });

    // Encontra a linha de cabeçalho (primeira linha com 'data' ou 'valor')
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const hasData  = rows[i].some(c => norm(c).includes('data'));
      const hasValor = rows[i].some(c => norm(c).includes('valor'));
      if (hasData || hasValor) { headerIdx = i; break; }
    }

    const headers = rows[headerIdx].map(mapHeader);
    const dataRows = rows.slice(headerIdx + 1);

    const despesas = [];
    const erros    = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.every(c => c === '' || c === null || c === undefined)) continue;

      const obj = {};
      headers.forEach((field, idx) => { if (field) obj[field] = row[idx]; });

      const data   = parseDate(obj.data);
      const valor  = parseValor(obj.valor);
      const centro = String(obj.centroCusto ?? '').trim();
      const desc   = String(obj.descricao ?? '').trim();

      if (!data) { erros.push(`Linha ${i + headerIdx + 2}: data inválida`); continue; }
      if (!centro && !desc) { erros.push(`Linha ${i + headerIdx + 2}: sem dados`); continue; }

      despesas.push({
        data,
        centroCusto:    centro || '—',
        tipoDespesa:    String(obj.tipoDespesa   ?? '').trim() || null,
        setorDespesa:   String(obj.setorDespesa  ?? '').trim() || null,
        numFrota:       String(obj.numFrota      ?? '').trim() || null,
        tipoFrota:      String(obj.tipoFrota     ?? '').trim() || null,
        descricaoFrota: String(obj.descricaoFrota?? '').trim() || null,
        fornecedor:     String(obj.fornecedor    ?? '').trim() || null,
        descricao:      desc || '—',
        valor,
        createdById: req.user.id,
      });
    }

    if (despesas.length === 0) {
      return res.status(400).json({ error: 'Nenhuma linha válida encontrada', detalhes: erros });
    }

    const created = await prisma.despesa.createMany({ data: despesas });
    const totalValor = despesas.reduce((s, d) => s + d.valor, 0);

    await prisma.importacaoDespesa.create({
      data: {
        fileName:    req.file.originalname,
        totalLinhas: created.count,
        totalValor,
        createdById: req.user.id,
      },
    });

    res.json({
      importadas: created.count,
      totalValor,
      erros,
      fileName: req.file.originalname,
    });
  } catch (err) { next(err); }
}

// GET /api/despesas
export async function listar(req, res, next) {
  try {
    const { mes, ano, centro, search } = req.query;
    const where = {};

    if (mes && ano) {
      const m = parseInt(mes); const a = parseInt(ano);
      where.data = { gte: new Date(a, m - 1, 1), lt: new Date(a, m, 1) };
    } else if (ano) {
      const a = parseInt(ano);
      where.data = { gte: new Date(a, 0, 1), lt: new Date(a + 1, 0, 1) };
    }

    if (centro) where.centroCusto = { contains: centro };

    if (search) {
      where.OR = [
        { descricao:      { contains: search } },
        { centroCusto:    { contains: search } },
        { fornecedor:     { contains: search } },
        { tipoDespesa:    { contains: search } },
        { descricaoFrota: { contains: search } },
      ];
    }

    const [despesas, total] = await Promise.all([
      prisma.despesa.findMany({
        where,
        orderBy: { data: 'desc' },
        include: { createdBy: { select: { name: true } } },
      }),
      prisma.despesa.aggregate({ where, _sum: { valor: true }, _count: true }),
    ]);

    res.json({
      despesas,
      resumo: {
        total: total._count,
        valorTotal: total._sum.valor ?? 0,
      },
    });
  } catch (err) { next(err); }
}

// DELETE /api/despesas/:id
export async function remover(req, res, next) {
  try {
    await prisma.despesa.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// DELETE /api/despesas (limpar tudo de um período)
export async function removerLote(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids obrigatório' });
    const { count } = await prisma.despesa.deleteMany({ where: { id: { in: ids.map(Number) } } });
    res.json({ removidas: count });
  } catch (err) { next(err); }
}

// GET /api/despesas/historico
export async function historico(req, res, next) {
  try {
    const imports = await prisma.importacaoDespesa.findMany({
      orderBy: { importadoEm: 'desc' },
      take: 20,
      include: { createdBy: { select: { name: true } } },
    });
    res.json(imports);
  } catch (err) { next(err); }
}
