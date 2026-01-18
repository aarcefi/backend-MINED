import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCirculoInfantilDto, UpdateCirculoInfantilDto } from './dto';

@Injectable()
export class CirculoInfantilService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCirculoInfantilDto) {
    return this.prisma.circuloInfantil.create({ data });
  }

  findAll() {
    return this.prisma.circuloInfantil.findMany();
  }

  findOne(id: string) {
    return this.prisma.circuloInfantil.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateCirculoInfantilDto) {
    return this.prisma.circuloInfantil.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.circuloInfantil.delete({ where: { id } });
  }
}
