// Purpose: Pure maze presentation coordinates; combat continues to use the same grid units.
export function warsLayout(width: number, height: number) {
  const stacked = width < 600;
  const tile = Math.max(10, Math.floor(stacked ? Math.min((width - 24) / 11, (height - 64) / 14) : Math.min((width - 60) / 22, (height - 38) / 7)));
  const left = { x: stacked ? (width - tile * 11) / 2 : 12, y: 22 };
  const right = { x: stacked ? left.x : width / 2 + 12, y: stacked ? left.y + tile * 7 + 32 : left.y };
  return { tile, left, right, stacked };
}
