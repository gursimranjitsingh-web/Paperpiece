import Link from 'next/link';
import { MAP_SIZES, MAX_PLAYERS, SERVER_TICK_RATE } from '@paperpiece/shared';
import { BrandMark } from '@/components/BrandMark';
import { FirstTimeTutorial } from '@/components/FirstTimeTutorial';
import { SettingsMenu } from '@/components/SettingsMenu';
import { ServerStatus } from '@/components/ServerStatus';

/** Landing page — brand, hero, live server status, and entry points. */
export default function HomePage() {
  return (
    <div className="grid-backdrop relative min-h-screen overflow-hidden">
      <FirstTimeTutorial />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-canvas)]" />
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(6,214,160,0.18),transparent)] blur-2xl" />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <BrandMark size={30} />
          <span className="text-lg font-black tracking-tight">Paperpiece</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-[var(--color-ink-soft)]">
          <Link href="/leaderboard" className="transition hover:text-[var(--color-ink)]">
            Leaderboard
          </Link>
          <Link href="/profile" className="transition hover:text-[var(--color-ink)]">
            Profile
          </Link>
          <SettingsMenu />
          <ServerStatus />
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 text-center sm:pt-24">
        <span className="mb-5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[var(--color-ink-soft)]">
          Real-time · server-authoritative · up to {MAX_PLAYERS} players
        </span>

        <h1 className="bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent-2)] to-[var(--color-accent)] bg-clip-text text-6xl font-black leading-[0.95] tracking-tight text-transparent sm:text-8xl">
          Claim the board.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--color-ink-soft)]">
          Draw out from your territory, loop back to capture ground, and cut off rivals by crossing
          their trail. Last one holding the most wins.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/lobby?quick=1"
            className="rounded-xl bg-[var(--color-accent)] px-7 py-3.5 font-semibold text-[var(--color-canvas)] shadow-lg shadow-emerald-500/25 transition hover:brightness-110"
          >
            ⚡ Quick Play
          </Link>
          <Link
            href="/lobby"
            className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-[var(--color-ink)] transition hover:bg-white/10"
          >
            Create room
          </Link>
          <Link
            href="/lobby?join=1"
            className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-[var(--color-ink)] transition hover:bg-white/10"
          >
            Join with code
          </Link>
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
          Quick Play drops you straight into a match against bots — no waiting.
        </p>

        {/* How it works */}
        <div className="mt-16 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
          <Step
            n="1"
            title="Roll out"
            body="Leave your zone to lay a glowing trail across the grid."
          />
          <Step
            n="2"
            title="Loop back"
            body="Return to your territory to capture everything you enclosed."
          />
          <Step
            n="3"
            title="Cut rivals"
            body="Cross an enemy trail to eliminate them — but guard your own."
          />
        </div>

        <dl className="mt-10 grid grid-cols-3 gap-4 text-center">
          <Stat label="Map sizes" value={MAP_SIZES.join(' · ')} />
          <Stat label="Players / room" value={`up to ${MAX_PLAYERS}`} />
          <Stat label="Server tick" value={`${SERVER_TICK_RATE} TPS`} />
        </dl>
      </main>

      <footer className="relative z-10 mx-auto mt-16 max-w-5xl px-6 py-8 text-center text-xs text-[var(--color-ink-soft)]">
        Built by Gursimran
      </footer>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-2 grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-accent)]/15 text-sm font-bold text-[var(--color-accent)]">
        {n}
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{body}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}
