import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DecisionSolicitudService } from './decision.service';
import { CreateDecisionDto, UpdateDecisionDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('decision-solicitud')
@Controller('decision-solicitud')
export class DecisionSolicitudController {
  constructor(private readonly service: DecisionSolicitudService) {}

  @Post()
  create(@Body() dto: CreateDecisionDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDecisionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
