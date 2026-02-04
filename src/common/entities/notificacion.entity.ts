import { Usuario } from './usuario.entity';

export class Notificacion {
  id: string;
  usuarioId: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: Date;
  tipo: string;

  usuario?: Usuario;
}
