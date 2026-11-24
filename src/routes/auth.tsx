import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Logo, LogoMark } from '@/components/Logo';
import { fetchRole, useGoToPanel, type Role } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const Route = createFileRoute('/auth')({ component: AuthPage });

type Area = 'hospede' | 'hotel' | 'admin';
const AREAS: { id: Area; label: string }[] = [
  { id: 'hospede', label: 'Hóspede' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'admin', label: 'Administração' },
];

const field = 'mt-1.5 h-12 w-full rounded-xl border bg-muted/60 px-4 text-[15px] outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/30';

/** Aceita 84 123 4567, 258841234567 ou +258841234567 e devolve +258XXXXXXXXX. */
function normalizePhone(raw: string): string | null {
  let value = raw.replace(/[^\d+]/g, '');
  if (!value.startsWith('+')) value = value.startsWith('258') ? '+' + value : '+258' + value;
  return /^\+258\d{9}$/.test(value) ? value : null;
}

function GoogleGlyph() {
  return (
    <svg viewBox='0 0 24 24' className='size-5' aria-hidden='true'>
      <path fill='#4285F4' d='M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.9a5.04 5.04 0 0 1-2.19 3.31v2.75h3.54c2.07-1.9 3.25-4.72 3.25-8.09Z' />
      <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.75c-.98.66-2.24 1.05-3.74 1.05-2.87 0-5.3-1.94-6.17-4.55H2.17v2.84A11 11 0 0 0 12 23Z' />
      <path fill='#FBBC05' d='M5.83 13.09a6.6 6.6 0 0 1 0-4.18V6.07H2.17a11 11 0 0 0 0 9.86l3.66-2.84Z' />
      <path fill='#EA4335' d='M12 5.36c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.46 2.1 14.97 1 12 1A11 11 0 0 0 2.17 7.07l3.66 2.84C6.7 7.3 9.13 5.36 12 5.36Z' />
    </svg>
  );
}

