import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { sendOtp, verifyOtpAndSetPassword, signInWithPassword, mapSupabaseUser } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImg from '@/assets/cyberninja-logo.png';

type Step = 'login' | 'register' | 'otp';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return toast.error('Enter email and password');
    setLoading(true);
    try {
      const user = await signInWithPassword(email, password);
      login(mapSupabaseUser(user));
      navigate('/');
    } catch (err: unknown) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) return toast.error('Enter your email');
    if (!username || username.length < 3) return toast.error('Username must be at least 3 characters');
    if (!password || password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await sendOtp(email);
      toast.success('Verification code sent to your email');
      setStep('otp');
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) return toast.error('Enter the 4-digit code');
    setLoading(true);
    try {
      const user = await verifyOtpAndSetPassword(email, otp, password, username);
      if (user) {
        login(mapSupabaseUser(user));
        navigate('/');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={logoImg} alt="CyberNinja" className="size-16 rounded-xl mb-4" />
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">CYBERNINJA</h1>
          <p className="text-sm text-muted-foreground mt-1">Master Ethical Hacking</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {step === 'login' && (
            <>
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-foreground">Sign In</h2>
                <p className="text-sm text-muted-foreground">Access your training dashboard</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button onClick={handleLogin} disabled={loading} className="w-full py-3 bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight className="size-4 ml-2" />}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                New recruit?{' '}
                <button onClick={() => setStep('register')} className="text-primary hover:underline font-medium">
                  Create Account
                </button>
              </p>
            </>
          )}

          {step === 'register' && (
            <>
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-foreground">Create Account</h2>
                <p className="text-sm text-muted-foreground">Choose your operator callsign</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username (callsign)"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    maxLength={20}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 characters)"
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button onClick={handleSendOtp} disabled={loading} className="w-full py-3 bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button onClick={() => setStep('login')} className="text-primary hover:underline font-medium">
                  Sign In
                </button>
              </p>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="text-center mb-2">
                <Shield className="size-10 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-bold text-foreground">Verify Email</h2>
                <p className="text-sm text-muted-foreground">Enter the 4-digit code sent to {email}</p>
              </div>

              <div className="flex justify-center">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  maxLength={4}
                  className="w-40 text-center text-2xl font-mono tracking-[0.5em] py-3 rounded-lg border border-border bg-secondary/50 text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                />
              </div>

              <Button onClick={handleVerifyOtp} disabled={loading} className="w-full py-3 bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </Button>

              <button onClick={() => setStep('register')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                ← Back
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Ethical hacking training platform. Always get authorization before testing.
        </p>
      </div>
    </div>
  );
}
