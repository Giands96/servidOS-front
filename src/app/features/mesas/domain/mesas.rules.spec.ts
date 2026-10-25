import { aMesa } from '../../../../testing/builders';
import {
  accionesMesa,
  actualizadoHace,
  conteoMesas,
  draftFromMesa,
  emptyMesaDraft,
  filtrarPorEstado,
  mesaFieldErrors,
  mesaOcupadaMessage,
  ocupacionLabel,
  opcionesComensales,
  previewOcupar,
  toGuardarMesaRequest,
  validateMesaDraft,
} from './mesas.rules';

describe('emptyMesaDraft / draftFromMesa', () => {
  it('starts empty and loads a table as raw text', () => {
    expect(emptyMesaDraft()).toEqual({ numero: '', capacidad: '' });
    expect(draftFromMesa(aMesa({ numero: 7, capacidad: 8 }))).toEqual({ numero: '7', capacidad: '8' });
  });
});

describe('validateMesaDraft', () => {
  it('accepts positive integers, trimming spaces', () => {
    expect(validateMesaDraft({ numero: ' 15 ', capacidad: '4' })).toEqual({});
  });

  it('asks for a number greater than 0 (design copy)', () => {
    for (const numero of ['', '0', '-3', '2.5', 'abc']) {
      expect(validateMesaDraft({ numero, capacidad: '4' }).numero).toBe('Debe ser un entero mayor a 0');
    }
  });

  it('asks for the seats when the capacity is empty, and for an integer > 0 otherwise', () => {
    expect(validateMesaDraft({ numero: '1', capacidad: ' ' }).capacidad).toBe('Ingresá la cantidad de asientos');
    for (const capacidad of ['0', '-1', '3.5', 'x']) {
      expect(validateMesaDraft({ numero: '1', capacidad }).capacidad).toBe('Debe ser un entero mayor a 0');
    }
  });

  it('reports both fields at once', () => {
    expect(validateMesaDraft(emptyMesaDraft())).toEqual({
      numero: 'Debe ser un entero mayor a 0',
      capacidad: 'Ingresá la cantidad de asientos',
    });
  });
});

describe('toGuardarMesaRequest', () => {
  it('parses the trimmed numbers', () => {
    expect(toGuardarMesaRequest({ numero: ' 15', capacidad: '6 ' })).toEqual({ numero: 15, capacidad: 6 });
  });

  it('throws for an invalid draft (the page validates first)', () => {
    expect(() => toGuardarMesaRequest({ numero: '0', capacidad: '4' })).toThrow();
  });
});

describe('mesaFieldErrors', () => {
  it('puts a duplicate number (400) under numero', () => {
    expect(mesaFieldErrors(400, 'La mesa 4 ya existe para este restaurante')).toEqual({
      numero: 'La mesa 4 ya existe para este restaurante',
    });
  });

  it('puts a capacity below the seated guests (400) under capacidad', () => {
    const message = 'La capacidad no puede ser menor a los comensales actuales (3)';
    expect(mesaFieldErrors(400, message)).toEqual({ capacidad: message });
  });

  it('maps a 422 "campo: mensaje; campo: mensaje" per field and drops unknown fields', () => {
    expect(mesaFieldErrors(422, 'numero: debe ser mayor que 0; capacidad: no debe ser nulo; otro: x')).toEqual({
      numero: 'debe ser mayor que 0',
      capacidad: 'no debe ser nulo',
    });
  });

  it('returns {} for other errors or no message (the page shows a toast)', () => {
    expect(mesaFieldErrors(400, 'La mesa no existe')).toEqual({});
    expect(mesaFieldErrors(500, 'boom')).toEqual({});
    expect(mesaFieldErrors(400, null)).toEqual({});
  });
});

describe('ocupacionLabel', () => {
  it('shows guests over capacity, or a dash when the guests are unknown', () => {
    expect(ocupacionLabel(aMesa({ estado: 'OCUPADA', comensales: 3, capacidad: 4 }))).toBe('3/4 comensales');
    expect(ocupacionLabel(aMesa({ estado: 'OCUPADA', comensales: null, capacidad: 4 }))).toBe('–/4 comensales');
    expect(ocupacionLabel(aMesa({ estado: 'LIBRE', comensales: null, capacidad: 6 }))).toBe('–/6 comensales');
  });
});

