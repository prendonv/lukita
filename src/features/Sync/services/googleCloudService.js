/**
 * Direct-to-Google Cloud Service (Zero Backend / Zero Cost)
 * Uses Google Identity Services (GIS) OAuth2 Token Model directly from the browser
 * to talk to Google Sheets API v4 and Google Drive API v3.
 */

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
].join(' ');

const TOKEN_STORAGE_KEY = 'lukita_google_oauth_token';

/**
 * Zero-Login Google Apps Script Bridge:
 * Sends the full mirror of local expenses + full backup payload directly to the user's
 * Google Sheet Web App URL without requiring any OAuth popup or token expiration.
 */
export const syncViaAppsScriptWebhook = async ({
  appsScriptUrl,
  expenses,
  categories,
  paymentMethods,
  settings
}) => {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    throw new Error('Configura primero la URL de tu Puente Apps Script.');
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const payMap = new Map(paymentMethods.map((p) => [p.id, p]));

  const sortedForSheet = [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  const rows = sortedForSheet.map((exp) => {
    const category = catMap.get(exp.categoryId);
    const subcategory = category?.subcategories?.find(
      (s) => s.id === exp.subcategoryId
    );
    const paymentMethod = payMap.get(exp.paymentMethodId);

    return [
      exp.id,
      exp.date,
      exp.amount,
      exp.currency,
      category ? `${category.emoji} ${category.name}` : 'Sin categoría',
      subcategory ? subcategory.name : '',
      paymentMethod ? `${paymentMethod.icon} ${paymentMethod.name}` : 'Otro',
      exp.note || '',
      exp.createdAt || ''
    ];
  });

  const response = await fetch(appsScriptUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      action: 'SYNC_MIRROR',
      rows,
      backup: {
        app: 'Lukita',
        version: '1.3.0',
        exportedAt: new Date().toISOString(),
        expenses,
        categories,
        paymentMethods,
        settings
      }
    })
  });

  if (!response.ok) {
    throw new Error('No se pudo conectar con tu Puente Apps Script.');
  }

  return {
    syncedCount: expenses.length,
    syncedIds: expenses.map((e) => e.id)
  };
};

/**
 * Restores expenses and categories directly from the user's Google Apps Script Web App URL
 * without any login popup.
 */
