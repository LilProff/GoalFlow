import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { useStore } from './lib/store';
import { setClerkGetToken, setOnUnauthorized } from './lib/api';
import Landing from './pages/Landing';
import AppLayout from './components/layout/AppLayout';

// Landing and the shell load eagerly (they're the first paint). Everything
// behind auth is split out so a first-time visitor doesn't download the
// planner, charting library and settings screens just to read the home page.
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Planner = lazy(() => import('./pages/Planner'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Goals = lazy(() => import('./pages/Goals'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>
      <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useStore();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }
  
  if (!isSignedIn) return <Navigate to="/" replace />;
  if (!user?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }
  
  if (!isSignedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initAuth, setUserFromClerk, resetAuthState, authLoading } = useStore();
  const { isLoaded, isSignedIn, getToken, userId, signOut } = useAuth();
  const { user: clerkUser } = useUser();

  // Wire Clerk's getToken to API
  useEffect(() => {
    setClerkGetToken(getToken);
  }, [getToken]);

  // If the API ever rejects our token, the session is genuinely gone (Clerk
  // refreshes tokens transparently otherwise) — clear Clerk's client state so
  // the user lands back on the marketing page instead of a broken dashboard.
  useEffect(() => {
    setOnUnauthorized(() => { void signOut(); });
  }, [signOut]);

  // Handle Clerk auth state changes
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      // initAuth() resolves false when the backend has no profile for this
      // Clerk user yet — that's a first-time signup, so create one. Clerk is
      // the only place the real email/name exist, so pass them through;
      // sending blanks here created profiles with empty names and emails.
      initAuth().then(loaded => {
        if (loaded) return;
        const email = clerkUser?.primaryEmailAddress?.emailAddress ?? '';
        const name = clerkUser?.fullName ?? clerkUser?.firstName ?? '';
        return setUserFromClerk(userId, email, name).catch(err => {
          console.error('Failed to sync clerk user:', err);
        });
      });
    } else {
      // Signed out — reset locally. Calling initAuth() here fired a
      // guaranteed-to-fail /auth/verify on every visit to the marketing page.
      resetAuthState();
    }
  }, [isLoaded, isSignedIn, userId, clerkUser]);

  if (!isLoaded || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/planner"      element={<Planner />} />
          <Route path="/tasks"        element={<Tasks />} />
          <Route path="/goals"        element={<Goals />} />
          <Route path="/analytics"    element={<Analytics />} />
          <Route path="/leaderboard"  element={<Leaderboard />} />
          <Route path="/settings"     element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}