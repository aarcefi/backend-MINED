import { PriorityStrategy, PriorityContext } from '../prioridad.interface';

export class CantHijosPriorityStrategy implements PriorityStrategy {
  calculate(context: PriorityContext): number {
    const cant = context.solicitante.cantHijos;
    return cant > 1 ? (cant - 1) * 5 : 0;
  }

  getName(): string {
    return 'CantHijosPriority';
  }
}
