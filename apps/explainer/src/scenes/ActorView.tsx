/**
 * Renders one actor at time t (spec §5.3): the surface morphs continuously
 * (geometry + OKLab tone); content phases are drawn at their native size,
 * scaled uniformly to fit the live rect, clipped to the surface, and
 * cross-faded at phase boundaries. Text never reflows mid-morph, and is
 * never drawn larger than authored.
 */
import type { ReactNode } from 'react';
import { mixColor } from '../motion/color';
import { center, roundedRectPath } from '../layout/geometry';
import { MOCKS } from '../mocks/registry';
import { actorPose, chaosAt, highlightAt, phaseWeights, type ActorId, type SurfaceKind } from '../timeline/actors';
import { color } from '../theme/tokens';
import { ScaleContext } from '../ui/ScaleContext';
import { Surface } from '../ui/Surface';

interface SurfaceTone {
  readonly fill: string;
  readonly border: string;
  readonly borderTop: string;
}

const TONES: Record<SurfaceKind, SurfaceTone> = {
  card: { fill: color.card, border: color.border, borderTop: color.borderTop },
  device: { fill: color.device, border: 'rgba(249,250,251,0.12)', borderTop: 'rgba(249,250,251,0.22)' },
};

const mixTone = (a: SurfaceTone, b: SurfaceTone, u: number): SurfaceTone => ({
  fill: mixColor(a.fill, b.fill, u),
  border: mixColor(a.border, b.border, u),
  borderTop: mixColor(a.borderTop, b.borderTop, u),
});

export const ActorView = ({ id, t }: { id: ActorId; t: number }): ReactNode => {
  const pose = actorPose(id, t);
  if (pose.opacity < 0.002) return null;
  const weights = phaseWeights(id, t);
  if (weights.length === 0) return null;

  // Surface tone: weighted OKLab mix of the visible phases' materials.
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let tone = TONES[weights[0]!.phase.surface];
  let acc = weights[0]!.weight;
  for (const w of weights.slice(1)) {
    acc += w.weight;
    tone = mixTone(tone, TONES[w.phase.surface], w.weight / acc);
  }

  // State-A unease tints the border toward danger; Beat-2 focus lifts it to primary.
  const chaos = chaosAt(t);
  const hl = highlightAt(id, t);
  const border = mixColor(mixColor(tone.border, 'rgba(224,98,110,0.45)', chaos), 'rgba(99,102,241,0.62)', hl);

  const { cx, cy } = center(pose);
  const transform = `rotate(${pose.rot} ${cx} ${cy}) translate(${cx} ${cy}) scale(${pose.scale}) translate(${-cx} ${-cy})`;
  const clipId = `actor-clip-${id}`;
  const isDevice = weights.some((w) => w.phase.surface === 'device' && w.weight > 0.5);

  return (
    <g opacity={Math.min(1, pose.opacity)} transform={transform}>
      <Surface
        x={pose.x}
        y={pose.y}
        w={pose.w}
        h={pose.h}
        r={pose.r}
        fill={tone.fill}
        border={border}
        borderTop={mixColor(tone.borderTop, 'rgba(129,140,248,0.75)', hl)}
        shadow={isDevice ? 'hero' : 'card'}
        glow={hl}
      />
      <clipPath id={clipId}>
        <path d={roundedRectPath(pose.x, pose.y, pose.w, pose.h, pose.r)} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {weights.map(({ phase, weight }) => {
          const Mock = MOCKS[phase.content];
          // Fit, but never enlarge: incoming content appears at native size and the surface closes around it.
          const s = Math.min(1, pose.w / phase.native.w, pose.h / phase.native.h);
          const ox = cx - (phase.native.w * s) / 2;
          const oy = cy - (phase.native.h * s) / 2;
          return (
            <g key={phase.content} opacity={weight / Math.max(1, total)} transform={`translate(${ox} ${oy}) scale(${s})`}>
              <ScaleContext.Provider value={s * pose.scale}>
                <Mock t={t} w={phase.native.w} h={phase.native.h} />
              </ScaleContext.Provider>
            </g>
          );
        })}
      </g>
    </g>
  );
};