export const restoreViaAppsScriptWebhook = async ({
  appsScriptUrl,
  existingCategories = [],
  existingPaymentMethods = []
}) => {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    throw new Error('Configura primero la URL de tu Puente Apps Script.');
  }

  const url = new URL(appsScriptUrl.trim());
  url.searchParams.set('action', 'READ_ALL');

  const response = await fetch(url.toString(), {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error('Error al leer datos desde tu Puente Apps Script.');
  }

  const data = await response.json();

  // If the script has a full JSON snapshot stored in Drive/Properties, use it directly
  if (data.backup && Array.isArray(data.backup.expenses)) {
    return data.backup;
  }

  // Otherwise reconstruct from the spreadsheet rows returned by the script
  const rows = data.rows || [];
  const categories = existingCategories.map((c) => ({
    ...c,
    subcategories: [...(c.subcategories || [])]
  }));
  const paymentMethods = [...existingPaymentMethods];

  const PALETTE = [
    '#10B981',
    '#3B82F6',
    '#8B5CF6',
    '#F59E0B',
    '#EC4899',
    '#06B6D4',
    '#F43F5E',
    '#14B8A6'
  ];

  const splitEmojiAndText = (rawStr, fallbackEmoji = '🏷️') => {
    const trimmed = String(rawStr || '').trim();
    if (!trimmed) return { emoji: fallbackEmoji, name: 'General' };
    const parts = trimmed.split(' ');
    if (parts.length > 1 && parts[0].length <= 4 && !/^[a-zA-Z0-9]+$/.test(parts[0])) {
      return {
        emoji: parts[0],
        name: parts.slice(1).join(' ').trim()
      };
    }
    return { emoji: fallbackEmoji, name: trimmed };
  };

  const importedExpenses = [];

  rows.forEach((row, index) => {
    const [
      rawId,
      rawDate,
      rawAmount,
      rawCurrency,
      rawCategory,
      rawSubcategory,
      rawPayment,
      rawNote,
      rawCreatedAt
    ] = row;

    const cleanAmount = Number(String(rawAmount || '0').replace(/[^0-9.-]+/g, ''));
    if (!cleanAmount || cleanAmount <= 0) return;

    const { emoji: catEmoji, name: catName } = splitEmojiAndText(rawCategory, '🏷️');
    let category = categories.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase()
    );

    if (!category) {
      category = {
        id: `cat_imp_${Date.now()}_${index}`,
        name: catName,
        emoji: catEmoji,
        color: PALETTE[categories.length % PALETTE.length],
        subcategories: []
      };
      categories.push(category);
    }

    let subcategoryId = null;
    const subName = String(rawSubcategory || '').trim();
    if (subName) {
      let sub = category.subcategories.find(
        (s) => s.name.toLowerCase() === subName.toLowerCase()
      );
      if (!sub) {
        sub = {
          id: `sub_imp_${Date.now()}_${index}`,
          name: subName
        };
        category.subcategories.push(sub);
      }
      subcategoryId = sub.id;
    }

    const { emoji: payIcon, name: payName } = splitEmojiAndText(rawPayment, '💳');
    const normalizedPayName =
      payName === 'Nequi / Transferencia' ? 'Transferencia' : payName;

    let payment = paymentMethods.find(
      (p) => p.name.toLowerCase() === normalizedPayName.toLowerCase()
    );

    if (!payment) {
      payment = {
        id: `pay_imp_${Date.now()}_${index}`,
        name: normalizedPayName,
        icon: payIcon
      };
      paymentMethods.push(payment);
    }

    const formattedDate =
      typeof rawDate === 'string' && rawDate.includes('T')
        ? rawDate.slice(0, 10)
        : String(rawDate || '').slice(0, 10);

    importedExpenses.push({
      id: rawId || `exp_sheet_${Date.now()}_${index}`,
      date: formattedDate || new Date().toISOString().slice(0, 10),
      amount: cleanAmount,
      currency: (rawCurrency || 'COP').trim(),
      categoryId: category.id,
      subcategoryId,
      paymentMethodId: payment.id,
      note: String(rawNote || '').trim(),
      createdAt: rawCreatedAt || new Date().toISOString(),
      syncedToSheets: true
    });
  });

  return {
    expenses: importedExpenses,
    categories,
    paymentMethods
  };
};

let gisLoadedPromise = null;

/**
 * Dynamically loads the official Google Identity Services script when needed
 * so the app remains 100% offline-first and never blocks initial load.
 */
export const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google);
  }
  if (gisLoadedPromise) return gisLoadedPromise;

  gisLoadedPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      gisLoadedPromise = null;
      reject(
        new Error(
          'No pudimos conectar con Google. Verifica tu conexión a internet e inténtalo de nuevo.'
        )
      );
    };
    document.head.appendChild(script);
  });

  return gisLoadedPromise;
};

/**
 * Requests an OAuth2 access token from the user using their Client ID.
 * Caches the token in localStorage for its 1-hour lifetime to avoid repeated popups.
 */
export const requestGoogleAccessToken = async (clientId) => {
  if (!clientId || !clientId.trim()) {
    throw new Error(
      'Falta configurar tu Client ID de Google Cloud. Ingrésalo en la sección de Configuración.'
    );
  }

  try {
    const cachedRaw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (
        cached.clientId === clientId.trim() &&
        cached.accessToken &&
        cached.expiresAt > Date.now() + 60_000
      ) {
        return cached.accessToken;
      }
    }
  } catch {
    // Ignore storage parse error
  }

  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: GOOGLE_SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(
              new Error(
                `Autorización cancelada o rechazada (${response.error}).`
              )
            );
            return;
          }
          const expiresInSec = Number(response.expires_in) || 3500;
          localStorage.setItem(
            TOKEN_STORAGE_KEY,
            JSON.stringify({
              clientId: clientId.trim(),
              accessToken: response.access_token,
              expiresAt: Date.now() + expiresInSec * 1000
            })
          );
          resolve(response.access_token);
        }
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(
        new Error(
          'El Client ID ingresado no tiene un formato válido o el navegador bloqueó la ventana emergente.'
        )
      );
    }
  });
};

