/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
it('la regla de múltiples hijos supera al sector 1º', () => {
  const base = {
    tipoSolicitud: 'TRABAJADOR',
    nino: {},
    configuracionPrioridad: { sector1: 'SALUD', sector2: null, sector3: null },
  };
  const saludConUnHijo = calculator.calculatePriority({
    ...base,
    sector: 'SALUD',
    solicitante: { cantHijos: 1 },
  });
  const otroConDosHijos = calculator.calculatePriority({
    ...base,
    sector: 'OTRO',
    solicitante: { cantHijos: 2 },
  });
  expect(otroConDosHijos).toBeGreaterThan(saludConUnHijo);
});

it('entre sectores priorizados gana el 1º', () => {
  const ctx = (sector: string) => ({
    sector,
    tipoSolicitud: 'TRABAJADOR' as const,
    nino: {},
    solicitante: { cantHijos: 1 },
    configuracionPrioridad: {
      sector1: 'SALUD',
      sector2: 'EDUCACION',
      sector3: 'DEFENSA',
    },
  });
  const s1 = calculator.calculatePriority(ctx('SALUD'));
  const s2 = calculator.calculatePriority(ctx('EDUCACION'));
  const s3 = calculator.calculatePriority(ctx('DEFENSA'));
  const s4 = calculator.calculatePriority(ctx('OTRO'));
  expect(s1).toBeGreaterThan(s2);
  expect(s2).toBeGreaterThan(s3);
  expect(s3).toBeGreaterThan(s4);
});

it('sin config cae a pesos base', () => {
  const prio = calculator.calculatePriority({
    sector: 'SALUD',
    tipoSolicitud: 'TRABAJADOR',
    nino: {},
    solicitante: { cantHijos: 1 },
    configuracionPrioridad: null,
  });
  expect(prio).toBe(30 + 20); // sector base + tipo
});