function AuthPage() {
  const goToPanel = useGoToPanel();
  const navigate = useNavigate();
  const redirected = useRef(false);
  const recoveryRef = useRef(false);
  const [area, setArea] = useState<Area>('hospede');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const isGuestArea = area === 'hospede';

  // Link de recuperação de palavra-passe: mostra o formulário de nova palavra-passe
  // e impede o redireccionamento automático.
  useEffect(() => {
    if (/type=recovery/.test(window.location.hash + window.location.search)) {
      recoveryRef.current = true;
      setRecovering(true);
    }
  }, []);

  // Se o fornecedor OAuth regressar a esta página em vez de /auth/callback,
  // conclui o login assim que o Supabase publicar a sessão autenticada.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryRef.current = true;
        setRecovering(true);
        return;
      }
      if (event === 'SIGNED_IN' && session && !redirected.current && !recoveryRef.current) {
        redirected.current = true;
        const userId = session.user.id;
        // Não se fazem chamadas ao Supabase dentro deste callback: adia-se para evitar bloqueios.
        setTimeout(() => { void fetchRole(userId).then(goToPanel); }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [goToPanel]);

  function warnIfWrongArea(role: Role | null) {
    if (area === 'hotel' && role !== 'hotel_admin' && role !== 'super_admin') {
      toast.warning('Esta conta não tem acesso à Área do Hotel. Entrou como hóspede.');
    } else if (area === 'admin' && role !== 'super_admin') {
      toast.warning('Esta conta não tem acesso à Administração Geral.');
    }
  }

  async function finishLogin(userId: string | undefined) {
    if (redirected.current) return;
    redirected.current = true;
    const role = userId ? await fetchRole(userId) : null;
    warnIfWrongArea(role);
    await goToPanel(role);
  }

  async function signInWithGoogle() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/auth/callback' },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar a autenticação com Google.');
      setBusy(false);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      let userId: string | undefined;
      if (mode === 'register' && isGuestArea) {
        // O cargo nunca é enviado pelo cliente: toda a conta nova é 'cliente'.
        // Gestores de hotel são promovidos ou convidados pelo administrador geral.
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success('Registo criado. Confirme o endereço de e-mail para activar a conta.');
          setMode('login');
          return;
        }
        toast.success('Conta criada com sucesso.');
        userId = data.session.user.id;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success('Sessão iniciada.');
        userId = data.user?.id;
      }
      await finishLogin(userId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível autenticar.');
    } finally { setBusy(false); }
  }

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!normalized) { toast.error('Indique um telemóvel moçambicano válido, por exemplo 84 123 4567.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (error) throw error;
      setPhone(normalized);
      setOtpSent(true);
      toast.success('Enviámos um código por SMS para ' + normalized + '.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o código SMS.');
    } finally { setBusy(false); }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp.trim(), type: 'sms' });
      if (error) throw error;
      toast.success('Sessão iniciada.');
      await finishLogin(data.user?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Código inválido ou expirado.');
    } finally { setBusy(false); }
  }

  async function forgotPassword() {
    const value = email.trim();
    if (!value) { toast.error('Escreva primeiro o seu e-mail.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(value, { redirectTo: window.location.origin + '/auth' });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success('Enviámos um link para redefinir a palavra-passe.');
  }

  async function saveNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Palavra-passe actualizada.');
      recoveryRef.current = false;
      setRecovering(false);
      await finishLogin(data.user?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível actualizar a palavra-passe.');
    } finally { setBusy(false); }
  }

  return (
    <main className='grid min-h-screen bg-background lg:grid-cols-2'>
      <aside className='bg-hero relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between'>
        <Link to='/' search={{}} aria-label='Voltar à página inicial'><Logo size={44} /></Link>
        <div className='max-w-md'>
          <h2 className='font-display text-4xl font-extrabold leading-tight tracking-tight'>O mundo mais perto de si.</h2>
          <p className='mt-4 text-lg text-muted-foreground'>Descubra, compare e reserve hotéis em Moçambique. Pague online ou em dinheiro no hotel.</p>
        </div>
        <div aria-hidden='true' className='pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-primary/10' />
        <div aria-hidden='true' className='pointer-events-none absolute bottom-24 right-24 size-16 rounded-full bg-violet/30' />
        <p className='relative text-sm text-muted-foreground'>Reservas simples, em qualquer lugar.</p>
      </aside>

      <section className='flex flex-col justify-center px-5 py-10 sm:px-10'>
        <div className='mx-auto w-full max-w-md'>
          <Link to='/' search={{}} className='mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground'>
            <ArrowLeft className='size-4' />Voltar ao início
          </Link>

          <div className='mb-6 flex flex-col items-center text-center lg:hidden'>
            <LogoMark size={64} />
            <p className='mt-3 font-display text-2xl font-extrabold tracking-tight'>LUV <span className='text-primary'>CONECT</span></p>
            <p className='mt-1 text-sm text-muted-foreground'>Entre para reservar e acompanhar as suas reservas.</p>
          </div>

          <div role='tablist' aria-label='Tipo de acesso' className='grid grid-cols-3 gap-1.5 rounded-full bg-muted p-1'>
            {AREAS.map((a) => (
              <button
                key={a.id}
                type='button'
                role='tab'
                aria-selected={area === a.id}
                onClick={() => { setArea(a.id); setMethod('email'); setOtpSent(false); if (a.id !== 'hospede') setMode('login'); }}
                className={cn('h-10 rounded-full text-sm font-semibold transition', area === a.id ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground')}
              >
                {a.label}
              </button>
            ))}
          </div>

          {recovering ? (
            <form onSubmit={saveNewPassword} className='mt-8 space-y-4'>
              <h1 className='font-display text-3xl font-extrabold tracking-tight'>Nova palavra-passe</h1>
              <label className='block text-sm font-medium'>Nova palavra-passe
                <input type='password' required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={field} autoComplete='new-password' />
              </label>
              <Button type='submit' className='h-12 w-full rounded-full text-base font-bold' disabled={busy}>{busy ? 'A guardar…' : 'Guardar palavra-passe'}</Button>
            </form>
          ) : (
            <>
              <h1 className='mt-8 font-display text-3xl font-extrabold tracking-tight'>{mode === 'register' ? 'Criar conta' : 'Entrar'}</h1>

              <button
                type='button'
                onClick={signInWithGoogle}
                disabled={busy}
                className='mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full border-2 bg-card px-4 text-[15px] font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
              >
                <GoogleGlyph />Continuar com Google
              </button>

              {isGuestArea && (
                <button
                  type='button'
                  onClick={() => { setMethod(method === 'phone' ? 'email' : 'phone'); setOtpSent(false); }}
                  disabled={busy}
                  className='mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-full border-2 bg-card px-4 text-[15px] font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <Smartphone className='size-5' />{method === 'phone' ? 'Usar e-mail e palavra-passe' : 'Continuar com telemóvel (+258)'}
                </button>
              )}

              <div className='my-5 flex items-center gap-3 text-xs text-muted-foreground'>
                <span className='h-px flex-1 bg-border' /><span>ou</span><span className='h-px flex-1 bg-border' />
              </div>

              {method === 'phone' && isGuestArea ? (
                otpSent ? (
                  <form onSubmit={verifyOtp} className='space-y-4'>
                    <label className='block text-sm font-medium'>Código recebido por SMS
                      <input required inputMode='numeric' autoComplete='one-time-code' maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value)} className={field} />
                    </label>
                    <Button type='submit' className='h-12 w-full rounded-full text-base font-bold' disabled={busy}>{busy ? 'A verificar…' : 'Confirmar código'}</Button>
                    <button type='button' onClick={() => { setOtpSent(false); setOtp(''); }} className='w-full text-sm text-primary underline'>Mudar o número</button>
                  </form>
                ) : (
                  <form onSubmit={sendOtp} className='space-y-4'>
                    <label className='block text-sm font-medium'>Telemóvel (+258)
                      <input type='tel' required inputMode='tel' autoComplete='tel' placeholder='84 123 4567' value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
                    </label>
                    <Button type='submit' className='h-12 w-full rounded-full text-base font-bold' disabled={busy}>{busy ? 'A enviar…' : 'Enviar código por SMS'}</Button>
                  </form>
                )
              ) : (
                <form onSubmit={submitEmail} className='space-y-4'>
                  {mode === 'register' && (
                    <label className='block text-sm font-medium'>Nome completo
                      <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} autoComplete='name' />
                    </label>
                  )}
                  <label className='block text-sm font-medium'>E-mail
                    <input type='email' required value={email} onChange={(e) => setEmail(e.target.value)} className={field} autoComplete='email' />
                  </label>
                  <label className='block text-sm font-medium'>Palavra-passe
                    <input type='password' required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={field} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  </label>
                  {mode === 'login' && (
                    <div className='text-right'>
                      <button type='button' onClick={forgotPassword} className='text-sm text-primary hover:underline'>Esqueci a palavra-passe</button>
                    </div>
                  )}
                  <Button type='submit' className='h-12 w-full rounded-full text-base font-bold' disabled={busy}>{busy ? 'A processar…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</Button>
                </form>
              )}

              {isGuestArea ? (
                <>
                  <button type='button' onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className='mt-5 w-full text-sm text-muted-foreground'>
                    {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}<span className='font-semibold text-primary'>{mode === 'login' ? 'Criar conta' : 'Entrar'}</span>
                  </button>
                  <Button type='button' variant='secondary' className='mt-4 h-12 w-full rounded-full font-bold text-primary' onClick={() => void navigate({ to: '/', search: {} })}>
                    Continuar como convidado
                  </Button>
                </>
              ) : (
                <p className='mt-6 text-sm text-muted-foreground'>Hotel e Administração: acesso só com conta autorizada. Depois de entrar, é levado ao painel certo.</p>
              )}

              <p className='mt-8 text-center text-xs text-muted-foreground'>Ao continuar, aceita os Termos e a Política de Privacidade.</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
