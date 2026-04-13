import { motion } from 'framer-motion';

interface ArraySectionProps {
  arrays: Record<string, any[]>;
  compareIndices: [number, number] | null;
  swapAnimation: [number, number] | null;
  doneIndices: number[];
}

export function ArraySection({ arrays, compareIndices, swapAnimation, doneIndices }: ArraySectionProps) {
  return (
    <div className="space-y-3">
      {Object.entries(arrays).map(([name, arr]) => (
        <div key={name}>
          <span className="text-xs font-mono text-muted-foreground mb-1.5 block">
            {name} <span className="text-viz-blue/50">[{arr.length}]</span>
          </span>
          <div className="flex gap-0">
            {arr.map((value, index) => {
              const isSwapping = swapAnimation && swapAnimation.includes(index);
              const isComparing = compareIndices && compareIndices.includes(index);
              const isDone = doneIndices.includes(index);

              let bgClass = 'bg-secondary border-border text-foreground';
              if (isDone) bgClass = 'bg-viz-green-bg border-viz-green text-viz-green';
              else if (isSwapping) bgClass = 'bg-viz-amber-bg border-viz-amber text-viz-amber';
              else if (isComparing) bgClass = 'bg-viz-blue-bg border-viz-blue text-viz-blue';

              return (
                <motion.div
                  key={`${name}-${index}`}
                  className="flex flex-col items-center"
                  animate={isSwapping ? { y: [0, -8, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <div className={`w-12 h-11 flex items-center justify-center border font-mono text-sm font-semibold ${bgClass} ${index === 0 ? 'rounded-l-md' : ''} ${index === arr.length - 1 ? 'rounded-r-md' : ''}`}>
                    {value}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 font-mono">{index}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
