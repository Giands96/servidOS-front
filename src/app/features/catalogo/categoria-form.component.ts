import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Categoria } from './catalogo.types';
import { CatalogoApi } from './data/catalogo.api';
import {
  categoriaFieldErrors,
  toCrearCategoriaRequest,
  validateCategoriaDraft,
} from './domain/producto-form.rules';

const CREATE_ERROR = 'No se pudo crear la categoría';

/**
 * Create-category form (no modal chrome): one field. Orchestration only: validation, the request body and the
 * server error mapping live in `producto-form.rules`. The name error appears after the first submit attempt;
 * a name the backend rejected stays flagged until the text changes.
 */
@Component({
  selector: 'app-categoria-form',
  imports: [ButtonComponent, IconComponent, TextFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form novalidate aria-label="Nueva categoría" (submit)="submit($event)">
      <div class="p-6">
        <app-text-field
          label="Nombre"
          name="nombre"
          autocomplete="off"
          [required]="true"
          [disabled]="submitting()"
          [error]="nombreMessage()"
          [(value)]="nombre"
        />
      </div>

      <footer class="flex items-center justify-end gap-3 border-t border-line bg-surface/60 px-6 py-4">
        <button appButton type="button" variant="secondary" [disabled]="submitting()" (click)="cancelled.emit()">
          Cancelar
        </button>
        <button appButton type="submit" variant="primary" [disabled]="submitting()">
          @if (submitting()) {
            <app-icon name="spinner" [size]="18" class="animate-spin" />
          } @else {
            <app-icon name="check" [size]="18" />
          }Crear categoría
        </button>
      </footer>
    </form>
  `,
})
export class CategoriaFormComponent {
  private readonly api = inject(CatalogoApi);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted with the created category (the backend answer). */
  readonly created = output<Categoria>();
  readonly cancelled = output<void>();

  protected readonly nombre = signal('');
  private readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  /** The name the backend rejected, with its message: shown under the field until the text changes. */
  private readonly rejected = signal<{ nombre: string; message: string } | null>(null);

  protected readonly nombreMessage = computed(() => {
    const client = this.submitAttempted() ? validateCategoriaDraft({ nombre: this.nombre() }).nombre : undefined;
    const rejected = this.rejected();
    return client ?? (rejected !== null && rejected.nombre === this.nombre() ? rejected.message : null);
  });

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) {
      return;
    }
    this.submitAttempted.set(true);
    const draft = { nombre: this.nombre() };
    if (Object.keys(validateCategoriaDraft(draft)).length > 0) {
      return;
    }
    this.submitting.set(true);
    this.api
      .crearCategoria(toCrearCategoriaRequest(draft))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categoria) => {
          this.submitting.set(false);
          this.created.emit(categoria);
        },
        error: (error: unknown) => {
          // The draft stays as typed so the user can fix it and try again.
          this.submitting.set(false);
          this.fail(error, draft.nombre);
        },
      });
  }

  /** A name rejection goes under the field; anything else is the backend `message` as is in a toast. */
  private fail(error: unknown, sentNombre: string): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toasts.show('Error', CREATE_ERROR);
      return;
    }
    const message = readApiError(error.error)?.message ?? null;
    const rejected = categoriaFieldErrors(error.status, message).nombre;
    if (rejected !== undefined) {
      this.rejected.set({ nombre: sentNombre, message: rejected });
      return;
    }
    this.toasts.show(error.status, message ?? CREATE_ERROR);
  }
}
