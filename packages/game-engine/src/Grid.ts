import { type CellDelta, toIndex } from '@paperpiece/shared';

/** Sentinel for "no owner" stored in the typed arrays. */
const NONE = -1;

/**
 * Registry mapping string player ids to compact integer slots so ownership can
 * be stored in memory-efficient typed arrays instead of string arrays.
 */
class PlayerRegistry {
  private readonly idToSlot = new Map<string, number>();
  private readonly slotToId: string[] = [];

  slotOf(playerId: string): number {
    let slot = this.idToSlot.get(playerId);
    if (slot === undefined) {
      slot = this.slotToId.length;
      this.slotToId.push(playerId);
      this.idToSlot.set(playerId, slot);
    }
    return slot;
  }

  idOf(slot: number): string | null {
    if (slot === NONE) return null;
    return this.slotToId[slot] ?? null;
  }
}

/**
 * The authoritative territory/trail grid.
 *
 * Ownership and trails are stored in flat `Int32Array`s (row-major) for cache
 * locality and low memory — a 500×500 map is only 2 × 1 MB. Every mutation is
 * recorded in a dirty set so the server can broadcast **delta updates only**.
 */
export class Grid {
  readonly width: number;
  readonly height: number;
  readonly size: number;

  private readonly owners: Int32Array;
  private readonly trails: Int32Array;
  private readonly registry = new PlayerRegistry();

  /** Owned-cell counts per player slot (territory size). */
  private readonly territoryCounts = new Map<number, number>();
  /** Trail-cell counts per player slot. */
  private readonly trailCounts = new Map<number, number>();

  /** Indices changed since the last {@link drainDeltas}. */
  private readonly dirty = new Set<number>();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.owners = new Int32Array(this.size).fill(NONE);
    this.trails = new Int32Array(this.size).fill(NONE);
  }

  /** Owner player id at a cell, or null. */
  getOwner(x: number, y: number): string | null {
    return this.registry.idOf(this.owners[toIndex(x, y, this.width)] ?? NONE);
  }

  /** Trail-owner player id at a cell, or null. */
  getTrailOwner(x: number, y: number): string | null {
    return this.registry.idOf(this.trails[toIndex(x, y, this.width)] ?? NONE);
  }

  /** Set (or clear, with null) the territory owner of a cell. */
  setOwner(x: number, y: number, playerId: string | null): void {
    const idx = toIndex(x, y, this.width);
    const prev = this.owners[idx] ?? NONE;
    const next = playerId === null ? NONE : this.registry.slotOf(playerId);
    if (prev === next) return;
    if (prev !== NONE) this.bump(this.territoryCounts, prev, -1);
    if (next !== NONE) this.bump(this.territoryCounts, next, 1);
    this.owners[idx] = next;
    this.dirty.add(idx);
  }

  /** Set (or clear, with null) the trail owner of a cell. */
  setTrailOwner(x: number, y: number, playerId: string | null): void {
    const idx = toIndex(x, y, this.width);
    const prev = this.trails[idx] ?? NONE;
    const next = playerId === null ? NONE : this.registry.slotOf(playerId);
    if (prev === next) return;
    if (prev !== NONE) this.bump(this.trailCounts, prev, -1);
    if (next !== NONE) this.bump(this.trailCounts, next, 1);
    this.trails[idx] = next;
    this.dirty.add(idx);
  }

  /** Territory size (owned cell count) for a player. */
  territorySizeOf(playerId: string): number {
    return this.territoryCounts.get(this.registry.slotOf(playerId)) ?? 0;
  }

  /** Remove all territory and trail cells belonging to a player (on death). */
  clearPlayer(playerId: string): void {
    const slot = this.registry.slotOf(playerId);
    for (let i = 0; i < this.size; i += 1) {
      if (this.owners[i] === slot) {
        this.owners[i] = NONE;
        this.dirty.add(i);
      }
      if (this.trails[i] === slot) {
        this.trails[i] = NONE;
        this.dirty.add(i);
      }
    }
    this.territoryCounts.set(slot, 0);
    this.trailCounts.set(slot, 0);
  }

  /** Randomly remove ~`fraction` of a player's owned cells. Returns cells removed. */
  shrinkPlayer(playerId: string, fraction: number): number {
    const slot = this.registry.slotOf(playerId);
    if ((this.territoryCounts.get(slot) ?? 0) === 0) return 0;
    let removed = 0;
    for (let i = 0; i < this.size; i += 1) {
      if (this.owners[i] === slot && Math.random() < fraction) {
        this.owners[i] = NONE;
        this.dirty.add(i);
        removed += 1;
      }
    }
    this.territoryCounts.set(slot, Math.max(0, (this.territoryCounts.get(slot) ?? 0) - removed));
    return removed;
  }

  /** Clear only the (unfinished) trail cells of a player, keeping territory. */
  clearTrail(playerId: string): void {
    const slot = this.registry.slotOf(playerId);
    if ((this.trailCounts.get(slot) ?? 0) === 0) return;
    for (let i = 0; i < this.size; i += 1) {
      if (this.trails[i] === slot) {
        this.trails[i] = NONE;
        this.dirty.add(i);
      }
    }
    this.trailCounts.set(slot, 0);
  }

  /**
   * Return the set of changed cells since the last drain and reset the dirty
   * set. This is what the server broadcasts each tick.
   */
  drainDeltas(): CellDelta[] {
    const deltas: CellDelta[] = [];
    for (const idx of this.dirty) {
      deltas.push({
        index: idx,
        ownerId: this.registry.idOf(this.owners[idx] ?? NONE),
        trailOwnerId: this.registry.idOf(this.trails[idx] ?? NONE),
      });
    }
    this.dirty.clear();
    return deltas;
  }

  /** Full ownership snapshot (row-major player ids / null). For join/reconnect. */
  ownerSnapshot(): (string | null)[] {
    const out: (string | null)[] = new Array(this.size);
    for (let i = 0; i < this.size; i += 1) out[i] = this.registry.idOf(this.owners[i] ?? NONE);
    return out;
  }

  /** Full trail snapshot (row-major). */
  trailSnapshot(): (string | null)[] {
    const out: (string | null)[] = new Array(this.size);
    for (let i = 0; i < this.size; i += 1) out[i] = this.registry.idOf(this.trails[i] ?? NONE);
    return out;
  }

  /** Direct owner-slot read used by internal algorithms (flood fill). */
  ownerSlotAt(x: number, y: number): number {
    return this.owners[toIndex(x, y, this.width)] ?? NONE;
  }

  /** Resolve a player's slot (stable integer id). */
  slotOf(playerId: string): number {
    return this.registry.slotOf(playerId);
  }

  /** Paint a rectangular block of territory (used for spawn territory). */
  fillRect(rect: { minX: number; minY: number; maxX: number; maxY: number }, playerId: string): void {
    for (let y = rect.minY; y <= rect.maxY; y += 1) {
      for (let x = rect.minX; x <= rect.maxX; x += 1) {
        if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
          this.setOwner(x, y, playerId);
        }
      }
    }
  }

  private bump(map: Map<number, number>, slot: number, delta: number): void {
    map.set(slot, (map.get(slot) ?? 0) + delta);
  }
}