/**
 * Creates a brand new formatted Google Spreadsheet in the user's Drive
 * with header columns for Lukita expenses.
 */
export const createLukitaSpreadsheet = async (accessToken) => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `Lukita — Control de Gastos (${new Date().getFullYear()})`
      },
      sheets: [
        {
          properties: {
            title: 'Gastos',
            gridProperties: {
              frozenRowCount: 1
            }
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'ID Registro' } },
                    { userEnteredValue: { stringValue: 'Fecha' } },
                    { userEnteredValue: { stringValue: 'Monto' } },
                    { userEnteredValue: { stringValue: 'Moneda' } },
                    { userEnteredValue: { stringValue: 'Categoría' } },
                    { userEnteredValue: { stringValue: 'Subcategoría' } },
                    { userEnteredValue: { stringValue: 'Método de Pago' } },
                    { userEnteredValue: { stringValue: 'Nota' } },
                    { userEnteredValue: { stringValue: 'Fecha Creación ISO' } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(
      'No se pudo crear la hoja de cálculo en tu Google Drive. Verifica que Google Sheets API esté habilitada en tu proyecto de Google Cloud.'
    );
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl
  };
};

/**
 * Syncs local expenses to the target Google Sheet as a true mirror of local state:
 * adds new expenses, updates edited expenses, and deletes rows that were removed in the app.
 */
export const syncExpensesToGoogleSheet = async ({
  accessToken,
  spreadsheetId,
  expenses,
  categories,
  paymentMethods
}) => {
  let targetSheetId = spreadsheetId;
  let targetSheetUrl = '';

  if (!targetSheetId) {
    const created = await createLukitaSpreadsheet(accessToken);
    targetSheetId = created.spreadsheetId;
    targetSheetUrl = created.spreadsheetUrl;
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const payMap = new Map(paymentMethods.map((p) => [p.id, p]));

  // Sort chronologically for clean spreadsheet reading
  const sortedForSheet = [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  const headerRow = [
    'ID Registro',
    'Fecha',
    'Monto',
    'Moneda',
    'Categoría',
    'Subcategoría',
    'Método de Pago',
    'Nota',
    'Fecha Creación ISO'
  ];

  const rowsData = sortedForSheet.map((exp) => {
    const category = catMap.get(exp.categoryId);
    const subcategory = category?.subcategories?.find(
      (s) => s.id === exp.subcategoryId
    );
    const paymentMethod = payMap.get(exp.paymentMethodId);

    return [
      exp.id,
      exp.date,
      exp.amount,
      exp.currency,
      category ? `${category.emoji} ${category.name}` : 'Sin categoría',
      subcategory ? subcategory.name : '',
      paymentMethod ? `${paymentMethod.icon} ${paymentMethod.name}` : 'Otro',
      exp.note || '',
      exp.createdAt || ''
    ];
  });

  // 1. Clear the existing "Gastos!A1:I" range so deleted expenses are removed from the sheet
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/Gastos!A1:I:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!clearRes.ok) {
    throw new Error(
      'Error al limpiar la hoja en Google Sheets. Revisa que la pestaña "Gastos" exista en tu hoja de cálculo.'
    );
  }

  // 2. Write the updated header + all current local expenses
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/Gastos!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: 'Gastos!A1',
        majorDimension: 'ROWS',
        values: [headerRow, ...rowsData]
      })
    }
  );

  if (!updateRes.ok) {
    throw new Error(
      'Error al actualizar filas en Google Sheets. Revisa que la pestaña "Gastos" exista en tu hoja de cálculo.'
    );
  }

  return {
    syncedCount: expenses.length,
    spreadsheetId: targetSheetId,
    spreadsheetUrl:
      targetSheetUrl || `https://docs.google.com/spreadsheets/d/${targetSheetId}`,
    syncedIds: expenses.map((e) => e.id)
  };
};

/**
 * Uploads or updates a full JSON backup file in the user's Google Drive.
 */
