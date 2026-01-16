import { Module } from '@nestjs/common';
//import { PrismaService } from '../prisma/prisma.service';
import { TutorModule } from './modules/tutor/tutor.module';
import { NinoModule } from './modules/nino/nino.module';
import { SolicitudModule } from './modules/solicitud/solicitud.module';
import { CirculoInfantilModule } from './modules/circulo-infantil/circulo-infantil.module';
import { PeriodoModule } from './modules/periodo/periodo.module';
import { CapacidadModule } from './modules/capacidad/capacidad.module';
import { DocumentoModule } from './modules/documento/documento.module';
import { ComisionModule } from './modules/comision/comision.module';
import { SesionModule } from './modules/sesion/sesion.module';
import { DecisionModule } from './modules/decision/decision.module';
import { MatriculaModule } from './modules/matricula/matricula.module';
import { ControlTrimestralModule } from './modules/control-trimestral/control-trimestral.module';
import { TrazabilidadModule } from './modules/trazabilidad/trazabilidad.module';

@Module({
  imports: [
    TutorModule,
    NinoModule,
    SolicitudModule,
    CirculoInfantilModule,
    PeriodoModule,
    CapacidadModule,
    DocumentoModule,
    ComisionModule,
    SesionModule,
    DecisionModule,
    MatriculaModule,
    ControlTrimestralModule,
    TrazabilidadModule,
  ],
  //providers: [PrismaService],
})
export class AppModule {}
