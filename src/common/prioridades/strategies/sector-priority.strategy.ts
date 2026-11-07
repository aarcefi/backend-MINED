import { PriorityStrategy, PriorityContext } from '../prioridad.interface';

export class SectorPriorityStrategy implements PriorityStrategy {
  private readonly sectorScores: Record<string, number> = {
    SALUD: 30,
    EDUCACION: 25,
    DEFENSA: 20,
    CASO_SOCIAL: 35,
    OTRO: 10,
  };

  private readonly pesosPrioritarios = [1000, 500, 250];

  calculate(context: PriorityContext): number {
    const config = context.configuracionPrioridad;
    if (config) {
      const priorizados = [config.sector1, config.sector2, config.sector3];
      const idx = priorizados.findIndex((s) => s && s === context.sector);
      if (idx !== -1) {
        return this.pesosPrioritarios[idx];
      }
    }
    return this.sectorScores[context.sector] || 10;
  }

  getName(): string {
    return 'SectorPriority';
  }
}
