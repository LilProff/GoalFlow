import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import RynaChat from '../ryna/RynaChat';
import { useStore } from '../../lib/store';

export default function AppLayout() {
  const { chatOpen } = useStore();
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <Outlet />
      </main>
      {chatOpen && <RynaChat />}
    </div>
  );
}
