import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { useStore } from './lib/store';
import { setOnUnauthorized } from './lib/api';
import Landing from './pages/Landing';
import AppLayout from './components/layout/AppLayout';
import OfflineBanner from './components/layout/OfflineBanner';

// Landing and the shell load eagerly (they're the first paint). Everything
// behind auth is split out so a first-time visitor doesn't download the
// planner, charting library and settings screens just to read the home page.
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Planner = lazy(() => import('./pages/Planner'));
const Projects = lazy(() => import('./pages/Projects'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Goals = lazy(() => import('./pages/Goals'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>
      <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!user?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initAuth, resetAuthState, authLoading } = useStore();
  // Distinguishes "haven't checked for a stored session yet" from "checked,
  // and there isn't one" — without this, ProtectedRoute would flash a
  // redirect to "/" on every reload before the token check resolves.
  const [bootChecking, setBootChecking] = useState(true);

  useEffect(() => {
    // A rejected token (expired, refresh also failed) means the session is
    // genuinely over — drop local state so the UI reflects signed-out rather
    // than getting stuck on a broken authenticated view.
    setOnUnauthorized(() => resetAuthState());
  }, [resetAuthState]);

  useEffect(() => {
    initAuth().finally(() => setBootChecking(false));
    // Intentionally run once on mount — login()/signup() update auth state
    // directly and don't need this effect to re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bootChecking || authLoading) {
    return <FullScreenLoader />;
  }

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen">
        {/* One instance, above the router, so it's visible regardless of
            which page — signed out on Landing, mid-onboarding, or in the
            authenticated shell — connectivity drops on. */}
        <OfflineBanner />
        <div className="flex-1 min-h-0">
          <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/planner"      element={<Planner />} />
              <Route path="/projects"     element={<Projects />} />
              <Route path="/tasks"        element={<Tasks />} />
              <Route path="/goals"        element={<Goals />} />
              <Route path="/analytics"    element={<Analytics />} />
              <Route path="/leaderboard"  element={<Leaderboard />} />
              <Route path="/settings"     element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  );
}
