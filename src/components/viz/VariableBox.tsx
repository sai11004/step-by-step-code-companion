import { motion } from 'framer-motion';

interface VariableBoxProps {
  name: string;
  value: any;
  isChanged: boolean;
}

export function VariableBox({ name, value, isChanged }: VariableBoxProps) {
  const displayValue = value === null || value === undefined ? 'undefined'
    : typeof value === 'boolean' ? String(value)
    : typeof value === 'string' ? `"${value}"`
    : String(value);

  return (
    <motion.div
      key={`${name}-${displayValue}`}
      initial={isChanged ? { scale: 0.85, opacity: 0.7 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2 min-w-[56px] text-center transition-colors ${
        isChanged
          ? 'bg-viz-amber-bg border-viz-amber text-viz-amber animate-pulse-glow'
          : 'bg-viz-blue-bg border-viz-blue/40 text-viz-blue'
      }`}
    >
      <span className="text-[9px] opacity-70 font-mono uppercase tracking-wider">{name}</span>
      <span className="text-base font-semibold font-mono">{displayValue}</span>
    </motion.div>
  );
}
