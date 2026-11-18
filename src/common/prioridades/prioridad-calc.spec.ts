/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PriorityCalculator } from './prioridad-calc.service.';
import { PriorityContext } from './prioridad.interface';

describe('PriorityCalculator', () => {
  let calculator: PriorityCalculator;

  const baseContext = (
    over: Partial<PriorityContext> = {},
  ): PriorityContext => ({
    sector: 'OTRO',
    tipoSolicitud: 'TRABAJADOR',
    nino: {},
    solicitante: { cantHijos: 1 },
    configuracionPrioridad: null,
    ...over,
  });

  beforeEach(() => {
    calculator = new PriorityCalculator();
  });

  it('suma todas las estrategias (sin config)', () => {
    const ctx = baseContext({
      sector: 'SALUD',
      nino: { casoEspecial: true, tipoNecesidad: 'X' },
      solicitante: { cantHijos: 2 },
    });
    // 30 (SALUD) + 20 (TRAB) + 15 (caso) + 10 (necesidad) + 5 (hijo extra) + 2000 (multiples hijos)
    expect(calculator.calculatePriority(ctx)).toBe(2080);
  });

  it('sin configuracionPrioridad usa pesos base (OTRO → 10)', () => {
    expect(calculator.calculatePriority(baseContext())).toBe(10 + 20);
  });

  it('respeta el orden 1º > 2º > 3º > resto con config', () => {
    const withCfg = (sector: string) =>
      baseContext({
        sector,
        configuracionPrioridad: {
          sector1: 'SALUD',
          sector2: 'EDUCACION',
          sector3: 'DEFENSA',
        },
      });
    const s1 = calculator.calculatePriority(withCfg('SALUD'));
    const s2 = calculator.calculatePriority(withCfg('EDUCACION'));
    const s3 = calculator.calculatePriority(withCfg('DEFENSA'));
    const s4 = calculator.calculatePriority(withCfg('OTRO'));
    expect(s1).toBeGreaterThan(s2);
    expect(s2).toBeGreaterThan(s3);
    expect(s3).toBeGreaterThan(s4);
  });

  it('múltiples hijos supera al sector 1º', () => {
    const unHijoSalud = calculator.calculatePriority(
      baseContext({
        sector: 'SALUD',
        solicitante: { cantHijos: 1 },
        configuracionPrioridad: { sector1: 'SALUD' },
      }),
    );
    const dosHijosOtro = calculator.calculatePriority(
      baseContext({
        sector: 'OTRO',
        solicitante: { cantHijos: 2 },
        configuracionPrioridad: { sector1: 'SALUD' },
      }),
    );
    expect(dosHijosOtro).toBeGreaterThan(unHijoSalud);
  });

  it('con config donde el sector no está priorizado → peso base', () => {
    const score = calculator.calculatePriority(
      baseContext({
        sector: 'OTRO',
        configuracionPrioridad: { sector1: 'SALUD' },
      }),
    );
    expect(score).toBe(10 + 20);
  });

  it('getPriorityBreakdown devuelve una clave por estrategia', () => {
    const breakdown = calculator.getPriorityBreakdown(baseContext());
    expect(Object.keys(breakdown).sort()).toEqual([
      'CantHijosPriority',
      'CasoEspecialPriority',
      'MultiplesHijosEdadCirculoPriority',
      'SectorPriority',
      'TipoNecesidadPriority',
      'TipoSolicitudPriority',
    ]);
  });

  it('registerStrategy añade una estrategia dinámica', () => {
    const custom = {
      calculate: jest.fn().mockReturnValue(7),
      getName: () => 'X',
    };
    calculator.registerStrategy(custom);
    calculator.calculatePriority(baseContext());
    expect(custom.calculate).toHaveBeenCalled();
  });

  it('removeStrategy elimina por nombre y devuelve true/false', () => {
    expect(calculator.removeStrategy('SectorPriority')).toBe(true);
    expect(calculator.removeStrategy('NoExiste')).toBe(false);
    const breakdown = calculator.getPriorityBreakdown(baseContext());
    expect(breakdown).not.toHaveProperty('SectorPriority');
  });

    // ── ramas de las strategies ────────────────────────────────
  it('tipoSolicitud desconocido cae al peso base 15', () => {
    const prio = calculator.calculatePriority(
      baseContext({ tipoSolicitud: 'NO_EXISTE' }),
    );
    // OTRO=10 base + 15 default de tipo + 0 resto (cantHijos=1)
    expect(prio).toBe(25);
  });

  it('sector desconocido cae al peso base 10', () => {
    const prio = calculator.calculatePriority(
      baseContext({ sector: 'INVENTADO' }),
    );
    // 10 default + 20 (TRABAJADOR)
    expect(prio).toBe(30);
  });

  it('cantHijos undefined no rompe la strategy de múltiples hijos', () => {
    const prio = calculator.calculatePriority(
      baseContext({ solicitante: {} as any }),
    );
    // Sin cantHijos: 10 + 20 + 0 = 30
    expect(prio).toBe(30);
  });
});
