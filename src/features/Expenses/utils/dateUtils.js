const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

/**
 * Returns YYYY-MM-DD in local device timezone
 */
export const getTodayISODate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns YYYY-MM for a given Date or current date
 */
export const getCurrentYearMonth = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Shifts a YYYY-MM string by delta months (-1 for previous, +1 for next)
 */
export const shiftYearMonth = (yearMonth, delta) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return getCurrentYearMonth(date);
};

/**
 * Formats YYYY-MM into "Octubre 2026"
 */
export const formatMonthLabel = (yearMonth) => {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-').map(Number);
  const monthName = MONTH_NAMES[month - 1] || '';
  return `${monthName} ${year}`;
};

/**
 * Formats YYYY-MM-DD into friendly Spanish label ("Hoy", "Ayer", or "24 oct")
 */
export const formatShortDate = (isoDate) => {
  if (!isoDate) return '';
  const today = getTodayISODate();
  if (isoDate === today) return 'Hoy';

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayISO = `${yesterdayDate.getFullYear()}-${String(
    yesterdayDate.getMonth() + 1
  ).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  if (isoDate === yesterdayISO) return 'Ayer';

  const [year, month, day] = isoDate.split('-').map(Number);
  const shortMonths = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic'
  ];
  return `${day} ${shortMonths[month - 1] || ''} ${year !== new Date().getFullYear() ? year : ''}`.trim();
};
