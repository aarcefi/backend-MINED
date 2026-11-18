/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../prisma/prisma.service';
import {
  truncateAll,
  seedBasico,
  crearUsuario,
  crearCirculo,
  crearSolicitud,
  login,
  SeedResultado,
} from './helpers/db';
import { MailService } from 'src/mail/mail.service';

describe('SolicitudController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let seed: SeedResultado;
  let circuloPlaya: { id: string; nombre: string };
  let circuloMarianao: { id: string; nombre: string };

  // Usuarios
  let perfilSolicitanteId: string;
  let solicitanteToken: string;
  let funcionarioPlayaToken: string;
  let funcionarioMarianaoToken: string;
  let comisionPlayaToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
        sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
        sendMail: jest.fn().mockResolvedValue(undefined),
        sendCustomEmail: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    seed = await seedBasico(prisma);

    // Círculos en distintos municipios
    circuloPlaya = await crearCirculo(prisma, {
      nombre: 'Círculo Playa',
      municipioId: seed.playa.id,
      provinciaId: seed.laHabana.id,
    });
    circuloMarianao = await crearCirculo(prisma, {
      nombre: 'Círculo Marianao',
      municipioId: seed.marianao.id,
      provinciaId: seed.laHabana.id,
    });

    // Solicitante en Playa
    const solicitante = await crearUsuario(prisma, {
      email: 'sol@test.com',
      password: 'password123',
      rol: 'SOLICITANTE',
      municipioId: seed.playa.id,
      provinciaId: seed.laHabana.id,
      carnetIdentidad: '85010112345',
      perfilSolicitante: { cantHijos: 1 },
    });
    const perfil = await prisma.perfilSolicitante.findUnique({
      where: { usuarioId: solicitante.id },
    });
    perfilSolicitanteId = perfil!.id;

    // Funcionarios en Playa y Marianao
    await crearUsuario(prisma, {
      email: 'fun.playa@test.com',
      password: 'password123',
      rol: 'FUNCIONARIO_MUNICIPAL',
      municipioId: seed.playa.id,
      provinciaId: seed.laHabana.id,
    });
    await crearUsuario(prisma, {
      email: 'fun.marianao@test.com',
      password: 'password123',
      rol: 'FUNCIONARIO_MUNICIPAL',
      municipioId: seed.marianao.id,
      provinciaId: seed.laHabana.id,
    });

    // Comisión en Playa
    await crearUsuario(prisma, {
      email: 'com.playa@test.com',
      password: 'password123',
      rol: 'COMISION_OTORGAMIENTO',
      municipioId: seed.playa.id,
      provinciaId: seed.laHabana.id,
    });

    // Admin
    await crearUsuario(prisma, {
      email: 'admin@test.com',
      password: 'password123',
      rol: 'ADMINISTRADOR',
      municipioId: seed.playa.id,
      provinciaId: seed.laHabana.id,
    });

    // Tokens
    solicitanteToken = await login(app, 'sol@test.com', 'password123');
    funcionarioPlayaToken = await login(
      app,
      'fun.playa@test.com',
      'password123',
    );
    funcionarioMarianaoToken = await login(
      app,
      'fun.marianao@test.com',
      'password123',
    );
    comisionPlayaToken = await login(app, 'com.playa@test.com', 'password123');
    adminToken = await login(app, 'admin@test.com', 'password123');
  });

  // ── POST /solicitud ─────────────────────────────────────────
  describe('POST /solicitud', () => {
    const dtoBase = () => ({
      solicitanteId: perfilSolicitanteId,
      sector: 'SALUD',
      tipoSolicitud: 'TRABAJADOR',
      estado: 'EN_REVISION',
      nino: {
        tarjetaMenor: '24010134567',
        nombre: 'Juan',
        apellidos: 'Pérez',
        fechaNacimiento: '2024-01-01',
        sexo: 'M',
      },
    });

    it('201 crea la solicitud (solicitante)', async () => {
      const res = await request(app.getHttpServer())
        .post('/solicitud')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send(dtoBase())
        .expect(201);

      expect(res.body.id).toBeTruthy();
      expect(res.body.sector).toBe('SALUD');
      expect(res.body.estado).toBe('EN_REVISION');
      expect(res.body.nino.tarjetaMenor).toBe('24010134567');

      const enBD = await prisma.solicitud.findUnique({
        where: { id: res.body.id },
      });
      expect(enBD).not.toBeNull();
      expect(enBD?.prioridad).toBeGreaterThan(0);
    });

    it('201 con circuloId asigna el círculo', async () => {
      const res = await request(app.getHttpServer())
        .post('/solicitud')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({ ...dtoBase(), circuloId: circuloPlaya.id })
        .expect(201);

      expect(res.body.circulo?.id).toBe(circuloPlaya.id);
      expect(res.body.circulo?.municipio).toBe('Playa');
    });

    it('401 sin token', async () => {
      await request(app.getHttpServer())
        .post('/solicitud')
        .send(dtoBase())
        .expect(401);
    });

    it('404 si el circuloId no existe', async () => {
      await request(app.getHttpServer())
        .post('/solicitud')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({
          ...dtoBase(),
          circuloId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);
    });

    it('400 si falta el sector', async () => {
      const dto = dtoBase();
      delete (dto as any).sector;
      await request(app.getHttpServer())
        .post('/solicitud')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send(dto)
        .expect(400);
    });
  });

  // ── GET /solicitud ──────────────────────────────────────────
  describe('GET /solicitud', () => {
    beforeEach(async () => {
      await crearSolicitud(prisma, {
        solicitanteId: perfilSolicitanteId,
        periodoId: seed.periodo.id,
        circuloId: circuloPlaya.id,
        tarjetaMenor: '24010134567',
      });
      await crearSolicitud(prisma, {
        solicitanteId: perfilSolicitanteId,
        periodoId: seed.periodo.id,
        circuloId: circuloMarianao.id,
        tarjetaMenor: '23050545678',
      });
    });

    it('200 funcionario de Playa ve solo las de su municipio', async () => {
      const res = await request(app.getHttpServer())
        .get('/solicitud')
        .set('Authorization', `Bearer ${funcionarioPlayaToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].circulo.municipio).toBe('Playa');
    });

    it('200 funcionario de Marianao ve la de Marianao', async () => {
      const res = await request(app.getHttpServer())
        .get('/solicitud')
        .set('Authorization', `Bearer ${funcionarioMarianaoToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].circulo.municipio).toBe('Marianao');
    });

    it('200 admin ve todas', async () => {
      const res = await request(app.getHttpServer())
        .get('/solicitud')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('401 sin token', async () => {
      await request(app.getHttpServer()).get('/solicitud').expect(401);
    });
  });

  // ── GET /solicitud/:id ──────────────────────────────────────
  describe('GET /solicitud/:id', () => {
    let solicitudId: string;

    beforeEach(async () => {
      const sol = await crearSolicitud(prisma, {
        solicitanteId: perfilSolicitanteId,
        periodoId: seed.periodo.id,
        circuloId: circuloPlaya.id,
      });
      solicitudId = sol.id;
    });

    it('200 el solicitante dueño la ve', async () => {
      const res = await request(app.getHttpServer())
        .get(`/solicitud/${solicitudId}`)
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .expect(200);
      expect(res.body.id).toBe(solicitudId);
    });

    it('200 el admin la ve', async () => {
      await request(app.getHttpServer())
        .get(`/solicitud/${solicitudId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('200 el funcionario del municipio del círculo la ve', async () => {
      await request(app.getHttpServer())
        .get(`/solicitud/${solicitudId}`)
        .set('Authorization', `Bearer ${funcionarioPlayaToken}`)
        .expect(200);
    });

    it('403 el funcionario de otro municipio NO la ve', async () => {
      await request(app.getHttpServer())
        .get(`/solicitud/${solicitudId}`)
        .set('Authorization', `Bearer ${funcionarioMarianaoToken}`)
        .expect(403);
    });

    it('404 si no existe', async () => {
      await request(app.getHttpServer())
        .get('/solicitud/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('400 si el ID no es UUID', async () => {
      await request(app.getHttpServer())
        .get('/solicitud/no-es-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ── PATCH /solicitud/:id/estado ─────────────────────────────
  describe('PATCH /solicitud/:id/estado', () => {
    let solicitudId: string;

    beforeEach(async () => {
      const sol = await crearSolicitud(prisma, {
        solicitanteId: perfilSolicitanteId,
        periodoId: seed.periodo.id,
        circuloId: circuloPlaya.id,
        estado: 'EN_REVISION',
      });
      solicitudId = sol.id;
    });

    it('200 funcionario de Playa puede aprobar por dirección', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/solicitud/${solicitudId}/estado`)
        .set('Authorization', `Bearer ${funcionarioPlayaToken}`)
        .send({ estado: 'APROBADA_DIRECCION' })
        .expect(200);

      expect(res.body.estado).toBe('APROBADA_DIRECCION');

      const enBD = await prisma.solicitud.findUnique({
        where: { id: solicitudId },
      });
      expect(enBD?.estado).toBe('APROBADA_DIRECCION');
    });

    it('200 comisión de Playa puede aprobar por comisión', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/solicitud/${solicitudId}/estado`)
        .set('Authorization', `Bearer ${comisionPlayaToken}`)
        .send({ estado: 'APROBADA_COMISION' })
        .expect(200);

      expect(res.body.estado).toBe('APROBADA_COMISION');

      // Al aprobar por comisión se crea la matrícula
      const matricula = await prisma.matricula.findUnique({
        where: { solicitudId },
      });
      expect(matricula).not.toBeNull();
      expect(matricula?.circuloId).toBe(circuloPlaya.id);
    });

    it('403 funcionario de otro municipio NO puede cambiar estado', async () => {
      await request(app.getHttpServer())
        .patch(`/solicitud/${solicitudId}/estado`)
        .set('Authorization', `Bearer ${funcionarioMarianaoToken}`)
        .send({ estado: 'APROBADA_DIRECCION' })
        .expect(403);
    });

    it('403 el solicitante NO puede cambiar estado', async () => {
      await request(app.getHttpServer())
        .patch(`/solicitud/${solicitudId}/estado`)
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({ estado: 'APROBADA_DIRECCION' })
        .expect(403);
    });

    it('400 si el circuloId es "string" (bug histórico del refactor)', async () => {
      await request(app.getHttpServer())
        .patch(`/solicitud/${solicitudId}/estado`)
        .set('Authorization', `Bearer ${comisionPlayaToken}`)
        .send({ estado: 'APROBADA_COMISION', circuloId: 'string' })
        .expect(400);
    });
  });

  // ── DELETE /solicitud/:id ──────────────────────────────────
  describe('DELETE /solicitud/:id', () => {
    let solicitudId: string;

    beforeEach(async () => {
      const sol = await crearSolicitud(prisma, {
        solicitanteId: perfilSolicitanteId,
        periodoId: seed.periodo.id,
        circuloId: circuloPlaya.id,
        estado: 'EN_REVISION',
      });
      solicitudId = sol.id;
    });

    it('200 el admin puede eliminar', async () => {
      await request(app.getHttpServer())
        .delete(`/solicitud/${solicitudId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const enBD = await prisma.solicitud.findUnique({
        where: { id: solicitudId },
      });
      expect(enBD).toBeNull();
    });

    it('409 el solicitante NO puede eliminar si no está EN_REVISION', async () => {
      await prisma.solicitud.update({
        where: { id: solicitudId },
        data: { estado: 'APROBADA_COMISION' },
      });

      await request(app.getHttpServer())
        .delete(`/solicitud/${solicitudId}`)
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .expect(409);
    });

    it('409 NO se puede eliminar con matrícula asociada', async () => {
      await prisma.matricula.create({
        data: {
          solicitudId,
          circuloId: circuloPlaya.id,
          fechaOtorgamiento: new Date(),
          fechaLimite: new Date('2027-01-01'),
          folio: `F-${Date.now()}`,
        },
      });

      await request(app.getHttpServer())
        .delete(`/solicitud/${solicitudId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });
});
