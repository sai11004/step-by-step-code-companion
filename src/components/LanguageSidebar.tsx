import { Language } from '@/types/visualizer';

interface LanguageSidebarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const languages: { id: Language; label: string; emoji: string }[] = [
  { id: 'javascript', label: 'JS', emoji: '🌐' },
  { id: 'python', label: 'PY', emoji: '🐍' },
  { id: 'java', label: 'JV', emoji: '☕' },
  { id: 'cpp', label: 'C++', emoji: '💻' },
  { id: 'c', label: 'C', emoji: '⚙️' },
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
          <span className="text-base leading-none">{lang.emoji}</span>
          <span className="mt-0.5 text-[10px]">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
