import { useState } from 'react';
import { Lock, User, Eye, EyeOff, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import logo from '../assets/logo.png';

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const toast     = useToast();

  const [form,    setForm   ] = useState({ name: '', password: '' });
  const [show,    setShow   ] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.password) { toast('Preencha todos os campos', 'warning'); return; }
    setLoading(true);
    try {
      await login(form.name, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || 'Credenciais inválidas', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base-950 flex">

      {/* ── Painel esquerdo — branding ── */}
      <div className="hidden lg:flex lg:w-[48%] flex-col justify-between p-14 relative overflow-hidden"
           style={{ background: 'linear-gradient(145deg, #060a10 0%, #0a1628 60%, #0d1f3c 100%)' }}>

        {/* Grid sutil */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: 'linear-gradient(#388bfd 1px,transparent 1px),linear-gradient(90deg,#388bfd 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

        {/* Orbs de luz */}
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full blur-[100px] opacity-15"
             style={{ background: 'radial-gradient(circle,#1f6feb,transparent)' }} />
        <div className="absolute bottom-20 left-10 w-60 h-60 rounded-full blur-[80px] opacity-10"
             style={{ background: 'radial-gradient(circle,#388bfd,transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 rounded-full blur-[100px] opacity-10"
             style={{ background: 'radial-gradient(ellipse,#d29922,transparent)' }} />

        {/* ── LOGO DESTAQUE ── */}
        <div className="relative z-10 flex flex-col items-start">
          <div className="mb-8">
            <img
              src={logo}
              alt="Agenda Transjap"
              style={{
                height: '90px',
                width: 'auto',
                filter: 'drop-shadow(0 0 18px rgba(210,153,34,0.55)) drop-shadow(0 4px 16px rgba(0,0,0,0.7))',
              }}
            />
          </div>

          <div className="w-12 h-0.5 rounded-full mb-6" style={{ background: 'linear-gradient(90deg,#d29922,transparent)' }} />

          <h1 className="text-4xl font-bold text-base-50 leading-tight mb-4">
            Gestão de tarefas<br />
            <span style={{ color: '#388bfd' }}>profissional</span>
          </h1>
          <p className="text-base-100 text-sm leading-relaxed max-w-xs">
            Controle de manutenções, pendências e agendas em tempo real.
            Multiusuário, com notificações instantâneas.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-3">
          {[
            'Agenda individual por usuário',
            'Alertas automáticos de atraso',
            'Notificações em tempo real',
            'Controle de manutenção e pendências',
          ].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: 'rgba(63,185,80,0.15)', border: '1px solid rgba(63,185,80,0.35)' }}>
                <Zap size={10} style={{ color: '#3fb950' }} />
              </div>
              <span className="text-sm text-base-100">{f}</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-xs text-base-200">© 2025 Transjap Terraplenagem e Construções</p>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-base-950">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="mb-8 lg:hidden">
            <img
              src={logo}
              alt="Transjap"
              style={{
                height: '52px',
                width: 'auto',
                filter: 'drop-shadow(0 0 10px rgba(210,153,34,0.5))',
              }}
            />
          </div>

          <h2 className="text-2xl font-bold text-base-50 mb-1">Entrar na plataforma</h2>
          <p className="text-sm text-base-100 mb-8">Use suas credenciais corporativas</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Usuário</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={set('name')}
                  className="input pl-9"
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  className="input pl-9 pr-9"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-200 hover:text-base-50 transition-colors"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-6 h-10">
              {loading ? <Spinner size={16} /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
