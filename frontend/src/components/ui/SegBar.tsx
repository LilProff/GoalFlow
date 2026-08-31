// Segmented progress bar
interface SegBarProps {
  value: number; // 0-100
  color?: string;
  segments?: number;
  height?: number;
}

export default function SegBar({ value, color = 'var(--acid)', segments = 20, height = 4 }: SegBarProps) {
  const filled = Math.round((value / 100) * segments);
  return (
    <div className="flex gap-0.5" style={{ height }}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] transition-all duration-300"
          style={{
            background: i < filled ? color : 'var(--border-mid)',
            opacity: i < filled ? (0.5 + (i / segments) * 0.5) : 1,
          }}
        />
      ))}
    </div>
  );
}
