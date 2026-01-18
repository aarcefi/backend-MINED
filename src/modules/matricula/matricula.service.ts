import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMatriculaDto, UpdateMatriculaDto } from './dto';

@Injectable()
export class MatriculaService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMatriculaDto) {
    return this.prisma.matricula.create({ data });
  }

  findAll() {
    return this.prisma.matricula.findMany();
  }

  findOne(id: string) {
    return this.prisma.matricula.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateMatriculaDto) {
    return this.prisma.matricula.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.matricula.delete({ where: { id } });
  }
}