export const uploadBackupToGoogleDrive = async ({ accessToken, backupData }) => {
  const fileName = 'lukita_backup_datos.json';
  const fileContent = JSON.stringify(backupData, null, 2);

  // Check if a backup file created by Lukita already exists
  const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
  searchUrl.searchParams.set(
    'q',
    `name = '${fileName}' and trashed = false`
  );
  searchUrl.searchParams.set('fields', 'files(id, name)');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  let existingFileId = null;
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      existingFileId = searchData.files[0].id;
    }
  }

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Respaldo completo Local-First de Lukita (Gastos, Categorías y Métodos de Pago)'
  };

  const boundary = '-------LukitaMultipartBoundary314159';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadUrl = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const uploadRes = await fetch(uploadUrl, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  if (!uploadRes.ok) {
    throw new Error(
      'No se pudo subir el respaldo a tu Google Drive. Verifica que Google Drive API esté habilitada en tu proyecto de Google Cloud.'
    );
  }

  return await uploadRes.json();
};

/**
 * Downloads the latest JSON backup file from the user's Google Drive.
 */
export const downloadBackupFromGoogleDrive = async ({ accessToken }) => {
  const fileName = 'lukita_backup_datos.json';
  const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
  searchUrl.searchParams.set(
    'q',
    `name = '${fileName}' and trashed = false`
  );
  searchUrl.searchParams.set('orderBy', 'modifiedTime desc');
  searchUrl.searchParams.set('fields', 'files(id, name, modifiedTime)');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchRes.ok) {
    throw new Error('No se pudo consultar tu Google Drive.');
  }

  const searchData = await searchRes.json();
  if (!searchData.files || searchData.files.length === 0) {
    throw new Error(
      'No encontramos ningún archivo "lukita_backup_datos.json" en tu Google Drive.'
    );
  }

  const fileId = searchData.files[0].id;
  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!downloadRes.ok) {
    throw new Error('Error al descargar el archivo de respaldo desde Google Drive.');
  }

  return await downloadRes.json();
};

/**
 * Reads all rows from the user's Google Sheet ("Gastos!A2:I") and reconstructs
 * expenses, custom categories, subcategories, and payment methods into local state.
 */
