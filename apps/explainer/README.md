# @conqr/explainer

The CONQR explainer film: 120 s, 1920×1080, 30 fps. Every frame is a pure function of time,
rendered with Remotion from SVG. **Read `spec.md` first**; it is the blueprint, and three of its
tables are enforced against the code by `test/spec-sync.test.ts`.

```bash
pnpm --filter @conqr/explainer studio      # scrub the film in Remotion Studio
pnpm --filter @conqr/explainer stills      # PNGs of every state → out/stills/
pnpm --filter @conqr/explainer render      # full MP4 → out/conqr-explainer.mp4
pnpm --filter @conqr/explainer test        # motion, money, timeline, spec-sync, layout, text
pnpm --filter @conqr/explainer metrics     # regenerate font-metrics.json after a font bump
```

| Folder | What lives there |
|---|---|
| `src/timeline/` | The state machine: beats, stage rects, actor tracks, cues, captions, camera, story clock |
| `src/film/Film.tsx` | **The orchestrator**: `Film(t)` composes every plane from the timeline |
| `src/motion/` | Closed-form easings, analytic spring, keyframe tracks, OKLab colour, noise |
| `src/mocks/` | Mock UIs per actor and state (A silo → B node/deep dive → C tile) |
| `src/ui/` | SVG atoms: Label (requires `maxW`), Surface, Chip, Avatar, Icon, Ring |
| `src/data/` | The illustrative pool and the LLD §3.1 settlement that computes every ₹ figure |

All colour lives in `src/theme/tokens.ts`. Switching the film to the app's ember/brass palette is a
one-file change.
