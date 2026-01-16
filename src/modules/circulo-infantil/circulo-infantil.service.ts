import { Injectable } from '@nestjs/common';
import { CreateCirculoInfantilDto } from './dto/create-circulo-infantil.dto';
import { UpdateCirculoInfantilDto } from './dto/update-circulo-infantil.dto';

@Injectable()
export class CirculoInfantilService {
  create(createCirculoInfantilDto: CreateCirculoInfantilDto) {
    return 'This action adds a new circuloInfantil';
  }

  findAll() {
    return `This action returns all circuloInfantil`;
  }

  findOne(id: number) {
    return `This action returns a #${id} circuloInfantil`;
  }

  update(id: number, updateCirculoInfantilDto: UpdateCirculoInfantilDto) {
    return `This action updates a #${id} circuloInfantil`;
  }

  remove(id: number) {
    return `This action removes a #${id} circuloInfantil`;
  }
}
