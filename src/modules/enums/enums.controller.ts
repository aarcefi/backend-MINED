/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { EnumsService } from './enums.service';
import { AddEnumValueDto, UpdateEnumValueDto } from './dto/enum-value.dto';

@ApiTags('Enums')
@ApiBearerAuth()
@Controller('enums')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR)
export class EnumsController {
  constructor(private readonly enumsService: EnumsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los enums disponibles' })
  getAllEnums() {
    return this.enumsService.getAllEnums();
  }

  @Get(':enumName')
  @ApiOperation({ summary: 'Obtener un enum específico por nombre' })
  @ApiParam({ name: 'enumName', description: 'Nombre del enum' })
  getEnumByName(@Param('enumName') enumName: string) {
    const result = this.enumsService.getEnumByName(enumName);
    if (!result) {
      return { message: `Enum ${enumName} no encontrado` };
    }
    return result;
  }

  @Get(':enumName/options')
  @ApiOperation({ summary: 'Obtener opciones formateadas para selects' })
  @ApiParam({ name: 'enumName', description: 'Nombre del enum' })
  getEnumOptions(@Param('enumName') enumName: string) {
    const result = this.enumsService.getEnumOptions(enumName);
    if (!result) {
      return { message: `Enum ${enumName} no encontrado` };
    }
    return result;
  }

  @Get('validate/:enumName/:value')
  @ApiOperation({ summary: 'Validar si un valor pertenece a un enum' })
  @ApiParam({ name: 'enumName', description: 'Nombre del enum' })
  @ApiParam({ name: 'value', description: 'Valor a validar' })
  validateEnumValue(
    @Param('enumName') enumName: string,
    @Param('value') value: string,
  ) {
    const isValid = this.enumsService.validateEnumValue(enumName, value);
    return {
      valid: isValid,
      enumName,
      value,
      message: isValid
        ? `El valor ${value} es válido para el enum ${enumName}`
        : `El valor ${value} no es válido para el enum ${enumName}`,
    };
  }

  @Post(':enumName')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar un nuevo valor al enum' })
  @ApiParam({ name: 'enumName', description: 'Nombre del enum' })
  @ApiBody({ type: AddEnumValueDto })
  addEnumValue(
    @Param('enumName') enumName: string,
    @Body() dto: AddEnumValueDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.enumsService.addEnumValue(enumName, dto.value, userId);
  }

  @Put(':enumName/:oldValue')
  @ApiOperation({ summary: 'Actualizar un valor existente del enum' })
  @ApiParam({ name: 'enumName', description: 'Nombre del enum' })
  @ApiParam({ name: 'oldValue', description: 'Valor actual a actualizar' })
  @ApiBody({ type: UpdateEnumValueDto })
  updateEnumValue(
    @Param('enumName') enumName: string,
    @Param('oldValue') oldValue: string,
    @Body() dto: UpdateEnumValueDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.enumsService.updateEnumValue(
      enumName,
      oldValue,
      dto.newValue,
      userId,
    );
  }

  @Delete(':enumName/:value')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un valor del enum' })
  @ApiParam({ name: 'enumName', description: 'Nombre del enum' })
  @ApiParam({ name: 'value', description: 'Valor a eliminar' })
  deleteEnumValue(
    @Param('enumName') enumName: string,
    @Param('value') value: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.enumsService.deleteEnumValue(enumName, value, userId);
  }
}
