import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useExpenseStore } from './features/Expenses/store/expenseStore';
import { AppShell } from './ui/AppShell';
import { QuickEntryView } from './features/Expenses/components/QuickEntryView';
import { DashboardView } from './features/Analytics/components/DashboardView';
import { HistoryView } from './features/Expenses/components/HistoryView';
import { SettingsAndSyncView } from './features/Sync/components/SettingsAndSyncView';

export const App = () => {
  const isInitialized = useExpenseStore((s) => s.isInitialized);
  const initStore = useExpenseStore((s) => s.initStore);

  useEffect(() => {
    initStore();
  }, [initStore]);

  if (!isInitialized) {
    return null;
  }

  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<QuickEntryView />} />
          <Route path="/totales" element={<DashboardView />} />
          <Route path="/movimientos" element={<HistoryView />} />
          <Route path="/ajustes" element={<SettingsAndSyncView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
};
