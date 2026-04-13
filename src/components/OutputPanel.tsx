import { useState, useRef } from 'react';
import { Language } from '@/types/visualizer';
import { Play, Loader2, Terminal, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OutputPanelProps {
  code: string;
  language: Language;
}

export function OutputPanel({ code, language }: OutputPanelProps) {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);

  const run = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');
    setExecTime(null);
    const start = performance.now();

    try {
      if (language === 'javascript') {
        // Sandboxed JS execution
        const logs: string[] = [];
        const fakeConsole = {
          log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          error: (...args: any[]) => logs.push('Error: ' + args.join(' ')),
          warn: (...args: any[]) => logs.push('Warning: ' + args.join(' ')),
        };
        try {
          const fn = new Function('console', code);
          fn(fakeConsole);
          setOutput(logs.join('\n'));
        } catch (e: any) {
          setError(e.message);
        }
      } else {
        // Use edge function for Python/Java/C++
        const { data, error: fnError } = await supabase.functions.invoke('run-code', {
          body: { code, language },
        });

        if (fnError) {
          setError(fnError.message);
        } else if (data?.error) {
          setError(data.error);
        } else {
          setOutput(data?.output || '');
          if (data?.stderr) setError(data.stderr);
        }
      }
    } catch (e: any) {
      setError(e.message);
    }

    setExecTime(performance.now() - start);
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Terminal className="w-4 h-4" />
          <span>Output</span>
          {execTime !== null && (
            <span className="text-xs text-muted-foreground/60 font-mono">
              {execTime < 1000 ? `${Math.round(execTime)}ms` : `${(execTime / 1000).toFixed(2)}s`}
            </span>
          )}
        </div>
        <button
          onClick={run}
          disabled={isRunning || !code.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {output && (
          <pre className="text-foreground/90 whitespace-pre-wrap">{output}</pre>
        )}
        {error && (
          <div className="flex items-start gap-2 text-viz-red">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        )}
        {!output && !error && !isRunning && (
          <p className="text-muted-foreground/50 text-center mt-8">Click "Run" to execute your code</p>
        )}
        {isRunning && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Running...
          </div>
        )}
      </div>
    </div>
  );
}
