import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNinoDto, UpdateNinoDto } from './dto';

@Injectable()
export class NinoService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateNinoDto) {
    return this.prisma.nino.create({ data });
  }

  findAll() {
    return this.prisma.nino.findMany();
  }

  findOne(id: string) {
    return this.prisma.nino.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateNinoDto) {
    return this.prisma.nino.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.nino.delete({ where: { id } });
  }
}
