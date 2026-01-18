import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePeriodoDto, UpdatePeriodoDto } from './dto';

@Injectable()
export class PeriodoService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePeriodoDto) {
    return this.prisma.periodoOtorgamiento.create({ data });
  }

  findAll() {
    return this.prisma.periodoOtorgamiento.findMany();
  }

  findOne(id: string) {
    return this.prisma.periodoOtorgamiento.findUnique({ where: { id } });
  }

  update(id: string, data: UpdatePeriodoDto) {
    return this.prisma.periodoOtorgamiento.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.periodoOtorgamiento.delete({ where: { id } });
  }
}
