import { PriorityCalculator } from './prioridad-calc.service.';

describe('PriorityCalculator', () => {
  let calculator: PriorityCalculator;

  beforeEach(() => {
    calculator = new PriorityCalculator();
  });

  it('should sum all strategies correctly', () => {
    const context = {
      sector: 'SALUD',
      tipoSolicitud: 'TRABAJADOR',
      nino: { casoEspecial: true, tipoNecesidad: 'DISCAPACIDAD' },
      solicitante: { cantHijos: 2 },
    };
    const priority = calculator.calculatePriority(context);
    // SALUD=30, TRABAJADOR=20, casoEspecial=15, tipoNecesidad=10, hijos=5
    expect(priority).toBe(80);
  });

  it('should return breakdown of each strategy', () => {
    const context = {
      sector: 'EDUCACION',
      tipoSolicitud: 'ESTUDIANTE',
      nino: { casoEspecial: false },
      solicitante: { cantHijos: 1 },
    };
    const breakdown = calculator.getPriorityBreakdown(context);
    expect(breakdown).toHaveProperty('SectorPriority');
    expect(breakdown).toHaveProperty('TipoSolicitudPriority');
    expect(breakdown).toHaveProperty('CasoEspecialPriority');
    expect(breakdown).toHaveProperty('TipoNecesidadPriority');
    expect(breakdown).toHaveProperty('CantHijosPriority');
  });

  it('should register new strategy dynamically', () => {
    const mockStrategy = {
      calculate: jest.fn().mockReturnValue(10),
      getName: () => 'MockStrategy',
    };
    calculator.registerStrategy(mockStrategy);
    const context = {
      sector: 'OTRO',
      tipoSolicitud: 'ESTUDIANTE',
      nino: {},
      solicitante: { cantHijos: 1 },
    };
    calculator.calculatePriority(context);
    expect(mockStrategy.calculate).toHaveBeenCalledWith(context);
  });
});
