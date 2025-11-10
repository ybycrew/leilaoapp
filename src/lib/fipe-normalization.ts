function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

const MODEL_TRIM_TOKENS = new Set<string>([
  'LT',
  'LTZ',
  'LS',
  'L',
  'SE',
  'SEL',
  'SES',
  'GL',
  'GLI',
  'GLS',
  'GLX',
  'GLXIS',
  'GLXI',
  'GX',
  'GX2',
  'GX3',
  'GX4',
  'LX',
  'LXL',
  'LXS',
  'EL',
  'ELX',
  'EX',
  'EXL',
  'EXS',
  'XR',
  'XS',
  'XLT',
  'XLS',
  'XLE',
  'XSE',
  'SR',
  'SRX',
  'SRV',
  'SL',
  'SLX',
  'SLT',
  'SXT',
  'RTX',
  'RT',
  'RS',
  'RZ',
  'S',
  'SI',
  'ST',
  'SW',
  'SX',
  'ZX',
  'ZL',
  'ZI',
  'GT',
  'GTS',
  'GTI',
  'GTR',
  'T',
  'TSI',
  'TFSI',
  'TDI',
  'CDI',
  'MPI',
  'FLEX',
  'FLEXPOWER',
  'FLEXFUEL',
  'FUELFLEX',
  'BI-FUEL',
  'TURBO',
  'SUPERCHARGED',
  'COMPRESSOR',
  'TIPTRONIC',
  'CVT',
  'AUT',
  'AUTO',
  'AUTOMATICO',
  'AUTOMÁTICO',
  'AUTOMATIC',
  'AUTOMÁTICA',
  'MANUAL',
  'MEC',
  'MEC.',
  'MECANICO',
  'MECÂNICO',
  'MECANICA',
  'MECÂNICA',
  'AT',
  'MT',
  'DCT',
  'DSG',
  'POWERSHIFT',
  'TIPTRONIC',
  'HATCH',
  'HATCHBACK',
  'SEDAN',
  'SALOON',
  'COUPE',
  'COUPÉ',
  'CABRIO',
  'CABRIOLET',
  'ROADSTER',
  'FASTBACK',
  'PERUA',
  'WAGON',
  'SW',
  'SUV',
  'CROSS',
  'CROSSOVER',
  'CROSSWAY',
  'CROSSFOX',
  'ADVENTURE',
  'ADVENTURELOCKER',
  'ADVENTURELOCK',
  'LOCKER',
  'TRAIL',
  'TRAILHAWK',
  'MOAB',
  'OVERLAND',
  'LIMITED',
  'PLATINUM',
  'PREMIUM',
  'PRIME',
  'ELITE',
  'LUXO',
  'LUXE',
  'LUXURY',
  'BLACK',
  'BLACKHAWK',
  'BLACKLINE',
  'BLACKPACKAGE',
  'NIGHT',
  'NIGHTFALL',
  'SUNSET',
  'SUN',
  'SOLAR',
  'POWER',
  'POWERTECH',
  'POWERPLUS',
  'TECH',
  'TECH1',
  'TECH2',
  'TECH3',
  'CONNECT',
  'CONNECTED',
  'SENSE',
  'VISION',
  'ACTIVE',
  'ACTION',
  'STYLE',
  'ELEGANCE',
  'CONFORT',
  'COMFORT',
  'COMFORTLINE',
  'HIGH',
  'HIGHLINE',
  'HIGHCOUNTRY',
  'HIGH COUNTRY',
  'COUNTRY',
  'COUNTRYMAN',
  'COUNTRYMANE',
  'TREND',
  'TRENDLINE',
  'UP',
  'UPT',
  'BLINDADO',
  'BLINDADA',
  'UTILITARIO',
  'UTILITÁRIO',
  'CAB',
  'CABINE',
  'CABINE DUPLA',
  'CABINE ESTENDIDA',
  'DUPLA',
  'SIMPLES',
  'CS',
  'CD',
  'CE',
  'PICAPE',
  'PICKUP',
  'PICK-UP',
  '4X2',
  '4X4',
  '2WD',
  '4WD',
  'AWD',
  'FWD',
  'RWD',
  '8V',
  '16V',
  '24V',
  '32V',
  'VVT',
  'VVTI',
  'ECO',
  'ECON',
  'ECONOMY',
  'ECONOFLEX',
  'E-FLEX',
  'TJET',
  'THP',
  'HPT',
  'HP',
  'HEV',
  'HÍBRIDO',
  'HIBRIDO',
  'HYBRID',
  'E-HYBRID',
  'ELÉTRICO',
  'ELETRICO',
  'ELECTRIC',
  'PHEV',
  'E-POWER',
  'ETORQ',
  'E-TORQ',
  'E-TORQUE',
  'E-DRIVE',
  'DRIVE',
  'ENERGI',
  'ENERGY',
  'POWERTRAIN',
  'TFSIE',
  'E-HDI',
  'HDI',
  'TDI',
  'CDI',
  'COMMONRAIL'
]);

