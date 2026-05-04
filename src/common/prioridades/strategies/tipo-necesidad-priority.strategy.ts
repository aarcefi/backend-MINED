import { PriorityStrategy, PriorityContext } from '../prioridad.interface';

export class TipoNecesidadPriorityStrategy implements PriorityStrategy {
  calculate(context: PriorityContext): number {
    return context.nino.tipoNecesidad ? 10 : 0;
  }

  getName(): string {
    return 'TipoNecesidadPriority';
  }
}
