/**
 * Deep dive · tracker — a live check-in: liveness prompt, capture, upload,
 * server timestamp. Stamps are read from the story clock at their cue, so
 * they always agree with the phone (spec §4.8).
 */
import type { ReactNode } from 'react';
import { bump } from '../../motion/track';
import { clockLabel } from '../../data/format';
import { color, soft } from '../../theme/tokens';
import { storySecondsOfDay } from '../../timeline/clock';
import { CUE } from '../../timeline/cues';
import { Chip, chipWidth } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui/Label';
import { countUp, fadeIn, seq, swap } from '../shared/anim';
import type { MockProps } from '../shared/types';
import { Viewfinder } from '../shared/Viewfinder';

const L = CUE.live;
const SERVER_STAMP = `${clockLabel(storySecondsOfDay(L.doneAt))} IST`;
const PROMPT = { text: 'Liveness: show 2 fingers', icon: 'scan', size: 14, h: 32 } as const;

export const LiveCheckIn = ({ t, w }: MockProps): ReactNode => {
  const prompt = fadeIn(t, L.promptAt, 0.4);
  const hand = fadeIn(t, L.promptAt + 0.8, 0.6);
  const frozen = swap(t, L.shutter + 0.15, 0.3);
  const press = bump(t, L.shutter - 0.05, L.shutter + 0.3);
  const up = seq(t, L.uploadFrom);
  const dn = seq(t, L.doneAt);
  const upload = countUp(t, L.uploadFrom, L.uploadTo - L.uploadFrom);
  const done = dn.in;
  const vf = { x: 24, y: 92, w: w - 48, h: 380 };
  const promptW = chipWidth(PROMPT);
  return (
    <g>
      <Label x={28} y={42} face="Inter-600" size={20} tracking={-0.012} maxW={260}>
        Live check-in
      </Label>
      <Label x={28} y={64} face="Inter-400" size={14} color={color.muted} maxW={260}>
        Ishaan · Morning Lift Club
      </Label>
      <Chip x={w - 24} y={24} h={30} size={13} text="Camera only" icon="lock" tone="neutral" ink={color.ink} anchor="end" />

      <Viewfinder {...vf} r={20} t={t} clipId="vf-live" flashAt={L.flash} frozen={frozen} hand={hand} />
      <Chip {...PROMPT} x={vf.x + (vf.w - promptW) / 2} y={vf.y + 20} tone="primary" ink={color.ink} opacity={prompt} />
      <Chip x={vf.x + 18} y={vf.y + vf.h - 46} h={30} size={13} text={`Server time ${SERVER_STAMP}`} icon="check" tone="accent" ink={color.ink} tnum opacity={done} />

      {/* shutter */}
      <circle cx={w / 2} cy={526} r={31} fill="none" stroke={color.ink} strokeWidth={3} opacity={0.9} />
      <circle cx={w / 2} cy={526} r={24 * (1 - 0.14 * press)} fill={color.ink} opacity={0.92 - 0.5 * done} />
      <Label x={28} y={531} face="Inter-500" size={14} color={color.muted} maxW={120}>
        Front · Rear
      </Label>
      <g opacity={up.in}>
        <Icon name="upload" x={w - 112} y={516} size={18} color={color.muted} />
        <Label x={w - 28} y={531} face="Inter-500" size={14} anchor="end" tnum color={color.muted} maxW={72}>
          412 KB
        </Label>
      </g>

      <line x1={24} y1={566} x2={w - 24} y2={566} stroke={soft.ink} strokeWidth={1} />
      <g opacity={up.out}>
        <Icon name="clock" x={24} y={574} size={18} color={color.muted} />
        <Label x={50} y={588} face="Inter-500" size={15} color={color.muted} maxW={w - 74}>
          Waiting for capture
        </Label>
      </g>
      <g opacity={up.in * dn.out}>
        <Icon name="upload" x={24} y={574} size={18} color={color.muted} />
        <Label x={50} y={588} face="Inter-500" size={15} color={color.muted} maxW={180}>
          Uploading
        </Label>
        <rect x={160} y={580} width={w - 184} height={6} rx={3} fill={soft.ink} />
        <rect x={160} y={580} width={(w - 184) * upload} height={6} rx={3} fill={color.primary} />
      </g>
      <g opacity={done}>
        <Icon name="check" x={24} y={574} size={18} color={color.accent} strokeWidth={2.2} />
        <Label x={50} y={588} face="Inter-600" size={15} color={color.accent} tnum maxW={w - 74}>
          {`Checked in · ${SERVER_STAMP}`}
        </Label>
      </g>
    </g>
  );
};
