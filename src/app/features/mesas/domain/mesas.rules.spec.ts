import { aMe, aMesa } from '../../../../testing/builders';
import {
  accionesMesa,
  actualizadoHace,
  conteoMesas,
  draftFromMesa,
  emptyMesaDraft,
  falloLiberar,
  filtrarPorEstado,
  mesaFieldErrors,
  mesaBajaMessage,
  mesaGuardadaMessage,
  mesaLiberadaMessage,
  mesaReactivadaMessage,
  mesaOcupadaMessage,
  mesasPermisos,
  ocupacionLabel,
  opcionesComensales,
  previewOcupar,
  reactivarFalloMensaje,
  toGuardarMesaRequest,
  upsertMesa,
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

describe('mesasPermisos', () => {
  const blocked = { suscripcion: null };

  it('an admin operates, manages and sees the inactive tables', () => {
    expect(mesasPermisos(aMe({ rol: 'ADMINISTRADOR' }))).toEqual({
      operar: true,
      gestionar: true,
      verInactivas: true,
      bloqueado: false,
      soloLectura: false,
    });
  });

  it('recepción and mesero only operate', () => {
    for (const rol of ['RECEPCION', 'MESERO'] as const) {
      expect(mesasPermisos(aMe({ rol }))).toEqual({
        operar: true,
        gestionar: false,
        verInactivas: false,
        bloqueado: false,
        soloLectura: false,
      });
    }
  });

  it('cajero is read-only (design chip "Solo lectura")', () => {
    expect(mesasPermisos(aMe({ rol: 'CAJERO' }))).toEqual({
      operar: false,
      gestionar: false,
      verInactivas: false,
      bloqueado: false,
      soloLectura: true,
    });
  });

  it('a blocked tenant keeps reading (inactive list included) but loses every write', () => {
    expect(mesasPermisos(aMe({ rol: 'ADMINISTRADOR', ...blocked }))).toEqual({
      operar: false,
      gestionar: false,
      verInactivas: true,
      bloqueado: true,
      soloLectura: false,
    });
  });

  it('a blocked cajero is not flagged as blocked: it could not write anyway', () => {
    expect(mesasPermisos(aMe({ rol: 'CAJERO', ...blocked })).bloqueado).toBe(false);
  });

  it('no session gets nothing', () => {
    expect(mesasPermisos(null)).toEqual({
      operar: false,
      gestionar: false,
      verInactivas: false,
      bloqueado: false,
      soloLectura: true,
    });
  });
});

describe('mesaGuardadaMessage', () => {
  it('confirms a created and an edited table by number', () => {
    expect(mesaGuardadaMessage(aMesa({ numero: 15 }), 'crear')).toBe('Mesa 15 creada');
    expect(mesaGuardadaMessage(aMesa({ numero: 3 }), 'editar')).toBe('Mesa 3 actualizada');
  });
});

describe('upsertMesa', () => {
  const mesas = [aMesa({ mesaId: 1, numero: 1 }), aMesa({ mesaId: 2, numero: 4 })];

  it('adds a new table in number order', () => {
    expect(upsertMesa(mesas, aMesa({ mesaId: 9, numero: 2 })).map((m) => m.numero)).toEqual([1, 2, 4]);
  });

  it('replaces an edited table and re-sorts when its number changed', () => {
    const result = upsertMesa(mesas, aMesa({ mesaId: 1, numero: 7, capacidad: 6 }));
    expect(result.map((m) => [m.mesaId, m.numero])).toEqual([
      [2, 4],
      [1, 7],
    ]);
    expect(result.find((m) => m.mesaId === 1)?.capacidad).toBe(6);
  });

  it('does not mutate the given list', () => {
    upsertMesa(mesas, aMesa({ mesaId: 9, numero: 2 }));
    expect(mesas.map((m) => m.mesaId)).toEqual([1, 2]);
  });
});

describe('falloLiberar', () => {
  it('a 400 about open orders opens the "No se pudo liberar" dialog', () => {
    expect(falloLiberar(400, 'La mesa tiene pedidos abiertos')).toBe('pedidos-abiertos');
  });

  it('any other failure is a toast', () => {
    expect(falloLiberar(400, 'La mesa ya está libre')).toBe('otro');
    expect(falloLiberar(500, 'La mesa tiene pedidos abiertos')).toBe('otro');
    expect(falloLiberar(400, null)).toBe('otro');
  });
});

describe('mesaLiberadaMessage', () => {
  it('confirms the freed table by number', () => {
    expect(mesaLiberadaMessage(aMesa({ numero: 2 }))).toBe('Mesa 2 liberada');
  });
});

describe('mesaBajaMessage / mesaReactivadaMessage', () => {
  it('confirms by number', () => {
    expect(mesaBajaMessage(aMesa({ numero: 9 }))).toBe('Mesa 9 dada de baja');
    expect(mesaReactivadaMessage(aMesa({ numero: 3 }))).toBe('Mesa 3 reactivada');
  });
});

describe('reactivarFalloMensaje', () => {
  it('adds the design hint when the number is now used by an active table', () => {
    expect(reactivarFalloMensaje('La mesa 3 ya existe para este restaurante')).toBe(
      'La mesa 3 ya existe para este restaurante. Editá el número de la mesa activa o mantené esta dada de baja.',
    );
  });

  it('keeps any other backend message as is, and falls back when there is none', () => {
    expect(reactivarFalloMensaje('La mesa ya está activa')).toBe('La mesa ya está activa');
    expect(reactivarFalloMensaje(null)).toBe('Revisa tu conexión e inténtalo de nuevo.');
  });
});
