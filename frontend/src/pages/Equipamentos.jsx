import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Truck, Plus, Search, Pencil, Trash2, X, Save,
  Wrench, Cog, AlertTriangle, CheckCircle2, BarChart2,
  Calendar, Clock,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Modal } from '../components/ui/Modal.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { equipmentService } from '../services/api.js';
import { fmtDate } from '../utils/format.js';

const EQUIPMENT_TYPES = [
  { value: 'caminhao',      label: 'Caminhão',        icon: Truck   },
  { value: 'veiculo_leve',  label: 'Veículo Leve',    icon: Truck   },
  { value: 'maquina_pesada',label: 'Máquina Pesada',  icon: Cog     },
  { value: 'prensa',        label: 'Prensa',          icon: Cog     },
  { value: 'outro',         label: 'Outro',           icon: Wrench  },
];

const EQUIPMENT_STATUSES = [
  { value: 'operando',      label: '🟢 Operando',        color: '#3fb950' },
  { value: 'em_manutencao', label: '🟡 Em Manutenção',   color: '#d29922' },
  { value: 'parado',        label: '🔴 Parado',          color: '#f85149' },
  { value: 'inativo',       label: '⚫ Inativo',          color: '#6e7681' },
];

const STATUS_FILTER = [
  { id: 'todos',         label: 'Todos'         },
  { id: 'operando',      label: 'Operando'      },
  { id: 'em_manutencao', label: 'Em Manutenção' },
  { id: 'parado',        label: 'Parado'        },
  { id: 'inativo',       label: 'Inativo'       },
];

const EMPTY_FORM = {
  name: '', code: '', type: 'caminhao', brand: '', model: '',
  year: '', location: '', status: 'operando', notes: '',
};

function EquipmentIcon({ type, size = 20 }) {
  const t = EQUIPMENT_TYPES.find(e => e.value === type);
  const Icon = t?.icon || Wrench;
  return <Icon size={size} />;
}

