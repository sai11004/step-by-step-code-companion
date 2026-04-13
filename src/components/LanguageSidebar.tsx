import { Language } from '@/types/visualizer';
import { Code2, Coffee, Cpu, FileCode2 } from 'lucide-react';

interface LanguageSidebarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const languages: { id: Language; label: string; icon: React.ReactNode }[] = [
  { id: 'javascript', label: 'JS', icon: <FileCode2 className="w-5 h-5" /> },
  { id: 'python', label: 'PY', icon: <Code2 className="w-5 h-5" /> },
  { id: 'java', label: 'JV', icon: <Coffee className="w-5 h-5" /> },
  { id: 'cpp', label: 'C++', icon: <Cpu className="w-5 h-5" /> },
];

export function LanguageSidebar({ language, onLanguageChange }: LanguageSidebarProps) {
  return (
    <div className="flex flex-col items-center w-14 bg-card border-r border-border py-3 gap-1">
      {languages.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onLanguageChange(lang.id)}
          className={`flex flex-col items-center justify-center w-11 h-12 rounded-md transition-all text-xs font-mono font-medium ${
            language === lang.id
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={lang.id}
        >
          {lang.icon}
          <span className="mt-0.5 text-[10px]">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
