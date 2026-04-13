import { useState, useCallback, useEffect, useRef } from 'react';
import { Language, ViewMode, EditorSettings, DEFAULT_SETTINGS, LANGUAGE_TEMPLATES, ExecutionStep } from '@/types/visualizer';
import { executeCode } from '@/engine';
import { LanguageSidebar } from '@/components/LanguageSidebar';
import { EditorToolbar } from '@/components/EditorToolbar';
import { CodeEditor } from '@/components/CodeEditor';
import { ControlBar } from '@/components/ControlBar';
import { VisualizationPanel } from '@/components/viz/VisualizationPanel';
import { ExplainPanel } from '@/components/ExplainPanel';
import { OutputPanel } from '@/components/OutputPanel';
import { Eye, Sparkles, Terminal } from 'lucide-react';

const Index = () => {
  const [language, setLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript);
  const [viewMode, setViewMode] = useState<ViewMode>('visualize');
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const playRef = useRef<ReturnType<typeof setInterval>>();

  // Auto-visualize on code change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const result = executeCode(code, language);
      setSteps(result);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [code, language]);

  // Auto-play
  useEffect(() => {
    if (playRef.current) clearInterval(playRef.current);
    if (isPlaying && steps.length > 0) {
      playRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, playSpeed, steps.length]);

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    setCode(LANGUAGE_TEMPLATES[lang]);
  }, []);

  const currentStep = steps[currentStepIndex] || null;

  const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'visualize', label: 'Visualize', icon: <Eye className="w-4 h-4" /> },
    { id: 'explain', label: 'Explain', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'output', label: 'Output', icon: <Terminal className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Language sidebar */}
      <LanguageSidebar language={language} onLanguageChange={handleLanguageChange} />

      {/* Editor panel */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-border" style={{ maxWidth: '50%' }}>
        <EditorToolbar settings={settings} onSettingsChange={setSettings} />
        <CodeEditor
          code={code}
          language={language}
          settings={settings}
          highlightLine={currentStep?.lineNumber}
          onChange={setCode}
        />
        {viewMode !== 'output' && (
          <ControlBar
            steps={steps}
            currentStepIndex={currentStepIndex}
            isPlaying={isPlaying}
            playSpeed={playSpeed}
            onBack={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
            onStep={() => setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onReset={() => { setCurrentStepIndex(0); setIsPlaying(false); }}
            onSpeedChange={setPlaySpeed}
            onSeek={setCurrentStepIndex}
          />
        )}
      </div>

      {/* Right panel */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Tab switcher */}
        <div className="flex items-center border-b border-border bg-card">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                viewMode === tab.id
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'visualize' && <VisualizationPanel step={currentStep} />}
          {viewMode === 'explain' && (
            <ExplainPanel step={currentStep} code={code} language={language} allSteps={steps} />
          )}
          {viewMode === 'output' && <OutputPanel code={code} language={language} />}
        </div>
      </div>
    </div>
  );
};

export default Index;
