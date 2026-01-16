import { Injectable } from '@nestjs/common';
import { CreateSesionDto } from './dto/create-sesion.dto';
import { UpdateSesionDto } from './dto/update-sesion.dto';

@Injectable()
export class SesionService {
  create(createSesionDto: CreateSesionDto) {
    return 'This action adds a new sesion';
  }

  findAll() {
    return `This action returns all sesion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sesion`;
  }

  update(id: number, updateSesionDto: UpdateSesionDto) {
    return `This action updates a #${id} sesion`;
  }

  remove(id: number) {
    return `This action removes a #${id} sesion`;
  }
}
