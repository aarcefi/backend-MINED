/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class EnumsService {
  private readonly logger = new Logger(EnumsService.name);

  // Mapeo de enums con sus valores actuales (se cargarán desde BD)
  private enumsCache: Record<string, string[]> = {};

  constructor(private prisma: PrismaService) {
    this.loadEnumsFromDatabase();
  }

  // Cargar enums desde la base de datos
  private async loadEnumsFromDatabase() {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{ enum_name: string; enum_values: string }>
      >`
      SELECT 
        t.typname as enum_name,
        string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typtype = 'e'
      GROUP BY t.typname
    `;

      result.forEach((row) => {
        this.enumsCache[row.enum_name] = row.enum_values.split(',');
      });

      this.logger.log(
        `Enums cargados desde PostgreSQL: ${Object.keys(this.enumsCache).join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Error cargando enums desde PostgreSQL', error);
      this.loadDefaultEnums();
    }
  }

  // Valores por defecto en caso de error
  private loadDefaultEnums() {
    this.enumsCache = {
      TipoPersona: ['MADRE', 'PADRE', 'TUTOR'],
      TipoSolicitud: ['TRABAJADOR', 'ESTUDIANTE', 'CASO_SOCIAL'],
      SectorPrioridad: ['SALUD', 'EDUCACION', 'DEFENSA', 'CASO_SOCIAL', 'OTRO'],
      EstadoSolicitud: [
        'EN_REVISION',
        'REVISADA',
        'APROBADA',
        'RECHAZADA',
        'EN_ESPERA',
      ],
      TipoDocumento: [
        'CARNET',
        'TARJETA_MENOR',
        'CARTA_LABORAL',
        'CARTA_ESTUDIO',
        'INFORME_SOCIAL',
      ],
      VinculoLaboral: ['ACTIVO', 'ESTUDIANTE', 'PERDIDO'],
      TipoCirculo: ['NORMAL', 'ESPECIAL', 'MIXTO'],
      ResultadoDecision: ['ACEPTADA', 'DENEGADA'],
      EstadoMatricula: ['ACTIVA', 'VENCIDA', 'CANCELADA'],
      RolUsuario: [
        'SOLICITANTE',
        'FUNCIONARIO_MUNICIPAL',
        'COMISION_OTORGAMIENTO',
        'DIRECTOR_CIRCULO',
        'ADMINISTRADOR',
      ],
    };
  }

  // Método para obtener todos los enums
  getAllEnums() {
    return this.enumsCache;
  }

  // Método para obtener un enum específico
  getEnumByName(enumName: string): { name: string; values: string[] } | null {
    const values = this.enumsCache[enumName];
    if (!values) {
      return null;
    }
    return { name: enumName, values };
  }

  // Método para obtener opciones formateadas
  getEnumOptions(enumName: string) {
    const enumObj = this.getEnumByName(enumName);
    if (!enumObj) {
      return null;
    }

    return enumObj.values.map((value) => ({
      value,
      label: this.formatEnumLabel(value),
      original: value,
    }));
  }

  // Validar valor
  validateEnumValue(enumName: string, value: string): boolean {
    const enumObj = this.getEnumByName(enumName);
    if (!enumObj) {
      return false;
    }
    return enumObj.values.includes(value);
  }

  // ========== CRUD OPERATIONS CON POSTGRESQL ==========

  // Agregar nuevo valor al enum
  async addEnumValue(
    enumName: string,
    value: string,
    userId: string,
  ): Promise<{
    message: string;
    enumName: string;
    newValue: string;
    allValues: string[];
  }> {
    // Validar que el enum existe
    if (!this.enumsCache[enumName]) {
      throw new NotFoundException(`Enum ${enumName} no encontrado`);
    }

    // Validar valor
    if (!value || value.trim() === '') {
      throw new BadRequestException('El valor no puede estar vacío');
    }

    // Formatear valor: mayúsculas, espacios por guiones bajos
    const formattedValue = value.trim().toUpperCase().replace(/\s+/g, '_');

    // Validar que no exista
    if (this.enumsCache[enumName].includes(formattedValue)) {
      throw new ConflictException(
        `El valor ${formattedValue} ya existe en el enum ${enumName}`,
      );
    }

    try {
      // Ejecutar ALTER TYPE para agregar el nuevo valor
      await this.prisma.$executeRawUnsafe(
        `ALTER TYPE "${enumName}" ADD VALUE '${formattedValue}'`,
      );

      // Registrar el cambio
      await this.prisma.enumChangeLog.create({
        data: {
          enumName,
          operation: 'ADD',
          newValue: formattedValue,
          changedBy: userId,
          status: 'APPLIED',
          appliedAt: new Date(),
        },
      });

      // Actualizar caché
      this.enumsCache[enumName].push(formattedValue);
      this.enumsCache[enumName].sort();

      this.logger.log(
        `Valor ${formattedValue} agregado al enum ${enumName} por usuario ${userId}`,
      );

      return {
        message: `Valor ${formattedValue} agregado exitosamente al enum ${enumName}`,
        enumName,
        newValue: formattedValue,
        allValues: this.enumsCache[enumName],
      };
    } catch (error) {
      this.logger.error(
        `Error agregando valor al enum ${enumName}: ${error.message}`,
      );

      // Registrar error
      await this.prisma.enumChangeLog.create({
        data: {
          enumName,
          operation: 'ADD',
          newValue: formattedValue,
          changedBy: userId,
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw new BadRequestException(
        `No se pudo agregar el valor. Error: ${error.message}`,
      );
    }
  }

  // Actualizar valor existente (requiere recrear el enum)
  async updateEnumValue(
    enumName: string,
    oldValue: string,
    newValue: string,
    userId: string,
  ): Promise<{
    message: string;
    enumName: string;
    oldValue: string;
    newValue: string;
    allValues: string[];
  }> {
    // Validar enum
    if (!this.enumsCache[enumName]) {
      throw new NotFoundException(`Enum ${enumName} no encontrado`);
    }

    // Validar valor antiguo
    if (!this.enumsCache[enumName].includes(oldValue)) {
      throw new NotFoundException(
        `El valor ${oldValue} no existe en el enum ${enumName}`,
      );
    }

    // Validar nuevo valor
    if (!newValue || newValue.trim() === '') {
      throw new BadRequestException('El nuevo valor no puede estar vacío');
    }

    const formattedNewValue = newValue
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

    if (oldValue === formattedNewValue) {
      throw new BadRequestException('El nuevo valor es igual al actual');
    }

    if (this.enumsCache[enumName].includes(formattedNewValue)) {
      throw new ConflictException(
        `El valor ${formattedNewValue} ya existe en el enum ${enumName}`,
      );
    }

    // Verificar si hay registros usando el valor
    await this.checkDependencies(enumName, oldValue);

    try {
      // PostgreSQL no permite renombrar valores de enum directamente
      // Necesitamos crear un nuevo enum y migrar los datos
      await this.migrateEnumValue(
        enumName,
        oldValue,
        formattedNewValue,
        userId,
      );

      // Actualizar caché
      const index = this.enumsCache[enumName].indexOf(oldValue);
      this.enumsCache[enumName][index] = formattedNewValue;
      this.enumsCache[enumName].sort();

      this.logger.log(
        `Valor ${oldValue} actualizado a ${formattedNewValue} en enum ${enumName} por usuario ${userId}`,
      );

      return {
        message: `Valor ${oldValue} actualizado a ${formattedNewValue} exitosamente en el enum ${enumName}`,
        enumName,
        oldValue,
        newValue: formattedNewValue,
        allValues: this.enumsCache[enumName],
      };
    } catch (error) {
      this.logger.error(
        `Error actualizando valor en enum ${enumName}: ${error.message}`,
      );

      await this.prisma.enumChangeLog.create({
        data: {
          enumName,
          operation: 'UPDATE',
          oldValue,
          newValue: formattedNewValue,
          changedBy: userId,
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw new BadRequestException(
        `No se pudo actualizar el valor. Error: ${error.message}`,
      );
    }
  }

  // Eliminar valor del enum
  async deleteEnumValue(
    enumName: string,
    value: string,
    userId: string,
  ): Promise<{
    message: string;
    enumName: string;
    deletedValue: string;
    allValues: string[];
  }> {
    // Validar enum
    if (!this.enumsCache[enumName]) {
      throw new NotFoundException(`Enum ${enumName} no encontrado`);
    }

    // Validar valor
    if (!this.enumsCache[enumName].includes(value)) {
      throw new NotFoundException(
        `El valor ${value} no existe en el enum ${enumName}`,
      );
    }

    // Verificar dependencias
    await this.checkDependencies(enumName, value);

    // No eliminar si es el último valor
    if (this.enumsCache[enumName].length === 1) {
      throw new BadRequestException(
        'No se puede eliminar el último valor del enum',
      );
    }

    try {
      // PostgreSQL no permite eliminar valores de enum directamente
      // Necesitamos crear un nuevo enum sin el valor y migrar los datos
      await this.migrateEnumWithoutValue(enumName, value, userId);

      // Actualizar caché
      const index = this.enumsCache[enumName].indexOf(value);
      this.enumsCache[enumName].splice(index, 1);

      this.logger.log(
        `Valor ${value} eliminado del enum ${enumName} por usuario ${userId}`,
      );

      return {
        message: `Valor ${value} eliminado exitosamente del enum ${enumName}`,
        enumName,
        deletedValue: value,
        allValues: this.enumsCache[enumName],
      };
    } catch (error) {
      this.logger.error(
        `Error eliminando valor del enum ${enumName}: ${error.message}`,
      );

      await this.prisma.enumChangeLog.create({
        data: {
          enumName,
          operation: 'DELETE',
          oldValue: value,
          newValue: '',
          changedBy: userId,
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw new BadRequestException(
        `No se pudo eliminar el valor. Error: ${error.message}`,
      );
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  // Verificar dependencias
  private async checkDependencies(
    enumName: string,
    value: string,
  ): Promise<void> {
    const tables = this.getDependencyTables(enumName);

    for (const table of tables) {
      // Escapar el nombre de la tabla y columna (son seguros porque vienen de nuestro código)
      const tableName = table.tableName;
      const columnName = table.columnName;

      // Escapar el valor para evitar inyección SQL (aunque es un valor de enum, por seguridad)
      const escapedValue = value.replace(/'/g, "''");

      // Construir la consulta manualmente
      const query = `
      SELECT COUNT(*) as count FROM "${tableName}" 
      WHERE "${columnName}" = '${escapedValue}'
    `;

      const result =
        await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(query);
      const count = Number(result[0]?.count || 0);

      if (count > 0) {
        throw new ConflictException(
          `No se puede modificar/eliminar el valor ${value} porque está siendo usado en ${count} registro(s) de la tabla ${tableName}`,
        );
      }
    }
  }

  // Obtener tablas que dependen de un enum
  private getDependencyTables(
    enumName: string,
  ): Array<{ tableName: string; columnName: string }> {
    const dependencies: Record<
      string,
      Array<{ tableName: string; columnName: string }>
    > = {
      TipoPersona: [
        { tableName: 'perfiles_solicitantes', columnName: 'tipoPersona' },
      ],
      TipoSolicitud: [
        { tableName: 'solicitudes', columnName: 'tipoSolicitud' },
      ],
      SectorPrioridad: [{ tableName: 'solicitudes', columnName: 'sector' }],
      EstadoSolicitud: [
        { tableName: 'solicitudes', columnName: 'estado' },
        { tableName: 'trazabilidades', columnName: 'estadoAnterior' },
        { tableName: 'trazabilidades', columnName: 'estadoNuevo' },
      ],
      TipoDocumento: [
        { tableName: 'documentos_solicitud', columnName: 'tipoDocumento' },
      ],
      VinculoLaboral: [
        { tableName: 'controles_trimestrales', columnName: 'vinculo' },
      ],
      TipoCirculo: [{ tableName: 'circulos_infantiles', columnName: 'tipo' }],
      ResultadoDecision: [
        { tableName: 'decisiones_solicitud', columnName: 'resultado' },
      ],
      EstadoMatricula: [{ tableName: 'matriculas', columnName: 'estado' }],
      RolUsuario: [{ tableName: 'usuarios', columnName: 'rol' }],
    };

    return dependencies[enumName] || [];
  }

  // Migrar valores de enum (para UPDATE)
  private async migrateEnumValue(
    enumName: string,
    oldValue: string,
    newValue: string,
    userId: string,
  ): Promise<void> {
    const tempEnumName = `${enumName}_temp`;
    const currentValues = this.enumsCache[enumName];
    const newValues = currentValues.map((v) => (v === oldValue ? newValue : v));

    // Construir la cadena de valores para el nuevo enum
    const valuesList = newValues
      .map((v) => `'${v.replace(/'/g, "''")}'`)
      .join(', ');

    // Obtener la lista de tablas y columnas que usan este enum
    const columns = this.getDependencyTables(enumName);
    if (columns.length === 0) {
      // Si no hay dependencias, simplemente agregar el nuevo valor (si es ADD) o renombrar
      // Pero aquí estamos en update, así que debería haber al menos una dependencia.
      throw new Error(`No se encontraron tablas que usen el enum ${enumName}`);
    }

    // Construir la transacción SQL
    const queries: string[] = [];

    // 1. Crear el nuevo enum temporal
    queries.push(`CREATE TYPE "${tempEnumName}" AS ENUM (${valuesList});`);

    // 2. Actualizar las columnas en cada tabla
    for (const col of columns) {
      queries.push(`
      ALTER TABLE "${col.tableName}"
      ALTER COLUMN "${col.columnName}" TYPE "${tempEnumName}"
      USING (
        CASE WHEN "${col.columnName}"::text = '${oldValue.replace(/'/g, "''")}'
             THEN '${newValue.replace(/'/g, "''")}'::text
             ELSE "${col.columnName}"::text
        END
      )::"${tempEnumName}";
    `);
    }

    // 3. Eliminar el enum original
    queries.push(`DROP TYPE "${enumName}" CASCADE;`);

    // 4. Renombrar el temporal al original
    queries.push(`ALTER TYPE "${tempEnumName}" RENAME TO "${enumName}";`);

    // Ejecutar todas las consultas en una transacción
    await this.prisma.$transaction(async (tx) => {
      for (const query of queries) {
        await tx.$executeRawUnsafe(query);
      }
    });

    // Registrar el cambio exitoso
    await this.prisma.enumChangeLog.create({
      data: {
        enumName,
        operation: 'UPDATE',
        oldValue,
        newValue,
        changedBy: userId,
        status: 'APPLIED',
        appliedAt: new Date(),
      },
    });
  }
  // Migrar enum sin un valor (para DELETE)
  private async migrateEnumWithoutValue(
    enumName: string,
    valueToRemove: string,
    userId: string,
  ): Promise<void> {
    const tempEnumName = `${enumName}_temp`;
    const currentValues = this.enumsCache[enumName];
    const newValues = currentValues.filter((v) => v !== valueToRemove);
    const valuesList = newValues
      .map((v) => `'${v.replace(/'/g, "''")}'`)
      .join(', ');

    const columns = this.getDependencyTables(enumName);

    const queries: string[] = [];

    queries.push(`CREATE TYPE "${tempEnumName}" AS ENUM (${valuesList});`);

    for (const col of columns) {
      queries.push(`
      ALTER TABLE "${col.tableName}"
      ALTER COLUMN "${col.columnName}" TYPE "${tempEnumName}"
      USING "${col.columnName}"::text::"${tempEnumName}";
    `);
    }

    queries.push(`DROP TYPE "${enumName}" CASCADE;`);
    queries.push(`ALTER TYPE "${tempEnumName}" RENAME TO "${enumName}";`);

    await this.prisma.$transaction(async (tx) => {
      for (const query of queries) {
        await tx.$executeRawUnsafe(query);
      }
    });

    await this.prisma.enumChangeLog.create({
      data: {
        enumName,
        operation: 'DELETE',
        oldValue: valueToRemove,
        newValue: '',
        changedBy: userId,
        status: 'APPLIED',
        appliedAt: new Date(),
      },
    });
  }

  // Formatear label
  private formatEnumLabel(value: string): string {
    return value
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
}
