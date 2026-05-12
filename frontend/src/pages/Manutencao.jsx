import { useState, useMemo, useEffect, useCallback } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Wrench, Package, Plus, Search, Pencil, Trash2,
  AlertTriangle, CheckCircle2, TrendingDown, X, Save,
  List, Columns, Truck, Clock,
} from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { TaskCard } from '../components/tasks/TaskCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonCard, Spinner } from '../components/ui/Spinner.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { partService } from '../services/api.js';
import { getDelayDays, getDueProximity } from '../utils/delay.js';
import { isMaintenanceTask } from '../utils/taskFilters.js';
import { MAINTENANCE_STATUS_LABELS } from '../utils/format.js';

const TABS = [
  { id: 'manutencao', label: 'Manutenção', icon: Wrench   },
  { id: 'pecas',      label: 'Peças',       icon: Package  },
];

const VIEW_MODES = [
  { id: 'lista',       label: 'Lista',         icon: List    },
  { id: 'por_etapa',   label: 'Por Etapa',     icon: Columns },
  { id: 'por_equip',   label: 'Por Equip.',    icon: Truck   },
];

const UNITS = ['un', 'kg', 'lt', 'm', 'cx', 'par', 'rolo', 'jg'];
const EMPTY_PART = { name: '', code: '', description: '', quantity: 0, unit: 'un', location: '', minStock: 0, supplier: '' };

function daysInCurrentStage(task) {
  const timings = task.maintenanceSummary?.stageTimings;
  if (!timings) return null;
  const active = timings.find(s => s.active);
  if (!active?.start) return null;
  const start = typeof active.start === 'string' ? parseISO(active.start) : active.start;
  if (!isValid(start)) return null;
  return Math.max(0, differenceInDays(new Date(), start));
}

function isGargalo(task) {
  const days = daysInCurrentStage(task);
  return days !== null && days > 5;
}

function isVencendo(task) {
  const p = getDueProximity(task);
  return p === 'due_today' || p === 'due_soon';
}