const NUMBER_WITH_DECIMAL = /^\d+([.,]\d+)?$/;
const PLAIN_NUMBER = /^\d+$/;
const LETTER_TOKEN = /^[A-Z]{1,3}$/;

/**
 * Normalizes a string by removing diacritics and converting to uppercase ASCII.
 */
export function toAsciiUpper(value: string): string {
  return stripDiacritics(value)
    .replace(/['’`´]/g, '')
    .toUpperCase();
}

/**
 * Builds a search key removing non-alphanumeric characters from the uppercase representation.
 */
export function buildSearchKey(value: string): string {
  return toAsciiUpper(value).replace(/[^A-Z0-9]/g, '');
}

/**
 * Extracts a base name for a FIPE model, removing version/trim indicators.
 */
export function extractModelBase(value: string): {
  baseName: string;
  baseNameUpper: string;
  baseSearchName: string;
  nameUpper: string;
  variantName: string;
} {
  if (!value) {
    return {
      baseName: '',
      baseNameUpper: '',
      baseSearchName: '',
      nameUpper: '',
      variantName: ''
    };
  }

  const cleaned = value.replace(/[(),.;:]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return {
      baseName: '',
      baseNameUpper: '',
      baseSearchName: '',
      nameUpper: '',
      variantName: ''
    };
  }

  const tokensOriginal = cleaned.split(' ');
  const tokensUpper = toAsciiUpper(cleaned).split(' ');

  const baseTokens: string[] = [];

  for (let i = 0; i < tokensUpper.length; i++) {
    const upperToken = tokensUpper[i];
    const originalToken = tokensOriginal[i];
    if (!upperToken) {
      continue;
    }

    if (baseTokens.length === 0) {
      baseTokens.push(originalToken);
      continue;
    }

    if (upperToken.includes('/')) {
      break;
    }

    if (MODEL_TRIM_TOKENS.has(upperToken)) {
      break;
    }

    if (NUMBER_WITH_DECIMAL.test(upperToken)) {
      if (baseTokens.length === 1 && LETTER_TOKEN.test(tokensUpper[0])) {
        baseTokens.push(originalToken);
        continue;
      }
      break;
    }

    if (PLAIN_NUMBER.test(upperToken)) {
      if (baseTokens.length === 1 && LETTER_TOKEN.test(tokensUpper[0])) {
        baseTokens.push(originalToken);
        continue;
      }
      break;
    }

    baseTokens.push(originalToken);
  }

  if (baseTokens.length === 0) {
    baseTokens.push(tokensOriginal[0]);
  }

  const baseName = baseTokens.join(' ').trim();
  const variantTokens = tokensOriginal.slice(baseTokens.length);
  const variantName = variantTokens.join(' ').trim();
  const baseNameUpper = toAsciiUpper(baseName);
  const baseSearchName = buildSearchKey(baseName);
  const nameUpper = toAsciiUpper(value);

  return {
    baseName,
    baseNameUpper,
    baseSearchName,
    nameUpper,
    variantName
  };
}

export function normalizeBrandName(value: string): {
  display: string;
  upper: string;
  search: string;
} {
  const trimmed = value.trim();
  const upper = toAsciiUpper(trimmed);
  return {
    display: upper,
    upper,
    search: buildSearchKey(trimmed)
  };
}

