import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Crosshair, Terminal, Trophy, UserCircle, Bot, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';
import logoImg from '@/assets/cyberninja-logo.png';

const NAV = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Learning Path', path: '/missions', icon: Crosshair },
  { label: 'Training Lab', path: '/lab', icon: Terminal },
  { label: 'AI Mentor', path: '/ai', icon: Bot },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { label: 'Profile', path: '/profile', icon: UserCircle },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-[hsl(220_16%_3.5%)] shrink-0">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <img src={logoImg} alt="CyberNinja" className="size-8 rounded-lg" />
        <span className="text-base font-extrabold text-foreground tracking-tight">CYBERNINJA</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <item.icon className="size-[18px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="mx-3 mb-3 rounded-lg border border-border bg-card/50 p-3">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="size-9 rounded-full object-cover" />
            ) : (
              <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 mt-3 w-full px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
