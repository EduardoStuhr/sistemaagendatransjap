import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, AlertCircle, Clock, Tag, MessageSquare, History, Trash2, FileDown, Truck, Wrench } from 'lucide-react';
import { exportTaskPDF } from '../../utils/exportTaskPDF.js';
import { AttachmentPanel } from './AttachmentPanel.jsx';
import { MaintenanceStepper } from './MaintenanceStepper.jsx';
import { Modal } from '../ui/Modal.jsx';
import { StatusBadge, PriorityBadge } from '../ui/StatusBadge.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import {
  fmtDate, fmtDatetime, fmtRelative,
  STATUS_LABELS, STATUS_STYLES, CATEGORY_LABELS, MAINTENANCE_STATUS_LABELS,
} from '../../utils/format.js';
import { getDelayDays, getDelayLevel, DELAY_STYLES, getDueProximity, DUE_PROXIMITY_STYLES } from '../../utils/delay.js';
import { isMaintenanceTask } from '../../utils/taskFilters.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';

const ALL_STATUSES    = Object.keys(STATUS_LABELS);
const SIMPLE_STATUSES = ['nao_visualizada', 'visualizada', 'em_andamento', 'concluida'];

export function TaskModal({ task, onClose, onStatusChange, onMaintenanceStatusChange, onAddComment, onCobrar, onDelete }) {
  const { user }  = useAuth();
  const toast     = useToast();
  const navigate  = useNavigate();
  const isMaint   = isMaintenanceTask(task);

  const [comment,         setComment        ] = useState('');
  const [sending,         setSending        ] = useState(false);
  const [changing,        setChanging       ] = useState(false);
  const [deleting,        setDeleting       ] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);

  const isManager  = user?.isAdmin || user?.isManager;
  const delayDays  = getDelayDays(task);
  const delayLevel = getDelayLevel(delayDays);
  const ds         = DELAY_STYLES[delayLevel];
  const proximity  = delayDays > 0 ? 'overdue' : getDueProximity(task);
  const ps         = DUE_PROXIMITY_STYLES[proximity];

  async function handleStatus(e) {
    setChanging(true);
    try {
      await onStatusChange(task.id, e.target.value);
      toast('Status atualizado', 'success');
    } catch { toast('Erro ao atualizar status', 'error'); }
    finally { setChanging(false); }
  }

  async function handleMaintenanceStatus(e) {
    setChanging(true);
    try {
      await onMaintenanceStatusChange(task.id, task.status, e.target.value);
      toast('Etapa de manutenção atualizada', 'success');
      setShowStageSelect(false);
    } catch { toast('Erro ao atualizar etapa de manutenção', 'error'); }
    finally { setChanging(false); }
  }

  async function handleStageChange(newStage) {
    setChanging(true);
    try {
      await onMaintenanceStatusChange(task.id, task.status, newStage);
      toast('Etapa atualizada', 'success');
    } catch { toast('Erro ao atualizar etapa', 'error'); }
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

  function goToManutencao() {
    onClose();
    navigate('/manutencao');
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={task.title}
      size="lg"
      footer={
        <>
          {(isManager || task.fromId === user?.id) && onDelete && (
            <button onClick={handleDelete} disabled={deleting}
              className="btn btn-sm gap-1.5 mr-auto text-danger border-danger/30 bg-danger/10 hover:bg-danger/20">
              {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
              Excluir tarefa
            </button>
          )}

          {isMaint && (
            <button onClick={goToManutencao} className="btn btn-ghost btn-sm gap-1.5 text-warning border-warning/30">
              <Wrench size={13} /> Abrir em Manutenção →
            </button>
          )}

          {isManager && !['concluida','cancelada'].includes(task.status) && (
            <button onClick={handleCobrar} className="btn-danger btn-sm">
              <AlertCircle size={13} /> Cobrar atualização
            </button>
          )}
          <button onClick={() => exportTaskPDF(task)} className="btn btn-ghost btn-sm gap-1.5">
            <FileDown size={13} /> Exportar PDF
          </button>
          <button onClick={onClose} className="btn-ghost btn-sm">Fechar</button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Due proximity banner (only when not overdue) */}
        {!delayDays && ps && proximity !== 'none' && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${ps.border} ${ps.badge}`}>
            <Clock size={13} />
            <span className="text-xs font-semibold">{ps.label}</span>
          </div>
        )}

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
          <InfoBox label="Status">
            {isManager ? (
              <div className="relative">
                {changing && <Spinner size={12} className="absolute right-2 top-1/2 -translate-y-1/2" />}
                <select className="select text-xs py-1" value={task.status} onChange={handleStatus} disabled={changing}>
                  {(isMaint ? ALL_STATUSES : SIMPLE_STATUSES).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            ) : <StatusBadge status={task.status} />}
          </InfoBox>

          {isMaint && (
            <InfoBox label="Etapa de manutenção">
              <div className="flex items-center justify-between gap-2">
                <span className="badge bg-base-500/50 text-base-100 border border-base-400/50 capitalize text-xs">
                  {task.maintenanceSummary?.maintenanceStatusLabel || '—'}
                </span>
                {isManager && (
                  <button
                    onClick={() => setShowStageSelect(v => !v)}
                    className="text-[10px] text-base-200 hover:text-base-50 transition-colors underline underline-offset-2"
                  >
                    {showStageSelect ? 'fechar' : 'alterar manualmente'}
                  </button>
                )}
              </div>
              {showStageSelect && isManager && (
                <div className="relative mt-2">
                  {changing && <Spinner size={12} className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />}
                  <select className="select text-xs py-1 w-full" value={task.maintenanceStatus || ''} onChange={handleMaintenanceStatus} disabled={changing}>
                    {Object.entries(MAINTENANCE_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
            </InfoBox>
          )}

          <InfoBox label="Prazo">
            <span className={`text-sm font-semibold ${delayDays > 0 ? ds.text : ps ? ps.text : 'text-base-50'}`}>
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

          {/* Equipment box */}
          {task.equipment && (
            <InfoBox label="Equipamento">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-brand-light flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-base-50">{task.equipment.name}</p>
                  <p className="text-[10px] font-mono text-base-200">{task.equipment.code}</p>
                </div>
              </div>
            </InfoBox>
          )}
        </div>

        {/* Maintenance Stepper interativo */}
        {isMaint && (
          <MaintenanceStepper
            task={task}
            isManager={isManager}
            onChangeStage={isManager ? handleStageChange : undefined}
            changing={changing}
          />
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
          <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-3">Anexos</p>
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

          <div className="flex gap-2">
            <textarea
              className="input text-xs resize-none flex-1 h-16"
              placeholder="Adicionar comentário ou atualização..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment(); }}
            />
            <button onClick={handleComment} disabled={!comment.trim() || sending} className="btn-primary btn-sm self-stretch px-3">
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
