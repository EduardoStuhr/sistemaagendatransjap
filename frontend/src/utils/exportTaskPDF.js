import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '../assets/logoBase64.js';

/* ── Paleta ────────────────────────────────────────── */
const C = {
  dark:    [13,  17,  23 ],
  blue:    [31,  111, 235],
  blueL:   [56,  139, 253],
  success: [63,  185, 80 ],
  warning: [210, 153, 34 ],
  danger:  [248, 81,  73 ],
  orange:  [219, 109, 40 ],
  gray1:   [230, 237, 243],
  gray2:   [139, 148, 158],
  gray3:   [48,  54,  61 ],
  white:   [255, 255, 255],
};

/* ── Helpers ───────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}
function priorityColor(p) {
  return { baixa: C.success, media: C.blueL, alta: C.warning, urgente: C.orange, critica: C.danger }[p] || C.gray2;
}
function statusLabel(s) {
  return {
    nao_visualizada: 'Não visualizada', visualizada: 'Visualizada',
    em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
  }[s] || s;
}
function priorityLabel(p) {
  return { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente', critica: 'Crítica' }[p] || p;
}
function categoryLabel(c) {
  return {
    manutencao: 'Manutenção', pendencia: 'Pendência', compras: 'Compras',
    rh: 'RH', financeiro: 'Financeiro', operacional: 'Operacional', outro: 'Outro',
  }[c] || c;
}

/* ── Gerador ───────────────────────────────────────── */
export function exportTaskPDF(task) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw   = doc.internal.pageSize.getWidth();   // 210
  const ph   = doc.internal.pageSize.getHeight();  // 297
  const ml   = 15; // margin left
  const mr   = 15; // margin right
  const cw   = pw - ml - mr;
  let   y    = 0;

  /* ══ HEADER ══════════════════════════════════════ */
  // Fundo escuro
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, pw, 38, 'F');

  // Linha azul inferior do header
  doc.setFillColor(...C.blueL);
  doc.rect(0, 36, pw, 2, 'F');

  // Logo
  try {
    doc.addImage(logoBase64, 'PNG', ml, 7, 50, 14, undefined, 'FAST');
  } catch {}

  // Nome do sistema (direita)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.gray2);
  doc.text('AGENDA TRANSJAP', pw - mr, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Sistema Corporativo', pw - mr, 17, { align: 'right' });

  // Data de geração
  doc.setFontSize(6.5);
  doc.setTextColor(...C.gray2);
  doc.text(`Emitido em ${fmtDateTime(new Date())}`, pw - mr, 33, { align: 'right' });

  y = 46;

  /* ══ TÍTULO DA TAREFA ════════════════════════════ */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C.dark);
  const titleLines = doc.splitTextToSize(task.title, cw);
  doc.text(titleLines, ml, y);
  y += titleLines.length * 7 + 2;

  // Linha separadora
  doc.setDrawColor(...C.blueL);
  doc.setLineWidth(0.5);
  doc.line(ml, y, pw - mr, y);
  y += 7;

  /* ══ BADGES (Status · Prioridade · Categoria) ═══ */
  function badge(label, color, x, yy) {
    const w = doc.getStringUnitWidth(label) * 8 / doc.internal.scaleFactor + 6;
    doc.setFillColor(color[0], color[1], color[2], 0.15);
    doc.setFillColor(Math.min(255, color[0] + 180), Math.min(255, color[1] + 180), Math.min(255, color[2] + 180));
    doc.roundedRect(x, yy - 4, w, 6, 1, 1, 'F');
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(label, x + 3, yy);
    return w + 3;
  }

  let bx = ml;
  bx += badge(statusLabel(task.status), C.blueL,  bx, y);
  bx += badge(priorityLabel(task.priority), priorityColor(task.priority), bx, y);
  bx += badge(categoryLabel(task.category), C.gray2, bx, y);
  y += 9;

  /* ══ GRID DE INFORMAÇÕES ═════════════════════════ */
  function infoGrid(items) {
    const cols  = 2;
    const colW  = cw / cols;
    const lineH = 10;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = ml + col * colW;
      const iy  = y + row * lineH;

      // Fundo alternado
      if (row % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(x, iy - 4, colW - 2, lineH, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...C.gray2);
      doc.text(item.label.toUpperCase(), x + 3, iy);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.dark);
      doc.text(String(item.value || '—'), x + 3, iy + 4.5);
    });

    return Math.ceil(items.length / cols) * lineH + 4;
  }

  const recipients = task.recipients?.map(r => r.user?.name).join(', ') || '—';
  y += infoGrid([
    { label: 'Criado por',    value: task.from?.name },
    { label: 'Data de criação', value: fmtDateTime(task.createdAt) },
    { label: 'Prazo',         value: fmtDate(task.dueDate) },
    { label: 'Destinatários', value: recipients },
  ]);

  /* ══ DESCRIÇÃO ═══════════════════════════════════ */
  if (task.description?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.blue);
    doc.text('DESCRIÇÃO', ml, y);
    y += 4;

    doc.setFillColor(245, 247, 250);
    const descLines = doc.splitTextToSize(task.description, cw - 8);
    const descH     = descLines.length * 4.5 + 6;
    doc.rect(ml, y, cw, descH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.dark);
    doc.text(descLines, ml + 4, y + 5);
    y += descH + 6;
  }

  /* ══ COMENTÁRIOS ═════════════════════════════════ */
  if (task.comments?.length > 0) {
    // Verifica espaço na página
    if (y > ph - 60) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.blue);
    doc.text('COMENTÁRIOS', ml, y);
    y += 5;

    task.comments.forEach((c, idx) => {
      const textLines = doc.splitTextToSize(c.text, cw - 10);
      const boxH      = textLines.length * 4.5 + 11;

      if (y + boxH > ph - 20) { doc.addPage(); y = 20; }

      // Borda lateral colorida
      doc.setFillColor(...C.blueL);
      doc.rect(ml, y, 2, boxH, 'F');

      // Fundo
      doc.setFillColor(idx % 2 === 0 ? 248 : 245, idx % 2 === 0 ? 250 : 247, 255);
      doc.rect(ml + 2, y, cw - 2, boxH, 'F');

      // Nome + data
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.blue);
      doc.text(c.user?.name || '—', ml + 5, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...C.gray2);
      doc.text(fmtDateTime(c.createdAt), pw - mr, y + 5, { align: 'right' });

      // Texto
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.dark);
      doc.text(textLines, ml + 5, y + 10);

      y += boxH + 2;
    });
    y += 4;
  }

  /* ══ HISTÓRICO ═══════════════════════════════════ */
  if (task.history?.length > 0) {
    if (y > ph - 50) { doc.addPage(); y = 20; }

    autoTable(doc, {
      startY: y,
      head: [['Histórico de ações', 'Data/Hora']],
      body: task.history.map(h => [h.action, fmtDateTime(h.createdAt)]),
      headStyles: {
        fillColor: C.dark, textColor: C.white, fontSize: 7.5,
        fontStyle: 'bold', cellPadding: 3,
      },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, textColor: C.dark },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
      margin: { left: ml, right: mr },
      tableWidth: cw,
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  /* ══ FOOTER EM TODAS AS PÁGINAS ══════════════════ */
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Linha
    doc.setDrawColor(...C.gray3);
    doc.setLineWidth(0.3);
    doc.line(ml, ph - 12, pw - mr, ph - 12);

    // Texto esquerda
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray2);
    doc.text('Transjap Terraplenagem e Construções — Documento gerado automaticamente', ml, ph - 7);

    // Paginação direita
    doc.text(`Página ${i} de ${totalPages}`, pw - mr, ph - 7, { align: 'right' });
  }

  /* ══ SALVA ═══════════════════════════════════════ */
  const safeName = task.title.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim().replace(/\s+/g, '_');
  doc.save(`Tarefa_${task.id}_${safeName}.pdf`);
}
