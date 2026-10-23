import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { readApiError } from '../../core/http/domain/api-error.rules';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Categoria, EstadoProducto, Producto } from './catalogo.types';
import { CatalogoApi } from './data/catalogo.api';
import {
  ProductoDraft,
  ProductoErrors,
  ProductoField,
  categoriaOptions,
  draftFromProducto,
  emptyProductoDraft,
  productoFieldErrors,
  toGuardarProductoRequest,
  validateProductoDraft,
} from './domain/producto-form.rules';

const SAVE_ERROR = 'No se pudo guardar el producto';
const DESCRIPCION_ROWS = 3;

let nextId = 0;

/**
 * Product form (no modal chrome) for creating or editing. Orchestration only: validation, the request body and
 * the server error mapping live in `producto-form.rules`. Field errors appear after the first submit attempt;
 * the ones the backend rejects stay under their field until its value changes.
 */
@Component({
  selector: 'app-producto-form',
  imports: [ButtonComponent, IconComponent, TextFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form novalidate [attr.aria-label]="mode() === 'crear' ? 'Nuevo producto' : 'Editar producto'" (submit)="submit($event)">
      <div class="space-y-4 p-6">
        <app-text-field
          label="Nombre"
          name="nombre"
          autocomplete="off"
          [required]="true"
          [disabled]="submitting()"
          [error]="errors().nombre ?? null"
          [(value)]="nombre"
        />
        <app-text-field
          label="Precio"
          name="precio"
          autocomplete="off"
          inputmode="decimal"
          hint="En soles, ej. 32.50"
          [mono]="true"
          [required]="true"
          [disabled]="submitting()"
          [error]="errors().precio ?? null"
          [(value)]="precio"
        />

        <div>
          <label class="mb-1.5 block text-sm font-medium text-ink" [for]="categoriaFieldId">Categoría</label>
          <select
            [id]="categoriaFieldId"
            name="categoriaId"
            class="w-full rounded-control border bg-card px-3.5 py-3 text-base text-ink sm:text-sm outline-none transition-colors focus:border-ink disabled:bg-surface disabled:text-muted"
            [class.border-line]="!errors().categoriaId"
            [class.border-danger]="errors().categoriaId"
            [disabled]="submitting()"
            [attr.aria-invalid]="errors().categoriaId ? 'true' : null"
            (change)="selectCategoria($event)"
          >
            <option value="" [selected]="categoriaId() === null">Sin categoría</option>
            @for (option of options(); track option.categoriaId) {
              <option [value]="option.categoriaId" [selected]="option.categoriaId === categoriaId()">
                {{ option.label }}
              </option>
            }
          </select>
          @if (errors().categoriaId; as message) {
            <p class="mt-1.5 flex items-center gap-1.5 text-xs text-danger" role="alert">
              <app-icon name="alert" [size]="14" />{{ message }}
            </p>
          }
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-ink" [for]="descripcionFieldId">Descripción</label>
          <textarea
            [id]="descripcionFieldId"
            name="descripcion"
            class="w-full resize-y rounded-control border bg-card px-3.5 py-3 text-base text-ink sm:text-sm outline-none transition-colors placeholder:text-subtle focus:border-ink disabled:bg-surface disabled:text-muted"
            [class.border-line]="!errors().descripcion"
            [class.border-danger]="errors().descripcion"
            [rows]="descripcionRows"
            [disabled]="submitting()"
            [attr.aria-invalid]="errors().descripcion ? 'true' : null"
            [attr.aria-describedby]="errors().descripcion ? descripcionFieldId + '-error' : descripcionFieldId + '-hint'"
            [value]="descripcion()"
            (input)="descripcion.set($any($event.target).value)"
          ></textarea>
          @if (errors().descripcion; as message) {
            <p class="mt-1.5 flex items-center gap-1.5 text-xs text-danger" [id]="descripcionFieldId + '-error'" role="alert">
              <app-icon name="alert" [size]="14" />{{ message }}
            </p>
          } @else {
            <p class="mt-1.5 text-xs text-muted" [id]="descripcionFieldId + '-hint'">
              Opcional · máximo 500 caracteres
            </p>
          }
        </div>

        <div class="w-48">
          <app-text-field
            label="Tiempo de preparación"
            name="tiempoPreparacion"
            autocomplete="off"
            inputmode="numeric"
            hint="Opcional · en minutos"
            [mono]="true"
            [disabled]="submitting()"
            [error]="errors().tiempoPreparacion ?? null"
            [(value)]="tiempoPreparacion"
          />
        </div>

        <div>
          <app-text-field
            label="URL de la imagen"
            name="imagenUrl"
            type="text"
            autocomplete="off"
            hint="Opcional · http o https"
            [disabled]="submitting()"
            [error]="errors().imagenUrl ?? null"
            [(value)]="imagenUrl"
          />
          @if (preview(); as url) {
            <img
              class="mt-2 size-12 rounded-control border border-line object-cover"
              alt=""
              referrerpolicy="no-referrer"
              [src]="url"
              (error)="imageFailed.set(url)"
            />
          }
        </div>
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
          }{{ mode() === 'crear' ? 'Crear producto' : 'Guardar cambios' }}
        </button>
      </footer>
    </form>
  `,
})
export class ProductoFormComponent {
  private readonly api = inject(CatalogoApi);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = input.required<'crear' | 'editar'>();
  /** The product being edited; null when creating. */
  readonly producto = input<Producto | null>(null);
  readonly categorias = input<readonly Categoria[]>([]);

  /** Emitted with the saved product (the backend answer). */
  readonly saved = output<Producto>();
  readonly cancelled = output<void>();

  protected readonly categoriaFieldId = `producto-form-categoria-${nextId}`;
  protected readonly descripcionFieldId = `producto-form-descripcion-${nextId++}`;
  protected readonly descripcionRows = DESCRIPCION_ROWS;

  private readonly initial = computed<ProductoDraft>(() => {
    const producto = this.producto();
    return this.mode() === 'editar' && producto !== null ? draftFromProducto(producto) : emptyProductoDraft();
  });

  // The draft, one signal per field (seeded from the inputs) so each text field can two-way bind its own.
  protected readonly nombre = linkedSignal(() => this.initial().nombre);
  protected readonly precio = linkedSignal(() => this.initial().precio);
  protected readonly categoriaId = linkedSignal(() => this.initial().categoriaId);
  protected readonly descripcion = linkedSignal(() => this.initial().descripcion);
  protected readonly tiempoPreparacion = linkedSignal(() => this.initial().tiempoPreparacion);
  protected readonly imagenUrl = linkedSignal(() => this.initial().imagenUrl);

  private readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  /** Backend rejections per field with the value that was sent: shown until that field's value changes. */
  private readonly rejected = signal<Partial<Record<ProductoField, { value: string | number | null; message: string }>>>({});
  /** The image URL that failed to load: its preview stays hidden. */
  protected readonly imageFailed = signal<string | null>(null);

  private readonly draft = computed<ProductoDraft>(() => ({
    nombre: this.nombre(),
    precio: this.precio(),
    categoriaId: this.categoriaId(),
    descripcion: this.descripcion(),
    tiempoPreparacion: this.tiempoPreparacion(),
    imagenUrl: this.imagenUrl(),
  }));

  protected readonly errors = computed<ProductoErrors>(() => {
    const draft = this.draft();
    const client = this.submitAttempted() ? validateProductoDraft(draft) : {};
    const rejected = this.rejected();
    const merged: ProductoErrors = { ...client };
    for (const field of Object.keys(rejected) as ProductoField[]) {
      const entry = rejected[field];
      if (entry !== undefined && merged[field] === undefined && entry.value === draft[field]) {
        merged[field] = entry.message;
      }
    }
    return merged;
  });

  protected readonly options = computed(() => categoriaOptions(this.categorias(), this.categoriaId()));

  /** The typed image URL when it is valid and has not failed to load. */
  protected readonly preview = computed(() => {
    const draft = this.draft();
    const url = draft.imagenUrl.trim();
    if (url === '' || validateProductoDraft(draft).imagenUrl !== undefined) {
      return null;
    }
    return this.imageFailed() === url ? null : url;
  });

  protected selectCategoria(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.categoriaId.set(value === '' ? null : Number(value));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) {
      return;
    }
    this.submitAttempted.set(true);
    const draft = this.draft();
    if (Object.keys(validateProductoDraft(draft)).length > 0) {
      return;
    }
    const mode = this.mode();
    const producto = this.producto();
    if (mode === 'editar' && producto === null) {
      return;
    }
    // The PUT is a full replace: an edit keeps the current estado (a missing one counts as DISPONIBLE).
    const estado: EstadoProducto = mode === 'editar' ? (producto?.estado ?? 'DISPONIBLE') : 'DISPONIBLE';
    const req = toGuardarProductoRequest(draft, estado);
    const request$ =
      mode === 'editar' && producto !== null
        ? this.api.actualizarProducto(producto.productoId, req)
        : this.api.crearProducto(req);
    this.submitting.set(true);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.submitting.set(false);
        this.saved.emit(saved);
      },
      error: (error: unknown) => {
        // The draft stays as typed so the user can fix it and try again.
        this.submitting.set(false);
        this.fail(error, draft);
      },
    });
  }

  /** Field rejections go under their fields; anything else is the backend `message` as is in a toast. */
  private fail(error: unknown, sent: ProductoDraft): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toasts.show('Error', SAVE_ERROR);
      return;
    }
    const message = readApiError(error.error)?.message ?? null;
    const fields = productoFieldErrors(error.status, message);
    const entries = (Object.keys(fields) as ProductoField[]).flatMap((field) => {
      const text = fields[field];
      return text === undefined ? [] : [[field, { value: sent[field], message: text }] as const];
    });
    if (entries.length === 0) {
      this.toasts.show(error.status, message ?? SAVE_ERROR);
      return;
    }
    this.rejected.set(Object.fromEntries(entries));
  }
}