function StatusBadgeEq({ status }) {
  const s = EQUIPMENT_STATUSES.find(x => x.value === status);
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${s?.color || '#6e7681'}20`, color: s?.color || '#6e7681', border: `1px solid ${s?.color || '#6e7681'}40` }}>
      {s?.label || status}
    </span>
  );
}

export default function Equipamentos() {
  const toast = useToast();

  const [equipments,   setEquipments  ] = useState([]);
  const [loading,      setLoading     ] = useState(true);
  const [search,       setSearch      ] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showModal,    setShowModal   ] = useState(false);
  const [editing,      setEditing     ] = useState(null);
  const [form,         setForm        ] = useState(EMPTY_FORM);
  const [saving,       setSaving      ] = useState(false);
  const [deletingId,   setDeletingId  ] = useState(null);
  const [detailEq,     setDetailEq   ] = useState(null);
  const [detailStats,  setDetailStats ] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchEquipments = useCallback(async () => {
    setLoading(true);
    try { setEquipments(await equipmentService.list()); }
    catch { toast('Erro ao carregar equipamentos', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchEquipments(); }, [fetchEquipments]);

  const filtered = useMemo(() => {
    let list = equipments;
    if (statusFilter !== 'todos') list = list.filter(e => e.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q));
    }
    return list;
  }, [equipments, search, statusFilter]);

  function setF(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })); }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(eq) {
    setEditing(eq);
    setForm({
      name: eq.name, code: eq.code, type: eq.type || 'caminhao',
      brand: eq.brand || '', model: eq.model || '', year: eq.year || '',
      location: eq.location || '', status: eq.status, notes: eq.notes || '',
    });
    setShowModal(true);
  }

  async function openDetail(eq) {
    setDetailEq(eq);
    setDetailStats(null);
    setLoadingDetail(true);
    try {
      const [full, stats] = await Promise.all([
        equipmentService.get(eq.id),
        equipmentService.stats(eq.id),
      ]);
      setDetailEq(full);
      setDetailStats(stats);
    } catch { toast('Erro ao carregar detalhes', 'error'); }
    finally { setLoadingDetail(false); }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Nome obrigatório', 'warning'); return; }
    if (!form.code.trim()) { toast('Código obrigatório', 'warning'); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await equipmentService.update(editing.id, form);
        setEquipments(prev => prev.map(e => e.id === editing.id ? updated : e));
        toast('Equipamento atualizado!', 'success');
      } else {
        const created = await equipmentService.create(form);
        setEquipments(prev => [created, ...prev]);
        toast('Equipamento cadastrado!', 'success');
      }
      setShowModal(false);
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar equipamento', 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete(eq) {
    if (!confirm(`Remover o equipamento "${eq.name}"?`)) return;
    setDeletingId(eq.id);
    try {
      await equipmentService.remove(eq.id);
      setEquipments(prev => prev.filter(e => e.id !== eq.id));
      toast('Equipamento removido', 'info');
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao remover', 'error');
    } finally { setDeletingId(null); }
  }

  // Build monthly tasks chart data from detail tasks
  const monthlyData = useMemo(() => {
    if (!detailEq?.tasks) return [];
    const counts = {};
    for (const t of detailEq.tasks) {
      const m = t.createdAt?.slice(0, 7);
      if (m) counts[m] = (counts[m] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month: month.slice(5), count }));
  }, [detailEq]);

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
            <input className="input pl-9 h-9 w-60" placeholder="Buscar equipamento..."
                   value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTER.map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border
                  ${statusFilter === f.id ? 'bg-brand text-white border-brand' : 'bg-base-700 border-base-500 text-base-100 hover:border-base-400'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={openCreate} className="btn-primary btn-sm">
          <Plus size={14} /> Novo Equipamento
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-base-700" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title="Nenhum equipamento"
                    description="Cadastre caminhões, máquinas e outros equipamentos"
                    action={<button onClick={openCreate} className="btn-primary btn-sm"><Plus size={14} /> Novo Equipamento</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(eq => {
            const activeOSs = eq._count?.tasks ?? 0;
            const typeInfo  = EQUIPMENT_TYPES.find(t => t.value === eq.type) || EQUIPMENT_TYPES[4];
            return (
              <div key={eq.id}
                   className="card card-hover cursor-pointer group relative"
                   onClick={() => openDetail(eq)}>
                {/* Top */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0 text-brand-light">
                    <EquipmentIcon type={eq.type} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-base-50 truncate">{eq.name}</p>
                    <p className="text-[10px] font-mono text-base-200">{eq.code}</p>
                  </div>
                  <StatusBadgeEq status={eq.status} />
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px] text-base-200 mb-3">
                  {eq.location && <span className="truncate">{eq.location}</span>}
                  {eq.year && <span>{eq.year}</span>}
                  {activeOSs > 0 && (
                    <span className="ml-auto text-warning font-semibold">{activeOSs} OS ativa{activeOSs > 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* Action buttons (hover) */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                     onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(eq)} aria-label="Editar equipamento"
                          className="w-7 h-7 rounded-lg bg-base-500 hover:bg-brand/30 hover:text-brand-light flex items-center justify-center text-base-200 transition-all">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(eq)} disabled={deletingId === eq.id} aria-label="Remover equipamento"
                          className="w-7 h-7 rounded-lg bg-base-500 hover:bg-danger/20 hover:text-danger flex items-center justify-center text-base-200 transition-all">
                    {deletingId === eq.id ? <Spinner size={12} /> : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create/Edit modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
             title={editing ? 'Editar Equipamento' : 'Novo Equipamento'}
             footer={
               <>
                 <button onClick={() => setShowModal(false)} className="btn-ghost btn-sm">Cancelar</button>
                 <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
                   {saving ? <Spinner size={14} /> : <><Save size={13} /> Salvar</>}
                 </button>
               </>
             }>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input className="input" placeholder='Ex: "Caminhão Frota 12"' value={form.name} onChange={setF('name')} autoFocus />
          </div>
          <div>
            <label className="label">Código / Placa / Patrimônio *</label>
            <input className="input font-mono" placeholder="Ex: ABC-1234" value={form.code} onChange={setF('code')} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="select" value={form.type} onChange={setF('type')}>
              {EQUIPMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Marca</label>
            <input className="input" placeholder="Ex: Volvo" value={form.brand} onChange={setF('brand')} />
          </div>
          <div>
            <label className="label">Modelo</label>
            <input className="input" placeholder="Ex: FH 540" value={form.model} onChange={setF('model')} />
          </div>
          <div>
            <label className="label">Ano</label>
            <input type="number" min={1900} max={2099} className="input" placeholder="Ex: 2018" value={form.year} onChange={setF('year')} />
          </div>
          <div>
            <label className="label">Localização / Setor</label>
            <input className="input" placeholder="Ex: Pátio Norte" value={form.location} onChange={setF('location')} />
          </div>
          <div className="col-span-2">
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={setF('status')}>
              {EQUIPMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Observações</label>
            <textarea className="input resize-none h-16" placeholder="Notas adicionais..." value={form.notes} onChange={setF('notes')} />
          </div>
        </div>
      </Modal>

      {/* ── Detail modal ── */}
      {detailEq && (
        <Modal open onClose={() => setDetailEq(null)} title={detailEq.name} size="lg"
               footer={
                 <>
                   <button onClick={() => { openEdit(detailEq); setDetailEq(null); }} className="btn-ghost btn-sm mr-auto">
                     <Pencil size={13} /> Editar
                   </button>
                   <button onClick={() => setDetailEq(null)} className="btn-ghost btn-sm">Fechar</button>
                 </>
               }>
          {loadingDetail ? (
            <div className="flex justify-center py-10"><Spinner size={28} /></div>
          ) : (
            <div className="space-y-5">
              {/* Info row */}
              <div className="flex flex-wrap gap-3">
                <div className="card p-3 flex-1 min-w-[120px]">
                  <p className="text-[10px] text-base-200 uppercase tracking-wider mb-1">Tipo</p>
                  <div className="flex items-center gap-1.5 text-sm text-base-50">
                    <EquipmentIcon type={detailEq.type} size={14} />
                    {EQUIPMENT_TYPES.find(t => t.value === detailEq.type)?.label || detailEq.type}
                  </div>
                </div>
                <div className="card p-3 flex-1 min-w-[120px]">
                  <p className="text-[10px] text-base-200 uppercase tracking-wider mb-1">Código</p>
                  <p className="text-sm font-mono text-base-50">{detailEq.code}</p>
                </div>
                <div className="card p-3 flex-1 min-w-[120px]">
                  <p className="text-[10px] text-base-200 uppercase tracking-wider mb-1">Status</p>
                  <StatusBadgeEq status={detailEq.status} />
                </div>
                {detailEq.location && (
                  <div className="card p-3 flex-1 min-w-[120px]">
                    <p className="text-[10px] text-base-200 uppercase tracking-wider mb-1">Localização</p>
                    <p className="text-sm text-base-50">{detailEq.location}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              {detailStats && (
                <div>
                  <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-3">Estatísticas</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total de OSs',        value: detailStats.totalTasks,       icon: Wrench,       color: '#388bfd' },
                      { label: 'Dias parado (total)',  value: `${detailStats.totalStoppedDays}d`, icon: Clock, color: '#f85149' },
                      { label: 'OSs últimos 30d',      value: detailStats.last30,           icon: Calendar,     color: '#d29922' },
                      { label: 'MTBF (dias)',           value: detailStats.mtbf != null ? `${detailStats.mtbf}d` : '—', icon: BarChart2, color: '#3fb950' },
                    ].map(s => (
                      <div key={s.label} className="card p-3 text-center">
                        <div className="flex justify-center mb-1"><s.icon size={14} style={{ color: s.color }} /></div>
                        <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[10px] text-base-200 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly chart */}
              {monthlyData.length > 1 && (
                <div className="card p-4">
                  <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-3">OSs por mês</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={monthlyData} barSize={16}>
                      <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                      <Tooltip contentStyle={{ background: '#1c2333', border: '1px solid #30363d', borderRadius: 8, fontSize: 12, color: '#e6edf3' }} />
                      <Bar dataKey="count" fill="#388bfd" radius={[4, 4, 0, 0]} name="OSs" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Task history */}
              {detailEq.tasks?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-3">Últimas OSs ({detailEq.tasks.length})</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {detailEq.tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-base-700 hover:bg-base-600 transition-colors">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === 'concluida' ? 'bg-success' : t.status === 'cancelada' ? 'bg-base-400' : 'bg-brand-light'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-base-50 truncate">{t.title}</p>
                          <p className="text-[10px] text-base-200">{fmtDate(t.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailEq.notes && (
                <div className="rounded-xl bg-base-700 px-4 py-3">
                  <p className="text-[10px] text-base-200 uppercase tracking-wider mb-1">Observações</p>
                  <p className="text-xs text-base-100">{detailEq.notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
