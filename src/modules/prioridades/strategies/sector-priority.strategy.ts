import { PriorityStrategy, PriorityContext } from '../prioridad.interface';

export class SectorPriorityStrategy implements PriorityStrategy {
  private readonly sectorScores: Record<string, number> = {
    SALUD: 30,
    EDUCACION: 25,
    DEFENSA: 20,
    CASO_SOCIAL: 35,
    OTRO: 10,
  };

  calculate(context: PriorityContext): number {
    return this.sectorScores[context.sector] || 10;
  }

  getName(): string {
    return 'SectorPriority';
  }
}
