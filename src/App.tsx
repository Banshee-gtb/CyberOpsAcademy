import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthContext, useAuthProvider } from '@/hooks/useAuth';
import { useAuth } from '@/hooks/useAuth';

const LoginPage = lazy(() => import('@/pages/Login'));
const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const MissionsPage = lazy(() => import('@/pages/Missions'));
const LabPage = lazy(() => import('@/pages/Lab'));
const LeaderboardPage = lazy(() => import('@/pages/Leaderboard'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const AiMentorPage = lazy(() => import('@/pages/AiMentor'));

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="font-mono text-xs text-muted-foreground tracking-wider">INITIALIZING...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const auth = useAuthProvider();

  return (
    <AuthContext.Provider value={auth}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/missions" element={<MissionsPage />} />
            <Route path="/lab/:missionId?" element={<LabPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/ai" element={<AiMentorPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster position="top-right" />
    </AuthContext.Provider>
  );
}
