import { EditorSettings } from '@/types/visualizer';
import { Settings, WrapText, Map } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditorToolbarProps {
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

export function EditorToolbar({ settings, onSettingsChange }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-card border-b border-border text-xs">
      <div className="flex items-center gap-1.5">
        <Settings className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Font:</span>
        <Select
          value={String(settings.fontSize)}
          onValueChange={(v) => onSettingsChange({ ...settings, fontSize: Number(v) })}
        >
          <SelectTrigger className="h-6 w-16 text-xs bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[12, 13, 14, 15, 16, 18, 20].map((s) => (
              <SelectItem key={s} value={String(s)}>{s}px</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Tab:</span>
        <Select
          value={String(settings.tabSize)}
          onValueChange={(v) => onSettingsChange({ ...settings, tabSize: Number(v) })}
        >
          <SelectTrigger className="h-6 w-14 text-xs bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2, 4, 8].map((s) => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        onClick={() => onSettingsChange({ ...settings, wordWrap: !settings.wordWrap })}
        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
          settings.wordWrap ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Word Wrap"
      >
        <WrapText className="w-3.5 h-3.5" />
        <span>Wrap</span>
      </button>

      <button
        onClick={() => onSettingsChange({ ...settings, minimap: !settings.minimap })}
        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
          settings.minimap ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Minimap"
      >
        <Map className="w-3.5 h-3.5" />
        <span>Minimap</span>
      </button>
    </div>
  );
}
