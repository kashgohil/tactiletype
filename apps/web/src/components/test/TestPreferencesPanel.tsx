import { Button } from '@/components/ui/button';
import type {
  CaretStyle,
  FontSize,
  KeyboardLayout,
  TestPreferences,
} from '@/hooks/useTestPreferences';
import { LAYOUT_LABELS } from '@/utils/keyboardLayouts';
import { Settings2, X } from 'lucide-react';
import React, { useState } from 'react';

interface TestPreferencesPanelProps {
  prefs: TestPreferences;
  onChange: (patch: Partial<TestPreferences>) => void;
  onReset: () => void;
}

const selectClass =
  'h-8 rounded-md border border-accent/25 bg-transparent px-2 text-xs w-full';

export const TestPreferencesPanel: React.FC<TestPreferencesPanelProps> = ({
  prefs,
  onChange,
  onReset,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Test display settings"
        aria-expanded={open}
      >
        <Settings2 className="size-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-accent/30 bg-primary shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Test display</h3>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setOpen(false)}
              aria-label="Close settings"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-text/50">Caret style</span>
            <select
              className={selectClass}
              value={prefs.caretStyle}
              onChange={(e) =>
                onChange({ caretStyle: e.target.value as CaretStyle })
              }
            >
              <option value="line">Line</option>
              <option value="block">Block</option>
              <option value="underline">Underline</option>
              <option value="box">Box</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-text/50">Font size</span>
            <select
              className={selectClass}
              value={prefs.fontSize}
              onChange={(e) =>
                onChange({ fontSize: e.target.value as FontSize })
              }
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">Extra large</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-text/50">Keyboard layout</span>
            <select
              className={selectClass}
              value={prefs.keyboardLayout}
              onChange={(e) =>
                onChange({ keyboardLayout: e.target.value as KeyboardLayout })
              }
            >
              {(Object.keys(LAYOUT_LABELS) as KeyboardLayout[]).map((id) => (
                <option key={id} value={id}>
                  {LAYOUT_LABELS[id]}
                </option>
              ))}
            </select>
          </label>

          <Toggle
            label="High-contrast typed chars"
            checked={prefs.highContrastTyped}
            onChange={(v) => onChange({ highContrastTyped: v })}
          />
          <Toggle
            label="Smooth caret"
            checked={prefs.smoothCaret}
            onChange={(v) => onChange({ smoothCaret: v })}
          />
          <Toggle
            label="Hide live WPM / stats"
            checked={prefs.hideLiveStats}
            onChange={(v) => onChange({ hideLiveStats: v })}
          />
          <Toggle
            label="Key click sound"
            checked={prefs.soundEnabled}
            onChange={(v) => onChange({ soundEnabled: v })}
          />
          <Toggle
            label="Error sound"
            checked={prefs.errorSoundEnabled}
            onChange={(v) => onChange({ errorSoundEnabled: v })}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onReset}
          >
            Reset defaults
          </Button>
        </div>
      )}
    </div>
  );
};

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer text-xs">
      <span className="text-text/70">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--color-accent)]"
      />
    </label>
  );
}
