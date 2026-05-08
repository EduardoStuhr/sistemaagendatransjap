import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { userService } from '../../services/api.js';
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

export function CreateTaskModal({ onClose, onCreate }) {
  const { user } = useAuth();
  const toast    = useToast();

  const [form, setForm] = useState({
    title: '', description: '', priority: 'media',
    category: 'manutencao', dueDate: '', targetType: 'specific', selectedUsers: [],
  });
  const [users,    setUsers  ] = useState([]);
  const [loading,  setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

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

  async function handleCreate() {
    if (!form.title.trim()) { toast('Título obrigatório', 'warning'); return; }

    const recipientIds = form.targetType === 'all'
      ? users.map(u => u.id)
      : form.selectedUsers.length > 0
        ? form.selectedUsers
        : [user.id];

    setLoading(true);
    try {
      await onCreate({
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        priority:    form.priority,
        category:    form.category,
        dueDate:     form.dueDate || undefined,
        recipientIds,
      });
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

        {/* Priority + Category */}
        <div className="grid grid-cols-2 gap-3">
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
        </div>

        {/* Due date */}
        <div>
          <label className="label">Prazo</label>
          <input type="date" className="input" value={form.dueDate} onChange={set('dueDate')} />
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
