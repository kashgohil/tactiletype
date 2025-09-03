import { Check, Palette } from 'lucide-react';
import React from 'react';
import { themes } from '../contexts/themes';
import { useTheme } from '../hooks/useTheme';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export const ThemePicker: React.FC = () => {
  const { currentTheme, setTheme, setPreviewTheme } = useTheme();

  const handleThemeSelect = (theme: (typeof themes)[0]) => {
    setTheme(theme);
    setPreviewTheme(null); // Clear preview when theme is selected
  };

  const handleThemeHover = (theme: (typeof themes)[0]) => {
    setPreviewTheme(theme);
  };

  const handleMouseLeave = () => {
    setPreviewTheme(null);
  };

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="link" size="icon">
              <Palette />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {themes.map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => handleThemeSelect(theme)}
              onMouseEnter={() => handleThemeHover(theme)}
              onMouseLeave={handleMouseLeave}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{theme.name}</span>
              <div className="flex items-center gap-2">
                {currentTheme.id === theme.id && <Check />}
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: theme.primaryColor }}
                  title="Primary Color (Background)"
                />
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: theme.textColor }}
                  title="Text Color"
                />
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: theme.accentColor }}
                  title="Accent Color"
                />
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>Theme</TooltipContent>
    </Tooltip>
  );
};
