/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TutorModule } from './modules/tutor/tutor.module';
import { NinoModule } from './modules/nino/nino.module';
import { SolicitudModule } from './modules/solicitud/solicitud.module';
import { DocumentoModule } from './modules/documento/documento.module';
import { CirculoInfantilModule } from './modules/circulo-infantil/circulo-infantil.module';
import { PeriodoOtorgamientoModule } from './modules/periodo/periodo.module';
import { CapacidadCirculoModule } from './modules/capacidad/capacidad.module';
import { ComisionModule } from './modules/comision/comision.module';
import { SesionComisionModule } from './modules/sesion/sesion.module';
import { DecisionSolicitudModule } from './modules/decision/decision.module';
import { MatriculaModule } from './modules/matricula/matricula.module';
import { ControlTrimestralModule } from './modules/control-trimestral/control-trimestral.module';
import { TrazabilidadModule } from './modules/trazabilidad/trazabilidad.module';

@Module({
  imports: [
    // ConfigModule DEBE ir primero para cargar las variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    TutorModule,
    NinoModule,
    SolicitudModule,
    DocumentoModule,
    CirculoInfantilModule,
    PeriodoOtorgamientoModule,
    CapacidadCirculoModule,
    ComisionModule,
    SesionComisionModule,
    DecisionSolicitudModule,
    MatriculaModule,
    ControlTrimestralModule,
    TrazabilidadModule,
  ],
})
export class AppModule {}
