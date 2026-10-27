import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CaretLeft,
  CaretRight,
  CaretDown,
  FunnelSimple,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  CheckCircle,
  ClockCounterClockwise
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useExpenseStore } from '../store/expenseStore';
import { formatCurrencyAmount } from '../utils/currencyUtils';
import {
  formatMonthLabel,
  formatShortDate
} from '../utils/dateUtils';
import styles from './HistoryView.module.css';

export const HistoryView = () => {
  const navigate = useNavigate();
  const expenses = useExpenseStore((s) => s.expenses);
  const categories = useExpenseStore((s) => s.categories);
  const paymentMethods = useExpenseStore((s) => s.paymentMethods);
  const selectedYearMonth = useExpenseStore((s) => s.selectedYearMonth);
  const navigateMonth = useExpenseStore((s) => s.navigateMonth);
  const setEditingExpense = useExpenseStore((s) => s.setEditingExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const payMap = useMemo(
    () => new Map(paymentMethods.map((p) => [p.id, p])),
    [paymentMethods]
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.date?.startsWith(selectedYearMonth)) return false;
      if (categoryFilter !== 'ALL' && exp.categoryId !== categoryFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = catMap.get(exp.categoryId);
        const sub = cat?.subcategories?.find((s) => s.id === exp.subcategoryId);
        const pay = payMap.get(exp.paymentMethodId);

        const searchable = [
          exp.note,
          cat?.name,
          sub?.name,
          pay?.name,
          String(exp.amount),
          exp.currency
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(q);
      }

      return true;
    });
  }, [expenses, selectedYearMonth, categoryFilter, searchQuery, catMap, payMap]);

  // Group filtered expenses by date (YYYY-MM-DD)
  const groupedByDate = useMemo(() => {
    const groups = [];
    const map = new Map();

    filteredExpenses.forEach((exp) => {
      if (!map.has(exp.date)) {
        const group = { date: exp.date, items: [] };
        map.set(exp.date, group);
        groups.push(group);
      }
      map.get(exp.date).items.push(exp);
    });

    return groups;
  }, [filteredExpenses]);

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    navigate('/');
  };

  return (
    <section className={styles.historyPage} aria-label="Historial de movimientos">
      {/* Month Navigator */}
      <div className={styles.monthHeaderBar}>
        <button
          type="button"
          className={styles.monthBtn}
          onClick={() => navigateMonth(-1)}
          aria-label="Mes anterior"
        >
          <CaretLeft size={18} weight="bold" />
        </button>

        <div className={styles.monthCenter}>
          <h2 className={styles.monthTitle}>
            {formatMonthLabel(selectedYearMonth)}
          </h2>
          <span className={styles.countSubtitle}>
            {filteredExpenses.length}{' '}
            {filteredExpenses.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <button
          type="button"
          className={styles.monthBtn}
          onClick={() => navigateMonth(1)}
          aria-label="Mes siguiente"
        >
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className={styles.filterToolbar}>
        <div className={styles.searchBox}>
          <MagnifyingGlass size={17} className={styles.searchIcon} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nota, categoría o monto..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.categorySelectWrapper}>
          <FunnelSimple size={16} weight="bold" className={styles.selectIconLeft} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={styles.categorySelect}
            aria-label="Filtrar por categoría"
          >
            <option value="ALL">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.name}
              </option>
            ))}
          </select>
          <CaretDown size={15} weight="bold" className={styles.selectIconRight} />
        </div>
      </div>

      {/* Grouped Expense List */}
      {groupedByDate.length === 0 ? (
        <div className={styles.emptyBox}>
          <ClockCounterClockwise size={32} weight="duotone" />
          <h3>No encontramos movimientos</h3>
          <p>
            No hay gastos que coincidan con los filtros seleccionados en{' '}
            {formatMonthLabel(selectedYearMonth)}.
          </p>
        </div>
      ) : (
        <div className={styles.dateGroupsList}>
          {groupedByDate.map((group) => (
            <div key={group.date} className={styles.dateGroup}>
              <div className={styles.dateStickyHeader}>
                <span>{formatShortDate(group.date)}</span>
                <span className={styles.isoDateLabel}>{group.date}</span>
              </div>

              <div className={styles.itemsCard}>
                <AnimatePresence initial={false}>
                  {group.items.map((exp) => {
                    const cat = catMap.get(exp.categoryId);
                    const sub = cat?.subcategories?.find(
                      (s) => s.id === exp.subcategoryId
                    );
                    const pay = payMap.get(exp.paymentMethodId);
                    const isConfirming = confirmDeleteId === exp.id;

                    return (
                      <motion.div
                        key={exp.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={styles.expenseRow}
                      >
                        <div className={styles.expenseMain}>
                          <div className={styles.emojiAvatar}>
                            {cat?.emoji || '💸'}
                          </div>

                          <div className={styles.expenseDetails}>
                            <div className={styles.titleLine}>
                              <span className={styles.catTitle}>
                                {cat?.name || 'Gasto'}
                              </span>
                              {sub && (
                                <span className={styles.subcatBadge}>
                                  {sub.name}
                                </span>
                              )}
                            </div>

                            {exp.note && (
                              <p className={styles.expenseNote}>{exp.note}</p>
                            )}

                            <div className={styles.metaLine}>
                              <span>
                                {pay ? `${pay.icon} ${pay.name}` : 'Efectivo'}
                              </span>
                              {exp.syncedToSheets && (
                                <span
                                  className={styles.syncedBadge}
                                  title="Sincronizado en Google Sheets"
                                >
                                  <CheckCircle size={12} weight="fill" /> Sheets
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={styles.expenseRight}>
                          <span className={styles.expenseAmount}>
                            {formatCurrencyAmount(exp.amount, exp.currency, {
                              withCode: true
                            })}
                          </span>

                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.iconActionBtn}
                              onClick={() => handleEdit(exp)}
                              aria-label="Editar este gasto"
                            >
                              <PencilSimple size={15} weight="bold" />
                            </button>

                            {isConfirming ? (
                              <button
                                type="button"
                                className={styles.confirmDeleteBtn}
                                onClick={() => {
                                  deleteExpense(exp.id);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${styles.iconActionBtn} ${styles.deleteActionBtn}`}
                                onClick={() => setConfirmDeleteId(exp.id)}
                                aria-label="Eliminar este gasto"
                              >
                                <Trash size={15} weight="bold" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
