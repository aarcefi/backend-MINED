/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

function normalizar(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

@Injectable()
export class ValidacionIdentidadService {
  private readonly logger = new Logger(ValidacionIdentidadService.name);
  constructor(private prisma: PrismaService) {}

  async verificarIdentidadCompleta(datos: {
    carnetIdentidad: string;
    nombre: string;
    apellidos: string;
  }): Promise<void> {
    const ciudadano = await this.prisma.ciudadano.findUnique({
      where: { carnetIdentidad: datos.carnetIdentidad },
    });

    if (!ciudadano) {
      throw new BadRequestException(
        'El carnet de identidad no está registrado en la ficha única',
      );
    }

    if (!ciudadano.nombre || !ciudadano.apellidos) {
      throw new BadRequestException(
        'El carnet de identidad existe en la ficha única pero sus datos personales están incompletos. Contacte al registro civil.',
      );
    }

    const nombreDb = normalizar(ciudadano.nombre);
    const apellidosDb = normalizar(ciudadano.apellidos);
    const nombreInput = normalizar(datos.nombre);
    const apellidosInput = normalizar(datos.apellidos);

    if (nombreDb !== nombreInput) {
      this.logger.warn(
        `Nombre no coincide para CI ${datos.carnetIdentidad}: ` +
          `ficha="${ciudadano.nombre}" vs input="${datos.nombre}"`,
      );
      throw new BadRequestException(
        'El nombre no coincide con el registrado en la ficha única',
      );
    }

    if (apellidosDb !== apellidosInput) {
      this.logger.warn(
        `Apellidos no coinciden para CI ${datos.carnetIdentidad}: ` +
          `ficha="${ciudadano.apellidos}" vs input="${datos.apellidos}"`,
      );
      throw new BadRequestException(
        'Los apellidos no coinciden con los registrados en la ficha única',
      );
    }
  }

  async verificarCarnetIdentidad(carnetIdentidad: string): Promise<boolean> {
    const ciudadano = await this.prisma.ciudadano.findUnique({
      where: { carnetIdentidad },
    });
    if (!ciudadano) {
      throw new NotFoundException(
        `El carnet de identidad ${carnetIdentidad} no está registrado en el sistema de validación.`,
      );
    }
    return true;
  }

  async obtenerCiudadano(carnetIdentidad: string) {
    const ciudadano = await this.prisma.ciudadano.findUnique({
      where: { carnetIdentidad },
    });
    if (!ciudadano) {
      throw new NotFoundException(
        `Ciudadano con carnet ${carnetIdentidad} no encontrado.`,
      );
    }
    return ciudadano;
  }

  // Solo el nombre: el formulario de inscripción lo propone a partir del carnet
  async obtenerNombre(carnetIdentidad: string) {
    const ciudadano = await this.prisma.ciudadano.findUnique({
      where: { carnetIdentidad },
      select: { nombre: true, apellidos: true },
    });
    if (!ciudadano) {
      throw new NotFoundException(
        `El carnet ${carnetIdentidad} no está en el registro de identidad.`,
      );
    }
    return ciudadano;
  }

  async cargarCiudadanos(data: any[]) {
    for (const item of data) {
      await this.prisma.ciudadano.upsert({
        where: { carnetIdentidad: item.carnetIdentidad },
        update: {
          nombre: item.nombre,
          apellidos: item.apellidos,
          fechaNacimiento: item.fechaNacimiento
            ? new Date(item.fechaNacimiento)
            : null,
        },
        create: {
          carnetIdentidad: item.carnetIdentidad,
          nombre: item.nombre,
          apellidos: item.apellidos,
          fechaNacimiento: item.fechaNacimiento
            ? new Date(item.fechaNacimiento)
            : null,
        },
      });
    }
    return { message: `${data.length} ciudadanos cargados/actualizados` };
  }
}
