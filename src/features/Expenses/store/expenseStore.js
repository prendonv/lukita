import { create } from 'zustand';
import {
  bootstrapLocalData,
  dbSaveExpense,
  dbDeleteExpense,
  dbSaveCategory,
  dbDeleteCategory,
  dbSavePaymentMethod,
  dbDeletePaymentMethod,
  dbSaveSettings,
  dbSaveExpensesBulk,
  dbRestoreFullBackup
} from '../services/localDb';
import { getCurrentYearMonth, shiftYearMonth } from '../utils/dateUtils';
import { DEFAULT_SETTINGS } from '../utils/defaultData';

export const useExpenseStore = create((set, get) => ({
  isInitialized: false,
  expenses: [],
  categories: [],
  paymentMethods: [],
  settings: DEFAULT_SETTINGS,

  // Active dashboard state
  selectedYearMonth: getCurrentYearMonth(),
  selectedCurrencyFilter: 'COP',
  editingExpense: null,

  // Global toast notification state
  toast: null,

  showToast: (message, type = 'success') => {
    const id = Date.now();
    set({ toast: { id, message, type } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 3400);
  },

  dismissToast: () => set({ toast: null }),

  initStore: async () => {
    try {
      const data = await bootstrapLocalData();
      // Apply theme attribute if user selected explicit light/dark
      if (data.settings?.theme && data.settings.theme !== 'system') {
        document.documentElement.setAttribute('data-theme', data.settings.theme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      set({
        expenses: data.expenses,
        categories: data.categories,
        paymentMethods: data.paymentMethods,
        settings: data.settings,
        selectedCurrencyFilter: data.settings.defaultCurrency || 'COP',
        isInitialized: true
      });
    } catch (error) {
      console.error('Failed to initialize IndexedDB store:', error);
      set({ isInitialized: true });
    }
  },

  setSelectedYearMonth: (yearMonth) => set({ selectedYearMonth: yearMonth }),

  navigateMonth: (delta) => {
    const next = shiftYearMonth(get().selectedYearMonth, delta);
    set({ selectedYearMonth: next });
  },

  setSelectedCurrencyFilter: (currency) =>
    set({ selectedCurrencyFilter: currency }),

  setEditingExpense: (expenseOrNull) => set({ editingExpense: expenseOrNull }),

  // Expense CRUD
  saveExpense: async (expenseInput) => {
    const isUpdate = Boolean(expenseInput.id);
    const expense = {
      id: expenseInput.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amount: Number(expenseInput.amount),
      currency: expenseInput.currency || get().settings.defaultCurrency || 'COP',
      categoryId: expenseInput.categoryId,
      subcategoryId: expenseInput.subcategoryId || null,
      paymentMethodId: expenseInput.paymentMethodId,
      date: expenseInput.date,
      note: (expenseInput.note || '').trim(),
      createdAt: expenseInput.createdAt || new Date().toISOString(),
      syncedToSheets: false
    };

    await dbSaveExpense(expense);

    const updated = isUpdate
      ? get().expenses.map((e) => (e.id === expense.id ? expense : e))
      : [expense, ...get().expenses];

    updated.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    set({
      expenses: updated,
      selectedCurrencyFilter: expense.currency,
      editingExpense: null
    });

    get().showToast(
      isUpdate ? 'Gasto actualizado localmente' : 'Gasto guardado al instante',
      'success'
    );
    return expense;
  },

  deleteExpense: async (id) => {
    await dbDeleteExpense(id);
    set({
      expenses: get().expenses.filter((e) => e.id !== id),
      editingExpense: null
    });
    get().showToast('Registro eliminado de tu dispositivo', 'info');
  },

  markExpensesSynced: async (ids) => {
    const idSet = new Set(ids);
    const updated = get().expenses.map((exp) =>
      idSet.has(exp.id) ? { ...exp, syncedToSheets: true } : exp
    );
    await dbSaveExpensesBulk(updated, false);
    set({ expenses: updated });
  },

  // Category CRUD
  saveCategory: async (categoryInput) => {
    const isUpdate = Boolean(categoryInput.id);
    const category = {
      id: categoryInput.id || `cat_${Date.now()}`,
      name: categoryInput.name.trim(),
      emoji: categoryInput.emoji || '🏷️',
      color: categoryInput.color || '#10B981',
      subcategories: categoryInput.subcategories || []
    };

    await dbSaveCategory(category);
    const updated = isUpdate
      ? get().categories.map((c) => (c.id === category.id ? category : c))
      : [...get().categories, category];

    set({ categories: updated });
    get().showToast(
      isUpdate ? 'Categoría actualizada' : 'Categoría creada localmente',
      'success'
    );
  },

  deleteCategory: async (id) => {
    if (get().categories.length <= 1) {
      get().showToast('Debes conservar al menos una categoría activa.', 'error');
      return;
    }
    await dbDeleteCategory(id);
    set({ categories: get().categories.filter((c) => c.id !== id) });
    get().showToast('Categoría eliminada', 'info');
  },

  // Payment Method CRUD
  savePaymentMethod: async (methodInput) => {
    const isUpdate = Boolean(methodInput.id);
    const method = {
      id: methodInput.id || `pay_${Date.now()}`,
      name: methodInput.name.trim(),
      icon: methodInput.icon || '💳'
    };

    await dbSavePaymentMethod(method);
    const updated = isUpdate
      ? get().paymentMethods.map((m) => (m.id === method.id ? method : m))
      : [...get().paymentMethods, method];

    set({ paymentMethods: updated });
    get().showToast(
      isUpdate ? 'Método de pago actualizado' : 'Método de pago agregado',
      'success'
    );
  },

  deletePaymentMethod: async (id) => {
    if (get().paymentMethods.length <= 1) {
      get().showToast('Debes conservar al menos un método de pago.', 'error');
      return;
    }
    await dbDeletePaymentMethod(id);
    set({
      paymentMethods: get().paymentMethods.filter((m) => m.id !== id)
    });
    get().showToast('Método de pago eliminado', 'info');
  },

  // Settings Update
  updateSettings: async (partialSettings) => {
    const nextSettings = {
      ...get().settings,
      ...partialSettings,
      id: 'app_settings'
    };
    await dbSaveSettings(nextSettings);

    if (nextSettings.theme && nextSettings.theme !== 'system') {
      document.documentElement.setAttribute('data-theme', nextSettings.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    set({ settings: nextSettings });
  },

  // Full Backup Restore
  restoreBackupData: async (backupPayload) => {
    const data = await dbRestoreFullBackup(backupPayload);
    set({
      expenses: data.expenses,
      categories: data.categories,
      paymentMethods: data.paymentMethods,
      settings: data.settings,
      selectedCurrencyFilter: data.settings.defaultCurrency || 'COP'
    });
    get().showToast('Tus datos han sido restaurados con éxito', 'success');
  }
}));
