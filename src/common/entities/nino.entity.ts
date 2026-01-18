import { Tutor } from './tutor.entity';
import { Solicitud } from './solicitud.entity';

export class Nino {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: Date;
  sexo: string;
  tarjetaMenor: string;
  tutorId: string;

  tutor?: Tutor;
  casoEspecial: boolean;
  tipoNecesidad?: string;
  solicitud?: Solicitud;
}
