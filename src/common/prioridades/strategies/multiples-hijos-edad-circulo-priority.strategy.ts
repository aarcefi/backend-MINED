import { PriorityStrategy, PriorityContext } from '../prioridad.interface';

export class MultiplesHijosEdadCirculoPriorityStrategy implements PriorityStrategy {
  private readonly PESO = 2000;

  calculate(context: PriorityContext): number {
    return (context.solicitante.cantHijos ?? 0) > 1 ? this.PESO : 0;
  }

  getName(): string {
    return 'MultiplesHijosEdadCirculoPriority';
  }
}