export const importExpensesFromGoogleSheet = async ({
  accessToken,
  spreadsheetId,
  existingCategories = [],
  existingPaymentMethods = []
}) => {
  const readSheetRows = async (sheetId) => {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId.trim()}/values/Gastos!A2:I?valueRenderOption=FORMATTED_VALUE`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.values || [];
  };

  let targetId = spreadsheetId ? spreadsheetId.trim() : '';
  let rows = targetId ? await readSheetRows(targetId) : null;

  // If the specified sheet has <= 1 row (e.g., an empty test sheet), search Drive for all
  // "Lukita — Control de Gastos" spreadsheets and pick the one with the most rows!
  if (!rows || rows.length <= 1) {
    const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
    searchUrl.searchParams.set(
      'q',
      `name contains 'Lukita' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    searchUrl.searchParams.set('orderBy', 'modifiedTime desc');
    searchUrl.searchParams.set('fields', 'files(id, name)');

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const candidateFiles = searchData.files || [];

      for (const file of candidateFiles) {
        const candidateRows = await readSheetRows(file.id);
        if (candidateRows && (!rows || candidateRows.length > rows.length)) {
          rows = candidateRows;
          targetId = file.id;
        }
      }
    }
  }

  if (!rows || rows.length === 0) {
    throw new Error(
      'No encontramos filas de gastos en tu hoja de cálculo de Google Sheets.'
    );
  }

  const categories = existingCategories.map((c) => ({
    ...c,
    subcategories: [...(c.subcategories || [])]
  }));
  const paymentMethods = [...existingPaymentMethods];

  const PALETTE = [
    '#10B981',
    '#3B82F6',
    '#8B5CF6',
    '#F59E0B',
    '#EC4899',
    '#06B6D4',
    '#F43F5E',
    '#14B8A6'
  ];

  const splitEmojiAndText = (rawStr, fallbackEmoji = '🏷️') => {
    const trimmed = String(rawStr || '').trim();
    if (!trimmed) return { emoji: fallbackEmoji, name: 'General' };
    const parts = trimmed.split(' ');
    if (parts.length > 1 && parts[0].length <= 4 && !/^[a-zA-Z0-9]+$/.test(parts[0])) {
      return {
        emoji: parts[0],
        name: parts.slice(1).join(' ').trim()
      };
    }
    return { emoji: fallbackEmoji, name: trimmed };
  };

  const importedExpenses = [];

  rows.forEach((row, index) => {
    const [
      rawId,
      rawDate,
      rawAmount,
      rawCurrency,
      rawCategory,
      rawSubcategory,
      rawPayment,
      rawNote,
      rawCreatedAt
    ] = row;

    const cleanAmount = Number(String(rawAmount || '0').replace(/[^0-9.-]+/g, ''));
    if (!cleanAmount || cleanAmount <= 0) return;

    // 1. Resolve or create Category
    const { emoji: catEmoji, name: catName } = splitEmojiAndText(rawCategory, '🏷️');
    let category = categories.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase()
    );

    if (!category) {
      category = {
        id: `cat_imp_${Date.now()}_${index}`,
        name: catName,
        emoji: catEmoji,
        color: PALETTE[categories.length % PALETTE.length],
        subcategories: []
      };
      categories.push(category);
    }

    // 2. Resolve or create Subcategory if present
    let subcategoryId = null;
    const subName = String(rawSubcategory || '').trim();
    if (subName) {
      let sub = category.subcategories.find(
        (s) => s.name.toLowerCase() === subName.toLowerCase()
      );
      if (!sub) {
        sub = {
          id: `sub_imp_${Date.now()}_${index}`,
          name: subName
        };
        category.subcategories.push(sub);
      }
      subcategoryId = sub.id;
    }

    // 3. Resolve or create Payment Method
    const { emoji: payIcon, name: payName } = splitEmojiAndText(rawPayment, '💳');
    const normalizedPayName =
      payName === 'Nequi / Transferencia' ? 'Transferencia' : payName;

    let payment = paymentMethods.find(
      (p) => p.name.toLowerCase() === normalizedPayName.toLowerCase()
    );

    if (!payment) {
      payment = {
        id: `pay_imp_${Date.now()}_${index}`,
        name: normalizedPayName,
        icon: payIcon
      };
      paymentMethods.push(payment);
    }

    importedExpenses.push({
      id: rawId || `exp_sheet_${Date.now()}_${index}`,
      date: rawDate || new Date().toISOString().slice(0, 10),
      amount: cleanAmount,
      currency: (rawCurrency || 'COP').trim(),
      categoryId: category.id,
      subcategoryId,
      paymentMethodId: payment.id,
      note: String(rawNote || '').trim(),
      createdAt: rawCreatedAt || new Date().toISOString(),
      syncedToSheets: true
    });
  });

  return {
    spreadsheetId: targetId,
    expenses: importedExpenses,
    categories,
    paymentMethods
  };
};

/**
 * Local file export helpers (CSV and JSON) that work 100% offline without Google account
 */
export const exportExpensesToLocalCSV = ({
  expenses,
  categories,
  paymentMethods,
  filename = `lukita_gastos_${new Date().toISOString().slice(0, 10)}.csv`
}) => {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const payMap = new Map(paymentMethods.map((p) => [p.id, p]));

  const headers = [
    'ID',
    'Fecha',
    'Monto',
    'Moneda',
    'Categoria',
    'Subcategoria',
    'Metodo de Pago',
    'Nota'
  ];

  const escapeCSV = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = expenses.map((exp) => {
    const cat = catMap.get(exp.categoryId);
    const sub = cat?.subcategories?.find((s) => s.id === exp.subcategoryId);
    const pay = payMap.get(exp.paymentMethodId);

    return [
      exp.id,
      exp.date,
      exp.amount,
      exp.currency,
      cat ? `${cat.emoji} ${cat.name}` : 'Sin categoría',
      sub ? sub.name : '',
      pay ? pay.name : 'Otro',
      exp.note || ''
    ]
      .map(escapeCSV)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportFullDatabaseToLocalJSON = ({
  expenses,
  categories,
  paymentMethods,
  settings
}) => {
  const payload = {
    app: 'Lukita',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    expenses,
    categories,
    paymentMethods,
    settings
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const filename = `lukita_backup_${new Date().toISOString().slice(0, 10)}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
