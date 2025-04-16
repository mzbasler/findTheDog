/**
 * Configuração global do aplicativo PetRadar
 */
const CONFIG = {
  // Chave de armazenamento local
  STORAGE_KEY: "dogSightings",

  // Configurações do mapa
  MAP: {
    DEFAULT_CENTER: [-15.793889, -47.882778], // Centro do Brasil
    DEFAULT_ZOOM: 5,
    MAX_ZOOM: 19,
    TILE_LAYER: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ATTRIBUTION:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    BUFFER_RADIUS: 1000, // 1km em metros
    BUFFER_COLOR: "red",
    BUFFER_FILL_COLOR: "#f03",
    BUFFER_FILL_OPACITY: 0.2,
    ROUTE_COLOR: "blue",
    ROUTE_WEIGHT: 3,
    MARKER_ACTIVE_COLOR: "#007bff",
    MARKER_INACTIVE_COLOR: "#aaaaaa",
    MARKER_SIZE: 25,
    MARKER_BORDER: "2px solid white",
  },

  // Configurações de filtros de tempo
  TIME_FILTERS: {
    MORNING: {
      name: "Manhã",
      startHour: 6,
      endHour: 11,
      endMinute: 59,
    },
    AFTERNOON: {
      name: "Tarde",
      startHour: 12,
      endHour: 17,
      endMinute: 59,
    },
    EVENING: {
      name: "Noite",
      startHour: 18,
      endHour: 22,
      endMinute: 59,
    },
    NIGHT: {
      name: "Madrugada",
      startHour: 23,
      endHour: 5,
      endMinute: 59,
      crossesMidnight: true,
    },
  },

  // Duração dos alertas em ms
  ALERT_DURATION: 3000,

  // Formato de data para exibição
  DATE_FORMAT: {
    locale: "pt-BR",
    options: {},
  },

  // Padrões para processamento de arquivos
  FILE_PROCESSING: {
    DEFAULT_HEADERS: ["Data", "Horário", "Coordenadas", "Obs"],
    CSV_PREVIEW_ROWS: 5,
    DATE_PATTERNS: [
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{2}\/\d{2}\/\d{2}$/, // DD/MM/YY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    ],
    TIME_PATTERNS: {
      HHhMM: /^\d{1,2}h\d{2}$/, // 09h00 ou 9h00
      HHh: /^\d{1,2}h$/, // 09h ou 9h
      HHMM: /^\d{2}:\d{2}$/, // 09:00
    },
    COORDS_PATTERN: /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/, // -30.0271, -51.1940
  },

  // Atrasos para inicialização e atualizações (ms)
  DELAYS: {
    INIT: 100,
    MAP_UPDATE: 200,
  },
};
