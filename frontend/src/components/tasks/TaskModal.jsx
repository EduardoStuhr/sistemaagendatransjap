import { useState } from 'react';
import { Send, AlertCircle, Clock, Tag, MessageSquare, History, Trash2, FileDown } from 'lucide-react';
import { exportTaskPDF } from '../../utils/exportTaskPDF.js';
import { AttachmentPanel } from './AttachmentPanel.jsx';
import { Modal } from '../ui/Modal.jsx';
import { StatusBadge, PriorityBadge } from '../ui/StatusBadge.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { fmtDate, fmtDatetime, fmtRelative, STATUS_LABELS, STATUS_STYLES, CATEGORY_LABELS, MAINTENANCE_STATUS_LABELS } from '../../utils/format.js';
import { getDelayDays, getDelayLevel, DELAY_STYLES } from '../../utils/delay.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';

const ALL_STATUSES = Object.keys(STATUS_LABELS);
const SIMPLE_STATUSES = ['nao_visualizada', 'visualizada', 'em_andamento', 'concluida'];

export function TaskModal({ task, onClose, onStatusChange, onMaintenanceStatusChange, onAddComment, onCobrar, onDelete }) {
  const { user }  = useAuth();
  const toast     = useToast();
  const isMaintenanceTask = task.requestType === 'Manutenção' || !task.requestType;

  const [comment,  setComment ] = useState('');
  const [sending,  setSending ] = useState(false);
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isManager    = user?.isAdmin || user?.isManager;
  const delayDays    = getDelayDays(task);
  const delayLevel   = getDelayLevel(delayDays);
  const ds           = DELAY_STYLES[delayLevel];

  async function handleStatus(e) {
    const newStatus = e.target.value;
    setChanging(true);
    try {
      await onStatusChange(task.id, newStatus);
      toast('Status atualizado', 'success');
    } catch { toast('Erro ao atualizar status', 'error'); }
    finally { setChanging(false); }
  }

  async function handleMaintenanceStatus(e) {
    const newMaintenanceStatus = e.target.value;
    setChanging(true);
    try {
      await onMaintenanceStatusChange(task.id, task.status, newMaintenanceStatus);
      toast('Etapa de manutenção atualizada', 'success');
    } catch { toast('Erro ao atualizar etapa de manutenção', 'error'); }
    finally { setChanging(false); }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await onAddComment(task.id, comment);
      setComment('');
      toast('Comentário adicionado', 'success');
    } catch { toast('Erro ao enviar comentário', 'error'); }
    finally { setSending(false); }
  }

  async function handleDelete() {
    if (!confirm(`Excluir a tarefa "${task.title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
    } catch {
      toast('Erro ao excluir tarefa', 'error');
      setDeleting(false);
    }
  }

  async function handleCobrar() {
    try {
      await onCobrar(task.id);
      toast('Cobrança enviada ao responsável', 'success');
    } catch { toast('Erro ao enviar cobrança', 'error'); }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={task.title}
      size="lg"
      footer={
        <>
          {/* Excluir — admin, manager ou criador da tarefa */}
          {(isManager || task.fromId === user?.id) && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn btn-sm gap-1.5 mr-auto text-danger border-danger/30 bg-danger/10 hover:bg-danger/20"
            >
              {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
              Excluir tarefa
            </button>
          )}

          {isManager && !['concluida','cancelada'].includes(task.status) && (
            <button onClick={handleCobrar} className="btn-danger btn-sm">
              <AlertCircle size={13} /> Cobrar atualização
            </button>
          )}
          <button
            onClick={() => exportTaskPDF(task)}
            className="btn btn-ghost btn-sm gap-1.5"
            title="Exportar PDF"
          >
            <FileDown size={13} /> Exportar PDF
          </button>
          <button onClick={onClose} className="btn-ghost btn-sm">Fechar</button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Delay banner */}
        {delayDays > 0 && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${ds.border} ${ds.badge}`}>
            <Clock size={13} />
            <span className="text-xs font-semibold">{ds.label} — {delayDays} {delayDays === 1 ? 'dia' : 'dias'} de atraso</span>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority={task.priority} />
          <span className="badge bg-base-500/50 text-base-100 border border-base-400/50 capitalize">
            <Tag size={9} />
            {CATEGORY_LABELS[task.category] || task.category}
          </span>
          {task.description && (
            <p className="w-full text-sm text-base-100 leading-relaxed bg-base-600 rounded-lg px-3 py-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoBox label="Status" icon={null}>
            {isManager ? (
              <div className="relative">
                {changing && <Spinner size={12} className="absolute right-2 top-1/2 -translate-y-1/2" />}
                <select
                  className="select text-xs py-1"
                  value={task.status}
                  onChange={handleStatus}
                  disabled={changing}
                >
                  {(isMaintenanceTask ? ALL_STATUSES : SIMPLE_STATUSES).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            ) : <StatusBadge status={task.status} />}
          </InfoBox>

          {task.requestType === 'Manutenção' && (
            <InfoBox label="Etapa de manutenção">
              {isManager ? (
                <div className="relative">
                  {changing && <Spinner size={12} className="absolute right-2 top-1/2 -translate-y-1/2" />}
                  <select
                    className="select text-xs py-1"
                    value={task.maintenanceStatus || ''}
                    onChange={handleMaintenanceStatus}
                    disabled={changing}
                  >
                    {Object.entries(MAINTENANCE_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="badge bg-base-500/50 text-base-100 border border-base-400/50 capitalize">
                  {task.maintenanceSummary?.maintenanceStatusLabel || '—'}
                </span>
              )}
            </InfoBox>
          )}

          <InfoBox label="Prazo">
            <span className={`text-sm font-semibold ${delayDays > 0 ? ds.text : 'text-base-50'}`}>
              {fmtDate(task.dueDate)} {delayDays > 0 && '⚠️'}
            </span>
          </InfoBox>

          <InfoBox label="Criado por">
            <div className="flex items-center gap-2">
              <Avatar user={task.from} size="xs" />
              <span className="text-sm text-base-50">{task.from?.name}</span>
            </div>
          </InfoBox>

          <InfoBox label="Destinatários">
            <div className="flex flex-wrap gap-1">
              {task.recipients?.map(r => (
                <div key={r.id} className="flex items-center gap-1">
                  <Avatar user={r.user} size="xs" />
                  <span className="text-xs text-base-100">{r.user?.name}</span>
                </div>
              ))}
            </div>
          </InfoBox>
        </div>

        {/* Maintenance timeline */}
        {task.requestType === 'Manutenção' && task.maintenanceSummary && (
          <div className="rounded-2xl border border-base-500 bg-base-900 p-4">
            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-base-200">Fluxo de manutenção</p>
                <p className="text-sm font-semibold text-base-50">{task.maintenanceSummary.maintenanceStatusLabel}</p>
              </div>
              {task.maintenanceSummary.bottleneck && (
                <div className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-danger">
                  {task.maintenanceSummary.bottleneck.message}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {task.maintenanceSummary.stageTimings.map(stage => (
                <div key={stage.key} className={`rounded-2xl border p-3 ${stage.active ? 'border-brand text-brand-light bg-brand/5' : 'border-base-600 bg-base-800'}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${stage.active ? 'bg-brand-light' : stage.days !== null ? 'bg-success' : 'bg-base-500'}`} />
                      <span className="text-sm font-semibold text-base-100">{stage.label}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-base-200">{stage.active ? 'Atual' : stage.days !== null ? `${stage.days}d` : '—'}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-base-200">
                    <div>
                      <p className="font-medium text-base-100">Início</p>
                      <p>{fmtDatetime(stage.start)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-base-100">Fim</p>
                      <p>{fmtDatetime(stage.end)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Read receipts */}
        {task.views?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-2">Lido por</p>
            <div className="flex flex-wrap gap-2">
              {task.views.map(v => (
                <div key={v.id} className="flex items-center gap-1.5 text-xs text-success">
                  <Avatar user={v.user} size="xs" />
                  <span>{v.user?.name}</span>
                  <span className="text-base-200">— {fmtRelative(v.viewedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        <div className="border-t border-base-500 pt-4">
          <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-3 flex items-center gap-1">
            <span>Anexos</span>
          </p>
          <AttachmentPanel task={task} />
        </div>

        {/* Comments */}
        <div>
          <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-2 flex items-center gap-1">
            <MessageSquare size={11} /> Comentários ({task.comments?.length || 0})
          </p>

          {task.comments?.length === 0 && (
            <p className="text-xs text-base-200 italic py-2">Nenhum comentário ainda.</p>
          )}

          <div className="space-y-2 mb-3">
            {task.comments?.map(c => (
              <div key={c.id} className="flex gap-3 bg-base-600 rounded-xl px-3 py-2.5">
                <Avatar user={c.user} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-base-50">{c.user?.name}</span>
                    <span className="text-[10px] text-base-200 ml-auto">{fmtRelative(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-base-100 leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div className="flex gap-2">
            <textarea
              className="input text-xs resize-none flex-1 h-16"
              placeholder="Adicionar comentário ou atualização..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment(); }}
            />
            <button
              onClick={handleComment}
              disabled={!comment.trim() || sending}
              className="btn-primary btn-sm self-stretch px-3"
            >
              {sending ? <Spinner size={14} /> : <Send size={14} />}
            </button>
          </div>
        </div>

        {/* History */}
        {task.history?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-2 flex items-center gap-1">
              <History size={11} /> Histórico
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {task.history.map(h => (
                <div key={h.id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-light mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-base-100">{h.action}</p>
                    <p className="text-[10px] text-base-200">{fmtRelative(h.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function InfoBox({ label, children }) {
  return (
    <div className="bg-base-600 rounded-xl p-3">
      <p className="text-[10px] font-semibold text-base-200 uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}
