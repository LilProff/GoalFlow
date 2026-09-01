import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import RynaChat from '../ryna/RynaChat';
import { useStore } from '../../lib/store';

export default function AppLayout() {
  const { chatOpen } = useStore();
  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Full sidebar on desktop; a fixed bottom tab bar (MobileNav) takes
          over below the md breakpoint instead — a 220px side rail has no
          room on a phone screen. */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      {/* The nav is now a floating pill (not a docked bar), so content needs
          enough clearance below it rather than exactly its height. */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
      {chatOpen && <RynaChat />}
    </div>
  );
}
