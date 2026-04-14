interface LoopTrackerProps {
  loops: {
    label: string;
    iterations: { value: string; status: 'done' | 'active' | 'pending' }[];
  }[];
}

export function LoopTracker({ loops }: LoopTrackerProps) {
  if (loops.length === 0) return null;

  return (
    <div className="space-y-2">
      {loops.map((loop, i) => (
        <div key={`${loop.label}-${i}`} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground min-w-[80px] truncate" title={loop.label}>
            {loop.label}
          </span>
          <div className="flex gap-1 items-center">
            {loop.iterations.map((iter, j) => (
              <div
                key={j}
                title={iter.value}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  iter.status === 'done'
                    ? 'bg-viz-green'
                    : iter.status === 'active'
                    ? 'bg-viz-amber animate-pulse'
                    : 'bg-border'
                }`}
              />
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground/60 font-mono">
            {loops[i].iterations.filter(it => it.status === 'done').length}/{loops[i].iterations.length}
          </span>
        </div>
      ))}
    </div>
  );
}
