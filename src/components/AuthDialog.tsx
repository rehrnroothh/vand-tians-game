import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { signUpWithEmail, signInWithEmail, signOut, onAuthChange, getMyProfile, getMyStats } from '@/lib/socialService';
import { Loader2, LogOut, Trophy, X as XIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ display_name: string } | null>(null);
  const [stats, setStats] = useState<{ wins: number; losses: number; total: number } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    const { data: { subscription } } = onAuthChange((id) => setUserId(id));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId && open) {
      getMyProfile().then(setProfile);
      getMyStats().then(setStats);
    }
  }, [userId, open]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName || email.split('@')[0]);
        setError('Kolla din e-post för verifieringslänk!');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e: any) {
      setError(e.message ?? 'Något gick fel');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setProfile(null);
    setStats(null);
  };

  // Logged in view
  if (userId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-foreground">Mitt konto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inloggad som <span className="text-foreground font-medium">{profile?.display_name || '...'}</span>
            </p>
            {stats && (
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{stats.wins}</p>
                  <p className="text-xs text-muted-foreground">Vinster</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Spelade</p>
                </div>
              </div>
            )}
            <Button variant="secondary" className="w-full" onClick={handleSignOut}>
              <LogOut size={16} /> Logga ut
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Login / Signup form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-foreground">{mode === 'login' ? 'Logga in' : 'Skapa konto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Visningsnamn"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && <p className="text-xs text-center text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleSubmit} disabled={loading || !email || !password}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? 'Logga in' : 'Skapa konto'}
          </Button>
          <button
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
          >
            {mode === 'login' ? 'Har inget konto? Skapa ett' : 'Har redan konto? Logga in'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
