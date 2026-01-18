import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateControlTrimestralDto, UpdateControlTrimestralDto } from './dto';

@Injectable()
export class ControlTrimestralService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateControlTrimestralDto) {
    return this.prisma.controlTrimestral.create({ data });
  }

  findAll() {
    return this.prisma.controlTrimestral.findMany();
  }

  findOne(id: string) {
    return this.prisma.controlTrimestral.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateControlTrimestralDto) {
    return this.prisma.controlTrimestral.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.controlTrimestral.delete({ where: { id } });
  }
}
