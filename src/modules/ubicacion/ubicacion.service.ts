import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UbicacionService {
  constructor(private readonly prisma: PrismaService) {}

  findProvincias() {
    return this.prisma.provincia.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findMunicipios(provinciaId: string) {
    const provincia = await this.prisma.provincia.findUnique({
      where: { id: provinciaId },
      select: { id: true },
    });
    if (!provincia) {
      throw new NotFoundException(
        `Provincia con ID ${provinciaId} no encontrada`,
      );
    }
    return this.prisma.municipio.findMany({
      where: { provinciaId },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
