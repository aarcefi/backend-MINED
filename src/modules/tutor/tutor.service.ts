import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTutorDto, UpdateTutorDto } from './dto';

@Injectable()
export class TutorService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTutorDto) {
    return this.prisma.tutor.create({ data });
  }

  findAll() {
    return this.prisma.tutor.findMany();
  }

  findOne(id: string) {
    return this.prisma.tutor.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateTutorDto) {
    return this.prisma.tutor.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.tutor.delete({ where: { id } });
  }
}
