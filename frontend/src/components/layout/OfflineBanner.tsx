import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../lib/useOnlineStatus';

/**
 * A thin, unmissable bar rather than a toast — connectivity loss isn't a
 * one-off event to acknowledge and dismiss, it's a state the user should
 * stay aware of for as long as it's true (a toggled task or a saved goal
 * silently not reaching the server is the actual failure mode this warns
 * against).
 */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          className="shrink-0 flex items-center justify-center gap-2 py-1.5 overflow-hidden"
          style={{ background: '#3a2a10', color: '#f5c842', paddingTop: 'env(safe-area-inset-top)' }}>
          <WifiOff className="w-3 h-3 shrink-0" />
          <span className="mono text-[9px] tracking-widest font-bold">
            OFFLINE — CHANGES WON'T SAVE UNTIL YOU'RE BACK ONLINE
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
