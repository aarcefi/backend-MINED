/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

export function exigirBaseDePruebas(dbUrl?: string) {
  const nombre = new URL(dbUrl ?? 'postgresql://x/').pathname.slice(1);
  if (!/(^|[_-])test$/i.test(nombre)) {
    throw new Error(
      `Los tests no pueden usar la base "${nombre}". Define en .env.test una base cuyo nombre termine en _test.`,
    );
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(private configService: ConfigService) {
    const dbUrl = configService.get<string>('DATABASE_URL');

    if (process.env.JEST_WORKER_ID) {
      exigirBaseDePruebas(dbUrl);
    }

    if (!dbUrl) {
      console.error('❌ ERROR: DATABASE_URL no está definida en .env');
      console.log(
        'ConfigService DATABASE_URL:',
        configService.get('DATABASE_URL'),
      );
      console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL);
    } else if (!process.env.JEST_WORKER_ID) {
      const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
      console.log(`🔗 Usando DATABASE_URL: ${maskedUrl}`);
    }

    // 1. Crear el pool como variable LOCAL (esto SÍ puede ir antes de super)
    const pool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // 2. Crear el adapter con el pool
    const adapter = new PrismaPg(pool);

    // 3. Llamar a super() con el adapter
    super({
      adapter,
      log:
        process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test'
          ? ['warn', 'error']
          : ['query', 'info', 'warn', 'error'],
    });

    // 4. AHORA sí, asignar `this.pool` (después de super)
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      if (!process.env.JEST_WORKER_ID) {
        console.log('✅ Database connected successfully');
      }
    } catch (error) {
      console.error('❌ Database connection error:', error.message);

      if (error.code === 'P1000') {
        console.log('\n🔍 DIAGNÓSTICO DE ERROR P1000:');
        console.log('URL usada:', this.configService.get('DATABASE_URL'));
      }

      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    if (!process.env.JEST_WORKER_ID) {
      console.log('🔌 Database disconnected');
    }
  }
}
