/**
 * Phone screen inside the pot actor's device surface. Content is authored in
 * iOS points (390×836) and scaled into the 412px screen; the screen is one
 * of the three permitted clips (spec §6.4 rule 6).
 */
import type { ReactNode } from 'react';
import { roundedRectPath } from '../../layout/geometry';
import { PHONE } from '../../timeline/stage';
import { color } from '../../theme/tokens';
import { Label } from '../../ui/Label';
import { ScaleContext, useContentScale } from '../../ui/ScaleContext';

export interface PhoneChromeProps {
  readonly w: number;
  readonly h: number;
  readonly clipId: string;
  readonly time: string;
  readonly children: ReactNode;
}

export const PhoneChrome = ({ w, h, clipId, time, children }: PhoneChromeProps): ReactNode => {
  const outer = useContentScale();
  const b = PHONE.bezel;
  const sw = w - b * 2;
  const sh = h - b * 2;
  const island = { w: 118, h: 34 };
  return (
    <g>
      <clipPath id={clipId}>
        <path d={roundedRectPath(b, b, sw, sh, PHONE.screenRadius)} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x={b} y={b} width={sw} height={sh} fill={color.canvas} />
        <g transform={`translate(${b} ${b}) scale(${PHONE.scale})`}>
          <ScaleContext.Provider value={outer * PHONE.scale}>
            <StatusBar time={time} />
            {children}
          </ScaleContext.Provider>
        </g>
      </g>
      <path d={roundedRectPath((w - island.w) / 2, b + 11, island.w, island.h, island.h / 2)} fill="#000" />
    </g>
  );
};

/** Status bar in points: time left, signal + battery right. */
const StatusBar = ({ time }: { time: string }): ReactNode => (
  <g>
    <Label x={34} y={32} face="Inter-600" size={15} tnum maxW={60}>
      {time}
    </Label>
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={290 + i * 5} y={30 - (4 + i * 2.5)} width={3} height={4 + i * 2.5} rx={1} fill={color.ink} />
    ))}
    <path d={roundedRectPath(318, 20.5, 25, 12, 3.5)} fill="none" stroke="rgba(249,250,251,0.45)" strokeWidth={1} />
    <path d={roundedRectPath(320, 22.5, 17, 8, 2)} fill={color.ink} />
    <rect x={344.5} y={24.5} width={1.5} height={4} rx={0.75} fill="rgba(249,250,251,0.45)" />
  </g>
);
