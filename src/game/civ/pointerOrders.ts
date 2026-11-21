// Purpose: Issue an order only for a completed, single-pointer tap on an unchanged battlefield.
// A drag remains cancelled even if the finger returns to its start; cancellation never emits an order.
export const ORDER_TAP_DISTANCE = 10;
interface PendingOrder { id: number; x: number; y: number; layoutKey: string; valid: boolean }

export class OrderGesture {
  private pointers = new Set<number>();
  private pending: PendingOrder | null = null;

  begin(id: number, x: number, y: number, layoutKey: string): void {
    this.pointers.add(id);
    if (this.pending || this.pointers.size > 1) {
      if (this.pending) this.pending.valid = false;
      return;
    }
    this.pending = { id, x, y, layoutKey, valid: Number.isFinite(x) && Number.isFinite(y) };
  }

  move(id: number, x: number, y: number): void {
    const order = this.pending;
    if (!order || order.id !== id) return;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x - order.x, y - order.y) > ORDER_TAP_DISTANCE) order.valid = false;
  }

  finish(id: number, x: number, y: number, layoutKey: string): boolean {
    this.move(id, x, y);
    const order = this.pending;
    const accepted = !!order && order.id === id && order.valid && this.pointers.size === 1 && order.layoutKey === layoutKey;
    this.pointers.delete(id);
    // Any unexpected release also cancels the pending order rather than letting another finger complete it.
    this.pending = null;
    return accepted;
  }

  cancel(): void { this.pending = null; this.pointers.clear(); }
}
