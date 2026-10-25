/**
 * Supported currencies in Lukita.
 * Includes decimal configuration and formatting rules.
 */
export const SUPPORTED_CURRENCIES = [
  {
    code: 'COP',
    symbol: '$',
    name: 'Peso Colombiano',
    locale: 'es-CO',
    decimals: 0,
    flag: '🇨🇴'
  },
  {
    code: 'USD',
    symbol: 'US$',
    name: 'Dólar Estadounidense',
    locale: 'en-US',
    decimals: 2,
    flag: '🇺🇸'
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'es-ES',
    decimals: 2,
    flag: '🇪🇺'
  },
  {
    code: 'MXN',
    symbol: 'MX$',
    name: 'Peso Mexicano',
    locale: 'es-MX',
    decimals: 2,
    flag: '🇲🇽'
  },
  {
    code: 'CLP',
    symbol: 'CLP$',
    name: 'Peso Chileno',
    locale: 'es-CL',
    decimals: 0,
    flag: '🇨🇱'
  }
];

export const getCurrencyMeta = (code = 'COP') => {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0]
  );
};

/**
 * Formats a numeric amount according to its currency rules.
 */
export const formatCurrencyAmount = (amount, currencyCode = 'COP', options = {}) => {
  const meta = getCurrencyMeta(currencyCode);
  const numericValue = Number(amount) || 0;

  const formattedNumber = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: options.forceDecimals ? meta.decimals : 0,
    maximumFractionDigits: meta.decimals
  }).format(numericValue);

  if (options.withCode) {
    return `${meta.symbol}${formattedNumber} ${meta.code}`;
  }
  return `${meta.symbol}${formattedNumber}`;
};

/**
 * Formats a raw string entered in the custom keypad for live display.
 */
export const formatKeypadDisplay = (rawString, currencyCode = 'COP') => {
  if (!rawString || rawString === '0') return '0';
  const meta = getCurrencyMeta(currencyCode);

  const [integerPart, decimalPart] = rawString.split('.');
  const cleanInt = Number(integerPart.replace(/\D/g, '')) || 0;
  const formattedInt = new Intl.NumberFormat(meta.locale, {
    maximumFractionDigits: 0
  }).format(cleanInt);

  if (decimalPart !== undefined && meta.decimals > 0) {
    return `${formattedInt},${decimalPart.slice(0, meta.decimals)}`;
  }

  return formattedInt;
};
