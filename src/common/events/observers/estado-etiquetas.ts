const ETIQUETAS_ESTADO: Record<string, string> = {
  EN_REVISION: 'En revisión',
  EN_ESPERA: 'En espera',
  APROBADA_DIRECCION: 'Aprobada por Dirección',
  APROBADA_COMISION: 'Plaza otorgada',
  RECHAZADA_DIRECCION: 'Denegada por Dirección',
  RECHAZADA_COMISION: 'Denegada por Comisión',
};

export const etiquetaEstado = (estado: string) =>
  ETIQUETAS_ESTADO[estado] ?? estado;
