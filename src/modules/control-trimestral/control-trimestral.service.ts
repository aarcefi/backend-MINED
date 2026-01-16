import { Injectable } from '@nestjs/common';
import { CreateControlTrimestralDto } from './dto/create-control-trimestral.dto';
import { UpdateControlTrimestralDto } from './dto/update-control-trimestral.dto';

@Injectable()
export class ControlTrimestralService {
  create(createControlTrimestralDto: CreateControlTrimestralDto) {
    return 'This action adds a new controlTrimestral';
  }

  findAll() {
    return `This action returns all controlTrimestral`;
  }

  findOne(id: number) {
    return `This action returns a #${id} controlTrimestral`;
  }

  update(id: number, updateControlTrimestralDto: UpdateControlTrimestralDto) {
    return `This action updates a #${id} controlTrimestral`;
  }

  remove(id: number) {
    return `This action removes a #${id} controlTrimestral`;
  }
}
