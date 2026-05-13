import { useState } from 'react';
import { User, Lock, Palette, Save, Shield, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { authService } from '../services/api.js';
import { fmtDate } from '../utils/format.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';

const COLORS = [
  '#388bfd', '#3fb950', '#db6d28', '#8957e5',
  '#d29922', '#f78166', '#56d364', '#f85149',
  '#1f6feb', '#0d419d', '#79c0ff', '#a8daff',
];

const ROLES = [
  'Gestor(a)', 'Engenheiro(a)', 'Técnico(a)', 'Manutenção',
  'Administrador(a)', 'Operador(a)', 'Supervisor(a)',
];

export default function Profile() {
  const { user, login } = useAuth();
  const toast = useToast();

  const [infoForm,  setInfoForm ] = useState({ name: user?.name || '', role: user?.role || '' });
  const [pwForm,    setPwForm   ] = useState({ current: '', next: '', confirm: '' });
  const [selColor,  setSelColor ] = useState(user?.color || COLORS[0]);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw,   setSavingPw  ] = useState(false);
  const [savingColor,setSavingColor] = useState(false);
  const [showPw,     setShowPw    ] = useState(false);

  // Optimistic preview
  const previewUser = { ...user, name: infoForm.name || user?.name, color: selColor };

  async function handleSaveInfo(e) {
    e.preventDefault();
    if (!infoForm.name.trim()) { toast('Nome obrigatório', 'warning'); return; }
    setSavingInfo(true);
    try {
      await authService.updateProfile({ name: infoForm.name, role: infoForm.role });
      toast('Perfil atualizado!', 'success');
      // Refresh user from server
      window.location.reload();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar', 'error');
    } finally { setSavingInfo(false); }
  }

  async function handleSavePassword(e) {
    e.preventDefault();
    if (!pwForm.current) { toast('Informe a senha atual', 'warning'); return; }
    if (pwForm.next.length < 6) { toast('Nova senha mínima de 6 caracteres', 'warning'); return; }
    if (pwForm.next !== pwForm.confirm) { toast('Senhas não coincidem', 'error'); return; }
    setSavingPw(true);
    try {
      await authService.updateProfile({ currentPassword: pwForm.current, newPassword: pwForm.next });
      toast('Senha alterada com sucesso!', 'success');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao alterar senha', 'error');
    } finally { setSavingPw(false); }
  }

  async function handleSaveColor() {
    setSavingColor(true);
    try {
      await authService.updateColor(selColor);
      toast('Cor atualizada!', 'success');
      window.location.reload();
    } catch {
      toast('Erro ao atualizar cor', 'error');
    } finally { setSavingColor(false); }
  }

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <h1 className="text-lg font-semibold text-base-50 mb-6">Meu Perfil</h1>

      {/* Preview card */}
      <div className="card p-5 mb-6 flex items-center gap-4">
        <Avatar user={previewUser} size="xl" online />
        <div>
          <p className="text-base font-semibold text-base-50">{previewUser.name}</p>
          <p className="text-sm text-base-100 capitalize">{user?.role}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-base-200">
              <Mail size={11} /> {user?.email}
            </span>
            <span className="flex items-center gap-1 text-xs text-base-200">
              <Calendar size={11} /> desde {fmtDate(user?.createdAt)}
            </span>
          </div>
        </div>
        {(user?.isAdmin || user?.isManager) && (
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/15 border border-brand/30">
            <Shield size={12} className="text-brand-light" />
            <span className="text-xs font-semibold text-brand-light">
              {user.isAdmin ? 'Administrador' : 'Gestor'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* ── Info ── */}
        <Section icon={User} title="Informações pessoais">
          <form onSubmit={handleSaveInfo} className="space-y-3">
            <div>
              <label className="label">Nome completo</label>
              <input className="input" value={infoForm.name}
                     onChange={e => setInfoForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cargo / Função</label>
              <select className="select" value={infoForm.role}
                      onChange={e => setInfoForm(p => ({ ...p, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingInfo} className="btn-primary btn-sm">
                {savingInfo ? <Spinner size={14} /> : <><Save size={13} /> Salvar</>}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Color ── */}
        <Section icon={Palette} title="Cor do avatar">
          <div className="flex flex-wrap gap-2 mb-4">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setSelColor(c)}
                      className={`w-9 h-9 rounded-full transition-all border-2
                                  ${selColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                      style={{ background: c }} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-base-400"
                 style={{ background: selColor }} />
            <span className="text-xs text-base-100 font-mono">{selColor}</span>
            <button onClick={handleSaveColor} disabled={savingColor || selColor === user?.color}
                    className="btn-primary btn-sm ml-auto">
              {savingColor ? <Spinner size={14} /> : <><Save size={13} /> Aplicar cor</>}
            </button>
          </div>
        </Section>

        {/* ── Password ── */}
        <Section icon={Lock} title="Alterar senha">
          <form onSubmit={handleSavePassword} className="space-y-3">
            <div>
              <label className="label">Senha atual</label>
              <input type={showPw ? 'text' : 'password'} className="input"
                     placeholder="••••••••" value={pwForm.current}
                     onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nova senha</label>
              <input type={showPw ? 'text' : 'password'} className="input"
                     placeholder="Mínimo 6 caracteres" value={pwForm.next}
                     onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input type={showPw ? 'text' : 'password'} className="input"
                     placeholder="Repita a nova senha" value={pwForm.confirm}
                     onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
              {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-danger mt-1">Senhas não coincidem</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-base-100 cursor-pointer select-none">
                <input type="checkbox" className="rounded border-base-400 bg-base-900 text-brand"
                       checked={showPw} onChange={e => setShowPw(e.target.checked)} />
                Mostrar senhas
              </label>
              <button type="submit" disabled={savingPw} className="btn-primary btn-sm">
                {savingPw ? <Spinner size={14} /> : <><Lock size={13} /> Alterar senha</>}
              </button>
            </div>
          </form>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-base-500">
        <Icon size={15} className="text-brand-light" />
        <h3 className="text-sm font-semibold text-base-50">{title}</h3>
      </div>
      {children}
    </div>
  );
}
