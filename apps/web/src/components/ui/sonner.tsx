import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

const Toaster = ({ ...props }: ToasterProps) => {
  // Polarity comes from the active theme's own colors, not the OS preference -
  // the app's three-color themes are the source of truth here.
  const { colorScheme } = useTheme();

  return (
    <Sonner
      theme={colorScheme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          // Tailwind v4 exposes the theme ramp as --color-* custom properties
          '--normal-bg': 'var(--color-surface-2)',
          '--normal-text': 'var(--color-text)',
          '--normal-border': 'var(--color-line)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
