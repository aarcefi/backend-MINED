/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

// Los tests de integración vacían tablas con deleteMany: nunca sobre una base real
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
  constructor(private configService: ConfigService) {
    // Usa ConfigService para obtener DATABASE_URL
    const dbUrl = configService.get<string>('DATABASE_URL');

    if (process.env.JEST_WORKER_ID) {
      exigirBaseDePruebas(dbUrl);
    }

    if (!dbUrl) {
      console.error('❌ ERROR: DATABASE_URL no está definida en .env');
      // Muestra todas las variables relacionadas con DB
      console.log(
        'ConfigService DATABASE_URL:',
        configService.get('DATABASE_URL'),
      );
      console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL);
    } else {
      // Oculta la contraseña en el log
      const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
      console.log(`🔗 Usando DATABASE_URL: ${maskedUrl}`);
    }

    // Crea un pool de PostgreSQL
    const pool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Crea el adaptador
    const adapter = new PrismaPg(pool);

    // Pasa el adaptador al constructor
    super({
      adapter: adapter,
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
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
    console.log('🔌 Database disconnected');
  }
}
