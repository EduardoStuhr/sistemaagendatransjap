import { useState, useEffect, useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { userService, attachmentService } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { CATEGORY_LABELS } from '../../utils/format.js';

const PRIORITIES = [
  { value: 'baixa',   label: 'Baixa'   },
  { value: 'media',   label: 'Média'   },
  { value: 'alta',    label: 'Alta'    },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critica', label: 'Crítica' },
];

const TARGET_TYPES = [
  { value: 'specific', label: 'Usuário(s) específico(s)' },
  { value: 'all',      label: 'Todos os usuários' },
];

const REQUEST_TYPES = [
  { value: 'Agenda', label: 'Agenda' },
  { value: 'Operacional', label: 'Operacional' },
  { value: 'Manutenção', label: 'Manutenção' },
];

export function CreateTaskModal({ onClose, onCreate }) {
  const { user } = useAuth();
  const toast    = useToast();

  const [form, setForm] = useState({
    title: '', description: '', priority: 'media',
    category: 'manutencao', requestType: 'Manutenção', dueDate: '', targetType: 'specific', selectedUsers: [],
  });
  const [users,    setUsers  ] = useState([]);
  const [loading,  setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [files,    setFiles  ] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    userService.list()
      .then(setUsers)
      .finally(() => setFetching(false));
  }, []);

  function set(k) { return (e) => setForm(p => ({ ...p, [k]: e.target.value })); }

  function toggleUser(id) {
    setForm(p => ({
      ...p,
      selectedUsers: p.selectedUsers.includes(id)
        ? p.selectedUsers.filter(x => x !== id)
        : [...p.selectedUsers, id],
    }));
  }

  function onPickFiles(e) {
    const picked = Array.from(e.target.files || []);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...picked.filter(f => !existing.has(f.name + f.size))];
    });
    e.target.value = '';
  }

  async function handleCreate() {
    if (!form.title.trim()) { toast('Título obrigatório', 'warning'); return; }

    const recipientIds = form.targetType === 'all'
      ? users.map(u => u.id)
      : form.selectedUsers.length > 0
        ? form.selectedUsers
        : [user.id];

    setLoading(true);
    try {
      const task = await onCreate({
        title:        form.title.trim(),
        description:  form.description.trim() || undefined,
        priority:     form.priority,
        category:     form.category,
        requestType:  form.requestType,
        dueDate:      form.dueDate || undefined,
        recipientIds,
      });
      // Faz upload dos arquivos selecionados
      if (files.length > 0 && task?.id) {
        await attachmentService.upload(task.id, files).catch(() => {});
      }
      toast('Tarefa criada com sucesso!', 'success');
      onClose();
    } catch { toast('Erro ao criar tarefa', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova Tarefa / Pendência"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost btn-sm">Cancelar</button>
          <button onClick={handleCreate} disabled={loading} className="btn-primary btn-sm">
            {loading ? <Spinner size={14} /> : '✓ Criar tarefa'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="label">Título *</label>
          <input className="input" placeholder="Descreva a tarefa ou pendência..." value={form.title} onChange={set('title')} autoFocus />
        </div>

        {/* Description */}
        <div>
          <label className="label">Descrição</label>
          <textarea className="input resize-none h-16" placeholder="Detalhes, instruções ou contexto..." value={form.description} onChange={set('description')} />
        </div>

        {/* Priority + Category + Type */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="label">Prioridade</label>
            <select className="select" value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="select" value={form.category} onChange={set('category')}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo de solicitação</label>
            <select className="select" value={form.requestType} onChange={set('requestType')}>
              {REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="label">Prazo</label>
          <input type="date" className="input" value={form.dueDate} onChange={set('dueDate')} />
        </div>

        {/* Anexos */}
        <div>
          <label className="label">Anexos (opcional)</label>
          <input ref={fileRef} type="file" multiple className="hidden"
            accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
            onChange={onPickFiles} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="btn btn-ghost btn-sm gap-2 w-full border-dashed border-base-400 hover:border-brand/50">
            <Paperclip size={13} /> Selecionar arquivos para anexar
          </button>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-600 text-xs">
                  <Paperclip size={11} className="text-base-200 flex-shrink-0" />
                  <span className="flex-1 truncate text-base-100">{f.name}</span>
                  <span className="text-base-200 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-base-200 hover:text-danger p-0.5"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target */}
        <div>
          <label className="label">Destinatários</label>
          <select className="select mb-3" value={form.targetType} onChange={set('targetType')}>
            {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          {form.targetType === 'specific' && (
            <div>
              <p className="label mb-2">Selecionar usuários</p>
              {fetching ? (
                <div className="flex justify-center py-4"><Spinner size={20} /></div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {users.filter(u => u.id !== user?.id).map(u => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-600 border border-base-500 cursor-pointer hover:border-base-400 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.selectedUsers.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="rounded border-base-400 bg-base-900 text-brand"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-base-50 truncate">{u.name}</p>
                        <p className="text-[10px] text-base-200 capitalize">{u.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
