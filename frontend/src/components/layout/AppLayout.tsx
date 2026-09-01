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
      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
      {chatOpen && <RynaChat />}
    </div>
  );
}
