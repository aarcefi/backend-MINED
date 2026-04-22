import { PriorityCalculator } from './prioridad-calc.service.';

describe('PriorityCalculator', () => {
  let calculator: PriorityCalculator;

  beforeEach(() => {
    calculator = new PriorityCalculator();
  });

  it('debería calcular prioridad sumando todas las estrategias', () => {
    const context = {
      sector: 'SALUD',
      tipoSolicitud: 'TRABAJADOR',
      nino: { casoEspecial: true, tipoNecesidad: 'DISCAPACIDAD' },
      solicitante: { cantHijos: 2 },
    };
    const priority = calculator.calculatePriority(context);
    // SALUD=30, TRABAJADOR=20, casoEspecial=15, tipoNecesidad=10, cantHijos=5 => total 80
    expect(priority).toBe(80);
  });

  it('debería registrar nuevas estrategias dinámicamente', () => {
    const mockStrategy = {
      calculate: jest.fn().mockReturnValue(5),
      getName: () => 'Mock',
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
