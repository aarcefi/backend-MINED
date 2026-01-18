import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDocumentoDto, UpdateDocumentoDto } from './dto';

@Injectable()
export class DocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDocumentoDto) {
    return this.prisma.documentoSolicitud.create({ data });
  }

  findAll() {
    return this.prisma.documentoSolicitud.findMany();
  }

  findOne(id: string) {
    return this.prisma.documentoSolicitud.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateDocumentoDto) {
    return this.prisma.documentoSolicitud.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.documentoSolicitud.delete({ where: { id } });
  }
}
