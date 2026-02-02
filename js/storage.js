// File system and IndexedDB storage handling

import { state, DB_NAME, DB_STORE, HANDLE_KEY, defaultConfig, defaultScConfig } from './state.js';
import { getSortedMonthKeys, formatMonthKey, generateMonth } from './utils.js';

// Render function will be injected to avoid circular dependency
let renderFn = () => {};
export function setRenderFunction(fn) {
  renderFn = fn;
}

export function normalizeData(input) {
  const cfg = { ...defaultConfig, ...(input.config || {}) };
  cfg.defaultTimes = { ...defaultConfig.defaultTimes, ...(input.config?.defaultTimes || {}) };
  const scCfg = { ...defaultScConfig, ...(input.scConfig || {}) };
  scCfg.perDiem = { ...defaultScConfig.perDiem, ...(input.scConfig?.perDiem || {}) };
  const months = { ...(input.months || {}) };
  Object.keys(months).forEach(key => {
    if (!months[key].trips) months[key].trips = [];
    if (!months[key].vacations) months[key].vacations = [];
  });
  return { ...input, config: cfg, scConfig: scCfg, months };
}

export function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandle(handle) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Nepodarilo sa uložiť odkaz na súbor', err);
  }
}

export async function loadStoredHandle() {
  try {
    const db = await openDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch (err) {
    console.warn('Nepodarilo sa načítať odkaz na súbor', err);
    return null;
  }
}

export async function clearStoredHandle() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Nepodarilo sa vymazať odkaz na súbor', err);
  }
}

export async function verifyPermission(fileHandle, withWrite) {
  if (!fileHandle) return false;
  const opts = withWrite ? { mode: 'readwrite' } : {};
  if ((await fileHandle.queryPermission(opts)) === 'granted') return true;
  if ((await fileHandle.requestPermission(opts)) === 'granted') return true;
  return false;
}

export function downloadData(filename = 'dochadzka.json') {
  if (!state.data) return;
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function loadFromHandle(handle) {
  if (!handle) return false;
  try {
    if (!(await verifyPermission(handle, false))) return false;
    const file = await handle.getFile();
    const text = await file.text();
    const normalized = normalizeData(JSON.parse(text));
    state.fileHandle = handle;
    state.data = normalized;
    const monthKeys = getSortedMonthKeys(normalized.months);
    state.selectedMonthKey = monthKeys[0] || null;
    state.selectedDayIndex = 0;
    state.lastFileName = handle.name || '';
    localStorage.setItem('lastFileName', state.lastFileName);
    renderFn();
    return true;
  } catch (err) {
    console.error('Nepodarilo sa načítať súbor', err);
    return false;
  }
}

export function createSampleData() {
  const now = new Date();
  const monthKey = formatMonthKey(now.getFullYear(), now.getMonth());
  const months = {};
  months[monthKey] = generateMonth(now.getFullYear(), now.getMonth());
  const firstDays = Object.keys(months[monthKey].days).slice(0, 3);
  if (firstDays[0]) months[monthKey].days[firstDays[0]] = '0';
  if (firstDays[1]) months[monthKey].days[firstDays[1]] = 'D';
  if (firstDays[2]) months[monthKey].days[firstDays[2]] = '8';
  return { config: { ...defaultConfig }, scConfig: { ...defaultScConfig }, months };
}

export async function createSampleFile() {
  try {
    const data = normalizeData(createSampleData());
    state.data = data;
    state.selectedMonthKey = getSortedMonthKeys(data.months)[0] || null;
    state.selectedDayIndex = 0;

    if (state.fsSupported) {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'dochadzka.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      state.fileHandle = handle;
      state.lastFileName = handle.name || 'dochadzka.json';
      saveHandle(handle);
    } else {
      state.fileHandle = null;
      state.lastFileName = 'dochadzka.json';
      downloadData('dochadzka.json');
    }

    localStorage.setItem('lastFileName', state.lastFileName);
    renderFn();
  } catch (err) {
    if (err?.name !== 'AbortError') console.error(err);
  }
}

export async function openFile() {
  try {
    if (state.fsSupported) {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        multiple: false,
      });
      if (!handle) return;
      const loaded = await loadFromHandle(handle);
      if (loaded) saveHandle(handle);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = normalizeData(JSON.parse(text));
        state.fileHandle = null;
        state.data = data;
        const monthKeys = getSortedMonthKeys(data.months);
        state.selectedMonthKey = monthKeys[0] || null;
        state.selectedDayIndex = 0;
        state.lastFileName = file.name || '';
        localStorage.setItem('lastFileName', state.lastFileName);
        renderFn();
      } catch (err) {
        console.error(err);
        alert('Nepodarilo sa načítať JSON.');
      }
    };
    input.click();
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error(err);
      alert('Nepodarilo sa otvoriť súbor.');
    }
  }
}

export async function reconnectFile() {
  if (!state.fsSupported) {
    alert('Pripojenie nie je dostupné. Použite "Otvoriť súbor" a vyberte JSON.');
    return;
  }
  if (!state.isSecure) {
    alert('Pre spoľahlivé automatické pripojenie použite https:// alebo http://localhost.');
  }
  if (state.fileHandle && (await loadFromHandle(state.fileHandle))) return;
  const stored = await loadStoredHandle();
  if (stored && (await loadFromHandle(stored))) return;
  alert('Súbor sa nepodarilo pripojiť. Použite "Otvoriť súbor" a vyberte ho ručne.');
}

export async function saveData() {
  if (!state.data) return;
  if (state.fileHandle && state.fsSupported) {
    try {
      if (!(await verifyPermission(state.fileHandle, true))) return;
      const writable = await state.fileHandle.createWritable();
      await writable.write(JSON.stringify(state.data, null, 2));
      await writable.close();
    } catch (err) {
      console.error('Nepodarilo sa zapísať do súboru', err);
    }
  } else {
    downloadData(state.lastFileName || 'dochadzka.json');
  }
}

export function scheduleSave() {
  if (state.saveTimeout) clearTimeout(state.saveTimeout);
  state.saveTimeout = setTimeout(() => saveData(), 500);
}
