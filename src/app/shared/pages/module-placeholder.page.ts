import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Stand-in for a module that is built in a later phase; the route `data.title` names it. */
@Component({
  selector: 'app-module-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-8">
      <h1 class="text-3xl font-bold tracking-tight">{{ title }}</h1>
      <p class="mt-3 inline-block rounded-card border border-dashed border-line bg-card px-4 py-3 text-sm text-muted">
        Módulo en construcción
      </p>
    </section>
  `,
})
export class ModulePlaceholderPage {
  protected readonly title: string = inject(ActivatedRoute).snapshot.data['title'] ?? '';
}
