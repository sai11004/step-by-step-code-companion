import { useState, useRef, useEffect } from 'react';
import { Language } from '@/types/visualizer';
import { Play, Loader2, Terminal, AlertTriangle, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OutputPanelProps {
  code: string;
  language: Language;
}

interface OutputLine {
  type: 'stdout' | 'stderr' | 'input' | 'system';
  text: string;
}

export function OutputPanel({ code, language }: OutputPanelProps) {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [waitingInput, setWaitingInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [stdinBuffer, setStdinBuffer] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, waitingInput]);

  useEffect(() => {
    if (waitingInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingInput]);

  const run = async () => {
    setIsRunning(true);
    setLines([]);
    setExecTime(null);
    setWaitingInput(false);
    setStdinBuffer([]);
    const start = performance.now();

    try {
      if (language === 'javascript') {
        // Sandboxed JS execution
        const logs: OutputLine[] = [];
        const fakeConsole = {
          log: (...args: any[]) => logs.push({ type: 'stdout', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }),
          error: (...args: any[]) => logs.push({ type: 'stderr', text: args.join(' ') }),
          warn: (...args: any[]) => logs.push({ type: 'stderr', text: 'Warning: ' + args.join(' ') }),
        };
        try {
          const fn = new Function('console', code);
          fn(fakeConsole);
          setLines(logs.length > 0 ? logs : [{ type: 'system', text: 'Program finished (no output).' }]);
        } catch (e: any) {
          setLines([...logs, { type: 'stderr', text: e.message }]);
        }
      } else {
        // Use edge function for Python/Java/C++/C
        setLines([{ type: 'system', text: `Compiling & running ${language}...` }]);
        
        const allStdin = stdinBuffer.join('\n');
        const { data, error: fnError } = await supabase.functions.invoke('run-code', {
          body: { code, language, stdin: allStdin },
        });

        if (fnError) {
          setLines(prev => [...prev.filter(l => l.type !== 'system'), { type: 'stderr', text: fnError.message }]);
        } else if (data?.error) {
          const outputLines: OutputLine[] = [];
          if (data.output) outputLines.push({ type: 'stdout', text: data.output });
          outputLines.push({ type: 'stderr', text: data.error });
          setLines(outputLines);
        } else {
          const outputLines: OutputLine[] = [];
          if (data?.output) outputLines.push({ type: 'stdout', text: data.output });
          if (data?.stderr) outputLines.push({ type: 'stderr', text: data.stderr });
          if (outputLines.length === 0) outputLines.push({ type: 'system', text: 'Program finished (no output).' });
          setLines(outputLines);
        }
      }
    } catch (e: any) {
      setLines([{ type: 'stderr', text: e.message }]);
    }

    setExecTime(performance.now() - start);
    setIsRunning(false);
  };

  const submitInput = () => {
    if (!inputValue && !waitingInput) return;
    setStdinBuffer(prev => [...prev, inputValue]);
    setLines(prev => [...prev, { type: 'input', text: `> ${inputValue}` }]);
    setInputValue('');
    setWaitingInput(false);
  };

  const hasOutput = lines.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Terminal className="w-4 h-4" />
          <span>Terminal</span>
          {execTime !== null && (
            <span className="text-xs text-muted-foreground/60 font-mono">
              {execTime < 1000 ? `${Math.round(execTime)}ms` : `${(execTime / 1000).toFixed(2)}s`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isRunning && (
            <button
              onClick={() => setIsRunning(false)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-viz-red/20 text-viz-red text-xs font-medium hover:bg-viz-red/30 transition-colors"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}
          <button
            onClick={run}
            disabled={isRunning || !code.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-background">
        {lines.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap ${
            line.type === 'stderr' ? 'text-viz-red' :
            line.type === 'input' ? 'text-viz-amber' :
            line.type === 'system' ? 'text-muted-foreground italic' :
            'text-foreground/90'
          }`}>
            {line.type === 'stderr' && <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />}
            {line.text}
          </div>
        ))}
        {!hasOutput && !isRunning && (
          <p className="text-muted-foreground/50 text-center mt-8">Click "Run" to execute your code</p>
        )}
        {isRunning && lines.length <= 1 && (
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Running...
          </div>
        )}
      </div>

      {/* Inline input bar — always visible when running or after prompt */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card">
        <span className="text-xs text-muted-foreground font-mono">stdin:</span>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitInput()}
          placeholder="Type input here..."
          className="flex-1 bg-secondary border border-border rounded-md px-2.5 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={submitInput}
          className="px-2.5 py-1 rounded-md bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
