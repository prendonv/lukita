import {
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_SETTINGS,
  getSampleInitialExpenses
} from '../utils/defaultData';

const DB_NAME = 'lukita_local_db';
const DB_VERSION = 1;

const STORES = {
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
  PAYMENT_METHODS: 'payment_methods',
  SETTINGS: 'settings'
};

let dbPromise = null;

/**
 * Opens or initializes the local IndexedDB database on the user's device.
 */
export const openLocalDatabase = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        expStore.createIndex('date', 'date', { unique: false });
        expStore.createIndex('currency', 'currency', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.PAYMENT_METHODS)) {
        db.createObjectStore(STORES.PAYMENT_METHODS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });

  return dbPromise;
};

const getAllFromStore = async (storeName) => {
  const db = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

const putItemInStore = async (storeName, item) => {
  const db = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
};

const putBulkInStore = async (storeName, items, clearFirst = false) => {
  const db = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    if (clearFirst) {
      store.clear();
    }

    items.forEach((item) => {
      store.put(item);
    });

    tx.oncomplete = () => resolve(items);
    tx.onerror = () => reject(tx.error);
  });
};

const deleteFromStore = async (storeName, id) => {
  const db = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Loads all application data from IndexedDB and seeds initial defaults if first run.
 */
export const bootstrapLocalData = async () => {
  let [expenses, categories, paymentMethods, settingsList] = await Promise.all([
    getAllFromStore(STORES.EXPENSES),
    getAllFromStore(STORES.CATEGORIES),
    getAllFromStore(STORES.PAYMENT_METHODS),
    getAllFromStore(STORES.SETTINGS)
  ]);

  let settings = settingsList.find((s) => s.id === 'app_settings');

  // Seed initial defaults on first launch
  if (!settings) {
    settings = { ...DEFAULT_SETTINGS };
    await putItemInStore(STORES.SETTINGS, settings);
  }

  if (categories.length === 0) {
    categories = [...DEFAULT_CATEGORIES];
    await putBulkInStore(STORES.CATEGORIES, categories);
  }

  if (paymentMethods.length === 0) {
    paymentMethods = [...DEFAULT_PAYMENT_METHODS];
    await putBulkInStore(STORES.PAYMENT_METHODS, paymentMethods);
  } else {
    // Migrate legacy "Nequi / Transferencia" label to "Transferencia"
    const nequiMethod = paymentMethods.find(
      (m) => m.id === 'pay_nequi' && m.name === 'Nequi / Transferencia'
    );
    if (nequiMethod) {
      nequiMethod.name = 'Transferencia';
      await putItemInStore(STORES.PAYMENT_METHODS, nequiMethod);
    }
  }

  // Seed one welcome editable sample if brand new installation
  const hasSeededFlag = localStorage.getItem('lukita_seeded_v1');
  if (!hasSeededFlag && expenses.length === 0) {
    const sample = getSampleInitialExpenses();
    await putBulkInStore(STORES.EXPENSES, sample);
    expenses = sample;
    localStorage.setItem('lukita_seeded_v1', 'true');
  }

  // Sort expenses newest first by date, then createdAt
  expenses.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return {
    expenses,
    categories,
    paymentMethods,
    settings
  };
};

export const dbSaveExpense = (expense) => putItemInStore(STORES.EXPENSES, expense);
export const dbSaveExpensesBulk = (expenses, clearFirst = false) =>
  putBulkInStore(STORES.EXPENSES, expenses, clearFirst);
export const dbDeleteExpense = (id) => deleteFromStore(STORES.EXPENSES, id);

export const dbSaveCategory = (category) => putItemInStore(STORES.CATEGORIES, category);
export const dbDeleteCategory = (id) => deleteFromStore(STORES.CATEGORIES, id);

export const dbSavePaymentMethod = (method) =>
  putItemInStore(STORES.PAYMENT_METHODS, method);
export const dbDeletePaymentMethod = (id) =>
  deleteFromStore(STORES.PAYMENT_METHODS, id);

export const dbSaveSettings = (settings) =>
  putItemInStore(STORES.SETTINGS, { ...settings, id: 'app_settings' });

/**
 * Replaces the full local database from a JSON backup snapshot.
 */
export const dbRestoreFullBackup = async (backupPayload) => {
  const {
    expenses = [],
    categories = DEFAULT_CATEGORIES,
    paymentMethods = DEFAULT_PAYMENT_METHODS,
    settings = DEFAULT_SETTINGS
  } = backupPayload;

  await Promise.all([
    putBulkInStore(STORES.EXPENSES, expenses, true),
    putBulkInStore(STORES.CATEGORIES, categories, true),
    putBulkInStore(STORES.PAYMENT_METHODS, paymentMethods, true),
    putItemInStore(STORES.SETTINGS, { ...DEFAULT_SETTINGS, ...settings, id: 'app_settings' })
  ]);

  localStorage.setItem('lukita_seeded_v1', 'true');
  return bootstrapLocalData();
};
