import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  PlusCircle,
  ChartPieSlice,
  ClockCounterClockwise,
  CloudArrowUp,
  WifiHigh,
  WifiSlash,
  CheckCircle,
  WarningCircle,
  Info,
  X
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useExpenseStore } from '../features/Expenses/store/expenseStore';
import styles from './AppShell.module.css';

export const AppShell = ({ children }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const toast = useExpenseStore((s) => s.toast);
  const dismissToast = useExpenseStore((s) => s.dismissToast);
  const editingExpense = useExpenseStore((s) => s.editingExpense);
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    {
      to: '/',
      label: editingExpense ? 'Editar' : 'Registrar',
      icon: PlusCircle
    },
    {
      to: '/totales',
      label: 'Totales',
      icon: ChartPieSlice
    },
    {
      to: '/movimientos',
      label: 'Historial',
      icon: ClockCounterClockwise
    },
    {
      to: '/ajustes',
      label: 'Nube y Datos',
      icon: CloudArrowUp
    }
  ];

  return (
    <div className={styles.appViewport}>
      <header className={styles.topHeader}>
        <div className={styles.brandGroup}>
          <div className={styles.brandMark} aria-hidden="true">
            <span>L</span>
          </div>
          <div>
            <h1 className={styles.brandTitle}>Lukita</h1>
            <p className={styles.brandSubtitle}>Bóveda personal de gastos</p>
          </div>
        </div>

        <div
          className={`${styles.statusPill} ${
            isOnline ? styles.statusOnline : styles.statusOffline
          }`}
          title={
            isOnline
              ? 'Tus datos viven en este dispositivo. Conexión lista para sincronizar con Drive.'
              : 'Modo 100% Offline activo. Todo se guarda en tu dispositivo.'
          }
        >
          {isOnline ? (
            <WifiHigh size={14} weight="bold" />
          ) : (
            <WifiSlash size={14} weight="bold" />
          )}
          <span>{isOnline ? 'Local · Activo' : '100% Offline'}</span>
        </div>
      </header>

      <main className={styles.mainContent} key={location.pathname}>
        {children}
      </main>

      {/* Toast Notification Layer */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toastBanner} ${styles[`toast_${toast.type}`]}`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
          >
            <div className={styles.toastIcon}>
              {toast.type === 'error' ? (
                <WarningCircle size={20} weight="fill" />
              ) : toast.type === 'info' ? (
                <Info size={20} weight="fill" />
              ) : (
                <CheckCircle size={20} weight="fill" />
              )}
            </div>
            <span className={styles.toastMessage}>{toast.message}</span>
            <button
              type="button"
              className={styles.toastClose}
              onClick={dismissToast}
              aria-label="Cerrar notificación"
            >
              <X size={16} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className={styles.bottomTabBar} aria-label="Navegación principal">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={styles.tabIconWrapper}>
                    <IconComponent
                      size={23}
                      weight={isActive ? 'fill' : 'regular'}
                    />
                    {isActive && (
                      <motion.span
                        layoutId="activeTabIndicator"
                        className={styles.activeDot}
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 32
                        }}
                      />
                    )}
                  </div>
                  <span className={styles.tabLabel}>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
