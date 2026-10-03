import { Injectable, signal } from '@angular/core';

export type ToastKind = 'error' | 'info' | 'success';

export interface Toast {
  id: number;
  /** Short label shown before the message, usually the HTTP status ("409"). */
  code: string;
  message: string;
  kind: ToastKind;
}

export const TOAST_DURATION_MS = 6000;

/** Minimal signal-based toast queue; each toast dismisses itself after TOAST_DURATION_MS. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = signal<readonly Toast[]>([]);

  show(code: string | number, message: string, kind: ToastKind = 'error'): number {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, code: String(code), message, kind }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), TOAST_DURATION_MS),
    );
    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
