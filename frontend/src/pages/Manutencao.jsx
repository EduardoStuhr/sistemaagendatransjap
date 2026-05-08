import { useState, useMemo, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Wrench, Package, Plus, Search, Pencil, Trash2,
  AlertTriangle, CheckCircle2, TrendingDown, X, Save,
} from 'lucide-react';
import { TaskCard } from '../components/tasks/TaskCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonCard, Spinner } from '../components/ui/Spinner.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { partService } from '../services/api.js';
import { getDelayDays } from '../utils/delay.js';

const TABS = [
  { id: 'manutencao', label: 'Manutenção',  icon: Wrench   },
  { id: 'pecas',      label: 'Peças',        icon: Package  },
];

const UNITS = ['un', 'kg', 'lt', 'm', 'cx', 'par', 'rolo', 'jg'];

const EMPTY_PART = { name: '', code: '', description: '', quantity: 0, unit: 'un', location: '', minStock: 0, supplier: '' };

export default function Manutencao() {
  const { tasks, loading: tasksLoading, onSelectTask, onNewTask } = useOutletContext();
  const { user } = useAuth();
  const toast    = useToast();

  const [tab,     setTab    ] = useState('manutencao');
  const [search,  setSearch ] = useState('');
  const [parts,   setParts  ] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [editingPart,   setEditingPart  ] = useState(null);
  const [partForm,      setPartForm     ] = useState(EMPTY_PART);
  const [savingPart,    setSavingPart   ] = useState(false);
  const [deletingId,    setDeletingId   ] = useState(null);

  const fetchParts = useCallback(async () => {
    setPartsLoading(true);
    try { setParts(await partService.list()); }
    catch  { toast('Erro ao carregar peças', 'error'); }
    finally { setPartsLoading(false); }
  }, [toast]);

  useEffect(() => { if (tab === 'pecas') fetchParts(); }, [tab, fetchParts]);

  // Maintenance tasks
  const maintTasks = useMemo(() => {
    let list = tasks.filter(t => ['manutencao', 'pecas'].includes(t.category));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    list.sort((a, b) => getDelayDays(b) - getDelayDays(a));
    return list;
  }, [tasks, search]);

  const overdue  = maintTasks.filter(t => getDelayDays(t) > 0 && !['concluida','cancelada'].includes(t.status));
  const active   = maintTasks.filter(t => !['concluida','cancelada'].includes(t.status));
  const done     = maintTasks.filter(t => t.status === 'concluida');

  // Parts helpers
  const filteredParts = useMemo(() => {
    if (!search.trim()) return parts;
    const q = search.toLowerCase();
    return parts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q),
    );
  }, [parts, search]);

  const lowStock = parts.filter(p => p.quantity <= p.minStock && p.minStock > 0);

  function openCreate() { setEditingPart(null); setPartForm(EMPTY_PART); setShowPartModal(true); }
  function openEdit(p)  { setEditingPart(p); setPartForm({ ...p }); setShowPartModal(true); }

  async function handleSavePart() {
    if (!partForm.name.trim()) { toast('Nome obrigatório', 'warning'); return; }
    setSavingPart(true);
    try {
      if (editingPart) {
        const updated = await partService.update(editingPart.id, partForm);
        setParts(p => p.map(x => x.id === editingPart.id ? updated : x));
        toast('Peça atualizada!', 'success');
      } else {
        const created = await partService.create(partForm);
        setParts(p => [created, ...p]);
        toast('Peça cadastrada!', 'success');
      }
      setShowPartModal(false);
    } catch { toast('Erro ao salvar peça', 'error'); }
    finally { setSavingPart(false); }
  }

  async function handleDeletePart(id) {
    if (!confirm('Remover esta peça do estoque?')) return;
    setDeletingId(id);
    try {
      await partService.remove(id);
      setParts(p => p.filter(x => x.id !== id));
      toast('Peça removida', 'info');
    } catch { toast('Erro ao remover', 'error'); }
    finally { setDeletingId(null); }
  }

  const setF = k => e => setPartForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 p-1 bg-base-700 rounded-xl border border-base-500">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${tab === t.id ? 'bg-base-900 text-base-50 shadow-card' : 'text-base-100 hover:text-base-50'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
            <input className="input pl-9 h-9 w-56" placeholder="Buscar..."
                   value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {tab === 'pecas' && (
            <button onClick={openCreate} className="btn-primary btn-sm">
              <Plus size={14} /> Nova peça
            </button>
          )}
          {tab === 'manutencao' && (
            <button onClick={onNewTask} className="btn-primary btn-sm">
              <Plus size={14} /> Nova OS
            </button>
          )}
        </div>
      </div>

      {/* ── Manutenção tab ── */}
      {tab === 'manutencao' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Ordem de Serviço', value: active.length, icon: Wrench,       color: '#388bfd', sub: 'em aberto' },
              { label: 'Atrasadas',        value: overdue.length, icon: AlertTriangle, color: '#f85149', sub: 'precisam de ação' },
              { label: 'Concluídas',       value: done.length,    icon: CheckCircle2, color: '#3fb950', sub: 'este período' },
            ].map(k => (
              <div key={k.label} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${k.color}15`, border: `1px solid ${k.color}30` }}>
                  <k.icon size={18} style={{ color: k.color }} />
                </div>
                <div>
                  <p className="text-xs text-base-100">{k.label}</p>
                  <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-base-200">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {tasksLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_,i) => <SkeletonCard key={i} />)}</div>
          ) : maintTasks.length === 0 ? (
            <EmptyState icon={Wrench} title="Nenhuma ordem de serviço"
                        description="Crie uma nova OS de manutenção"
                        action={<button onClick={onNewTask} className="btn-primary btn-sm"><Plus size={14} /> Nova OS</button>} />
          ) : (
            <div className="space-y-2">
              {maintTasks.map(t => (
                <TaskCard key={t.id} task={t} currentUserId={user?.id} onClick={() => onSelectTask(t)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Peças tab ── */}
      {tab === 'pecas' && (
        <>
          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-warning/30 bg-warning/5 mb-4">
              <TrendingDown size={15} className="text-warning flex-shrink-0" />
              <p className="text-sm text-warning font-medium">
                {lowStock.length} {lowStock.length === 1 ? 'peça está' : 'peças estão'} abaixo do estoque mínimo
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total de itens',    value: parts.length,    color: '#388bfd' },
              { label: 'Estoque baixo',     value: lowStock.length, color: '#f85149' },
              { label: 'Com fornecedor',    value: parts.filter(p => p.supplier).length, color: '#3fb950' },
            ].map(k => (
              <div key={k.label} className="card p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-base-100 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {partsLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_,i) => <SkeletonCard key={i} />)}</div>
          ) : filteredParts.length === 0 ? (
            <EmptyState icon={Package} title="Nenhuma peça cadastrada"
                        description="Registre peças e materiais do estoque"
                        action={<button onClick={openCreate} className="btn-primary btn-sm"><Plus size={14} /> Nova peça</button>} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-base-500">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-base-700 border-b border-base-500">
                    {['Código','Nome','Qtd','Unid','Local','Estoque mín.','Fornecedor',''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-base-100 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-500/50">
                  {filteredParts.map(part => {
                    const isLow = part.quantity <= part.minStock && part.minStock > 0;
                    return (
                      <tr key={part.id} className="bg-base-700 hover:bg-base-600 transition-colors group">
                        <td className="px-4 py-3 font-mono text-xs text-base-100">{part.code || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-base-50">{part.name}</p>
                          {part.description && <p className="text-xs text-base-200 truncate max-w-[180px]">{part.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${isLow ? 'text-danger' : 'text-base-50'}`}>{part.quantity}</span>
                          {isLow && <AlertTriangle size={11} className="inline ml-1 text-danger" />}
                        </td>
                        <td className="px-4 py-3 text-base-100">{part.unit}</td>
                        <td className="px-4 py-3 text-base-100">{part.location || '—'}</td>
                        <td className="px-4 py-3 text-base-100">{part.minStock}</td>
                        <td className="px-4 py-3 text-base-100">{part.supplier || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(part)}
                                    className="w-7 h-7 rounded-lg bg-base-500 hover:bg-brand/30 hover:text-brand-light flex items-center justify-center text-base-200 transition-all">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => handleDeletePart(part.id)} disabled={deletingId === part.id}
                                    className="w-7 h-7 rounded-lg bg-base-500 hover:bg-danger/20 hover:text-danger flex items-center justify-center text-base-200 transition-all">
                              {deletingId === part.id ? <Spinner size={12} /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Part modal ── */}
      <Modal open={showPartModal} onClose={() => setShowPartModal(false)}
             title={editingPart ? 'Editar peça' : 'Nova peça / material'}
             footer={
               <>
                 <button onClick={() => setShowPartModal(false)} className="btn-ghost btn-sm">Cancelar</button>
                 <button onClick={handleSavePart} disabled={savingPart} className="btn-primary btn-sm">
                   {savingPart ? <Spinner size={14} /> : <><Save size={13} /> Salvar</>}
                 </button>
               </>
             }>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input className="input" placeholder="Ex: Rolamento SKF 6205" value={partForm.name} onChange={setF('name')} autoFocus />
          </div>
          <div>
            <label className="label">Código / SKU</label>
            <input className="input" placeholder="Ex: SKF-6205" value={partForm.code} onChange={setF('code')} />
          </div>
          <div>
            <label className="label">Fornecedor</label>
            <input className="input" placeholder="Nome do fornecedor" value={partForm.supplier} onChange={setF('supplier')} />
          </div>
          <div>
            <label className="label">Quantidade em estoque</label>
            <input type="number" min={0} className="input" value={partForm.quantity} onChange={setF('quantity')} />
          </div>
          <div>
            <label className="label">Unidade</label>
            <select className="select" value={partForm.unit} onChange={setF('unit')}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Estoque mínimo</label>
            <input type="number" min={0} className="input" placeholder="0 = sem mínimo" value={partForm.minStock} onChange={setF('minStock')} />
          </div>
          <div>
            <label className="label">Localização</label>
            <input className="input" placeholder="Ex: Prateleira A3" value={partForm.location} onChange={setF('location')} />
          </div>
          <div className="col-span-2">
            <label className="label">Descrição</label>
            <textarea className="input resize-none h-14" placeholder="Observações sobre a peça..." value={partForm.description} onChange={setF('description')} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
