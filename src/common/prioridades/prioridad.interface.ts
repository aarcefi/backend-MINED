export interface ConfiguracionPrioridadContexto {
  sector1?: string | null;
  sector2?: string | null;
  sector3?: string | null;
}

export interface PriorityContext {
  sector: string;
  tipoSolicitud: string;
  nino: {
    casoEspecial?: boolean;
    tipoNecesidad?: string;
  };
  solicitante: {
    cantHijos: number;
  };
  [key: string]: any;
  configuracionPrioridad?: ConfiguracionPrioridadContexto | null;
}

export interface PriorityStrategy {
  calculate(context: PriorityContext): number;
  getName(): string;
}
