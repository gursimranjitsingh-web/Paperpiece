import { GameClient } from '@/components/game/GameClient';

/** Live match screen — authoritative game loop + 2D board renderer + HUD. */
export default function PlayPage() {
  return <GameClient />;
}
