import { Injectable } from '@nestjs/common';
import { PriorityStrategy, PriorityContext } from './prioridad.interface';
import { SectorPriorityStrategy } from './strategies/sector-priority.strategy';
import { TipoSolicitudPriorityStrategy } from './strategies/tipo-solicitud-priority.strategy';
import { CasoEspecialPriorityStrategy } from './strategies/caso-especial-priority.strategy';
import { TipoNecesidadPriorityStrategy } from './strategies/tipo-necesidad-priority.strategy';
import { CantHijosPriorityStrategy } from './strategies/cant-hijos-priority.strategy';

@Injectable()
export class PriorityCalculator {
  private strategies: PriorityStrategy[] = [];

  constructor() {
    // Registrar todas las estrategias por defecto
    this.registerStrategy(new SectorPriorityStrategy());
    this.registerStrategy(new TipoSolicitudPriorityStrategy());
    this.registerStrategy(new CasoEspecialPriorityStrategy());
    this.registerStrategy(new TipoNecesidadPriorityStrategy());
    this.registerStrategy(new CantHijosPriorityStrategy());
  }

  /**
   * Permite registrar nuevas estrategias dinámicamente
   */
  registerStrategy(strategy: PriorityStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Elimina una estrategia por nombre
   */
  removeStrategy(name: string): boolean {
    const index = this.strategies.findIndex((s) => s.getName() === name);
    if (index !== -1) {
      this.strategies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Calcula la prioridad total sumando los puntajes de todas las estrategias
   */
  calculatePriority(context: PriorityContext): number {
    let total = 0;
    for (const strategy of this.strategies) {
      total += strategy.calculate(context);
    }
    return total;
  }

  /**
   * Obtiene el desglose de prioridades
   */
  getPriorityBreakdown(context: PriorityContext): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const strategy of this.strategies) {
      breakdown[strategy.getName()] = strategy.calculate(context);
    }
    return breakdown;
  }
}
