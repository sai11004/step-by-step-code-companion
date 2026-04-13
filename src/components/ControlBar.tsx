import { ExecutionStep } from '@/types/visualizer';
import { SkipBack, StepForward, Play, Pause, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ControlBarProps {
  steps: ExecutionStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  playSpeed: number;
  onBack: () => void;
  onStep: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
}

export function ControlBar({
  steps, currentStepIndex, isPlaying, playSpeed,
  onBack, onStep, onTogglePlay, onReset, onSpeedChange, onSeek,
}: ControlBarProps) {
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border-t border-border">
      <button onClick={onBack} disabled={currentStepIndex <= 0}
        className="p-1.5 rounded hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors">
        <SkipBack className="w-4 h-4" />
      </button>

      <button onClick={onStep} disabled={currentStepIndex >= steps.length - 1}
        className="p-1.5 rounded hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors">
        <StepForward className="w-4 h-4" />
      </button>

      <button onClick={onTogglePlay} disabled={steps.length === 0}
        className="p-1.5 rounded hover:bg-accent disabled:opacity-30 text-primary hover:text-primary transition-colors">
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <button onClick={onReset} disabled={steps.length === 0}
        className="p-1.5 rounded hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors">
        <RotateCcw className="w-4 h-4" />
      </button>

      <div className="flex-1 mx-2">
        <Slider
          value={[currentStepIndex]}
          min={0}
          max={Math.max(0, steps.length - 1)}
          step={1}
          onValueChange={([v]) => onSeek(v)}
          className="cursor-pointer"
        />
      </div>

      <span className="text-xs font-mono text-muted-foreground min-w-[60px] text-right">
        {steps.length > 0 ? `${currentStepIndex + 1}/${steps.length}` : '—/—'}
      </span>

      <Select value={String(playSpeed)} onValueChange={(v) => onSpeedChange(Number(v))}>
        <SelectTrigger className="h-7 w-20 text-xs bg-secondary border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2000">Slow</SelectItem>
          <SelectItem value="1000">Normal</SelectItem>
          <SelectItem value="500">Fast</SelectItem>
          <SelectItem value="200">Ultra</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
