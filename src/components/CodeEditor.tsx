import Editor, { OnMount } from '@monaco-editor/react';
import { EditorSettings, Language } from '@/types/visualizer';
import { useRef, useCallback } from 'react';

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
};

export function CodeEditor({ code, language, settings, highlightLine, onChange }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any[]>([]);

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
  }, []);

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
            linesDecorationsClassName: '',
            inlineClassName: '',
            glyphMarginClassName: '',
            overviewRuler: { color: '#4d9eff', position: 1 },
            minimap: { color: '#4d9eff', position: 1 },
            stickiness: 1,
            after: undefined,
            before: undefined,
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
    <div className="flex-1 overflow-hidden">
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
    </div>
  );
}