describe('accionesMesa', () => {
  const todos = { operar: true, gestionar: true };

  it('a free table offers Ocupar, edit and an enabled baja to an admin', () => {
    expect(accionesMesa(aMesa({ estado: 'LIBRE' }), todos)).toEqual({
      ocupar: true,
      liberar: false,
      editar: true,
      darDeBaja: { visible: true, habilitada: true, motivo: null },
    });
  });

  it('an occupied table offers Liberar and disables the baja with the backend reason', () => {
    expect(accionesMesa(aMesa({ estado: 'OCUPADA', comensales: 2 }), todos)).toEqual({
      ocupar: false,
      liberar: true,
      editar: true,
      darDeBaja: { visible: true, habilitada: false, motivo: 'No se puede dar de baja una mesa ocupada' },
    });
  });

  it('a role that only operates (recepción, mesero) sees no edit nor baja', () => {
    expect(accionesMesa(aMesa({ estado: 'LIBRE' }), { operar: true, gestionar: false })).toEqual({
      ocupar: true,
      liberar: false,
      editar: false,
      darDeBaja: { visible: false, habilitada: false, motivo: null },
    });
  });

  it('a read-only role (cajero) gets no action at all', () => {
    expect(accionesMesa(aMesa({ estado: 'OCUPADA' }), { operar: false, gestionar: false })).toEqual({
      ocupar: false,
      liberar: false,
      editar: false,
      darDeBaja: { visible: false, habilitada: false, motivo: null },
    });
  });
});

describe('opcionesComensales / previewOcupar', () => {
  it('offers 1..capacidad, never less than one chip', () => {
    expect(opcionesComensales(4)).toEqual([1, 2, 3, 4]);
    expect(opcionesComensales(0)).toEqual([1]);
  });

  it('previews the occupation (design copy)', () => {
    expect(previewOcupar(aMesa({ capacidad: 8 }), 4)).toBe('La mesa quedará OCUPADA con 4/8 comensales');
  });
});

describe('mesaOcupadaMessage', () => {
  it('matches the design toast, singular for one guest', () => {
    expect(mesaOcupadaMessage(aMesa({ numero: 8 }), 2)).toBe('Mesa 8 ocupada · 2 comensales sentados');
    expect(mesaOcupadaMessage(aMesa({ numero: 8 }), 1)).toBe('Mesa 8 ocupada · 1 comensal sentado');
  });
});

describe('actualizadoHace', () => {
  const at = new Date('2026-10-25T12:00:00');

  it('counts seconds under a minute and minutes after that', () => {
    expect(actualizadoHace(new Date('2026-10-25T11:59:25'), at)).toBe('Actualizado hace 35 s');
    expect(actualizadoHace(at, at)).toBe('Actualizado hace 0 s');
    expect(actualizadoHace(new Date('2026-10-25T11:57:30'), at)).toBe('Actualizado hace 2 min');
  });

  it('never goes negative when the clock is behind', () => {
    expect(actualizadoHace(new Date('2026-10-25T12:00:10'), at)).toBe('Actualizado hace 0 s');
  });
});

describe('conteoMesas / filtrarPorEstado', () => {
  const mesas = [
    aMesa({ mesaId: 1, estado: 'LIBRE' }),
    aMesa({ mesaId: 2, estado: 'OCUPADA' }),
    aMesa({ mesaId: 3, estado: 'OCUPADA' }),
  ];

  it('counts all, free and occupied tables', () => {
    expect(conteoMesas(mesas)).toEqual({ TODAS: 3, LIBRES: 1, OCUPADAS: 2 });
    expect(conteoMesas([])).toEqual({ TODAS: 0, LIBRES: 0, OCUPADAS: 0 });
  });

  it('filters by the segmented control', () => {
    expect(filtrarPorEstado(mesas, 'TODAS').map((m) => m.mesaId)).toEqual([1, 2, 3]);
    expect(filtrarPorEstado(mesas, 'LIBRES').map((m) => m.mesaId)).toEqual([1]);
    expect(filtrarPorEstado(mesas, 'OCUPADAS').map((m) => m.mesaId)).toEqual([2, 3]);
  });
});
