// Prize split: 75% to 1st, 25% to 2nd.
// 1st place is rounded to the nearest $10; 2nd takes the remainder so the
// two payouts always sum exactly to the pot.
export function calculatePayouts(totalPool: number): [number, number] {
  if (totalPool <= 0) return [0, 0];
  const first = Math.round((totalPool * 0.75) / 10) * 10;
  return [first, totalPool - first];
}
