import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, Trash2, Search, ChevronDown,
  TrendingUp, DollarSign, FileText, AlertCircle, X, CheckCircle,
} from 'lucide-react';
import { despesaService } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/* ── Upload Zone ─────────────────────────────────────── */
function UploadZone({ onUpload, loading }) {
  const [drag, setDrag] = useState(false);
  const input = useRef();

  function handle(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) return;
    onUpload(file);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => input.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all
        ${drag ? 'border-brand bg-brand/10' : 'border-base-400 hover:border-brand/60 hover:bg-base-700/40'}`}
    >
      <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => handle(e.target.files[0])} />
      {loading
        ? <Spinner size={32} />
        : <FileSpreadsheet size={40} className="text-base-200" />
      }
      <div className="text-center">
        <p className="text-sm font-medium text-base-50">
          {loading ? 'Processando planilha…' : 'Arraste o Excel aqui ou clique para selecionar'}
        </p>
        <p className="text-xs text-base-200 mt-1">Formatos aceitos: .xlsx, .xls, .csv · Máx. 10 MB</p>
      </div>
    </div>
  );
}

/* ── Resultado da importação ─────────────────────────── */
function ImportResult({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="rounded-xl border border-success/30 bg-success/10 p-4 flex items-start gap-3">
      <CheckCircle size={18} className="text-success flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-base-50">
          {result.importadas} despesa{result.importadas !== 1 ? 's' : ''} importada{result.importadas !== 1 ? 's' : ''} de <span className="text-base-200">{result.fileName}</span>
        </p>
        <p className="text-xs text-base-200 mt-0.5">Total importado: <strong className="text-success">{fmt(result.totalValor)}</strong></p>
        {result.erros?.length > 0 && (
          <p className="text-xs text-warning mt-1">{result.erros.length} linha(s) ignorada(s) por dados inválidos</p>
        )}
      </div>
      <button onClick={onClose} className="text-base-200 hover:text-base-50 p-1"><X size={14} /></button>
    </div>
  );
}

/* ── Página principal ────────────────────────────────── */
export default function Despesas() {
  const toast = useToast();
  const now   = new Date();

  const [despesas,    setDespesas   ] = useState([]);
  const [resumo,      setResumo     ] = useState({ total: 0, valorTotal: 0 });
  const [loading,     setLoading    ] = useState(false);
  const [uploading,   setUploading  ] = useState(false);
  const [importResult,setImportResult] = useState(null);

  const [search,      setSearch     ] = useState('');
  const [mes,         setMes        ] = useState(now.getMonth() + 1);
  const [ano,         setAno        ] = useState(now.getFullYear());
  const [selected,    setSelected   ] = useState(new Set());
  const [deleting,    setDeleting   ] = useState(false);

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { mes, ano };
      if (search) params.search = search;
      const data = await despesaService.listar(params);
      setDespesas(data.despesas);
      setResumo(data.resumo);
    } catch {
      toast('Erro ao carregar despesas', 'error');
    } finally {
      setLoading(false);
    }
  }, [mes, ano, search]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(file) {
    setUploading(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await despesaService.upload(fd);
      setImportResult(result);
      toast(`${result.importadas} despesas importadas`, 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao importar planilha', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await despesaService.remover(id);
      toast('Despesa removida', 'success');
      load();
    } catch { toast('Erro ao remover', 'error'); }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await despesaService.removerLote([...selected]);
      toast(`${selected.size} despesas removidas`, 'success');
      setSelected(new Set());
      load();
    } catch { toast('Erro ao remover', 'error'); }
    finally { setDeleting(false); }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleAll() {
    if (selected.size === despesas.length) setSelected(new Set());
    else setSelected(new Set(despesas.map(d => d.id)));
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-base-50">Despesas</h2>
          <p className="text-xs text-base-200 mt-0.5">Importe planilhas Excel e acompanhe os lançamentos</p>
        </div>
      </div>

      {/* Upload */}
      <div className="card p-5 space-y-3">
        <p className="text-sm font-semibold text-base-50 flex items-center gap-2">
          <Upload size={15} className="text-brand-light" /> Importar planilha Excel
        </p>
        <UploadZone onUpload={handleUpload} loading={uploading} />
        <ImportResult result={importResult} onClose={() => setImportResult(null)} />
        <div className="text-xs text-base-200 space-y-0.5">
          <p className="font-medium text-base-100">Colunas esperadas na planilha:</p>
          <p>Data · Centro de Custo / Obra · Tipo Despesa · Setor Despesa · Nº Frota · Tipo Frota · Descrição Frota · Fornecedor · Descrição do Serviço · Valor</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-brand/20 flex items-center justify-center">
              <FileText size={14} className="text-brand-light" />
            </div>
            <span className="text-xs text-base-200">Lançamentos</span>
          </div>
          <p className="text-2xl font-bold text-base-50">{resumo.total}</p>
          <p className="text-xs text-base-200 mt-0.5">{MESES[mes-1]}/{ano}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-success/20 flex items-center justify-center">
              <DollarSign size={14} className="text-success" />
            </div>
            <span className="text-xs text-base-200">Total do período</span>
          </div>
          <p className="text-xl font-bold text-base-50">{fmt(resumo.valorTotal)}</p>
          <p className="text-xs text-base-200 mt-0.5">{MESES[mes-1]}/{ano}</p>
        </div>
        <div className="card p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-warning/20 flex items-center justify-center">
              <TrendingUp size={14} className="text-warning" />
            </div>
            <span className="text-xs text-base-200">Média por lançamento</span>
          </div>
          <p className="text-xl font-bold text-base-50">
            {fmt(resumo.total > 0 ? resumo.valorTotal / resumo.total : 0)}
          </p>
        </div>
      </div>

      {/* Filtros + tabela */}
      <div className="card overflow-hidden">
        {/* Barra de filtros */}
        <div className="p-4 border-b border-base-500 flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
            <input
              type="text"
              placeholder="Buscar descrição, fornecedor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8 text-sm h-8 w-full"
            />
          </div>

          {/* Mês */}
          <div className="relative">
            <select value={mes} onChange={e => setMes(Number(e.target.value))}
              className="select text-sm h-8 pr-7 appearance-none">
              {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-base-200 pointer-events-none" />
          </div>

          {/* Ano */}
          <div className="relative">
            <select value={ano} onChange={e => setAno(Number(e.target.value))}
              className="select text-sm h-8 pr-7 appearance-none">
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-base-200 pointer-events-none" />
          </div>

          {selected.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={deleting}
              className="btn text-xs h-8 gap-1.5 bg-danger/20 text-danger border-danger/30 hover:bg-danger/30">
              {deleting ? <Spinner size={12} /> : <Trash2 size={13} />}
              Remover {selected.size} selecionada{selected.size > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size={28} /></div>
          ) : despesas.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <AlertCircle size={32} className="text-base-400" />
              <p className="text-sm text-base-200">Nenhuma despesa encontrada para o período</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-base-500 text-base-200 text-left">
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox"
                      checked={selected.size === despesas.length && despesas.length > 0}
                      onChange={toggleAll}
                      className="rounded border-base-400 bg-base-700 accent-brand" />
                  </th>
                  <th className="px-3 py-2 whitespace-nowrap">Data</th>
                  <th className="px-3 py-2 whitespace-nowrap">Centro de Custo</th>
                  <th className="px-3 py-2 whitespace-nowrap">Tipo</th>
                  <th className="px-3 py-2 whitespace-nowrap">Setor</th>
                  <th className="px-3 py-2 whitespace-nowrap">Frota</th>
                  <th className="px-3 py-2 whitespace-nowrap">Fornecedor</th>
                  <th className="px-3 py-2">Descrição do Serviço</th>
                  <th className="px-3 py-2 whitespace-nowrap text-right">Valor</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((d) => (
                  <tr key={d.id}
                    className={`border-b border-base-500/50 hover:bg-base-700/40 transition-colors
                      ${selected.has(d.id) ? 'bg-brand/10' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)}
                        className="rounded border-base-400 bg-base-700 accent-brand" />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-base-100">{fmtDate(d.data)}</td>
                    <td className="px-3 py-2 text-base-50 max-w-[140px] truncate" title={d.centroCusto}>{d.centroCusto}</td>
                    <td className="px-3 py-2 text-base-100 whitespace-nowrap">{d.tipoDespesa || '—'}</td>
                    <td className="px-3 py-2 text-base-100 whitespace-nowrap">{d.setorDespesa || '—'}</td>
                    <td className="px-3 py-2 text-base-100 whitespace-nowrap">
                      {d.numFrota ? `${d.numFrota}${d.tipoFrota ? ` · ${d.tipoFrota}` : ''}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-base-100 max-w-[120px] truncate" title={d.fornecedor}>{d.fornecedor || '—'}</td>
                    <td className="px-3 py-2 text-base-50 max-w-[200px] truncate" title={d.descricao}>{d.descricao}</td>
                    <td className="px-3 py-2 text-right font-semibold text-base-50 whitespace-nowrap">{fmt(d.valor)}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => handleDelete(d.id)}
                        className="text-base-400 hover:text-danger transition-colors p-1">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-base-400 bg-base-700/30">
                  <td colSpan={8} className="px-3 py-2 text-xs font-semibold text-base-200">
                    Total — {resumo.total} lançamento{resumo.total !== 1 ? 's' : ''}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-success whitespace-nowrap">
                    {fmt(resumo.valorTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
