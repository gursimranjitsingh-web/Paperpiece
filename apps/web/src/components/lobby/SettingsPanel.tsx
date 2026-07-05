'use client';

import { MAP_SIZES, MapTheme, SPAWN_TERRITORY_SIZES, type RoomSettings } from '@paperpiece/shared';
import { BOARD_THEMES } from '@/lib/theme';

interface Props {
  settings: RoomSettings;
  isHost: boolean;
  onChange: (patch: Partial<RoomSettings>) => void;
}

/** Host-configurable match settings. Read-only for non-hosts. */
export function SettingsPanel({ settings, isHost, onChange }: Props) {
  const disabled = !isHost;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
        Match settings {!isHost && <span className="ml-2 font-normal">(host only)</span>}
      </h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Map size">
          <Select
            disabled={disabled}
            value={settings.mapSize}
            onChange={(v) => onChange({ mapSize: Number(v) as RoomSettings['mapSize'] })}
            options={MAP_SIZES.map((s) => ({ value: s, label: `${s} × ${s}` }))}
          />
        </Field>

        <Field label="Starting area">
          <Select
            disabled={disabled}
            value={settings.spawnTerritorySize}
            onChange={(v) =>
              onChange({ spawnTerritorySize: Number(v) as RoomSettings['spawnTerritorySize'] })
            }
            options={SPAWN_TERRITORY_SIZES.map((s) => ({ value: s, label: `${s} × ${s}` }))}
          />
        </Field>

        <Field label={`Player limit — ${settings.playerLimit}`}>
          <Range
            disabled={disabled}
            min={1}
            max={50}
            value={settings.playerLimit}
            onChange={(v) => onChange({ playerLimit: v })}
          />
        </Field>

        <Field label={`Speed — ${settings.speedMultiplier.toFixed(1)}×`}>
          <Range
            disabled={disabled}
            min={0.5}
            max={3}
            step={0.1}
            value={settings.speedMultiplier}
            onChange={(v) => onChange({ speedMultiplier: v })}
          />
        </Field>

        <Field label={`Respawn — ${settings.respawnSeconds === 0 ? 'spectate' : `${settings.respawnSeconds}s`}`}>
          <Range
            disabled={disabled}
            min={0}
            max={15}
            value={settings.respawnSeconds}
            onChange={(v) => onChange({ respawnSeconds: v })}
          />
        </Field>

        <Field
          label={`Duration — ${
            settings.matchDurationSeconds === 0 ? 'last standing' : `${Math.round(settings.matchDurationSeconds / 60)}m`
          }`}
        >
          <Range
            disabled={disabled}
            min={0}
            max={900}
            step={30}
            value={settings.matchDurationSeconds}
            onChange={(v) => onChange({ matchDurationSeconds: v })}
          />
        </Field>
      </div>

      {/* Board theme */}
      <p className="mb-2 mt-4 text-xs text-[var(--color-ink-soft)]">Board theme</p>
      <div className="flex flex-wrap gap-2">
        {Object.values(MapTheme).map((t) => {
          const theme = BOARD_THEMES[t];
          const active = settings.theme === t;
          return (
            <button
              key={t}
              disabled={disabled}
              onClick={() => onChange({ theme: t })}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                active ? 'border-[var(--color-accent)]/50 bg-white/10' : 'border-white/10 bg-black/30'
              }`}
            >
              <span
                className="h-4 w-4 rounded"
                style={{ background: `linear-gradient(135deg, ${theme.swatch[0]}, ${theme.swatch[1]})` }}
              />
              {theme.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Toggle
          disabled={disabled}
          label="Mouse control"
          value={settings.mouseControl}
          onChange={(v) => onChange({ mouseControl: v })}
        />
        <Toggle
          disabled={disabled}
          label="Friendly fire"
          value={settings.friendlyFire}
          onChange={(v) => onChange({ friendlyFire: v })}
        />
        <Toggle
          disabled={disabled}
          label="Fog of war"
          value={settings.fogEnabled}
          onChange={(v) => onChange({ fogEnabled: v })}
        />
        <Toggle
          disabled={disabled}
          label="Fill with bots"
          value={settings.fillWithBots}
          onChange={(v) => onChange({ fillWithBots: v })}
        />
        <Toggle
          disabled={disabled}
          label="Public"
          value={settings.isPublic}
          onChange={(v) => onChange({ isPublic: v })}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[var(--color-ink-soft)]">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  options,
  onChange,
  disabled,
}: {
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <select
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[var(--color-ink)] outline-none disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[var(--color-canvas)]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="range"
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="accent-[var(--color-accent)] disabled:opacity-60"
    />
  );
}

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
        value
          ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
          : 'border-white/10 bg-black/30 text-[var(--color-ink-soft)]'
      }`}
    >
      {label}: {value ? 'On' : 'Off'}
    </button>
  );
}
