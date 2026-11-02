import { Injectable, Logger } from '@nestjs/common';
import { IEvent } from './event.interface';
import { IObserver } from './observer.interface';

@Injectable()
export class EventDispatcher {
  private readonly logger = new Logger(EventDispatcher.name);
  private observers: Map<string, IObserver[]> = new Map();

  register(eventName: string, observer: IObserver): void {
    if (!this.observers.has(eventName)) {
      this.observers.set(eventName, []);
    }
    this.observers.get(eventName)!.push(observer);
    this.logger.log(`Observer registrado para evento: ${eventName}`);
  }

  async dispatch(event: IEvent): Promise<void> {
    const eventName = event.name;
    const observers = this.observers.get(eventName);
    if (!observers || observers.length === 0) {
      return;
    }
    this.logger.debug(
      `Dispatching event ${eventName} to ${observers.length} observers`,
    );
    // Un observador que falla no debe impedir los demás ni la operación de origen
    const resultados = await Promise.allSettled(
      observers.map((observer) => observer.handle(event)),
    );
    resultados.forEach((resultado) => {
      if (resultado.status === 'rejected') {
        this.logger.error(`Error en observador de ${eventName}`, resultado.reason);
      }
    });
  }
}
