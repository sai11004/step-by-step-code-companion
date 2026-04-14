import Editor, { OnMount } from '@monaco-editor/react';
import { EditorSettings, Language } from '@/types/visualizer';
import { useRef, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  language: Language;
  settings: EditorSettings;
  highlightLine?: number;
  onChange: (value: string) => void;
}

const LANG_MAP: Record<Language, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
};

export function CodeEditor({ code, language, settings, highlightLine, onChange }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any[]>([]);
  const [askPopup, setAskPopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const [askAnswer, setAskAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('vizDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
        { token: 'keyword', foreground: '4d9eff' },
        { token: 'string', foreground: '3ddc84' },
        { token: 'number', foreground: 'f5a623' },
        { token: 'type', foreground: 'a78bfa' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#1a2a4a44',
        'editor.selectionBackground': '#264f7844',
        'editorGutter.background': '#0d1117',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#e6edf3',
        'editor.inactiveSelectionBackground': '#264f7822',
        'editorCursor.foreground': '#4d9eff',
        'minimap.background': '#0d1117',
      },
    });
    monaco.editor.setTheme('vizDark');

    // Listen for selection changes to show ASK button
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        setAskPopup(null);
        return;
      }
      const selectedText = editor.getModel()?.getValueInRange(selection);
      if (!selectedText || selectedText.trim().length < 3) {
        setAskPopup(null);
        return;
      }
      // Get position for popup
      const pos = editor.getScrolledVisiblePosition(selection.getEndPosition());
      if (pos && containerRef.current) {
        setAskPopup({
          text: selectedText.trim(),
          x: Math.min(pos.left + 40, containerRef.current.clientWidth - 160),
          y: pos.top + pos.height + 4,
        });
        setAskAnswer('');
      }
    });
  }, []);

  const handleAsk = async () => {
    if (!askPopup || isAsking) return;
    setIsAsking(true);
    setAskAnswer('');
    try {
      const response = await supabase.functions.invoke('explain-code', {
        body: {
          step: { step: 0, lineNumber: 0, lineCode: askPopup.text, memory: { variables: {}, arrays: {} }, callStack: [], loops: [], changedVariables: [], conditionResult: null, swapAnimation: null, compareIndices: null, doneIndices: [], returnValue: null, output: [] },
          code,
          language,
          question: `Explain this selected code snippet in simple terms: ${askPopup.text}`,
          chatHistory: [],
        },
      });
      setAskAnswer(response.data?.explanation || 'Could not explain.');
    } catch {
      setAskAnswer('Error getting explanation.');
    }
    setIsAsking(false);
  };

  // Highlight current line
  if (editorRef.current && highlightLine) {
    const editor = editorRef.current;
    const monaco = (window as any).monaco;
    if (monaco) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monaco.Range(highlightLine, 1, highlightLine, 1),
          options: {
            isWholeLine: true,
            className: '',
            overviewRuler: { color: '#4d9eff', position: 1 },
            minimap: { color: '#4d9eff', position: 1 },
            stickiness: 1,
          },
        },
        {
          range: new monaco.Range(highlightLine, 1, highlightLine, 1),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: 'active-line-decoration',
          },
        },
      ]);
      editor.revealLineInCenterIfOutsideViewport(highlightLine);
    }
  }

  return (
    <div className="flex-1 overflow-hidden relative" ref={containerRef}>
      <style>{`
        .active-line-decoration {
          background: rgba(77, 158, 255, 0.12) !important;
          border-left: 3px solid #4d9eff !important;
          margin-left: 3px;
        }
      `}</style>
      <Editor
        height="100%"
        language={LANG_MAP[language]}
        value={code}
        onChange={(v) => onChange(v || '')}
        onMount={handleMount}
        theme="vizDark"
        options={{
          fontSize: settings.fontSize,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap ? 'on' : 'off',
          minimap: { enabled: settings.minimap },
          scrollBeyondLastLine: false,
          padding: { top: 8, bottom: 8 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          automaticLayout: true,
          fontFamily: 'JetBrains Mono, monospace',
          fontLigatures: true,
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
        }}
      />

      {/* ASK floating button */}
      {askPopup && !askAnswer && (
        <button
          onClick={handleAsk}
          disabled={isAsking}
          className="absolute z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-viz-purple text-white text-xs font-medium shadow-lg hover:bg-viz-purple/90 transition-colors disabled:opacity-50"
          style={{ left: askPopup.x, top: askPopup.y }}
        >
          {isAsking ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
          ASK
        </button>
      )}

      {/* ASK answer popup */}
      {askPopup && askAnswer && (
        <div
          className="absolute z-50 max-w-xs rounded-lg border border-viz-purple/40 bg-card shadow-xl p-3 text-xs text-foreground/90"
          style={{ left: askPopup.x, top: askPopup.y }}
        >
          <div className="flex items-center gap-1.5 mb-1.5 text-viz-purple font-semibold">
            <MessageCircle className="w-3 h-3" />
            Explanation
          </div>
          <p className="leading-relaxed">{askAnswer}</p>
          <button
            onClick={() => { setAskPopup(null); setAskAnswer(''); }}
            className="mt-2 text-muted-foreground hover:text-foreground text-[10px]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
