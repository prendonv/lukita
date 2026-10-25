import { getTodayISODate } from './dateUtils';

export const DEFAULT_CATEGORIES = [
  {
    id: 'cat_food',
    name: 'Alimentación',
    emoji: '🍽️',
    color: '#10B981',
    subcategories: [
      { id: 'sub_groceries', name: 'Mercado' },
      { id: 'sub_restaurants', name: 'Restaurantes' },
      { id: 'sub_delivery', name: 'Domicilios' }
    ]
  },
  {
    id: 'cat_transport',
    name: 'Transporte',
    emoji: '🚕',
    color: '#3B82F6',
    subcategories: [
      { id: 'sub_uber', name: 'Uber / Taxi' },
      { id: 'sub_fuel', name: 'Gasolina / Peajes' },
      { id: 'sub_public', name: 'Transporte público' }
    ]
  },
  {
    id: 'cat_home',
    name: 'Hogar y Servicios',
    emoji: '🏠',
    color: '#8B5CF6',
    subcategories: [
      { id: 'sub_rent', name: 'Arriendo / Hipoteca' },
      { id: 'sub_utilities', name: 'Luz, Agua e Internet' },
      { id: 'sub_maintenance', name: 'Aseo y Mantenimiento' }
    ]
  },
  {
    id: 'cat_cravings',
    name: 'Café y Antojos',
    emoji: '☕',
    color: '#F59E0B',
    subcategories: [
      { id: 'sub_coffee', name: 'Cafetería' },
      { id: 'sub_snacks', name: 'Snacks y Postres' }
    ]
  },
  {
    id: 'cat_entertainment',
    name: 'Ocio y Salidas',
    emoji: '🎬',
    color: '#EC4899',
    subcategories: [
      { id: 'sub_streaming', name: 'Suscripciones' },
      { id: 'sub_bars', name: 'Salidas y Amigos' },
      { id: 'sub_cinema', name: 'Cine y Eventos' }
    ]
  },
  {
    id: 'cat_health',
    name: 'Salud y Bienestar',
    emoji: '💊',
    color: '#06B6D4',
    subcategories: [
      { id: 'sub_pharmacy', name: 'Farmacia' },
      { id: 'sub_gym', name: 'Gimnasio / Deporte' },
      { id: 'sub_doctor', name: 'Consultas médicas' }
    ]
  },
  {
    id: 'cat_shopping',
    name: 'Compras y Ropa',
    emoji: '🛍️',
    color: '#F43F5E',
    subcategories: [
      { id: 'sub_clothing', name: 'Ropa y Calzado' },
      { id: 'sub_tech', name: 'Tecnología' },
      { id: 'sub_gifts', name: 'Regalos' }
    ]
  },
  {
    id: 'cat_travel',
    name: 'Viajes',
    emoji: '✈️',
    color: '#14B8A6',
    subcategories: [
      { id: 'sub_flights', name: 'Tiquetes' },
      { id: 'sub_hotel', name: 'Alojamiento' }
    ]
  }
];

export const DEFAULT_PAYMENT_METHODS = [
  { id: 'pay_nequi', name: 'Transferencia', icon: '📱' },
  { id: 'pay_card_credit', name: 'Tarjeta de Crédito', icon: '💳' },
  { id: 'pay_card_debit', name: 'Tarjeta Débito', icon: '🏦' },
  { id: 'pay_cash', name: 'Efectivo', icon: '💵' }
];

export const DEFAULT_SETTINGS = {
  id: 'app_settings',
  defaultCurrency: 'COP',
  activeCurrencies: ['COP', 'USD', 'EUR'],
  theme: 'system',
  googleClientId: '',
  googleSpreadsheetId: '',
  googleSpreadsheetUrl: '',
  lastSheetsSyncAt: null,
  lastDriveBackupAt: null
};

export const getSampleInitialExpenses = () => {
  const today = getTodayISODate();
  return [
    {
      id: 'exp_welcome_1',
      amount: 14500,
      currency: 'COP',
      categoryId: 'cat_cravings',
      subcategoryId: 'sub_coffee',
      paymentMethodId: 'pay_nequi',
      date: today,
      note: 'Café de especialidad y croissant (Ejemplo editable)',
      createdAt: new Date().toISOString(),
      syncedToSheets: false
    }
  ];
};
