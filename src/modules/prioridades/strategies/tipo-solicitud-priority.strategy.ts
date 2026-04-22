import { PriorityStrategy, PriorityContext } from '../prioridad.interface';

export class TipoSolicitudPriorityStrategy implements PriorityStrategy {
  private readonly tipoScores: Record<string, number> = {
    TRABAJADOR: 20,
    ESTUDIANTE: 25,
    CASO_SOCIAL: 30,
  };

  calculate(context: PriorityContext): number {
    return this.tipoScores[context.tipoSolicitud] || 15;
  }

  getName(): string {
    return 'TipoSolicitudPriority';
  }
}
