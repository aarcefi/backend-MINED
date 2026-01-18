import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateComisionDto, UpdateComisionDto } from './dto';

@Injectable()
export class ComisionService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateComisionDto) {
    return this.prisma.comision.create({ data });
  }

  findAll() {
    return this.prisma.comision.findMany();
  }

  findOne(id: string) {
    return this.prisma.comision.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateComisionDto) {
    return this.prisma.comision.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.comision.delete({ where: { id } });
  }
}
