interface CallStackProps {
  callStack: { name: string; params: Record<string, any> }[];
}

export function CallStack({ callStack }: CallStackProps) {
  if (callStack.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {callStack.map((frame, i) => (
        <div
          key={`${frame.name}-${i}`}
          className={`rounded-md border px-3 py-2 text-xs font-mono ${
            i === 0
              ? 'bg-viz-purple-bg border-viz-purple/40 text-viz-purple'
              : 'bg-secondary border-border text-muted-foreground'
          }`}
        >
          <span className="font-semibold">{frame.name}</span>
          {Object.keys(frame.params).length > 0 && (
            <span className="ml-2 opacity-70">
              {Object.entries(frame.params).map(([k, v]) => `${k}=${v}`).join(', ')}
            </span>
          )}
          {i === 0 && <span className="ml-2 text-viz-purple/60">← active</span>}
        </div>
      ))}
    </div>
  );
}
