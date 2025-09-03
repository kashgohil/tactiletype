export interface Theme {
  id: string;
  name: string;
  textColor: string;
  accentColor: string;
  primaryColor: string;
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    textColor: '#333333',
    accentColor: '#ceb11e',
    primaryColor: '#fefefe',
  },
  {
    id: 'dark',
    name: 'Dark',
    textColor: '#e5e5e5',
    accentColor: '#60a5fa',
    primaryColor: '#1a1a1a',
  },
  {
    id: 'forest',
    name: 'Forest',
    textColor: '#2d3748',
    accentColor: '#48bb78',
    primaryColor: '#f7fdf7',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    textColor: '#1a365d',
    accentColor: '#4299e1',
    primaryColor: '#f0f9ff',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    textColor: '#2d1b69',
    accentColor: '#f56565',
    primaryColor: '#fef7f7',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    textColor: '#1a1a1a',
    accentColor: '#6b7280',
    primaryColor: '#fafafa',
  },
  {
    id: 'neon',
    name: 'Neon',
    textColor: '#0f172a',
    accentColor: '#10b981',
    primaryColor: '#f0fdf4',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    textColor: '#44403c',
    accentColor: '#d97706',
    primaryColor: '#fffbeb',
  },
];
