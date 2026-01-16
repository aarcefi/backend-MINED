import { Injectable } from '@nestjs/common';
import { CreateCapacidadDto } from './dto/create-capacidad.dto';
import { UpdateCapacidadDto } from './dto/update-capacidad.dto';

@Injectable()
export class CapacidadService {
  create(createCapacidadDto: CreateCapacidadDto) {
    return 'This action adds a new capacidad';
  }

  findAll() {
    return `This action returns all capacidad`;
  }

  findOne(id: number) {
    return `This action returns a #${id} capacidad`;
  }

  update(id: number, updateCapacidadDto: UpdateCapacidadDto) {
    return `This action updates a #${id} capacidad`;
  }

  remove(id: number) {
    return `This action removes a #${id} capacidad`;
  }
}
