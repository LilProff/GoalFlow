/**
 * The GoalFlow mark — a single shared component so every header/nav/footer
 * usage points at one asset instead of six copies of an inline SVG that
 * would all need updating in lockstep whenever the brand mark changes.
 */
export default function Logo({ className = 'w-5 h-5' }: { className?: string }) {
  return <img src="/logo-mark.png" alt="GoalFlow" className={`${className} object-contain shrink-0`} />;
}