export default function Manutencao() {
  const { tasks, loading: tasksLoading, onSelectTask, onNewTask } = useOutletContext();
  const { user } = useAuth();
  const toast    = useToast();
  const [searchParams] = useSearchParams();

  const [tab,          setTab         ] = useState('manutencao');
  const [viewMode,     setViewMode    ] = useState('lista');
  const [search,       setSearch      ] = useState('');
  const [parts,        setParts       ] = useState([]);
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

  // Somente OSs de manutenção (sem peças misturadas)
  const maintTasks = useMemo(() => {
    let list = tasks.filter(t => isMaintenanceTask(t) && t.requestType === 'Manutenção');

    // Aplicar filtro vindo do sidebar (?filter=urgentes|gargalos)
    const qFilter = searchParams.get('filter');
    if (qFilter === 'urgentes')  list = list.filter(t => ['critica','urgente'].includes(t.priority));
    if (qFilter === 'gargalos')  list = list.filter(isGargalo);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }

    // Ordenar: gargalos > atrasadas > vencendo > resto
    list.sort((a, b) => {
      const ga = isGargalo(a) ? 0 : getDelayDays(a) > 0 ? 1 : isVencendo(a) ? 2 : 3;
      const gb = isGargalo(b) ? 0 : getDelayDays(b) > 0 ? 1 : isVencendo(b) ? 2 : 3;
      return ga - gb;
    });

    return list;
  }, [tasks, search, searchParams]);

  const overdue  = useMemo(() => maintTasks.filter(t => getDelayDays(t) > 0 && !['concluida','cancelada'].includes(t.status)), [maintTasks]);
  const active   = useMemo(() => maintTasks.filter(t => !['concluida','cancelada'].includes(t.status)), [maintTasks]);
  const done     = useMemo(() => maintTasks.filter(t => t.status === 'concluida'), [maintTasks]);
  const vencendo = useMemo(() => active.filter(isVencendo), [active]);
  const gargalos = useMemo(() => active.filter(isGargalo), [active]);

  // Group by etapa for kanban view
  const byEtapa = useMemo(() => {
    const groups = {};
    for (const key of Object.keys(MAINTENANCE_STATUS_LABELS)) groups[key] = [];
    for (const t of active) {
      const k = t.maintenanceStatus || 'solicitacao_aberta';
      if (groups[k]) groups[k].push(t);
    }
    return groups;
  }, [active]);

  // Group by equipment
  const byEquip = useMemo(() => {
    const groups = { sem_equip: { label: 'Sem equipamento vinculado', tasks: [] } };
    for (const t of active) {
      if (!t.equipment) { groups.sem_equip.tasks.push(t); continue; }
      const key = `equip_${t.equipment.id}`;
      if (!groups[key]) groups[key] = { label: t.equipment.name, code: t.equipment.code, tasks: [] };
      groups[key].tasks.push(t);
    }
    return groups;
  }, [active]);

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
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
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
          {/* Gargalo banner */}
          {gargalos.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-danger/40 bg-danger/10 mb-4 animate-pulse-red">
              <AlertTriangle size={18} className="text-danger flex-shrink-0" />
              <p className="text-sm text-danger font-bold">
                {gargalos.length} {gargalos.length === 1 ? 'manutenção parada' : 'manutenções paradas'} há mais de 5 dias — verifique o que está bloqueando
              </p>
            </div>
          )}

          {/* KPIs — 5 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'OS em Aberto',        value: active.length,   icon: Wrench,        color: '#388bfd', sub: 'ativas'               },
              { label: 'Atrasadas',            value: overdue.length,  icon: AlertTriangle, color: '#f85149', sub: 'precisam de ação'     },
              { label: 'Vencendo',             value: vencendo.length, icon: Clock,         color: '#fb923c', sub: 'hoje ou em breve',    animate: vencendo.length > 0 },
              { label: 'Gargalos',             value: gargalos.length, icon: AlertTriangle, color: '#f85149', sub: '> 5d parada',         animate: gargalos.length > 0 },
              { label: 'Concluídas',           value: done.length,     icon: CheckCircle2,  color: '#3fb950', sub: 'este período'         },
            ].map(k => (
              <div key={k.label} className={`card p-4 flex items-center gap-3 ${k.animate ? 'animate-pulse-red' : ''}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${k.color}15`, border: `1px solid ${k.color}30` }}>
                  <k.icon size={16} style={{ color: k.color }} />
                </div>
                <div>
                  <p className="text-[11px] text-base-100 leading-tight">{k.label}</p>
                  <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-base-200">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* View mode toggle */}
          {active.length > 0 && (
            <div className="flex gap-1 p-1 bg-base-700 rounded-xl border border-base-500 mb-5 w-fit">
              {VIEW_MODES.map(m => (
                <button key={m.id} onClick={() => setViewMode(m.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${viewMode === m.id ? 'bg-base-900 text-base-50 shadow-card' : 'text-base-100 hover:text-base-50'}`}>
                  <m.icon size={13} /> {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {tasksLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_,i) => <SkeletonCard key={i} />)}</div>
          ) : maintTasks.length === 0 ? (
            <EmptyState icon={Wrench} title="Nenhuma ordem de serviço"
                        description="Crie uma nova OS de manutenção"
                        action={<button onClick={onNewTask} className="btn-primary btn-sm"><Plus size={14} /> Nova OS</button>} />
          ) : (
            <>
              {/* Lista */}
              {viewMode === 'lista' && (
                <div className="space-y-2">
                  {maintTasks.map(t => (
                    <TaskCard key={t.id} task={t} currentUserId={user?.id} onClick={() => onSelectTask(t)} />
                  ))}
                </div>
              )}

              {/* Por etapa — kanban */}
              {viewMode === 'por_etapa' && (
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {Object.entries(MAINTENANCE_STATUS_LABELS).map(([key, label]) => {
                    const col = byEtapa[key] || [];
                    return (
                      <div key={key} className="flex-shrink-0 w-72">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <p className="text-xs font-semibold text-base-100 uppercase tracking-wider">{label}</p>
                          <span className="text-[10px] bg-base-700 border border-base-500 text-base-200 rounded-full px-2 py-0.5">{col.length}</span>
                        </div>
                        <div className="space-y-2">
                          {col.length === 0 ? (
                            <div className="h-20 rounded-xl border border-dashed border-base-500 flex items-center justify-center text-xs text-base-200">Vazia</div>
                          ) : col.map(t => (
                            <TaskCard key={t.id} task={t} currentUserId={user?.id} onClick={() => onSelectTask(t)} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Por equipamento */}
              {viewMode === 'por_equip' && (
                <div className="space-y-6">
                  {Object.entries(byEquip).filter(([, g]) => g.tasks.length > 0).map(([key, group]) => (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-3">
                        <Truck size={14} className="text-brand-light" />
                        <p className="text-sm font-semibold text-base-50">{group.label}</p>
                        {group.code && <span className="text-[10px] font-mono text-base-200 bg-base-700 px-1.5 rounded">{group.code}</span>}
                        <span className="text-[10px] bg-base-700 border border-base-500 text-base-200 rounded-full px-2 py-0.5 ml-auto">{group.tasks.length} OS</span>
                      </div>
                      <div className="space-y-2 pl-5 border-l border-base-600">
                        {group.tasks.map(t => (
                          <TaskCard key={t.id} task={t} currentUserId={user?.id} onClick={() => onSelectTask(t)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Peças tab ── */}
      {tab === 'pecas' && (
        <>
          {lowStock.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-warning/30 bg-warning/5 mb-4">
              <TrendingDown size={15} className="text-warning flex-shrink-0" />
              <p className="text-sm text-warning font-medium">
                {lowStock.length} {lowStock.length === 1 ? 'peça está' : 'peças estão'} abaixo do estoque mínimo
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total de itens', value: parts.length,    color: '#388bfd' },
              { label: 'Estoque baixo',  value: lowStock.length, color: '#f85149' },
              { label: 'Com fornecedor', value: parts.filter(p => p.supplier).length, color: '#3fb950' },
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
                    {['Código','Nome','Qtd','Unid','Local','Est. mín.','Fornecedor',''].map(h => (
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
                            <button onClick={() => openEdit(part)} aria-label="Editar peça"
                                    className="w-7 h-7 rounded-lg bg-base-500 hover:bg-brand/30 hover:text-brand-light flex items-center justify-center text-base-200 transition-all">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => handleDeletePart(part.id)} disabled={deletingId === part.id} aria-label="Remover peça"
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
