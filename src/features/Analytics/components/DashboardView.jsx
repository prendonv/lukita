import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CaretLeft,
  CaretRight,
  ChartPieSlice,
  DownloadSimple,
  Plus,
  Wallet
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useExpenseStore } from '../../Expenses/store/expenseStore';
import {
  formatCurrencyAmount,
  getCurrencyMeta
} from '../../Expenses/utils/currencyUtils';
import {
  formatMonthLabel,
  getCurrentYearMonth
} from '../../Expenses/utils/dateUtils';
import { exportExpensesToLocalCSV } from '../../Sync/services/googleCloudService';
import styles from './DashboardView.module.css';

export const DashboardView = () => {
  const navigate = useNavigate();
  const expenses = useExpenseStore((s) => s.expenses);
  const categories = useExpenseStore((s) => s.categories);
  const paymentMethods = useExpenseStore((s) => s.paymentMethods);
  const settings = useExpenseStore((s) => s.settings);
  const selectedYearMonth = useExpenseStore((s) => s.selectedYearMonth);
  const navigateMonth = useExpenseStore((s) => s.navigateMonth);
  const setSelectedYearMonth = useExpenseStore((s) => s.setSelectedYearMonth);
  const selectedCurrencyFilter = useExpenseStore(
    (s) => s.selectedCurrencyFilter
  );
  const setSelectedCurrencyFilter = useExpenseStore(
    (s) => s.setSelectedCurrencyFilter
  );
  const showToast = useExpenseStore((s) => s.showToast);

  const currentYearMonth = getCurrentYearMonth();

  // Filter expenses for the active YYYY-MM
  const monthExpenses = useMemo(
    () =>
      expenses.filter(
        (exp) => exp.date && exp.date.startsWith(selectedYearMonth)
      ),
    [expenses, selectedYearMonth]
  );

  // Totals grouped by currency used in the month
  const totalsByCurrency = useMemo(() => {
    const map = {};
    monthExpenses.forEach((exp) => {
      const code = exp.currency || 'COP';
      if (!map[code]) {
        map[code] = { currency: code, total: 0, count: 0 };
      }
      map[code].total += Number(exp.amount) || 0;
      map[code].count += 1;
    });

    const list = Object.values(map);
    if (list.length === 0) {
      const def = settings.defaultCurrency || 'COP';
      return [{ currency: def, total: 0, count: 0 }];
    }
    return list;
  }, [monthExpenses, settings.defaultCurrency]);

  // Ensure selectedCurrencyFilter points to a currency present in the month if possible
  const activeCurrencyCode = useMemo(() => {
    const exists = totalsByCurrency.some(
      (t) => t.currency === selectedCurrencyFilter
    );
    return exists ? selectedCurrencyFilter : totalsByCurrency[0].currency;
  }, [totalsByCurrency, selectedCurrencyFilter]);

  const activeCurrencyExpenses = useMemo(
    () => monthExpenses.filter((e) => e.currency === activeCurrencyCode),
    [monthExpenses, activeCurrencyCode]
  );

  const activeTotalAmount = useMemo(
    () =>
      activeCurrencyExpenses.reduce(
        (acc, item) => acc + (Number(item.amount) || 0),
        0
      ),
    [activeCurrencyExpenses]
  );

  // Category Breakdown for the active currency
  const categoryBreakdown = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const grouped = {};

    activeCurrencyExpenses.forEach((exp) => {
      const cat = catMap.get(exp.categoryId) || {
        id: 'other',
        name: 'Otros',
        emoji: '🏷️',
        color: '#64748B'
      };
      if (!grouped[cat.id]) {
        grouped[cat.id] = {
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color || '#10B981',
          amount: 0,
          count: 0
        };
      }
      grouped[cat.id].amount += Number(exp.amount) || 0;
      grouped[cat.id].count += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({
        ...item,
        percentage:
          activeTotalAmount > 0 ? (item.amount / activeTotalAmount) * 100 : 0
      }));
  }, [activeCurrencyExpenses, categories, activeTotalAmount]);

  // Payment Method Breakdown for the active currency
  const paymentBreakdown = useMemo(() => {
    const payMap = new Map(paymentMethods.map((p) => [p.id, p]));
    const grouped = {};

    activeCurrencyExpenses.forEach((exp) => {
      const pay = payMap.get(exp.paymentMethodId) || {
        id: 'other',
        name: 'Otro método',
        icon: '💳'
      };
      if (!grouped[pay.id]) {
        grouped[pay.id] = {
          id: pay.id,
          name: pay.name,
          icon: pay.icon,
          amount: 0,
          count: 0
        };
      }
      grouped[pay.id].amount += Number(exp.amount) || 0;
      grouped[pay.id].count += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({
        ...item,
        percentage:
          activeTotalAmount > 0 ? (item.amount / activeTotalAmount) * 100 : 0
      }));
  }, [activeCurrencyExpenses, paymentMethods, activeTotalAmount]);

  const handleExportMonthCSV = () => {
    if (monthExpenses.length === 0) {
      showToast('No hay gastos en este mes para exportar.', 'error');
      return;
    }
    exportExpensesToLocalCSV({
      expenses: monthExpenses,
      categories,
      paymentMethods,
      filename: `lukita_gastos_${selectedYearMonth}.csv`
    });
    showToast(`Reporte de ${formatMonthLabel(selectedYearMonth)} descargado`, 'success');
  };

  // SVG Donut chart segments computation
  const donutSegments = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercent = 0;

    return categoryBreakdown.map((cat) => {
      const strokeDasharray = `${
        (cat.percentage / 100) * circumference
      } ${circumference}`;
      const strokeDashoffset = -(cumulativePercent / 100) * circumference;
      cumulativePercent += cat.percentage;
      return {
        ...cat,
        radius,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [categoryBreakdown]);

  return (
    <section className={styles.dashboardPage} aria-label="Totales y estadísticas del mes">
      {/* Month Navigator Bar */}
      <div className={styles.monthNavigator}>
        <button
          type="button"
          className={styles.monthNavBtn}
          onClick={() => navigateMonth(-1)}
          aria-label="Mes anterior"
        >
          <CaretLeft size={18} weight="bold" />
        </button>

        <div className={styles.monthTitleGroup}>
          <h2 className={styles.monthTitle}>
            {formatMonthLabel(selectedYearMonth)}
          </h2>
          {selectedYearMonth !== currentYearMonth && (
            <button
              type="button"
              className={styles.todayResetLink}
              onClick={() => setSelectedYearMonth(currentYearMonth)}
            >
              Volver al mes actual
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.monthNavBtn}
          onClick={() => navigateMonth(1)}
          aria-label="Mes siguiente"
        >
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      {/* Multi-Currency Summary Cards (100% Offline, Exact Separation) */}
      <div className={styles.currencyCardsGrid}>
        {totalsByCurrency.map((item) => {
          const meta = getCurrencyMeta(item.currency);
          const isSelected = item.currency === activeCurrencyCode;
          return (
            <motion.button
              key={item.currency}
              type="button"
              whileTap={{ scale: 0.98 }}
              className={`${styles.totalSummaryCard} ${
                isSelected ? styles.totalSummaryCardActive : ''
              }`}
              onClick={() => setSelectedCurrencyFilter(item.currency)}
            >
              <div className={styles.cardTopMeta}>
                <span className={styles.currencyBadge}>
                  {meta.flag} {item.currency}
                </span>
                <span className={styles.txCountBadge}>
                  {item.count} {item.count === 1 ? 'gasto' : 'gastos'}
                </span>
              </div>
              <p className={styles.totalAmountValue}>
                {formatCurrencyAmount(item.total, item.currency)}
              </p>
              <span className={styles.cardFooterHint}>
                Total de {formatMonthLabel(selectedYearMonth)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {activeCurrencyExpenses.length === 0 ? (
        <div className={styles.emptyStateBox}>
          <div className={styles.emptyIconCircle}>
            <ChartPieSlice size={28} weight="duotone" />
          </div>
          <h3 className={styles.emptyTitle}>
            Sin gastos registrados en {formatMonthLabel(selectedYearMonth)}
          </h3>
          <p className={styles.emptyText}>
            Registra tu primer gasto del mes para ver la distribución automática por
            categorías y métodos de pago.
          </p>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => navigate('/')}
          >
            <Plus size={18} weight="bold" /> Registrar un gasto ahora
          </button>
        </div>
      ) : (
        <>
          {/* Visual Donut & Category Breakdown Card */}
          <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Desglose por Categoría</h3>
                <p className={styles.cardSubtitle}>
                  Distribución en {activeCurrencyCode}
                </p>
              </div>
              <button
                type="button"
                className={styles.exportChipBtn}
                onClick={handleExportMonthCSV}
              >
                <DownloadSimple size={15} weight="bold" /> Exportar CSV
              </button>
            </div>

            <div className={styles.donutWrapper}>
              <div className={styles.donutSvgBox}>
                <svg
                  width="150"
                  height="150"
                  viewBox="0 0 150 150"
                  aria-label="Gráfico de anillo por categorías"
                >
                  <circle
                    cx="75"
                    cy="75"
                    r="58"
                    fill="transparent"
                    stroke="var(--bg-elevated)"
                    strokeWidth="16"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="75"
                      cy="75"
                      r={seg.radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      transform="rotate(-90 75 75)"
                      strokeLinecap="butt"
                    />
                  ))}
                </svg>
                <div className={styles.donutCenterLabel}>
                  <span className={styles.donutCenterEmoji}>
                    {categoryBreakdown[0]?.emoji || '📊'}
                  </span>
                  <span className={styles.donutCenterPct}>
                    {Math.round(categoryBreakdown[0]?.percentage || 0)}%
                  </span>
                </div>
              </div>

              <div className={styles.topCategoriesLegend}>
                {categoryBreakdown.slice(0, 4).map((cat) => (
                  <div key={cat.id} className={styles.legendRow}>
                    <span
                      className={styles.legendDot}
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className={styles.legendName}>
                      {cat.emoji} {cat.name}
                    </span>
                    <span className={styles.legendPct}>
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.breakdownList}>
              {categoryBreakdown.map((cat) => (
                <div key={cat.id} className={styles.breakdownItem}>
                  <div className={styles.breakdownRowTop}>
                    <div className={styles.breakdownTitleGroup}>
                      <span className={styles.breakdownEmoji}>{cat.emoji}</span>
                      <div>
                        <p className={styles.breakdownName}>{cat.name}</p>
                        <span className={styles.breakdownMeta}>
                          {cat.count} {cat.count === 1 ? 'registro' : 'registros'} ·{' '}
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <span className={styles.breakdownAmount}>
                      {formatCurrencyAmount(cat.amount, activeCurrencyCode)}
                    </span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <motion.div
                      className={styles.progressBarFill}
                      style={{ backgroundColor: cat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(cat.percentage, 3)}%` }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods Breakdown Card */}
          <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  <Wallet size={17} weight="bold" /> Por Método de Pago
                </h3>
                <p className={styles.cardSubtitle}>
                  De dónde salió tu dinero este mes ({activeCurrencyCode})
                </p>
              </div>
            </div>

            <div className={styles.paymentList}>
              {paymentBreakdown.map((pay) => (
                <div key={pay.id} className={styles.paymentRowItem}>
                  <div className={styles.paymentLeft}>
                    <span className={styles.paymentIcon}>{pay.icon}</span>
                    <div>
                      <p className={styles.paymentName}>{pay.name}</p>
                      <span className={styles.paymentSub}>
                        {pay.count} {pay.count === 1 ? 'pago' : 'pagos'} ·{' '}
                        {pay.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <span className={styles.paymentAmount}>
                    {formatCurrencyAmount(pay.amount, activeCurrencyCode)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
