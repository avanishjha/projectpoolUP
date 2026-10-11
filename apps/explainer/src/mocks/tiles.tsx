/**
 * State C — the four actors resolve into the ledger (spec §3.2). Every
 * number comes from SETTLEMENT (LLD §3.1) and counts up on a C² ease.
 */
import type { ReactNode } from 'react';
import { formatINR, rupees } from '../data/format';
import { MEMBERS, POOL } from '../data/pool';
import { SETTLEMENT } from '../data/settlement';
import { color, toneSoft, type Tone } from '../theme/tokens';
import { CUE } from '../timeline/cues';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/icons';
import { Ring } from '../ui/Ring';
import { Well } from '../ui/Surface';
import { countUp } from './shared/anim';
import { Tile, TILE_PAD } from './shared/Tile';
import type { MockProps } from './shared/types';

const S = SETTLEMENT;
const countAt = (i: number) => CUE.tiles.countFrom + i * CUE.tiles.gap;
const roundRupee = (paise: number) => Math.round(paise / 100) * 100;

const IconBadge = ({ w, icon, tone }: { w: number; icon: IconName; tone: Tone }): ReactNode => {
  const fg = tone === 'danger' ? color.danger : tone === 'accent' ? color.accent : tone === 'primary' ? color.primary : color.muted;
  return (
    <g>
      <Well x={w - TILE_PAD - 44} y={24} w={44} h={44} r={13} fill={toneSoft[tone]} />
      <Icon name={icon} x={w - TILE_PAD - 33} y={35} size={22} color={fg} />
    </g>
  );
};

export const PoolTile = ({ w }: MockProps): ReactNode => (
  <Tile
    w={w}
    eyebrow="POOL"
    value={`${MEMBERS.length} × ${formatINR(rupees(POOL.buyIn))}`}
    lines={[`${formatINR(S.buyIns)} in buy-ins`, `${POOL.days} days · ${POOL.name}`]}
    visualW={44}
  >
    <IconBadge w={w} icon="users" tone="primary" />
  </Tile>
);

export const CheckInTile = ({ t, w }: MockProps): ReactNode => {
  const p = countUp(t, countAt(1));
  const n = Math.round(S.checkIns * p);
  const pct = Math.round((S.checkIns / S.checkInsDue) * 100);
  return (
    <Tile
      w={w}
      eyebrow="CHECK-INS"
      value={String(n)}
      suffix={`/${S.checkInsDue}`}
      lines={[`${pct}% compliance`, `${MEMBERS.length} members × ${POOL.days} days`]}
      visualW={84}
      lineTone={color.accent}
    >
      <Ring cx={w - TILE_PAD - 40} cy={96} r={36} progress={(S.checkIns / S.checkInsDue) * p} color={color.accent} width={7} />
    </Tile>
  );
};

export const FinesTile = ({ t, w }: MockProps): ReactNode => {
  const p = countUp(t, countAt(2));
  return (
    <Tile
      w={w}
      eyebrow="FINES"
      value={formatINR(roundRupee(S.fines * p))}
      lines={[`${S.misses} misses × ${formatINR(rupees(POOL.fine))}`, 'All auto-debited. Zero IOUs.']}
      visualW={44}
      lineTone={color.danger}
    >
      <IconBadge w={w} icon="rupee" tone="danger" />
    </Tile>
  );
};

export const PotTile = ({ t, w }: MockProps): ReactNode => {
  const p = countUp(t, countAt(3));
  return (
    <Tile
      w={w}
      eyebrow="NET POT"
      value={formatINR(roundRupee(S.net * p))}
      lines={[`${formatINR(S.gross)} gross − ${formatINR(S.fee)} fee (5%)`, 'Split by check-ins made']}
      visualW={44}
      lineTone={color.ink}
    >
      <IconBadge w={w} icon="ledger" tone="primary" />
    </Tile>
  );
};
