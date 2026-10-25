import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Backspace,
  CalendarBlank,
  Check,
  NotePencil,
  Wallet,
  X,
  ArrowRight
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useExpenseStore } from '../store/expenseStore';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyMeta,
  formatKeypadDisplay,
  formatCurrencyAmount
} from '../utils/currencyUtils';
import { getTodayISODate, formatShortDate } from '../utils/dateUtils';
import styles from './QuickEntryView.module.css';

export const QuickEntryView = () => {
  const navigate = useNavigate();
  const categories = useExpenseStore((s) => s.categories);
  const paymentMethods = useExpenseStore((s) => s.paymentMethods);
  const settings = useExpenseStore((s) => s.settings);
  const editingExpense = useExpenseStore((s) => s.editingExpense);
  const setEditingExpense = useExpenseStore((s) => s.setEditingExpense);
  const saveExpense = useExpenseStore((s) => s.saveExpense);
  const expenses = useExpenseStore((s) => s.expenses);
  const showToast = useExpenseStore((s) => s.showToast);

  const defaultCurrency = settings.defaultCurrency || 'COP';
  const activeCurrencyCodes = settings.activeCurrencies?.length
    ? settings.activeCurrencies
    : ['COP', 'USD', 'EUR'];

  const [rawAmount, setRawAmount] = useState('0');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || 'cat_food'
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(
    paymentMethods[0]?.id || 'pay_nequi'
  );
  const [date, setDate] = useState(getTodayISODate());
  const [note, setNote] = useState('');

  // Populate fields if editing an existing expense
  useEffect(() => {
    if (editingExpense) {
      setRawAmount(String(editingExpense.amount));
      setCurrency(editingExpense.currency);
      setSelectedCategoryId(editingExpense.categoryId);
      setSelectedSubcategoryId(editingExpense.subcategoryId || null);
      setSelectedPaymentId(editingExpense.paymentMethodId);
      setDate(editingExpense.date);
      setNote(editingExpense.note || '');
    }
  }, [editingExpense]);

  // Keep valid defaults if categories or payment methods load
  useEffect(() => {
    if (!editingExpense) {
      if (categories.length > 0 && !categories.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(categories[0].id);
      }
      if (
        paymentMethods.length > 0 &&
        !paymentMethods.some((p) => p.id === selectedPaymentId)
      ) {
        setSelectedPaymentId(paymentMethods[0].id);
      }
    }
  }, [categories, paymentMethods, editingExpense, selectedCategoryId, selectedPaymentId]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || categories[0],
    [categories, selectedCategoryId]
  );

  const currencyMeta = useMemo(() => getCurrencyMeta(currency), [currency]);

  // Append digit or key to rawAmount
  const handleKeyPress = (key) => {
    if (key === 'BACKSPACE') {
      setRawAmount((prev) => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
      return;
    }

    if (key === 'CLEAR') {
      setRawAmount('0');
      return;
    }

    if (key === '.') {
      if (currencyMeta.decimals === 0) return;
      if (rawAmount.includes('.')) return;
      setRawAmount((prev) => `${prev}.`);
      return;
    }

    setRawAmount((prev) => {
      // Prevent excessive length
      const [intPart, decPart] = prev.split('.');
      if (decPart !== undefined && decPart.length >= currencyMeta.decimals) {
        return prev;
      }
      if (intPart.length >= 10 && decPart === undefined) {
        return prev;
      }

      if (prev === '0') {
        if (key === '0' || key === '000') return '0';
        return key;
      }
      return `${prev}${key}`;
    });
  };

  // Support physical keyboard input for desktop / iPad users
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeyPress('BACKSPACE');
      } else if (e.key === '.' || e.key === ',') {
        handleKeyPress('.');
      } else if (e.key === 'Escape') {
        handleKeyPress('CLEAR');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleCategorySelect = (catId) => {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId(null);
  };

  const handleCurrencyChange = (nextCurrency) => {
    const nextMeta = getCurrencyMeta(nextCurrency);
    if (nextMeta.decimals === 0 && rawAmount.includes('.')) {
      setRawAmount(rawAmount.split('.')[0]);
    }
    setCurrency(nextCurrency);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(rawAmount);
    if (!numericAmount || numericAmount <= 0) {
      showToast('Ingresa un monto mayor a cero para guardar el gasto.', 'error');
      return;
    }

    await saveExpense({
      id: editingExpense?.id,
      amount: numericAmount,
      currency,
      categoryId: selectedCategoryId,
      subcategoryId: selectedSubcategoryId,
      paymentMethodId: selectedPaymentId,
      date,
      note,
      createdAt: editingExpense?.createdAt
    });

    // Reset for immediate next entry
    setRawAmount('0');
    setNote('');
    setSelectedSubcategoryId(null);

    if (editingExpense) {
      navigate('/movimientos');
    }
  };

  const recentExpenses = useMemo(() => expenses.slice(0, 3), [expenses]);

  const bottomLeftKey = currencyMeta.decimals === 0 ? '000' : '.';

  return (
    <section className={styles.entryPage} aria-label="Registrar nuevo gasto">
      {editingExpense && (
        <div className={styles.editingBanner}>
          <span>Editando gasto guardado</span>
          <button
            type="button"
            className={styles.cancelEditBtn}
            onClick={() => {
              setEditingExpense(null);
              setRawAmount('0');
              setNote('');
            }}
          >
            <X size={14} weight="bold" /> Cancelar edición
          </button>
        </div>
      )}

      {/* Currency & Amount Display Card */}
      <div className={styles.displayCard}>
        <div className={styles.topRowControls}>
          <div className={styles.currencyPills} role="radiogroup" aria-label="Seleccionar moneda">
            {SUPPORTED_CURRENCIES.filter((c) =>
              activeCurrencyCodes.includes(c.code)
            ).map((curr) => {
              const isSelected = currency === curr.code;
              return (
                <button
                  key={curr.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`${styles.currencyChip} ${
                    isSelected ? styles.currencyChipActive : ''
                  }`}
                  onClick={() => handleCurrencyChange(curr.code)}
                >
                  <span>{curr.flag}</span>
                  <span>{curr.code}</span>
                </button>
              );
            })}
          </div>

          <label className={styles.datePickerPill} aria-label="Fecha del gasto">
            <CalendarBlank size={15} weight="bold" />
            <span>{formatShortDate(date)}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className={styles.nativeDateInput}
            />
          </label>
        </div>

        <div className={styles.amountReadout} aria-live="polite">
          <span className={styles.currencySymbol}>{currencyMeta.symbol}</span>
          <span
            className={`${styles.amountNumber} ${
              rawAmount === '0' ? styles.amountZero : ''
            }`}
          >
            {formatKeypadDisplay(rawAmount, currency)}
          </span>
          {rawAmount !== '0' && (
            <button
              type="button"
              className={styles.clearAmountBtn}
              onClick={() => handleKeyPress('CLEAR')}
              aria-label="Limpiar monto"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        <div className={styles.noteInputRow}>
          <NotePencil size={17} className={styles.noteIcon} />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Añadir nota opcional (ej. Almuerzo con amigos)..."
            className={styles.noteInput}
            maxLength={90}
          />
        </div>
      </div>

      {/* Category & Subcategory Taxonomy Selector */}
      <div className={styles.selectorSection}>
        <div className={styles.sectionHeaderRow}>
          <span className={styles.sectionLabel}>Categoría</span>
          {activeCategory && (
            <span className={styles.selectedPreviewBadge}>
              {activeCategory.emoji} {activeCategory.name}
            </span>
          )}
        </div>

        <div className={styles.categoryScrollGrid} role="listbox" aria-label="Categorías">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            return (
              <motion.button
                key={cat.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                whileTap={{ scale: 0.96 }}
                className={`${styles.categoryBtn} ${
                  isSelected ? styles.categoryBtnActive : ''
                }`}
                onClick={() => handleCategorySelect(cat.id)}
              >
                <span className={styles.categoryEmoji}>{cat.emoji}</span>
                <span className={styles.categoryName}>{cat.name}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Subcategories if available for selected category */}
        {activeCategory?.subcategories?.length > 0 && (
          <div className={styles.subcategoryRow} aria-label="Subcategoría opcional">
            <button
              type="button"
              className={`${styles.subcatChip} ${
                selectedSubcategoryId === null ? styles.subcatChipActive : ''
              }`}
              onClick={() => setSelectedSubcategoryId(null)}
            >
              General
            </button>
            {activeCategory.subcategories.map((sub) => {
              const isSelected = selectedSubcategoryId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  className={`${styles.subcatChip} ${
                    isSelected ? styles.subcatChipActive : ''
                  }`}
                  onClick={() =>
                    setSelectedSubcategoryId(isSelected ? null : sub.id)
                  }
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      <div className={styles.selectorSection}>
        <div className={styles.sectionHeaderRow}>
          <span className={styles.sectionLabel}>
            <Wallet size={14} weight="bold" /> Método de pago
          </span>
        </div>
        <div className={styles.paymentRow} role="radiogroup" aria-label="Método de pago">
          {paymentMethods.map((method) => {
            const isSelected = method.id === selectedPaymentId;
            return (
              <button
                key={method.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`${styles.paymentChip} ${
                  isSelected ? styles.paymentChipActive : ''
                }`}
                onClick={() => setSelectedPaymentId(method.id)}
              >
                <span>{method.icon}</span>
                <span>{method.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* High-Speed Custom In-App Numeric Keypad */}
      <div className={styles.keypadContainer} aria-label="Teclado numérico">
        <div className={styles.keypadGrid}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <motion.button
              key={digit}
              type="button"
              whileTap={{ scale: 0.94 }}
              className={styles.keyButton}
              onClick={() => handleKeyPress(digit)}
            >
              {digit}
            </motion.button>
          ))}

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            className={`${styles.keyButton} ${styles.keyButtonSecondary}`}
            onClick={() => handleKeyPress(bottomLeftKey)}
            aria-label={bottomLeftKey === '000' ? 'Tres ceros (miles)' : 'Punto decimal'}
          >
            {bottomLeftKey === '.' ? ',' : '000'}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            className={styles.keyButton}
            onClick={() => handleKeyPress('0')}
          >
            0
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            className={`${styles.keyButton} ${styles.keyButtonSecondary}`}
            onClick={() => handleKeyPress('BACKSPACE')}
            aria-label="Borrar último dígito"
          >
            <Backspace size={22} weight="bold" />
          </motion.button>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          className={styles.submitExpenseButton}
          onClick={handleSave}
        >
          <Check size={20} weight="bold" />
          <span>
            {editingExpense
              ? 'Guardar cambios del gasto'
              : `Registrar gasto ${
                  parseFloat(rawAmount) > 0
                    ? `de ${formatCurrencyAmount(parseFloat(rawAmount), currency)}`
                    : ''
                }`}
          </span>
        </motion.button>
      </div>

      {/* Mini Recent Feed for immediate confirmation */}
      {!editingExpense && recentExpenses.length > 0 && (
        <div className={styles.recentMiniCard}>
          <div className={styles.recentHeader}>
            <span>Últimos registros en tu dispositivo</span>
            <button
              type="button"
              className={styles.viewAllLink}
              onClick={() => navigate('/movimientos')}
            >
              Ver todos <ArrowRight size={13} weight="bold" />
            </button>
          </div>
          <div className={styles.recentList}>
            {recentExpenses.map((exp) => {
              const cat = categories.find((c) => c.id === exp.categoryId);
              return (
                <div key={exp.id} className={styles.recentItem}>
                  <div className={styles.recentItemLeft}>
                    <span className={styles.recentEmoji}>{cat?.emoji || '💸'}</span>
                    <div className={styles.recentItemTextGroup}>
                      <p className={styles.recentCatName}>
                        {cat?.name || 'Gasto'}
                        {exp.note ? ` · ${exp.note}` : ''}
                      </p>
                      <span className={styles.recentDate}>
                        {formatShortDate(exp.date)}
                      </span>
                    </div>
                  </div>
                  <span className={styles.recentAmount}>
                    {formatCurrencyAmount(exp.amount, exp.currency, {
                      withCode: exp.currency !== defaultCurrency
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
