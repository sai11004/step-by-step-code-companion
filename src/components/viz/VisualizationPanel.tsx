import { ExecutionStep } from '@/types/visualizer';
import { VariableBox } from './VariableBox';
import { ArraySection } from './ArraySection';
import { CallStack } from './CallStack';
import { CheckCircle, XCircle, CornerDownLeft, Terminal } from 'lucide-react';

interface VisualizationPanelProps {
  step: ExecutionStep | null;
}

export function VisualizationPanel({ step }: VisualizationPanelProps) {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <Terminal className="w-10 h-10 opacity-30" />
        <p className="text-sm">Write some code and it will be visualized here</p>
        <p className="text-xs opacity-50">Step through to see variables, arrays, and call stack</p>
      </div>
    );
  }

  if (step.error) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-destructive/40 bg-viz-red-bg p-4 text-sm text-viz-red font-mono">
          {step.error}
        </div>
      </div>
    );
  }

  const hasVars = Object.keys(step.memory.variables).length > 0;
  const hasArrays = Object.keys(step.memory.arrays).length > 0;
  const hasStack = step.callStack.length > 1;

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full animate-fade-in">
      {/* Current line */}
      <div className="rounded-md bg-secondary/50 border border-border px-3 py-2">
        <span className="text-[10px] text-muted-foreground font-mono">Line {step.lineNumber}</span>
        <p className="text-sm font-mono text-foreground">{step.lineCode}</p>
      </div>

      {/* Condition result */}
      {step.conditionResult !== null && (
        <div className={`flex items-center gap-2 text-sm font-medium rounded-md px-3 py-2 border ${
          step.conditionResult
            ? 'bg-viz-green-bg border-viz-green/40 text-viz-green'
            : 'bg-viz-red-bg border-viz-red/40 text-viz-red'
        }`}>
          {step.conditionResult
            ? <><CheckCircle className="w-4 h-4" /> Condition is TRUE</>
            : <><XCircle className="w-4 h-4" /> Condition is FALSE</>
          }
        </div>
      )}

      {/* Variables */}
      {hasVars && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Variables</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(step.memory.variables).map(([name, value]) => (
              <VariableBox
                key={name}
                name={name}
                value={value}
                isChanged={step.changedVariables.includes(name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Arrays */}
      {hasArrays && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Arrays</h3>
          <ArraySection
            arrays={step.memory.arrays}
            compareIndices={step.compareIndices}
            swapAnimation={step.swapAnimation}
            doneIndices={step.doneIndices}
          />
        </div>
      )}

      {/* Call Stack */}
      {hasStack && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Call Stack</h3>
          <CallStack callStack={step.callStack} />
        </div>
      )}

      {/* Return value */}
      {step.returnValue !== null && (
        <div className="flex items-center gap-2 text-sm rounded-md bg-viz-green-bg border border-viz-green/40 px-3 py-2 text-viz-green font-mono">
          <CornerDownLeft className="w-4 h-4" />
          return {JSON.stringify(step.returnValue)}
        </div>
      )}

      {/* Console output */}
      {step.output.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Console Output</h3>
          <div className="rounded-md bg-background border border-border p-3 font-mono text-xs text-foreground/80 space-y-0.5">
            {step.output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
