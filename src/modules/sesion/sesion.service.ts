import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSesionDto, UpdateSesionDto } from './dto';

@Injectable()
export class SesionComisionService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSesionDto) {
    return this.prisma.sesionComision.create({ data });
  }

  findAll() {
    return this.prisma.sesionComision.findMany();
  }

  findOne(id: string) {
    return this.prisma.sesionComision.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateSesionDto) {
    return this.prisma.sesionComision.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.sesionComision.delete({ where: { id } });
  }
}
