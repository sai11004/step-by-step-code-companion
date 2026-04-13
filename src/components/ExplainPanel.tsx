import { useState, useRef, useEffect } from 'react';
import { ExecutionStep, Language } from '@/types/visualizer';
import { VisualizationPanel } from './viz/VisualizationPanel';
import { Loader2, Send, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ExplainPanelProps {
  step: ExecutionStep | null;
  code: string;
  language: Language;
  allSteps: ExecutionStep[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export function ExplainPanel({ step, code, language, allSteps }: ExplainPanelProps) {
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<number | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (!step || step.step === prevStepRef.current) return;
    prevStepRef.current = step.step;
    fetchExplanation();
  }, [step?.step]);

  const fetchExplanation = async () => {
    if (!step) return;
    setExplanation('');
    setIsExplaining(true);

    try {
      const response = await supabase.functions.invoke('explain-code', {
        body: { step, code, language },
      });

      if (response.data?.explanation) {
        // Simulate streaming effect
        const text = response.data.explanation;
        let i = 0;
        const interval = setInterval(() => {
          i += 3;
          setExplanation(text.slice(0, i));
          if (i >= text.length) {
            clearInterval(interval);
            setIsExplaining(false);
          }
        }, 15);
      } else {
        setExplanation('Could not generate explanation.');
        setIsExplaining(false);
      }
    } catch {
      setExplanation('Error fetching explanation.');
      setIsExplaining(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || isAnswering || !step) return;
    const q = question.trim();
    setQuestion('');
    setIsAnswering(true);
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);

    try {
      const response = await supabase.functions.invoke('explain-code', {
        body: {
          step, code, language,
          question: q,
          chatHistory: chatHistory.slice(-6),
          recentSteps: allSteps.slice(Math.max(0, step.step - 5), step.step),
        },
      });

      const answer = response.data?.explanation || 'Sorry, I could not answer that.';
      setChatHistory(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', text: 'Error getting answer.' }]);
    }
    setIsAnswering(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Visualization at top */}
      <div className="flex-1 overflow-y-auto min-h-0 border-b border-border">
        <VisualizationPanel step={step} />
      </div>

      {/* Explanation */}
      <div className="p-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-viz-amber" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step Explanation</span>
        </div>
        <div className="text-sm text-foreground/90 min-h-[40px]">
          {isExplaining && !explanation && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          )}
          {explanation}
          {isExplaining && explanation && <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />}
        </div>
      </div>

      {/* Chat Q&A */}
      <div className="flex flex-col max-h-[200px]">
        <div className="flex items-center gap-1.5 px-3 pt-2">
          <MessageCircle className="w-3.5 h-3.5 text-viz-purple" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ask about this step</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`text-xs rounded-md px-2.5 py-1.5 ${
              msg.role === 'user'
                ? 'bg-primary/10 text-primary ml-4'
                : 'bg-secondary text-foreground/80 mr-4'
            }`}>
              {msg.text}
            </div>
          ))}
          {isAnswering && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex items-center gap-2 px-3 pb-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
            placeholder="Why did this variable change?..."
            className="flex-1 bg-secondary border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isAnswering}
          />
          <button
            onClick={askQuestion}
            disabled={isAnswering || !question.trim()}
            className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
