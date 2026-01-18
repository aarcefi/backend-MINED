import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCapacidadDto, UpdateCapacidadDto } from './dto';

@Injectable()
export class CapacidadCirculoService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCapacidadDto) {
    return this.prisma.capacidadCirculo.create({ data });
  }

  findAll() {
    return this.prisma.capacidadCirculo.findMany();
  }

  findOne(id: string) {
    return this.prisma.capacidadCirculo.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateCapacidadDto) {
    return this.prisma.capacidadCirculo.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.capacidadCirculo.delete({ where: { id } });
  }
}
