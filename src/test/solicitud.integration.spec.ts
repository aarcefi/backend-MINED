/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Module,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoSolicitud } from '@prisma/client';
import { SolicitudModule } from '../modules/solicitud/solicitud.module';
import { TrazabilidadModule } from '../modules/trazabilidad/trazabilidad.module';
import { PeriodoOtorgamientoModule } from '../modules/periodo/periodo.module';
import { NinosModule } from '../modules/nino/nino.module';
import { ValidacionIdentidadModule } from '../modules/validacion-ficha-unica/validacion-ficha-unica.module';
import { PriorityModule } from '../common/prioridades/prioridad.module';
import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../modules/usuario/usuarios.module';
import { PerfilesModule } from '../modules/perfiles/perfiles.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../common/events/events.module';
import { UtilsModule } from '../common/utils/utils.module';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from '../config/jwt.config';

// Módulo de pruebas que encapsula todas las dependencias necesarias
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    PerfilesModule,
    EventsModule,
    UtilsModule,
    PeriodoOtorgamientoModule,
    NinosModule,
    ValidacionIdentidadModule,
    PriorityModule,
    forwardRef(() => TrazabilidadModule), // importante: forwardRef para romper la circularidad
    SolicitudModule, // SolicitudModule ya tiene forwardRef a TrazabilidadModule, pero aquí también
  ],
})
class TestModule {}

describe('Solicitud Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Log de rutas registradas (para depuración)
    const server = app.getHttpServer();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const router = (server as any)._events?.request?._router;
    if (router) {
      console.log('📌 Rutas registradas:');
      router.stack.forEach((layer: any) => {
        if (layer.route) {
          console.log(
            Object.keys(layer.route.methods)[0].toUpperCase(),
            layer.route.path,
          );
        }
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.solicitud.deleteMany({});
    await prisma.nino.deleteMany({});
    await prisma.perfilSolicitante.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.ciudadano.deleteMany({});
    await prisma.periodoOtorgamiento.deleteMany({});

    await prisma.periodoOtorgamiento.create({
      data: {
        nombre: 'Periodo Prueba',
        fechaInicio: new Date('2026-01-01'),
        fechaCierre: new Date('2026-12-31'),
        fechaAsignacion: new Date('2026-01-01'),
        activo: true,
      },
    });
  });

  it('should create a new solicitud', async () => {
    const email = `solicitud_${Date.now()}@example.com`;
    const password = 'Test123!';
    const carnet = `85${Date.now()}`;

    await prisma.ciudadano.create({
      data: {
        carnetIdentidad: carnet,
        nombre: 'María',
        apellidos: 'González Pérez',
        fechaNacimiento: new Date('1985-01-01'),
      },
    });

    const registerDto = {
      email,
      password,
      datosSolicitante: {
        carnetIdentidad: carnet,
        nombre: 'María',
        apellidos: 'González Pérez',
        telefono: '+5351234567',
        municipio: 'La Habana',
        provincia: 'La Habana',
        tipoPersona: 'MADRE',
        cantHijos: 2,
        direccion: 'Calle 10 #123',
        centroTrabajo: 'Hospital',
      },
    };

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto);
    expect(registerRes.status).toBe(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const token = loginRes.body.tokens.accessToken;
    const usuarioId = loginRes.body.user.id;

    const perfil = await prisma.perfilSolicitante.findUnique({
      where: { usuarioId },
    });
    expect(perfil).toBeDefined();

    const createDto = {
      solicitanteId: perfil!.id,
      sector: 'SALUD',
      tipoSolicitud: 'TRABAJADOR',
      estado: EstadoSolicitud.EN_REVISION,
      observaciones: 'Solicitud de prueba',
      nino: {
        nombre: 'Juan',
        apellidos: 'Pérez',
        fechaNacimiento: '2020-01-01',
        sexo: 'M',
        tarjetaMenor: `TM${Date.now()}`,
        casoEspecial: false,
      },
    };

    const response = await request(app.getHttpServer())
      .post('/solicitud')
      .set('Authorization', `Bearer ${token}`)
      .send(createDto)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.sector).toBe('SALUD');
    expect(response.body.estado).toBe('EN_REVISION');
  });
});
