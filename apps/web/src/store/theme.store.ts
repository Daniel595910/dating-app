import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

function applyTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effective = mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;
  root.dataset.theme = effective;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (mode) => {
        applyTheme(mode);
        set({ theme: mode });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    }
  )
);

// Watch system theme changes when mode is 'system'
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    const current = useThemeStore.getState().theme;
    if (current === 'system') applyTheme('system');
  });
}