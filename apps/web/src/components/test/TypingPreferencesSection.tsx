import type React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CaretStyle, FontSize, KeyboardLayout } from '@/hooks/useTestPreferences';
import { useTestPreferences } from '@/hooks/useTestPreferences';
import { LAYOUT_LABELS } from '@/utils/keyboardLayouts';

const labelClass = 'text-text/60 mb-1.5';

const CARET_STYLES: { value: CaretStyle; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'block', label: 'Block' },
  { value: 'underline', label: 'Underline' },
  { value: 'box', label: 'Box' },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
];

/**
 * Typing-test display preferences. These live in localStorage and apply to
 * guests too, so this section renders whether or not anyone is logged in.
 */
export const TypingPreferencesSection: React.FC = () => {
  const { prefs, setPrefs, resetPrefs } = useTestPreferences();

  return (
    <Panel
      title="Typing preferences"
      description="How the test screen looks and sounds. Saved on this device."
      bodyClassName="space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className={labelClass} htmlFor="pref-caret">
            Caret style
          </Label>
          <Select
            value={prefs.caretStyle}
            onValueChange={(value) => setPrefs({ caretStyle: value as CaretStyle })}
          >
            <SelectTrigger id="pref-caret" className="w-full">
              <SelectValue placeholder="Caret style" />
            </SelectTrigger>
            <SelectContent>
              {CARET_STYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={labelClass} htmlFor="pref-font-size">
            Font size
          </Label>
          <Select
            value={prefs.fontSize}
            onValueChange={(value) => setPrefs({ fontSize: value as FontSize })}
          >
            <SelectTrigger id="pref-font-size" className="w-full">
              <SelectValue placeholder="Font size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className={labelClass} htmlFor="pref-layout">
          Keyboard layout
        </Label>
        <Select
          value={prefs.keyboardLayout}
          onValueChange={(value) => setPrefs({ keyboardLayout: value as KeyboardLayout })}
        >
          <SelectTrigger id="pref-layout" className="w-full">
            <SelectValue placeholder="Keyboard layout" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LAYOUT_LABELS) as KeyboardLayout[]).map((id) => (
              <SelectItem key={id} value={id}>
                {LAYOUT_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="divide-y divide-accent/10 pt-1">
        <Toggle
          id="pref-contrast"
          label="High-contrast typed characters"
          checked={prefs.highContrastTyped}
          onChange={(v) => setPrefs({ highContrastTyped: v })}
        />
        <Toggle
          id="pref-smooth-caret"
          label="Smooth caret"
          checked={prefs.smoothCaret}
          onChange={(v) => setPrefs({ smoothCaret: v })}
        />
        <Toggle
          id="pref-sound"
          label="Key click sound"
          checked={prefs.soundEnabled}
          onChange={(v) => setPrefs({ soundEnabled: v })}
        />
        <Toggle
          id="pref-error-sound"
          label="Error sound"
          checked={prefs.errorSoundEnabled}
          onChange={(v) => setPrefs({ errorSoundEnabled: v })}
        />
      </div>

      <Button type="button" variant="outline" size="sm" onClick={resetPrefs}>
        Reset defaults
      </Button>
    </Panel>
  );
};

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <Label htmlFor={id} className="text-text/70 cursor-pointer font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
