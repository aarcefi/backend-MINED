import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSolicitudDto, UpdateSolicitudDto } from './dto';

@Injectable()
export class SolicitudService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSolicitudDto) {
    return this.prisma.solicitud.create({ data });
  }

  findAll() {
    return this.prisma.solicitud.findMany();
  }

  findOne(id: string) {
    return this.prisma.solicitud.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateSolicitudDto) {
    return this.prisma.solicitud.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.solicitud.delete({ where: { id } });
  }
}
