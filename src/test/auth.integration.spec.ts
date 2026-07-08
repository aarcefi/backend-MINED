/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Auth Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.usuario.deleteMany({});
    await prisma.perfilSolicitante.deleteMany({});
    await prisma.ciudadano.deleteMany({});
    await prisma.periodoOtorgamiento.deleteMany({});
  });

  it('/auth/register (POST) - should return 400 if email is missing', async () => {
    const dto = {
      password: 'Test123!',
      datosSolicitante: {
        carnetIdentidad: `85${Date.now()}`, // dinámico pero no importa porque no se inserta
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
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(dto)
      .expect(400);
  });

  it('/auth/register (POST) - should register a new user successfully', async () => {
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
      email: `test_${Date.now()}@example.com`,
      password: 'Test123!',
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

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(registerDto.email);
    expect(response.body.rol).toBe('SOLICITANTE');
  });

  it('/auth/register (POST) - should return 409 if email already exists', async () => {
    const email = `duplicate_${Date.now()}@example.com`;
    const carnet = `85${Date.now()}`;
    const registerDto = {
      email,
      password: 'Test123!',
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
    await prisma.ciudadano.create({
      data: {
        carnetIdentidad: carnet,
        nombre: 'María',
        apellidos: 'González Pérez',
        fechaNacimiento: new Date('1985-01-01'),
      },
    });
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(409);
  });

  it('/auth/login (POST) - should return tokens on successful login', async () => {
    const email = `login_${Date.now()}@example.com`;
    const password = 'Test123!';
    const carnet = `85${Date.now()}`;
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
    await prisma.ciudadano.create({
      data: {
        carnetIdentidad: carnet,
        nombre: 'María',
        apellidos: 'González Pérez',
        fechaNacimiento: new Date('1985-01-01'),
      },
    });
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body).toHaveProperty('tokens');
    expect(response.body.tokens).toHaveProperty('accessToken');
    expect(response.body.tokens).toHaveProperty('refreshToken');
  });

  it('/auth/refresh (POST) - should return new tokens with valid refresh token', async () => {
    const email = `refresh_${Date.now()}@example.com`;
    const password = 'Test123!';
    const carnet = `85${Date.now()}`;
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
    await prisma.ciudadano.create({
      data: {
        carnetIdentidad: carnet,
        nombre: 'María',
        apellidos: 'González Pérez',
        fechaNacimiento: new Date('1985-01-01'),
      },
    });
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const refreshToken = loginResponse.body.tokens.refreshToken;
    const userId = loginResponse.body.user.id;

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken, userId })
      .expect(200);

    expect(refreshResponse.body).toHaveProperty('accessToken');
    expect(refreshResponse.body).toHaveProperty('refreshToken');
    expect(refreshResponse.body.accessToken).not.toBe(
      loginResponse.body.tokens.accessToken,
    );
  });
});
