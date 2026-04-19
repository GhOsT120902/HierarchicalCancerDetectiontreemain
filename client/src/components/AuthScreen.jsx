import { useState, useEffect, useRef } from 'react';
import { Activity, Mail, Lock, KeyRound, UserPlus, LogIn, Check } from 'lucide-react';

export default function AuthScreen({ onLogin }) {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const googleBtnRef = useRef(null);

  useEffect(() => {
    let scriptEl = null;

    async function initGoogle() {
      try {
        const res = await fetch('/api/auth/google-client-id');
        const data = await res.json();
        if (!data.ok || !data.client_id) return;
        const clientId = data.client_id;

        scriptEl = document.createElement('script');
        scriptEl.src = 'https://accounts.google.com/gsi/client';
        scriptEl.async = true;
        scriptEl.defer = true;
        scriptEl.onload = () => {
          if (!window.google?.accounts) return;
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredential,
          });
          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'filled_black',
              size: 'large',
              shape: 'rectangular',
              width: 360,
              text: 'signin_with',
            });
          }
        };
        document.head.appendChild(scriptEl);
      } catch (_) {
      }
    }

    async function handleGoogleCredential(response) {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: response.credential }),
        });
        const data = await res.json();
        if (data.ok) {
          onLogin(data.email || '', data.user_id || '');
        } else {
          setError(data.error || 'Google sign-in failed.');
        }
      } catch (_) {
        setError('Could not reach the server. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    initGoogle();

    return () => {
      if (scriptEl && document.head.contains(scriptEl)) {
        document.head.removeChild(scriptEl);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (view === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.ok) {
          onLogin(email, data.user_id || '');
        } else {
          setError(data.error || 'Invalid email or password.');
        }
      } else if (view === 'register') {
        if (password !== confirm) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.ok) {
          setMessage('Account created! Please sign in.');
          setView('login');
          setPassword('');
        } else {
          setError(data.error || 'Registration failed.');
        }
      } else if (view === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.ok) {
          setMessage('Reset code sent — check your inbox.');
          setView('reset');
        } else {
          setError(data.error || 'Failed to send reset code.');
        }
      } else if (view === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, new_password: password })
        });
        const data = await res.json();
        if (data.ok) {
          setMessage('Password reset successfully! Please sign in.');
          setView('login');
          setPassword('');
          setCode('');
        } else {
          setError(data.error || 'Reset failed. Check your code and try again.');
        }
      }
    } catch (err) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-cyan-500/10 text-cyan-500 rounded-xl flex items-center justify-center mb-4">
            <Activity size={28} />
          </div>
          <h1 className="text-2xl font-bold">MedAI Clinical Support</h1>
          <p className="text-[var(--text-muted)] text-sm mt-2 text-center">
            Precision cancer imaging classification system
          </p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-4 text-sm">{error}</div>}
        {message && <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-md mb-4 text-sm">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input
                type="email"
                required
                className="input-field pl-10"
                placeholder="doctor@hospital.org"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          {view !== 'forgot' && (
            <div className="space-y-1">
              <label className="text-sm font-medium">{view === 'reset' ? 'New Password' : 'Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="password"
                  required
                  className="input-field pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          {view === 'register' && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Check className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="password"
                  required
                  className="input-field pl-10"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>
            </div>
          )}

          {view === 'reset' && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Reset Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input
                  type="text"
                  required
                  className="input-field pl-10"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-6 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Processing...' : (
              <>
                {view === 'login' && <LogIn size={18} />}
                {view === 'register' && <UserPlus size={18} />}
                {view === 'forgot' && <KeyRound size={18} />}
                {view === 'reset' && <Check size={18} />}
                {view === 'login' ? 'Sign In' : view === 'register' ? 'Create Account' : view === 'forgot' ? 'Send Reset Code' : 'Set New Password'}
              </>
            )}
          </button>
        </form>

        {view === 'login' && (
          <div className="mt-4">
            <div className="relative flex items-center my-4">
              <div className="flex-1 border-t" style={{ borderColor: 'var(--border-color)' }}></div>
              <span className="px-3 text-xs text-[var(--text-muted)]">or</span>
              <div className="flex-1 border-t" style={{ borderColor: 'var(--border-color)' }}></div>
            </div>
            <div ref={googleBtnRef} className="flex justify-center min-h-[44px]">
              <span className="text-xs text-[var(--text-muted)] self-center">Loading Google Sign-In…</span>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-[var(--text-muted)]">
          {view === 'login' ? (
            <>
              <button onClick={() => setView('forgot')} className="text-cyan-500 hover:underline mr-4">Forgot Password?</button>
              <button onClick={() => setView('register')} className="text-cyan-500 hover:underline">Create Account</button>
            </>
          ) : (
            <button onClick={() => { setView('login'); setError(''); setMessage(''); }} className="text-cyan-500 hover:underline">
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
