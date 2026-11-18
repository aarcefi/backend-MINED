/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Vacía todas las tablas en una sola operación.
 * TRUNCATE ... CASCADE es atómico y ~100x más rápido que 20 deleteMany().
 */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      enum_change_logs,
      notificaciones,
      trazabilidades,
      traslados_solicitud,
      controles_trimestrales,
      matriculas,
      decisiones_solicitud,
      sesiones_comision,
      documentos_solicitud,
      solicitudes,
      capacidades_circulos,
      periodos_otorgamiento,
      perfiles_directores,
      perfiles_comisiones,
      perfiles_funcionarios,
      perfiles_solicitantes,
      ninos,
      circulos_infantiles,
      configuraciones_prioridad_comision,
      usuarios,
      municipios,
      provincias,
      ciudadanos
    RESTART IDENTITY CASCADE;
  `);
}

export interface SeedResultado {
  laHabana: { id: string; nombre: string };
  matanzas: { id: string; nombre: string };
  playa: { id: string; nombre: string };
  marianao: { id: string; nombre: string };
  cardenas: { id: string; nombre: string };
  periodo: { id: string; nombre: string };
}

/**
 * Datos mínimos que todo test de integración necesita para arrancar:
 * - 2 provincias, 3 municipios (uno en Matanzas para tests de "otro municipio")
 * - 3 ciudadanos (para `validacionFichaUnica`)
 * - 1 período de otorgamiento activo
 */
export async function seedBasico(
  prisma: PrismaService,
): Promise<SeedResultado> {
  const laHabana = await prisma.provincia.create({
    data: { nombre: 'La Habana' },
  });
  const matanzas = await prisma.provincia.create({
    data: { nombre: 'Matanzas' },
  });

  const playa = await prisma.municipio.create({
    data: { nombre: 'Playa', provinciaId: laHabana.id },
  });
  const marianao = await prisma.municipio.create({
    data: { nombre: 'Marianao', provinciaId: laHabana.id },
  });
  const cardenas = await prisma.municipio.create({
    data: { nombre: 'Cárdenas', provinciaId: matanzas.id },
  });

  await prisma.ciudadano.createMany({
    data: [
      {
        carnetIdentidad: '85010112345',
        nombre: 'María',
        apellidos: 'Pérez',
        fechaNacimiento: new Date('1985-01-01'),
      },
      {
        carnetIdentidad: '90020223456',
        nombre: 'Ana',
        apellidos: 'López',
        fechaNacimiento: new Date('1990-02-02'),
      },
      // Carnets de niños para pruebas de creación de nino
      {
        carnetIdentidad: '24010134567',
        nombre: 'Juan',
        apellidos: 'Pérez',
        fechaNacimiento: new Date('2024-01-01'),
      },
      {
        carnetIdentidad: '23050545678',
        nombre: 'Lucía',
        apellidos: 'Pérez',
        fechaNacimiento: new Date('2023-05-05'),
      },
    ],
  });

  const periodo = await prisma.periodoOtorgamiento.create({
    data: {
      nombre: 'Curso 2026-2027',
      fechaInicio: new Date('2026-09-01'),
      fechaCierre: new Date('2027-07-15'),
      fechaAsignacion: new Date('2027-08-01'),
      activo: true,
    },
  });

  return { laHabana, matanzas, playa, marianao, cardenas, periodo };
}

let carnetCounter = 0;
function nextCarnet(): string {
  carnetCounter += 1;
  return `TEST${Date.now()}${carnetCounter}`;
}

export interface CrearUsuarioOpts {
  email: string;
  password: string;
  rol:
    | 'SOLICITANTE'
    | 'FUNCIONARIO_MUNICIPAL'
    | 'COMISION_OTORGAMIENTO'
    | 'DIRECTOR_CIRCULO'
    | 'ADMINISTRADOR';
  municipioId?: string;
  provinciaId?: string;
  carnetIdentidad?: string;
  perfilSolicitante?: {
    cantHijos?: number;
    direccion?: string;
    centroTrabajo?: string;
    tipoPersona?: 'MADRE' | 'PADRE' | 'TUTOR';
  };
  perfilFuncionario?: { cargo?: string };
  perfilComision?: { cargo?: string };
  perfilDirector?: { circuloId: string };
}

export async function crearUsuario(
  prisma: PrismaService,
  opts: CrearUsuarioOpts,
): Promise<{ id: string; email: string; rol: string }> {
  const hashed = await bcrypt.hash(opts.password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      email: opts.email,
      password: hashed,
      rol: opts.rol,
      activo: true,
      nombre: 'Test',
      apellidos: `User${carnetCounter}`,
      carnetIdentidad: opts.carnetIdentidad ?? nextCarnet(),
      telefono: '55555555',
      municipioId: opts.municipioId,
      provinciaId: opts.provinciaId,
    },
  });

  if (opts.rol === 'SOLICITANTE' && opts.perfilSolicitante) {
    await prisma.perfilSolicitante.create({
      data: {
        usuarioId: usuario.id,
        tipoPersona: opts.perfilSolicitante.tipoPersona ?? 'MADRE',
        cantHijos: opts.perfilSolicitante.cantHijos ?? 1,
        direccion: opts.perfilSolicitante.direccion ?? 'Calle Test 123',
        centroTrabajo: opts.perfilSolicitante.centroTrabajo ?? 'Hospital',
      },
    });
  }

  if (opts.rol === 'FUNCIONARIO_MUNICIPAL') {
    await prisma.perfilFuncionario.create({
      data: {
        usuarioId: usuario.id,
        cargo: opts.perfilFuncionario?.cargo ?? 'Funcionario',
      },
    });
  }

  if (opts.rol === 'COMISION_OTORGAMIENTO') {
    await prisma.perfilComision.create({
      data: {
        usuarioId: usuario.id,
        cargo: opts.perfilComision?.cargo ?? 'Comisión',
      },
    });
  }

  if (opts.rol === 'DIRECTOR_CIRCULO' && opts.perfilDirector) {
    await prisma.perfilDirector.create({
      data: {
        usuarioId: usuario.id,
        circuloId: opts.perfilDirector.circuloId,
      },
    });
  }

  return usuario;
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body.tokens.accessToken as string;
}

export async function crearCirculo(
  prisma: PrismaService,
  opts: {
    nombre: string;
    municipioId: string;
    provinciaId: string;
    direccion?: string;
    activo?: boolean;
  },
): Promise<{ id: string; nombre: string }> {
  return prisma.circuloInfantil.create({
    data: {
      nombre: opts.nombre,
      direccion: opts.direccion ?? 'Calle Círculo 1',
      municipioId: opts.municipioId,
      provinciaId: opts.provinciaId,
      capacidadTotal: 100,
      tipo: 'NORMAL',
      activo: opts.activo ?? true,
      tieneSextoAnio: false,
    },
  });
}

export async function crearSolicitud(
  prisma: PrismaService,
  opts: {
    solicitanteId: string;
    periodoId: string;
    circuloId?: string;
    tarjetaMenor?: string;
    sector?: 'SALUD' | 'EDUCACION' | 'DEFENSA' | 'CASO_SOCIAL' | 'OTRO';
    tipoSolicitud?: 'TRABAJADOR' | 'ESTUDIANTE' | 'CASO_SOCIAL';
    estado?:
      | 'EN_REVISION'
      | 'APROBADA_COMISION'
      | 'APROBADA_DIRECCION'
      | 'RECHAZADA_COMISION'
      | 'RECHAZADA_DIRECCION'
      | 'EN_ESPERA';
    nombreNino?: string;
    apellidosNino?: string;
  },
): Promise<{ id: string }> {
  const tarjeta = opts.tarjetaMenor ?? '24010134567';
  const nino = await prisma.nino.create({
    data: {
      nombre: opts.nombreNino ?? 'Juan',
      apellidos: opts.apellidosNino ?? 'Pérez',
      fechaNacimiento: new Date('2024-01-01'),
      sexo: 'M',
      tarjetaMenor: tarjeta,
      solicitanteId: opts.solicitanteId,
    },
  });
  return prisma.solicitud.create({
    data: {
      ninoId: nino.id,
      solicitanteId: opts.solicitanteId,
      periodoId: opts.periodoId,
      circuloId: opts.circuloId,
      sector: opts.sector ?? 'SALUD',
      tipoSolicitud: opts.tipoSolicitud ?? 'TRABAJADOR',
      estado: opts.estado ?? 'EN_REVISION',
      anioSolicitado: 'ANIO_2',
      prioridad: 50,
    },
  });
}
