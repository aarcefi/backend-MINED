import { PriorityStrategy, PriorityContext } from '../prioridad.interface';

export class CasoEspecialPriorityStrategy implements PriorityStrategy {
  calculate(context: PriorityContext): number {
    return context.nino.casoEspecial ? 15 : 0;
  }

  getName(): string {
    return 'CasoEspecialPriority';
  }
}
