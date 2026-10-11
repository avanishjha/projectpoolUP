/** State-A window header: icon well, title, sub-line, optional right slot. */
import type { ReactNode } from 'react';
import { color, soft } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/icons';
import { Label } from '../../ui/Label';
import { Well } from '../../ui/Surface';

export interface SiloHeaderProps {
  readonly w: number;
  readonly icon: IconName;
  readonly title: string;
  readonly sub: string;
  /** Width reserved on the right for the slot. */
  readonly slotW?: number;
  readonly children?: ReactNode;
}

export const SILO_HEADER_H = 72;

export const SiloHeader = ({ w, icon, title, sub, slotW = 0, children }: SiloHeaderProps): ReactNode => (
  <g>
    <Well x={22} y={16} w={40} h={40} r={12} />
    <Icon name={icon} x={32} y={26} size={20} color={color.muted} />
    <Label x={76} y={33} face="Inter-600" size={18} tracking={-0.01} maxW={w - 76 - 24 - slotW}>
      {title}
    </Label>
    <Label x={76} y={53} face="Inter-400" size={13} color={color.muted} maxW={w - 76 - 24 - slotW}>
      {sub}
    </Label>
    {children}
    <line x1={0} y1={SILO_HEADER_H} x2={w} y2={SILO_HEADER_H} stroke={soft.ink} strokeWidth={1} />
  </g>
);
