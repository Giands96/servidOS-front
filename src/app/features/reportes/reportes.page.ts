import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Sales reports. Placeholder: the real screen (period, cards, tables, export) arrives with the next slice. */
@Component({
  selector: 'app-reportes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-4 sm:p-8">
      <h1 class="text-3xl font-bold tracking-tight">Reportes</h1>
    </section>
  `,
})
export class ReportesPage {}
