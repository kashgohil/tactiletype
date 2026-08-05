import { Button } from '@/components/ui/button';
import type {
  CaretStyle,
  FontSize,
  KeyboardLayout,
} from '@/hooks/useTestPreferences';
import { useTestPreferences } from '@/hooks/useTestPreferences';
import { LAYOUT_LABELS } from '@/utils/keyboardLayouts';
import React from 'react';

const labelClass = 'block text-sm font-medium text-text/60 mb-1.5';
const selectClass =
  'w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm';

/**
 * Typing-test display preferences. These live in localStorage and apply to
 * guests too, so this section renders whether or not anyone is logged in.
 */
export const TypingPreferencesSection: React.FC = () => {
  const { prefs, setPrefs, resetPrefs } = useTestPreferences();

  return (
    <section className="bg-accent/10 rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-lg">Typing preferences</h2>
      <p className="text-xs text-text/40 -mt-2">
        How the test screen looks and sounds. Saved on this device.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="pref-caret">
            Caret style
          </label>
          <select
            id="pref-caret"
            className={selectClass}
            value={prefs.caretStyle}
            onChange={(e) =>
              setPrefs({ caretStyle: e.target.value as CaretStyle })
            }
          >
            <option value="line">Line</option>
            <option value="block">Block</option>
            <option value="underline">Underline</option>
            <option value="box">Box</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="pref-font-size">
            Font size
          </label>
          <select
            id="pref-font-size"
            className={selectClass}
            value={prefs.fontSize}
            onChange={(e) => setPrefs({ fontSize: e.target.value as FontSize })}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra large</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="pref-layout">
          Keyboard layout
        </label>
        <select
          id="pref-layout"
          className={selectClass}
          value={prefs.keyboardLayout}
          onChange={(e) =>
            setPrefs({ keyboardLayout: e.target.value as KeyboardLayout })
          }
        >
          {(Object.keys(LAYOUT_LABELS) as KeyboardLayout[]).map((id) => (
            <option key={id} value={id}>
              {LAYOUT_LABELS[id]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2.5 pt-1">
        <Toggle
          label="High-contrast typed characters"
          checked={prefs.highContrastTyped}
          onChange={(v) => setPrefs({ highContrastTyped: v })}
        />
        <Toggle
          label="Smooth caret"
          checked={prefs.smoothCaret}
          onChange={(v) => setPrefs({ smoothCaret: v })}
        />
        <Toggle
          label="Key click sound"
          checked={prefs.soundEnabled}
          onChange={(v) => setPrefs({ soundEnabled: v })}
        />
        <Toggle
          label="Error sound"
          checked={prefs.errorSoundEnabled}
          onChange={(v) => setPrefs({ errorSoundEnabled: v })}
        />
      </div>

      <Button type="button" variant="outline" size="sm" onClick={resetPrefs}>
        Reset defaults
      </Button>
    </section>
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
    <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
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
