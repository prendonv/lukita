import React, { useState, useRef } from 'react';
import {
  CloudArrowUp,
  CloudArrowDown,
  Table,
  DownloadSimple,
  UploadSimple,
  Plus,
  Trash,
  PencilSimple,
  Check,
  Question,
  Sun,
  Moon,
  Desktop,
  ArrowSquareOut,
  SpinnerGap,
  Tag,
  Wallet,
  CurrencyCircleDollar
} from '@phosphor-icons/react';
import { useExpenseStore } from '../../Expenses/store/expenseStore';
import { SUPPORTED_CURRENCIES } from '../../Expenses/utils/currencyUtils';
import {
  requestGoogleAccessToken,
  syncExpensesToGoogleSheet,
  importExpensesFromGoogleSheet,
  syncViaAppsScriptWebhook,
  restoreViaAppsScriptWebhook,
  uploadBackupToGoogleDrive,
  downloadBackupFromGoogleDrive,
  exportExpensesToLocalCSV,
  exportFullDatabaseToLocalJSON
} from '../services/googleCloudService';
import styles from './SettingsAndSyncView.module.css';

const PRESET_COLORS = [
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
  '#F43F5E',
  '#14B8A6'
];

export const SettingsAndSyncView = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const categories = useExpenseStore((s) => s.categories);
  const paymentMethods = useExpenseStore((s) => s.paymentMethods);
  const settings = useExpenseStore((s) => s.settings);
  const updateSettings = useExpenseStore((s) => s.updateSettings);
  const saveCategory = useExpenseStore((s) => s.saveCategory);
  const deleteCategory = useExpenseStore((s) => s.deleteCategory);
  const savePaymentMethod = useExpenseStore((s) => s.savePaymentMethod);
  const deletePaymentMethod = useExpenseStore((s) => s.deletePaymentMethod);
  const markExpensesSynced = useExpenseStore((s) => s.markExpensesSynced);
  const restoreBackupData = useExpenseStore((s) => s.restoreBackupData);
  const showToast = useExpenseStore((s) => s.showToast);

  // Google Cloud Sync state
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState(
    settings.appsScriptUrl || ''
  );
  const [clientIdInput, setClientIdInput] = useState(
    settings.googleClientId || ''
  );
  const [sheetIdInput, setSheetIdInput] = useState(
    settings.googleSpreadsheetId || ''
  );
  const [showGuide, setShowGuide] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isBackingUpDrive, setIsBackingUpDrive] = useState(false);
  const [isRestoringDrive, setIsRestoringDrive] = useState(false);

  // Category Form State
  const [editingCatId, setEditingCatId] = useState(null);
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('🏷️');
  const [catColor, setCatColor] = useState('#10B981');
  const [catSubcategoriesText, setCatSubcategoriesText] = useState('');

  // Payment Method Form State
  const [payName, setPayName] = useState('');
  const [payIcon, setPayIcon] = useState('💳');

  const fileInputRef = useRef(null);

  const handleSaveGoogleConfig = async () => {
    await updateSettings({
      appsScriptUrl: appsScriptUrlInput.trim(),
      googleClientId: clientIdInput.trim(),
      googleSpreadsheetId: sheetIdInput.trim()
    });
    showToast('Configuración de Google guardada en tu dispositivo', 'success');
  };

  // Sync to Google Sheets (Prefers Zero-Login Apps Script Webhook if configured)
  const handleSyncToGoogleSheets = async () => {
    const activeWebhook =
      appsScriptUrlInput.trim() || settings.appsScriptUrl?.trim();

    if (activeWebhook) {
      setIsSyncingSheets(true);
      try {
        const result = await syncViaAppsScriptWebhook({
          appsScriptUrl: activeWebhook,
          expenses,
          categories,
          paymentMethods,
          settings
        });
        await updateSettings({
          appsScriptUrl: activeWebhook,
          lastSheetsSyncAt: new Date().toISOString()
        });
        await markExpensesSynced(result.syncedIds);
        showToast(
          `¡Sincronizado sin login! Tu hoja refleja tus ${result.syncedCount} gastos.`,
          'success'
        );
      } catch (err) {
        showToast(
          err.message || 'Error al sincronizar con tu Puente Apps Script',
          'error'
        );
      } finally {
        setIsSyncingSheets(false);
      }
      return;
    }

    const activeClientId = clientIdInput.trim() || settings.googleClientId;
    if (!activeClientId) {
      setShowGuide(true);
      showToast(
        'Pega la URL de tu Puente Apps Script (Sin Login) o tu Client ID de Google Cloud.',
        'error'
      );
      return;
    }

    setIsSyncingSheets(true);
    try {
      const token = await requestGoogleAccessToken(activeClientId);
      const result = await syncExpensesToGoogleSheet({
        accessToken: token,
        spreadsheetId: sheetIdInput.trim() || settings.googleSpreadsheetId,
        expenses,
        categories,
        paymentMethods
      });

      setSheetIdInput(result.spreadsheetId);
      await updateSettings({
        googleClientId: activeClientId,
        googleSpreadsheetId: result.spreadsheetId,
        googleSpreadsheetUrl: result.spreadsheetUrl,
        lastSheetsSyncAt: new Date().toISOString()
      });

      await markExpensesSynced(result.syncedIds);

      showToast(
        `¡Hoja sincronizada! Ahora refleja exactamente tus ${result.syncedCount} gastos locales.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Error al sincronizar con Google Sheets', 'error');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Backup JSON to Google Drive
  const handleBackupToDrive = async () => {
    const activeClientId = clientIdInput.trim() || settings.googleClientId;
    if (!activeClientId) {
      setShowGuide(true);
      showToast('Configura tu Client ID para subir respaldos a Google Drive.', 'error');
      return;
    }

    setIsBackingUpDrive(true);
    try {
      const token = await requestGoogleAccessToken(activeClientId);
      const backupPayload = {
        app: 'Lukita',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        expenses,
        categories,
        paymentMethods,
        settings
      };

      await uploadBackupToGoogleDrive({
        accessToken: token,
        backupData: backupPayload
      });

      await updateSettings({
        googleClientId: activeClientId,
        lastDriveBackupAt: new Date().toISOString()
      });

      showToast(
        'Respaldo JSON subido exitosamente a tu Google Drive (lukita_backup_datos.json).',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'No se pudo respaldar en Google Drive', 'error');
    } finally {
      setIsBackingUpDrive(false);
    }
  };

  // Restore JSON from Google Drive OR automatically import rows from Google Sheets
  const handleRestoreFromDrive = async () => {
    const activeWebhook =
      appsScriptUrlInput.trim() || settings.appsScriptUrl?.trim();

    if (activeWebhook) {
      setIsRestoringDrive(true);
      try {
        const recovered = await restoreViaAppsScriptWebhook({
          appsScriptUrl: activeWebhook,
          existingCategories: categories,
          existingPaymentMethods: paymentMethods
        });
        await restoreBackupData({
          ...recovered,
          settings: {
            ...settings,
            ...(recovered.settings || {}),
            appsScriptUrl: activeWebhook
          }
        });
        showToast(
          `¡Restaurados ${recovered.expenses?.length || 0} gastos sin login!`,
          'success'
        );
      } catch (err) {
        showToast(
          err.message || 'Error al restaurar desde tu Puente Apps Script',
          'error'
        );
      } finally {
        setIsRestoringDrive(false);
      }
      return;
    }

    const activeClientId = clientIdInput.trim() || settings.googleClientId;
    if (!activeClientId) {
      setShowGuide(true);
      showToast('Configura tu Client ID para restaurar desde Google.', 'error');
      return;
    }

    setIsRestoringDrive(true);
    try {
      const token = await requestGoogleAccessToken(activeClientId);
      const targetSheetId =
        sheetIdInput.trim() || settings.googleSpreadsheetId;

      // 1. Try restoring from Google Sheets first if user has a Spreadsheet ID configured
      if (targetSheetId) {
        try {
          const sheetRecovered = await importExpensesFromGoogleSheet({
            accessToken: token,
            spreadsheetId: targetSheetId,
            existingCategories: categories,
            existingPaymentMethods: paymentMethods
          });

          const resolvedSheetId =
            sheetRecovered.spreadsheetId || targetSheetId;
          setSheetIdInput(resolvedSheetId);

          await restoreBackupData({
            expenses: sheetRecovered.expenses,
            categories: sheetRecovered.categories,
            paymentMethods: sheetRecovered.paymentMethods,
            settings: {
              ...settings,
              googleClientId: activeClientId,
              googleSpreadsheetId: resolvedSheetId,
              googleSpreadsheetUrl: `https://docs.google.com/spreadsheets/d/${resolvedSheetId}`
            }
          });

          showToast(
            `¡Recuperados ${sheetRecovered.expenses.length} gastos y tus categorías desde Google Sheets!`,
            'success'
          );
          return;
        } catch (sheetErr) {
          console.warn('Fallback to Drive JSON backup:', sheetErr);
        }
      }

      // 2. Otherwise fallback to Drive JSON backup file
      const backupPayload = await downloadBackupFromGoogleDrive({
        accessToken: token
      });
      await restoreBackupData(backupPayload);
    } catch (err) {
      showToast(err.message || 'Error al restaurar tus datos desde Google', 'error');
    } finally {
      setIsRestoringDrive(false);
    }
  };

  // Restore from local JSON file
  const handleLocalFileRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!Array.isArray(parsed.expenses)) {
          throw new Error('Formato inválido');
        }
        await restoreBackupData(parsed);
      } catch {
        showToast(
          'El archivo seleccionado no es un respaldo válido de Lukita.',
          'error'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Category Form Handlers
  const startEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatEmoji(cat.emoji);
    setCatColor(cat.color || '#10B981');
    setCatSubcategoriesText(
      (cat.subcategories || []).map((s) => s.name).join(', ')
    );
  };

  const resetCategoryForm = () => {
    setEditingCatId(null);
    setCatName('');
    setCatEmoji('🏷️');
    setCatColor('#10B981');
    setCatSubcategoriesText('');
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      showToast('Escribe un nombre para la categoría.', 'error');
      return;
    }

    const subNames = catSubcategoriesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const subcategories = subNames.map((name, idx) => ({
      id: `sub_${Date.now()}_${idx}`,
      name
    }));

    await saveCategory({
      id: editingCatId,
      name: catName,
      emoji: catEmoji || '🏷️',
      color: catColor,
      subcategories
    });

    resetCategoryForm();
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payName.trim()) {
      showToast('Escribe el nombre del método de pago.', 'error');
      return;
    }
    await savePaymentMethod({
      name: payName,
      icon: payIcon || '💳'
    });
    setPayName('');
    setPayIcon('💳');
  };

  const toggleCurrencyInQuickBar = async (code) => {
    const current = settings.activeCurrencies || ['COP', 'USD', 'EUR'];
    const exists = current.includes(code);
    if (exists && current.length <= 1) {
      showToast('Debes tener al menos una moneda activa.', 'error');
      return;
    }
    const next = exists
      ? current.filter((c) => c !== code)
      : [...current, code];

    const nextDefault = next.includes(settings.defaultCurrency)
      ? settings.defaultCurrency
      : next[0];

    await updateSettings({
      activeCurrencies: next,
      defaultCurrency: nextDefault
    });
  };

  return (
    <section className={styles.settingsPage} aria-label="Nube, respaldos y configuración">
      {/* 1. Google Sheets & Drive Serverless Bridge */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerTitleGroup}>
            <CloudArrowUp size={22} weight="duotone" className={styles.accentIcon} />
            <div>
              <h2 className={styles.cardTitle}>
                Puente Directo con Google Drive y Sheets
              </h2>
              <p className={styles.cardSubtitle}>
                100% gratuito y sin servidores intermedios. Tus datos viajan directo
                de tu iPhone a tu cuenta de Google.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.guideToggleBtn}
            onClick={() => setShowGuide((v) => !v)}
          >
            <Question size={15} weight="bold" />
            <span>{showGuide ? 'Ocultar guía' : '¿Cómo obtener mi Client ID?'}</span>
          </button>
        </div>

        {showGuide && (
          <div className={styles.guideBox}>
            <h3 className={styles.guideTitle}>
              Guía rápida (2 minutos, 100% gratis para siempre):
            </h3>
            <ol className={styles.guideSteps}>
              <li>
                Entra a{' '}
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Cloud Console
                </a>{' '}
                y crea un proyecto gratuito (ej. <strong>Lukita Personal</strong>).
              </li>
              <li>
                En <strong>APIs y Servicios &gt; Biblioteca</strong>, habilita{' '}
                <strong>Google Sheets API</strong> y <strong>Google Drive API</strong>.
              </li>
              <li>
                En <strong>Credenciales &gt; Crear credenciales &gt; ID de cliente OAuth</strong>,
                elige <strong>Aplicación Web</strong> y agrega la URL donde abres Lukita en{' '}
                <em>Orígenes de JavaScript autorizados</em>.
              </li>
              <li>
                Copia el <strong>Client ID</strong> (termina en{' '}
                <code>.apps.googleusercontent.com</code>) y pégalo aquí abajo.
              </li>
            </ol>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.inputLabel} htmlFor="apps-script-url">
            ⚡ URL de tu Puente Apps Script (Recomendado — 100% Sin Login y Auto-Sync)
          </label>
          <div className={styles.inlineInputRow}>
            <input
              id="apps-script-url"
              type="url"
              value={appsScriptUrlInput}
              onChange={(e) => setAppsScriptUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className={styles.textInput}
            />
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleSaveGoogleConfig}
            >
              Guardar URL
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel} htmlFor="google-client-id">
            Opcional: Tu Google OAuth Client ID (Solo si no usas Apps Script)
          </label>
          <input
            id="google-client-id"
            type="text"
            value={clientIdInput}
            onChange={(e) => setClientIdInput(e.target.value)}
            placeholder="Ej: 123456789-abc.apps.googleusercontent.com"
            className={styles.textInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel} htmlFor="google-sheet-id">
            ID de Hoja de Google Sheets (Opcional — si lo dejas vacío Lukita crea una nueva)
          </label>
          <div className={styles.inlineInputRow}>
            <input
              id="google-sheet-id"
              type="text"
              value={sheetIdInput}
              onChange={(e) => setSheetIdInput(e.target.value)}
              placeholder="Se llenará automáticamente al sincronizar..."
              className={styles.textInput}
            />
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleSaveGoogleConfig}
            >
              Guardar ID
            </button>
          </div>
        </div>

        <div className={styles.cloudActionsGrid}>
          <button
            type="button"
            className={styles.primaryCloudBtn}
            onClick={handleSyncToGoogleSheets}
            disabled={isSyncingSheets}
          >
            {isSyncingSheets ? (
              <SpinnerGap size={19} className={styles.spinIcon} />
            ) : (
              <Table size={19} weight="bold" />
            )}
            <span>
              {isSyncingSheets
                ? 'Sincronizando con Sheets...'
                : 'Sincronizar ahora con Google Sheets'}
            </span>
          </button>

          <div className={styles.driveDualRow}>
            <button
              type="button"
              className={styles.driveActionBtn}
              onClick={handleBackupToDrive}
              disabled={isBackingUpDrive}
            >
              {isBackingUpDrive ? (
                <SpinnerGap size={18} className={styles.spinIcon} />
              ) : (
                <CloudArrowUp size={18} weight="bold" />
              )}
              <span>Subir Backup a Drive</span>
            </button>

            <button
              type="button"
              className={styles.driveActionBtn}
              onClick={handleRestoreFromDrive}
              disabled={isRestoringDrive}
            >
              {isRestoringDrive ? (
                <SpinnerGap size={18} className={styles.spinIcon} />
              ) : (
                <CloudArrowDown size={18} weight="bold" />
              )}
              <span>Restaurar de Sheets / Drive</span>
            </button>
          </div>
        </div>

        {settings.googleSpreadsheetUrl && (
          <a
            href={settings.googleSpreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.openSheetLink}
          >
            <span>Abrir mi hoja de cálculo en Google Sheets</span>
            <ArrowSquareOut size={15} weight="bold" />
          </a>
        )}

        <div className={styles.versionRow}>
          <span>Lukita v1.2 · Sincronización Espejo Activa</span>
          <button
            type="button"
            className={styles.forceUpdateLink}
            onClick={async () => {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) {
                  await r.unregister();
                }
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                for (const k of keys) {
                  await caches.delete(k);
                }
              }
              window.location.reload();
            }}
          >
            Refrescar app
          </button>
        </div>
      </div>

      {/* 2. Local Offline Export & Backup (AirDrop / Archivos iOS) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerTitleGroup}>
            <DownloadSimple
              size={22}
              weight="duotone"
              className={styles.accentIcon}
            />
            <div>
              <h2 className={styles.cardTitle}>
                Exportación y Respaldo Local (Sin cuenta de Google)
              </h2>
              <p className={styles.cardSubtitle}>
                Descarga tus datos al instante a la app Archivos de tu iPhone o
                compártelos por AirDrop.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.localActionsGrid}>
          <button
            type="button"
            className={styles.localBtn}
            onClick={() => {
              exportExpensesToLocalCSV({
                expenses,
                categories,
                paymentMethods
              });
              showToast('Archivo CSV descargado en tu dispositivo', 'success');
            }}
          >
            <Table size={18} weight="bold" />
            <span>Exportar todos los gastos (.CSV)</span>
          </button>

          <button
            type="button"
            className={styles.localBtn}
            onClick={() => {
              exportFullDatabaseToLocalJSON({
                expenses,
                categories,
                paymentMethods,
                settings
              });
              showToast('Copia de seguridad (.JSON) descargada', 'success');
            }}
          >
            <DownloadSimple size={18} weight="bold" />
            <span>Descargar respaldo completo (.JSON)</span>
          </button>

          <button
            type="button"
            className={styles.localBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadSimple size={18} weight="bold" />
            <span>Restaurar desde archivo .JSON local</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleLocalFileRestore}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* 3. Multi-Currency & Theme Preferences */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerTitleGroup}>
            <CurrencyCircleDollar
              size={22}
              weight="duotone"
              className={styles.accentIcon}
            />
            <div>
              <h2 className={styles.cardTitle}>Divisas y Apariencia</h2>
              <p className={styles.cardSubtitle}>
                Elige tu moneda principal y las divisas de acceso rápido en el
                teclado.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.inputLabel}>Moneda principal por defecto</span>
          <div className={styles.pillsWrap}>
            {SUPPORTED_CURRENCIES.map((curr) => {
              const isDefault = settings.defaultCurrency === curr.code;
              return (
                <button
                  key={curr.code}
                  type="button"
                  className={`${styles.optionPill} ${
                    isDefault ? styles.optionPillActive : ''
                  }`}
                  onClick={() => {
                    const active = settings.activeCurrencies || ['COP', 'USD'];
                    const nextActive = active.includes(curr.code)
                      ? active
                      : [...active, curr.code];
                    updateSettings({
                      defaultCurrency: curr.code,
                      activeCurrencies: nextActive
                    });
                    showToast(
                      `${curr.name} (${curr.code}) es ahora tu moneda principal`,
                      'success'
                    );
                  }}
                >
                  <span>{curr.flag}</span>
                  <span>{curr.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.inputLabel}>
            Divisas visibles en el teclado rápido
          </span>
          <div className={styles.pillsWrap}>
            {SUPPORTED_CURRENCIES.map((curr) => {
              const isChecked = (settings.activeCurrencies || []).includes(
                curr.code
              );
              return (
                <button
                  key={curr.code}
                  type="button"
                  className={`${styles.optionPill} ${
                    isChecked ? styles.optionPillActive : ''
                  }`}
                  onClick={() => toggleCurrencyInQuickBar(curr.code)}
                >
                  <span>{curr.flag}</span>
                  <span>
                    {curr.code} ({curr.symbol})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.inputLabel}>Tema visual</span>
          <div className={styles.themeRow}>
            {[
              { id: 'system', label: 'Automático iOS', icon: Desktop },
              { id: 'light', label: 'Claro', icon: Sun },
              { id: 'dark', label: 'Oscuro', icon: Moon }
            ].map((item) => {
              const IconComp = item.icon;
              const isSelected = (settings.theme || 'system') === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.themeBtn} ${
                    isSelected ? styles.themeBtnActive : ''
                  }`}
                  onClick={() => updateSettings({ theme: item.id })}
                >
                  <IconComp size={16} weight="bold" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Taxonomy Manager: Categories & Subcategories */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerTitleGroup}>
            <Tag size={22} weight="duotone" className={styles.accentIcon} />
            <div>
              <h2 className={styles.cardTitle}>
                Categorías y Subcategorías ({categories.length})
              </h2>
              <p className={styles.cardSubtitle}>
                Personaliza tu taxonomía local con nombre, emoji y subcategorías.
              </p>
            </div>
          </div>
        </div>

        <form className={styles.taxonomyForm} onSubmit={handleCategorySubmit}>
          <div className={styles.emojiAndNameRow}>
            <input
              type="text"
              value={catEmoji}
              onChange={(e) => setCatEmoji(e.target.value)}
              className={styles.emojiInput}
              maxLength={4}
              aria-label="Emoji de categoría"
              placeholder="🏷️"
            />
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Nombre de categoría (ej. Mascotas)"
              className={styles.textInput}
            />
          </div>

          <input
            type="text"
            value={catSubcategoriesText}
            onChange={(e) => setCatSubcategoriesText(e.target.value)}
            placeholder="Subcategorías separadas por coma (ej. Veterinario, Concentrado)"
            className={styles.textInput}
          />

          <div className={styles.colorAndSubmitRow}>
            <div className={styles.colorSwatches}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorDot} ${
                    catColor === color ? styles.colorDotSelected : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCatColor(color)}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>

            <div className={styles.formBtns}>
              {editingCatId && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={resetCategoryForm}
                >
                  Cancelar
                </button>
              )}
              <button type="submit" className={styles.addBtn}>
                {editingCatId ? (
                  <>
                    <Check size={16} weight="bold" /> Actualizar
                  </>
                ) : (
                  <>
                    <Plus size={16} weight="bold" /> Crear categoría
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className={styles.itemsManageList}>
          {categories.map((cat) => (
            <div key={cat.id} className={styles.manageRow}>
              <div className={styles.manageLeft}>
                <span
                  className={styles.manageEmojiBadge}
                  style={{ borderColor: cat.color || 'var(--border-subtle)' }}
                >
                  {cat.emoji}
                </span>
                <div>
                  <p className={styles.manageTitle}>{cat.name}</p>
                  {cat.subcategories?.length > 0 && (
                    <span className={styles.manageSubtext}>
                      {cat.subcategories.map((s) => s.name).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.manageActions}>
                <button
                  type="button"
                  className={styles.smallIconBtn}
                  onClick={() => startEditCategory(cat)}
                  aria-label={`Editar ${cat.name}`}
                >
                  <PencilSimple size={15} weight="bold" />
                </button>
                <button
                  type="button"
                  className={styles.smallIconBtn}
                  onClick={() => deleteCategory(cat.id)}
                  aria-label={`Eliminar ${cat.name}`}
                >
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Payment Methods Manager */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerTitleGroup}>
            <Wallet size={22} weight="duotone" className={styles.accentIcon} />
            <div>
              <h2 className={styles.cardTitle}>
                Métodos de Pago ({paymentMethods.length})
              </h2>
              <p className={styles.cardSubtitle}>
                Tarjetas, cuentas bancarias, billeteras digitales o efectivo.
              </p>
            </div>
          </div>
        </div>

        <form className={styles.paymentFormRow} onSubmit={handlePaymentSubmit}>
          <input
            type="text"
            value={payIcon}
            onChange={(e) => setPayIcon(e.target.value)}
            className={styles.emojiInput}
            maxLength={4}
            aria-label="Icono de método de pago"
          />
          <input
            type="text"
            value={payName}
            onChange={(e) => setPayName(e.target.value)}
            placeholder="Ej: Tarjeta Nu, Bancolombia, Efectivo..."
            className={styles.textInput}
          />
          <button type="submit" className={styles.addBtn}>
            <Plus size={16} weight="bold" /> Agregar
          </button>
        </form>

        <div className={styles.itemsManageList}>
          {paymentMethods.map((method) => (
            <div key={method.id} className={styles.manageRow}>
              <div className={styles.manageLeft}>
                <span className={styles.manageEmojiBadge}>{method.icon}</span>
                <p className={styles.manageTitle}>{method.name}</p>
              </div>
              <button
                type="button"
                className={styles.smallIconBtn}
                onClick={() => deletePaymentMethod(method.id)}
                aria-label={`Eliminar ${method.name}`}
              >
                <Trash size={15} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
