import { getTodayISODate } from './dateUtils';

export const DEFAULT_CATEGORIES = [
  {
    id: 'cat_pets',
    name: 'Animalitos',
    emoji: '🐈',
    color: '#10B981',
    subcategories: [
      { id: 'sub_pets_food', name: 'Concentrado y Arena' },
      { id: 'sub_pets_vet', name: 'Veterinario' },
      { id: 'sub_pets_acc', name: 'Accesorios y Juguetes' }
    ]
  },
  {
    id: 'cat_investments',
    name: 'Inversiones',
    emoji: '📈',
    color: '#3B82F6',
    subcategories: [
      { id: 'sub_inv_global66', name: 'Global66 / Divisas' },
      { id: 'sub_inv_funds', name: 'Fondos / Acciones' },
      { id: 'sub_inv_savings', name: 'Ahorro' }
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
  appsScriptUrl: '',
  googleClientId: '',
  googleSpreadsheetId: '',
  googleSpreadsheetUrl: '',
  lastSheetsSyncAt: null,
  lastDriveBackupAt: null
};

export const getSampleInitialExpenses = () => {
  return [
    {
      id: 'exp_1792904623037_13dl',
      amount: 48000,
      currency: 'COP',
      categoryId: 'cat_pets',
      subcategoryId: null,
      paymentMethodId: 'pay_card_credit',
      date: '2026-10-25',
      note: 'Arena, cepillo y pepitas de olor',
      createdAt: '2026-10-25T05:03:43.037Z',
      syncedToSheets: true
    },
    {
      id: 'exp_1792950242459_gwqi',
      amount: 30000,
      currency: 'COP',
      categoryId: 'cat_entertainment',
      subcategoryId: null,
      paymentMethodId: 'pay_nequi',
      date: '2026-10-25',
      note: 'Ruta fucsia',
      createdAt: '2026-10-25T17:44:02.459Z',
      syncedToSheets: true
    },
    {
      id: 'exp_1793133836082_mr5c',
      amount: 16000,
      currency: 'COP',
      categoryId: 'cat_pets',
      subcategoryId: null,
      paymentMethodId: 'pay_nequi',
      date: '2026-10-27',
      note: 'Comedero 8',
      createdAt: '2026-10-27T20:43:56.082Z',
      syncedToSheets: true
    },
    {
      id: 'exp_1793119864238_l7y2',
      amount: 50000,
      currency: 'COP',
      categoryId: 'cat_investments',
      subcategoryId: null,
      paymentMethodId: 'pay_nequi',
      date: '2026-10-27',
      note: 'Global66',
      createdAt: '2026-10-27T16:51:04.238Z',
      syncedToSheets: true
    }
  ];
};
