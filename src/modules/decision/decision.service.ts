import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDecisionDto, UpdateDecisionDto } from './dto';

@Injectable()
export class DecisionSolicitudService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDecisionDto) {
    return this.prisma.decisionSolicitud.create({ data });
  }

  findAll() {
    return this.prisma.decisionSolicitud.findMany();
  }

  findOne(id: string) {
    return this.prisma.decisionSolicitud.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateDecisionDto) {
    return this.prisma.decisionSolicitud.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.decisionSolicitud.delete({ where: { id } });
  }
}
