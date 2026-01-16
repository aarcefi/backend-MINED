import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DecisionService } from './decision.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';

@Controller('decision')
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Post()
  create(@Body() createDecisionDto: CreateDecisionDto) {
    return this.decisionService.create(createDecisionDto);
  }

  @Get()
  findAll() {
    return this.decisionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.decisionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDecisionDto: UpdateDecisionDto) {
    return this.decisionService.update(+id, updateDecisionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.decisionService.remove(+id);
  }
}
