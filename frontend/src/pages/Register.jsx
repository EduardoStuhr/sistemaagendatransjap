import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { authService } from '../services/api.js';
import { Spinner } from '../components/ui/Spinner.jsx';

const STEPS = ['email', 'code', 'profile'];

const ROLES = [
  'Gestor(a)', 'Engenheiro(a)', 'Técnico(a)', 'Manutenção',
  'Administrador(a)', 'Operador(a)', 'Supervisor(a)',
];

const COLORS = [
  '#388bfd', '#3fb950', '#db6d28', '#8957e5',
  '#d29922', '#f78166', '#56d364', '#f85149',
];

export default function Register() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const toast     = useToast();

  const [step,    setStep   ] = useState('email');
  const [loading, setLoading] = useState(false);
  const [resendCd, setResendCd] = useState(0);

  const [email,    setEmail   ] = useState('');
  const [code,     setCode    ] = useState(['', '', '', '', '', '']);
  const [form,     setForm    ] = useState({ name: '', password: '', confirm: '', role: 'Técnico(a)', color: COLORS[0] });
  const [showPw,   setShowPw  ] = useState(false);

  const codeRefs = useRef([]);

  // Countdown for resend
  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setInterval(() => setResendCd(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendCd]);

  // ── Step 1: send code ────────────────────────────────────────────────────────
  async function handleSendCode(e) {
    e.preventDefault();
    if (!email) { toast('Informe o email', 'warning'); return; }
    setLoading(true);
    try {
      await authService.sendCode(email);
      toast('Código enviado! Verifique seu email.', 'success');
      setStep('code');
      setResendCd(60);
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao enviar código', 'error');
    } finally { setLoading(false); }
  }

  async function handleResend() {
    if (resendCd > 0) return;
    setLoading(true);
    try {
      await authService.sendCode(email);
      toast('Novo código enviado!', 'info');
      setResendCd(60);
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao reenviar', 'error');
    } finally { setLoading(false); }
  }

  // ── Step 2: verify code ──────────────────────────────────────────────────────
  function handleCodeChange(i, val) {
    const v = val.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) codeRefs.current[i + 1]?.focus();
    if (!v && i > 0) codeRefs.current[i - 1]?.focus();
  }

  function handleCodePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeRefs.current[5]?.focus();
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    const joined = code.join('');
    if (joined.length < 6) { toast('Digite o código completo', 'warning'); return; }
    setLoading(true);
    try {
      await authService.verifyCode(email, joined);
      toast('Email verificado!', 'success');
      setStep('profile');
    } catch (err) {
      toast(err.response?.data?.error || 'Código inválido', 'error');
    } finally { setLoading(false); }
  }

  // ── Step 3: complete registration ────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast('Nome obrigatório', 'warning'); return; }
    if (form.password.length < 6) { toast('Senha mínima de 6 caracteres', 'warning'); return; }
    if (form.password !== form.confirm) { toast('Senhas não coincidem', 'error'); return; }

    setLoading(true);
    try {
      await authService.register({
        name: form.name, email, password: form.password,
        code: code.join(''), role: form.role,
      });
      await login(email, form.password);
      toast('Conta criada com sucesso!', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao criar conta', 'error');
    } finally { setLoading(false); }
  }

  // ── UI ───────────────────────────────────────────────────────────────────────
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #1f6feb, #0d419d)' }}>OP</div>
          <span className="font-semibold text-base-50">OpsAgenda</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {['Email', 'Verificação', 'Perfil'].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                              ${i < stepIndex ? 'bg-success text-white' : i === stepIndex ? 'bg-brand text-white' : 'bg-base-600 text-base-200'}`}>
                {i < stepIndex ? <CheckCircle size={12} /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === stepIndex ? 'text-base-50' : 'text-base-200'}`}>{label}</span>
              {i < 2 && <div className={`flex-1 h-px ${i < stepIndex ? 'bg-success' : 'bg-base-500'}`} />}
            </div>
          ))}
        </div>

        {/* ── Step: email ── */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-base-50 mb-1">Criar conta</h2>
              <p className="text-sm text-base-100">Informe seu email corporativo para receber o código de acesso</p>
            </div>

            <div>
              <label className="label">Email corporativo</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
                <input type="email" className="input pl-9" placeholder="seu@empresa.com"
                       value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-10">
              {loading ? <Spinner size={16} /> : 'Enviar código de verificação'}
            </button>

            <p className="text-center text-xs text-base-200">
              Já tem conta?{' '}
              <Link to="/login" className="text-brand-light hover:text-brand transition-colors">Entrar</Link>
            </p>
          </form>
        )}

        {/* ── Step: code ── */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div>
              <button type="button" onClick={() => setStep('email')}
                      className="flex items-center gap-1 text-xs text-base-100 hover:text-base-50 mb-3 transition-colors">
                <ArrowLeft size={13} /> Voltar
              </button>
              <h2 className="text-xl font-bold text-base-50 mb-1">Verifique seu email</h2>
              <p className="text-sm text-base-100">
                Enviamos um código de 6 dígitos para{' '}
                <span className="text-brand-light font-medium">{email}</span>
              </p>
            </div>

            {/* 6-digit code input */}
            <div>
              <label className="label">Código de verificação</label>
              <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => codeRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Backspace' && !code[i] && i > 0) codeRefs.current[i - 1]?.focus(); }}
                    className={`w-11 h-14 text-center text-xl font-bold rounded-xl border bg-base-900
                                focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light/40
                                transition-all ${digit ? 'border-brand text-brand-light' : 'border-base-400 text-base-50'}`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || code.join('').length < 6} className="btn-primary w-full h-10">
              {loading ? <Spinner size={16} /> : 'Verificar código'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCd > 0 || loading}
                className="flex items-center gap-1.5 text-xs mx-auto transition-colors
                           disabled:text-base-300 enabled:text-brand-light enabled:hover:text-brand"
              >
                <RefreshCw size={12} />
                {resendCd > 0 ? `Reenviar em ${resendCd}s` : 'Reenviar código'}
              </button>
            </div>
          </form>
        )}

        {/* ── Step: profile ── */}
        {step === 'profile' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-success" />
                <span className="text-xs text-success font-medium">Email verificado</span>
              </div>
              <h2 className="text-xl font-bold text-base-50 mb-1">Complete seu perfil</h2>
              <p className="text-sm text-base-100">Estas informações aparecerão no sistema</p>
            </div>

            {/* Color picker */}
            <div>
              <label className="label">Cor do avatar</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                          className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-base-950 ring-white scale-110' : 'hover:scale-105'}`}
                          style={{ background: c }} />
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="label">Nome completo</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
                <input className="input pl-9" placeholder="Seu nome" value={form.name}
                       onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="label">Cargo / Função</label>
              <select className="select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
                <input type={showPw ? 'text' : 'password'} className="input pl-9 pr-9" placeholder="Mínimo 6 caracteres"
                       value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-base-200 hover:text-base-50 transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirmar senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-200" />
                <input type={showPw ? 'text' : 'password'} className="input pl-9" placeholder="Repita a senha"
                       value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              {form.confirm && form.password !== form.confirm && (
                <p className="text-xs text-danger mt-1">Senhas não coincidem</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-10 mt-2">
              {loading ? <Spinner size={16} /> : 'Criar minha conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
