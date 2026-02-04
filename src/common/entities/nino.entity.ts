import { PerfilSolicitante } from './perfil-solicitante.entity';
import { Solicitud } from './solicitud.entity';

export class Nino {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: Date;
  sexo: string;
  tarjetaMenor: string;
  solicitanteId: string;

  solicitante?: PerfilSolicitante;
  casoEspecial: boolean;
  tipoNecesidad?: string;
  solicitud?: Solicitud;
}
