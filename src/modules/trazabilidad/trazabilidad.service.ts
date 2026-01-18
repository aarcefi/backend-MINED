import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTrazabilidadDto, UpdateTrazabilidadDto } from './dto';

@Injectable()
export class TrazabilidadService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTrazabilidadDto) {
    return this.prisma.trazabilidad.create({ data });
  }

  findAll() {
    return this.prisma.trazabilidad.findMany();
  }

  findOne(id: string) {
    return this.prisma.trazabilidad.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateTrazabilidadDto) {
    return this.prisma.trazabilidad.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.trazabilidad.delete({ where: { id } });
  }
}
