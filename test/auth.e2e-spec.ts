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
  login,
  SeedResultado,
} from './helpers/db';
import { MailService } from 'src/mail/mail.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seed: SeedResultado;

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
  });

  // ── POST /auth/register ─────────────────────────────────────
  describe('POST /auth/register', () => {
    const dtoBase = {
      email: 'nuevo@test.com',
      password: 'password123',
      datosSolicitante: {
        nombre: 'María',
        apellidos: 'Pérez',
        carnetIdentidad: '85010112345',
        telefono: '55555555',
        direccion: 'Calle 1 #100 e/ 2 y 4',
        municipio: 'Playa',
        provincia: 'La Habana',
        tipoPersona: 'MADRE',
        cantHijos: 1,
        centroTrabajo: 'Hospital',
      },
    };

    it('201 con datos válidos', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dtoBase)
        .expect(201);

      expect(res.body.email).toBe('nuevo@test.com');
      expect(res.body.rol).toBe('SOLICITANTE');
      expect(res.body.perfilSolicitante.municipio).toBe('Playa');
      expect(res.body.perfilSolicitante.provincia).toBe('La Habana');

      // Verifica que efectivamente quedó en BD
      const enBD = await prisma.usuario.findUnique({
        where: { email: 'nuevo@test.com' },
        include: { municipioRel: true, perfilSolicitante: true },
      });
      expect(enBD).not.toBeNull();
      expect(enBD?.municipioRel?.nombre).toBe('Playa');
      expect(enBD?.perfilSolicitante).not.toBeNull();
    });

    it('400 si falta datosSolicitante', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'x@y.com', password: 'password123' })
        .expect(400);
    });

    it('400 si el email no es válido', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...dtoBase, email: 'no-es-email' })
        .expect(400);
    });

    it('409 si el email ya está registrado', async () => {
      await crearUsuario(prisma, {
        email: 'dup@test.com',
        password: 'password123',
        rol: 'SOLICITANTE',
        municipioId: seed.playa.id,
        provinciaId: seed.laHabana.id,
        perfilSolicitante: {},
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...dtoBase, email: 'dup@test.com' })
        .expect(409);

      expect(res.body.message).toMatch(/email/i);
    });

    it('409 si el carnet ya está registrado', async () => {
      await crearUsuario(prisma, {
        email: 'otro@test.com',
        password: 'password123',
        rol: 'SOLICITANTE',
        municipioId: seed.playa.id,
        provinciaId: seed.laHabana.id,
        carnetIdentidad: '85010112345',
        perfilSolicitante: {},
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...dtoBase, email: 'nuevo2@test.com' })
        .expect(409);

      expect(res.body.message).toMatch(/carnet/i);
    });

    it('400 si el municipio no existe', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...dtoBase,
          email: 'x@y.com',
          datosSolicitante: {
            ...dtoBase.datosSolicitante,
            municipio: 'Inventado',
          },
        })
        .expect(400);

      expect(res.body.message).toMatch(/municipio/i);
    });
  });

  // ── POST /auth/login ────────────────────────────────────────
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await crearUsuario(prisma, {
        email: 'user@test.com',
        password: 'password123',
        rol: 'SOLICITANTE',
        municipioId: seed.playa.id,
        provinciaId: seed.laHabana.id,
        perfilSolicitante: {},
      });
    });

    it('200 con credenciales válidas', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'password123' })
        .expect(200);

      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('user@test.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('401 con password incorrecta', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'wrong-password' })
        .expect(401);
    });

    it('401 con email inexistente', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'no-existe@test.com', password: 'password123' })
        .expect(401);
    });

    it('400 si faltan campos', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com' })
        .expect(400);
    });
  });

  // ── GET /auth/profile ───────────────────────────────────────
  describe('GET /auth/profile', () => {
    let token: string;

    beforeEach(async () => {
      await crearUsuario(prisma, {
        email: 'user@test.com',
        password: 'password123',
        rol: 'SOLICITANTE',
        municipioId: seed.playa.id,
        provinciaId: seed.laHabana.id,
        perfilSolicitante: {},
      });
      token = await login(app, 'user@test.com', 'password123');
    });

    it('200 con token válido', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe('user@test.com');
      expect(res.body.rol).toBe('SOLICITANTE');
    });

    it('401 sin token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('401 con token inválido', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer token-falso')
        .expect(401);
    });

    it('401 con token expirado / malformado', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.xxx.yyy')
        .expect(401);
    });
  });

  // ── POST /auth/refresh ──────────────────────────────────────
  describe('POST /auth/refresh', () => {
    it('200 con refresh token válido', async () => {
      const user = await crearUsuario(prisma, {
        email: 'user@test.com',
        password: 'password123',
        rol: 'SOLICITANTE',
        municipioId: seed.playa.id,
        provinciaId: seed.laHabana.id,
        perfilSolicitante: {},
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'password123' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: loginRes.body.tokens.refreshToken,
          userId: user.id,
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
      // Ya no comparamos tokens: pueden ser idénticos si se generan en el mismo segundo.
    });

    it('401 con refresh token inválido', async () => {
      const user = await crearUsuario(prisma, {
        email: 'user@test.com',
        password: 'password123',
        rol: 'SOLICITANTE',
        municipioId: seed.playa.id,
        provinciaId: seed.laHabana.id,
        perfilSolicitante: {},
      });

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'token-invalido', userId: user.id })
        .expect(401);
    });
  });

  // ── POST /auth/logout ───────────────────────────────────────
  describe('POST /auth/logout', () => {
    it('200 e invalida el refresh token', async () => {
      await crearUsuario(prisma, {
        email: 'user@test.com',
        password: 'password123',
        rol: 'SOLICITANTE',
        municipioId: seed.playa.id,
        provinciaId: seed.laHabana.id,
        perfilSolicitante: {},
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'password123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.tokens.accessToken}`)
        .expect(200);

      // Intento de refresh después del logout → 401
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: loginRes.body.tokens.refreshToken,
          userId: loginRes.body.user.id,
        })
        .expect(401);
    });
  });

  // ── POST /auth/forgot-password → reset ────────────────────
  describe('Flujo forgot-password → reset-password', () => {
    it('envía código y permite resetear la contraseña', async () => {
      await crearUsuario(prisma, {
        email: 'user@test.com',
        password: 'old-password',
        rol: 'SOLICITANTE',
        municipioId: seed.playa.id,
        provinciaId: seed.laHabana.id,
        perfilSolicitante: {},
      });

      // 1. Solicita reset
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'user@test.com' })
        .expect(200);

      // 2. Lee el código desde la BD (nadie más lo conoce)
      const usuario = await prisma.usuario.findUnique({
        where: { email: 'user@test.com' },
      });
      expect(usuario?.resetPasswordCode).toBeTruthy();
      const code = usuario!.resetPasswordCode!;

      // 3. Resetea
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ code, newPassword: 'new-password-456' })
        .expect(200);

      // 4. El login con la nueva contraseña funciona
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'new-password-456' })
        .expect(200);

      // 5. El login con la vieja contraseña ya no funciona
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'old-password' })
        .expect(401);
    });

    it('401 con código inválido', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ code: '000000', newPassword: 'new-password' })
        .expect(401);
    });
  });
});
