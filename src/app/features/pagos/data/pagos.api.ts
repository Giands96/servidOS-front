import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../../../core/http/api.config';
import { Pago, RegistrarPagoRequest } from '../pagos.types';

/** Payments access: charging an order. */
@Injectable({ providedIn: 'root' })
export class PagosApi {
  private readonly http = inject(HttpClient);

  /** Charges an order. Optional fields are sent only when defined (0 is a value). */
  registrar(req: RegistrarPagoRequest): Observable<Pago> {
    const body: RegistrarPagoRequest = { pedidoId: req.pedidoId, metodoPago: req.metodoPago };
    if (req.montoEntregado !== undefined) {
      body.montoEntregado = req.montoEntregado;
    }
    if (req.referenciaExterna !== undefined) {
      body.referenciaExterna = req.referenciaExterna;
    }
    return this.http.post<Pago>(`${API_BASE}/pagos`, body);
  }
}
