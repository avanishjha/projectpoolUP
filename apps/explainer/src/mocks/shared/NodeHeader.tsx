/** State-B node header: numbered pill, title, icon. Brightens when active. */
import type { ReactNode } from 'react';
import { mixColor } from '../../motion/color';
import { roundedRectPath } from '../../layout/geometry';
import { baselineIn } from '../../theme/measure';
import { color, soft } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/icons';
import { Label } from '../../ui/Label';

export interface NodeHeaderProps {
  readonly w: number;
  readonly index: string;
  readonly title: string;
  readonly icon: IconName;
  /** 0..1 active emphasis. */
  readonly active: number;
}

export const NODE_HEADER_H = 72;

export const NodeHeader = ({ w, index, title, icon, active }: NodeHeaderProps): ReactNode => {
  const pillFill = mixColor(soft.ink, soft.primary, active);
  const pillInk = mixColor(color.muted, color.primary, active);
  return (
    <g>
      <path d={roundedRectPath(24, 23, 42, 26, 13)} fill={pillFill} />
      <Label x={45} y={baselineIn(23, 'SpaceGrotesk-600', 14, 26)} face="SpaceGrotesk-600" size={14} anchor="middle" tnum color={pillInk} maxW={34}>
        {index}
      </Label>
      <Label x={80} y={44} face="Inter-600" size={22} tracking={-0.012} maxW={w - 80 - 64}>
        {title}
      </Label>
      <Icon name={icon} x={w - 48} y={24} size={24} color={pillInk} />
      <line x1={24} y1={NODE_HEADER_H} x2={w - 24} y2={NODE_HEADER_H} stroke={soft.ink} strokeWidth={1} />
    </g>
  );
};

/** Node footer status line (y 488–516). */
export const NodeFooter = ({ w, icon, text, tone = color.muted, opacity }: { w: number; icon: IconName; text: string; tone?: string; opacity?: number }): ReactNode => (
  <g opacity={opacity}>
    <line x1={24} y1={476} x2={w - 24} y2={476} stroke={soft.ink} strokeWidth={1} />
    <Icon name={icon} x={24} y={493} size={18} color={tone} />
    <Label x={50} y={507} face="Inter-500" size={14} color={tone} maxW={w - 50 - 24}>
      {text}
    </Label>
  </g>
);
