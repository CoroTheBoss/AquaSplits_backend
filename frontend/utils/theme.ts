import { useTheme } from '../contexts/ThemeContext';

export function useThemeColors() {
  const { theme } = useTheme();
  
  return {
    background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    surface: theme === 'dark' ? '#2a2a2a' : '#fff',
    text: theme === 'dark' ? '#fff' : '#1a1a1a',
    textSecondary: theme === 'dark' ? '#999' : '#666',
    textTertiary: theme === 'dark' ? '#666' : '#999',
    border: theme === 'dark' ? '#444' : '#e0e0e0',
    primary: '#007AFF',
    error: '#ff3b30',
    cardBackground: theme === 'dark' ? '#2a2a2a' : '#fff',
    inputBackground: theme === 'dark' ? '#333' : '#fff',
  };
}

