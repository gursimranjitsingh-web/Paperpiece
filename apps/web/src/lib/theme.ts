'use client';

import { MapTheme } from '@paperpiece/shared';

export interface BoardTheme {
  key: MapTheme;
  label: string;
  /** Canvas clear colour (behind the board). */
  background: string;
  /** Empty-cell / board colour. */
  board: string;
  /** Board border + accent colour. */
  border: string;
  bloomIntensity: number;
  /** Two-stop gradient used for the theme's lobby swatch. */
  swatch: [string, string];
}

/** Board palettes selectable by the host. */
export const BOARD_THEMES: Record<MapTheme, BoardTheme> = {
  [MapTheme.Neon]: {
    key: MapTheme.Neon,
    label: 'Neon',
    background: '#080b14',
    board: '#0e1422',
    border: '#3a86ff',
    bloomIntensity: 0.85,
    swatch: ['#3a86ff', '#06d6a0'],
  },
  [MapTheme.Midnight]: {
    key: MapTheme.Midnight,
    label: 'Midnight',
    background: '#05060a',
    board: '#0b0f18',
    border: '#5b8cff',
    bloomIntensity: 0.7,
    swatch: ['#1e2a5a', '#5b8cff'],
  },
  [MapTheme.Sunset]: {
    key: MapTheme.Sunset,
    label: 'Sunset',
    background: '#160a17',
    board: '#241528',
    border: '#ff8f5e',
    bloomIntensity: 0.95,
    swatch: ['#ff8f5e', '#ef476f'],
  },
  [MapTheme.Forest]: {
    key: MapTheme.Forest,
    label: 'Forest',
    background: '#07130d',
    board: '#0e2018',
    border: '#4fd18a',
    bloomIntensity: 0.8,
    swatch: ['#2ea36a', '#c1fba4'],
  },
  [MapTheme.Mono]: {
    key: MapTheme.Mono,
    label: 'Mono',
    background: '#0a0a0a',
    board: '#161616',
    border: '#e8ecf5',
    bloomIntensity: 0.6,
    swatch: ['#e8ecf5', '#9aa4bd'],
  },
};

export const themeOf = (t: MapTheme | undefined): BoardTheme =>
  BOARD_THEMES[t ?? MapTheme.Neon] ?? BOARD_THEMES[MapTheme.Neon];
