import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Crosshair, Terminal, Bot, FlaskConical, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Home', path: '/', icon: LayoutDashboard },
  { label: 'Learn', path: '/missions', icon: Crosshair },
  { label: 'Lab', path: '/lab', icon: Terminal },
  { label: 'Sandbox', path: '/sandbox', icon: FlaskConical },
  { label: 'AI', path: '/ai', icon: Bot },
  { label: 'Me', path: '/profile', icon: UserCircle },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-[hsl(220_16%_3.5%)]/95 backdrop-blur-sm px-1 py-2 safe-area-pb">
      {NAV.map((item) => {
        const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-colors min-w-[44px]',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
