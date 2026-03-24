/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ValidacionIdentidadService {
  constructor(private prisma: PrismaService) {}

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
