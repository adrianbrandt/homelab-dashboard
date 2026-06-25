import { useCallback, useEffect, useState } from 'react';
import type { ThemeDensity, ThemeMode } from '@dashboard/shared';
import { useLayout } from './useLayout.ts';

const VIEW_THEME = 'hld:theme';
const VIEW_DENSITY = 'hld:density';
const CFG_THEME = 'hld:cfg-theme';
const CFG_DENSITY = 'hld:cfg-density';

const MODES: ThemeMode[] = ['dark', 'light', 'auto'];
const isMode = (v: unknown): v is ThemeMode =>
  typeof v === 'string' && MODES.includes(v as ThemeMode);
const isDensity = (v: unknown): v is ThemeDensity => v === 'comfortable' || v === 'compact';

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'auto') return prefersDark() ? 'dark' : 'light';
  return mode;
}

export function useTheme() {
  const { data: layout } = useLayout();
  const cfg = layout?.settings.theme;

  // Viewer choice (localStorage) wins; else config; else default.
  const [viewerMode, setViewerMode] = useState<ThemeMode | null>(() => {
    const v = localStorage.getItem(VIEW_THEME);
    return isMode(v) ? v : null;
  });
  const [viewerDensity, setViewerDensity] = useState<ThemeDensity | null>(() => {
    const v = localStorage.getItem(VIEW_DENSITY);
    return isDensity(v) ? v : null;
  });

  const mode: ThemeMode = viewerMode ?? cfg?.mode ?? 'dark';
  const density: ThemeDensity = viewerDensity ?? cfg?.density ?? 'comfortable';

  // Apply to <html>; re-resolve 'auto' on OS change.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => root.setAttribute('data-theme', resolveTheme(mode));
    apply();
    root.setAttribute('data-density', density);
    if (mode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [mode, density]);

  // Config accent → CSS var; cache config values for the flash bootstrap.
  useEffect(() => {
    if (!cfg) return;
    if (cfg.accent && /^[#a-z0-9(),.\s%-]+$/i.test(cfg.accent)) {
      document.documentElement.style.setProperty('--accent', cfg.accent);
    }
    localStorage.setItem(CFG_THEME, cfg.mode);
    localStorage.setItem(CFG_DENSITY, cfg.density);
  }, [cfg]);

  const cycleMode = useCallback(() => {
    setViewerMode((cur) => {
      const start = cur ?? cfg?.mode ?? 'dark';
      const next = MODES[(MODES.indexOf(start) + 1) % MODES.length];
      localStorage.setItem(VIEW_THEME, next);
      return next;
    });
  }, [cfg?.mode]);

  const toggleDensity = useCallback(() => {
    setViewerDensity((cur) => {
      const start = cur ?? cfg?.density ?? 'comfortable';
      const next: ThemeDensity = start === 'compact' ? 'comfortable' : 'compact';
      localStorage.setItem(VIEW_DENSITY, next);
      return next;
    });
  }, [cfg?.density]);

  return { mode, density, cycleMode, toggleDensity };
}
