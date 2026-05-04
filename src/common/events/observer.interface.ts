import { IEvent } from './event.interface';

export interface IObserver {
  handle(event: IEvent): Promise<void>;
}
