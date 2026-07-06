# Alineación del backend con el frontend MINED

## Objetivo

Este cambio alinea `backend-MINED` con los contratos consumidos por el frontend Astro del repositorio `mined`.

## Ajustes realizados

### Estados de solicitudes

El backend conserva sus estados específicos por etapa, pero acepta los valores simplificados enviados por el frontend:

- `APROBADA` se convierte en `APROBADA_COMISION` para Comisión y en `APROBADA_DIRECCION` para Dirección.
- `RECHAZADA` se convierte en `RECHAZADA_COMISION` para Comisión y en `RECHAZADA_DIRECCION` para Dirección.
- El filtro `estado=APROBADA` utilizado por Comisión consulta solicitudes `APROBADA_DIRECCION`.

### Filtro municipal

- `GET /solicitud/pendientes-revision` ahora recibe `municipio`.
- Si no se envía, se utiliza el municipio del usuario autenticado cuando está disponible.

### Permisos del director

El rol `DIRECTOR_CIRCULO` puede consultar:

- `GET /circulos-infantiles/:id`
- `GET /circulos-infantiles/:id/capacidades`
- las rutas de matrículas y estadísticas que ya estaban habilitadas.

La estrategia JWT carga también el perfil del director y su círculo.

### Documentos

- `PATCH /documentos-solicitud/:id/validar` acepta el cuerpo vacío utilizado por el frontend.
- Por defecto valida el documento y obtiene el perfil validador desde el JWT.
- Se añadió `PATCH /documentos-solicitud/:id/rechazar-validacion`.

### Notificaciones

- Las rutas `mis-notificaciones` obtienen el usuario desde el JWT si no se envía `usuarioId`.
- Se añadió `PATCH /notificaciones/mis-notificaciones/marcar-todas-leidas`.

### Traslados

Se implementó el módulo completo de traslados:

- `POST /traslados`
- `GET /traslados`
- `GET /traslados/mis`
- `GET /traslados/:id`
- `PATCH /traslados/:id/estado`

El servicio comprueba propiedad de la matrícula, evita traslados duplicados, valida el círculo de destino y actualiza matrícula y cupos cuando se aprueba.

Se añadió la migración Prisma `20260706100000_add_traslados`.

## Validación

- `prisma generate`: correcto.
- `prisma validate`: correcto.
- `pnpm run build`: correcto.
- Suite Jest existente: 1 suite pasa y 22 fallan por problemas previos de configuración de mocks, resolución de alias `src/*` y dependencias no declaradas en los módulos de prueba. Los fallos no fueron introducidos por este cambio y deben corregirse en una tarea específica de infraestructura de pruebas.

## Despliegue

Antes de iniciar la versión actualizada debe aplicarse la migración:

```bash
pnpm exec prisma migrate deploy
```
