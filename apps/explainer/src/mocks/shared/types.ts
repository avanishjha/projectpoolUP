/** Every mock is a pure function of global time, drawn in its own native box. */
export interface MockProps {
  /** Global film time, seconds. */
  readonly t: number;
  /** Native (authored) width — the actor scales it to the live rect. */
  readonly w: number;
  readonly h: number;
}
