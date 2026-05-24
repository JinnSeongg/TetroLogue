export type KickOffset = {
  x: number;
  y: number;
};

export const toBoardOffset = (offset: KickOffset): KickOffset => ({
  x: offset.x,
  y: -offset.y,
});
