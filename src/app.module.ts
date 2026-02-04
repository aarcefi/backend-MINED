import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { NinosModule } from './modules/index';
import { SolicitudModule } from './modules/index';
import { DocumentoModule } from './modules/index';
import { CirculoInfantilModule } from './modules/index';
import { PeriodoOtorgamientoModule } from './modules/index';
import { CapacidadCirculoModule } from './modules/index';
import { SesionComisionModule } from './modules/index';
import { DecisionSolicitudModule } from './modules/index';
import { MatriculasModule } from './modules/index';
import { ControlTrimestralModule } from './modules/index';
import { TrazabilidadModule } from './modules/index';
import { UsuariosModule } from './modules/index';
import { PerfilesModule } from './modules/index';
import { NotificacionesModule } from './modules/index';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [jwtConfig],
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    PerfilesModule,
    NotificacionesModule,
    NinosModule,
    SolicitudModule,
    DocumentoModule,
    CirculoInfantilModule,
    PeriodoOtorgamientoModule,
    CapacidadCirculoModule,
    SesionComisionModule,
    DecisionSolicitudModule,
    MatriculasModule,
    ControlTrimestralModule,
    TrazabilidadModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
