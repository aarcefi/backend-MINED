import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { UbicacionService } from './ubicacion.service';

// Públicos: el formulario de registro los necesita antes de iniciar sesión
@ApiTags('Ubicación')
@Public()
@Controller('provincias')
export class UbicacionController {
  constructor(private readonly ubicacionService: UbicacionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar provincias' })
  @ApiResponse({ status: 200, description: 'Provincias ordenadas por nombre' })
  findProvincias() {
    return this.ubicacionService.findProvincias();
  }

  @Get(':id/municipios')
  @ApiOperation({ summary: 'Listar los municipios de una provincia' })
  @ApiParam({ name: 'id', description: 'ID de la provincia' })
  @ApiResponse({ status: 200, description: 'Municipios ordenados por nombre' })
  @ApiResponse({ status: 404, description: 'Provincia no encontrada' })
  findMunicipios(@Param('id', ParseUUIDPipe) id: string) {
    return this.ubicacionService.findMunicipios(id);
  }
}
