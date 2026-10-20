// Settings view: edit config values from the data file and list discrepancies.
// Edits go to an in-memory draft; the file changes only when the user confirms the save.

import { state, defaultConfig, defaultScConfig, defaultPerDiemRates } from './state.js';
import { calculateHoursBetween } from './utils.js';
import { calculateYearVacationDays } from './vacations.js';

// Editable fields: path in state.data, label, input type, where the value is used
const FIELDS = [
  { section: 'Zamestnanec a zamestnávateľ' },
  { path: ['config', 'employeeName'], label: 'Meno zamestnanca', use: 'Dochádzka, cestovný príkaz, dovolenka' },
  { path: ['config', 'employerName'], label: 'Zamestnávateľ', use: 'Dochádzka, cestovný príkaz' },
  { path: ['scConfig', 'address'], label: 'Adresa zamestnávateľa', use: 'Cestovný príkaz' },
  { path: ['config', 'utvar'], label: 'Útvar', use: 'Žiadosť o dovolenku' },
  { section: 'Pracovný čas (deň typu 8 a SC)' },
  { path: ['config', 'defaultTimes', 'arrival'], label: 'Príchod', type: 'time' },
  { path: ['config', 'defaultTimes', 'breakStart'], label: 'Prestávka od', type: 'time' },
  { path: ['config', 'defaultTimes', 'breakEnd'], label: 'Prestávka do', type: 'time' },
  { path: ['config', 'defaultTimes', 'departure'], label: 'Odchod', type: 'time' },
  { section: 'Služobné cesty' },
  { path: ['scConfig', 'origin'], label: 'Bydlisko / miesto odchodu', use: 'Cestovný príkaz, vyúčtovanie' },
  { path: ['scConfig', 'destination'], label: 'Miesto konania', use: 'Cestovný príkaz, vyúčtovanie' },
  { path: ['scConfig', 'purpose'], label: 'Účel cesty', use: 'Cestovný príkaz' },
  { path: ['scConfig', 'vehicleType'], label: 'Dopravný prostriedok', use: 'Cestovný príkaz' },
  { path: ['scConfig', 'licensePlate'], label: 'EČV', use: 'Cestovný príkaz' },
  { path: ['scConfig', 'defaultKm'], label: 'Predvolené KM', type: 'number', use: 'Len nové cesty' },
  { path: ['scConfig', 'defaultStartTime'], label: 'Predvolený odchod', type: 'time', use: 'Len nové cesty' },
];

const KNOWN_KEYS = {
  config: [...Object.keys(defaultConfig), 'utvar', 'vacationEntitlement'],
  scConfig: [...Object.keys(defaultScConfig), 'companyAddress', 'perDiem', 'perDiemRates'],
};

// 1x1 transparent PNG from defaultConfig
const PLACEHOLDER_SIGNATURE = defaultConfig.signaturePng;

// Draft of config + scConfig; dropped when another file loads (state.data changes)
function getDraft() {
  const draft = state.settingsDraft;
  return draft && draft.base === state.data ? draft : null;
}

export function isEditingSettings() {
  return getDraft() !== null;
}

export function startSettingsEdit() {
  state.settingsDraft = {
    base: state.data,
    config: structuredClone(state.data.config),
    scConfig: structuredClone(state.data.scConfig),
  };
}

export function cancelSettingsEdit() {
  state.settingsDraft = null;
}

// Copy the draft into state.data; the caller saves the file
export function commitSettingsEdit() {
  const draft = getDraft();
  if (!draft) return;
  state.data.config = draft.config;
  state.data.scConfig = draft.scConfig;
  state.settingsDraft = null;
}

// Data the view shows and edits: the draft while editing, else the loaded data
function current() {
  const draft = getDraft();
  return draft ? { ...state.data, config: draft.config, scConfig: draft.scConfig } : state.data;
}

function getPath(path, data = current()) {
  return path.reduce((obj, key) => obj?.[key], data);
}

function setPath(path, value) {
  let obj = current();
  path.slice(0, -1).forEach(key => {
    if (!obj[key]) obj[key] = {};
    obj = obj[key];
  });
  obj[path[path.length - 1]] = value;
}

function getDefault(path) {
  const defaults = { config: defaultConfig, scConfig: defaultScConfig };
  return path.slice(1).reduce((obj, key) => obj?.[key], defaults[path[0]]);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function formatRate(value) {
  return Number(value).toFixed(2);
}

const RATE_KEYS = ['rate5to12', 'rate12to18', 'rateOver18'];

function formatFrom(from) {
  if (!from) return 'bez začiatku';
  const [year, month] = from.split('-');
  return `od ${month}-${year}`;
}

function formatRateRow(r) {
  return `${formatFrom(r.from)}: ${RATE_KEYS.map(k => formatRate(r[k])).join(' / ')}`;
}

function sortRates() {
  current().scConfig.perDiemRates.sort((a, b) => b.from.localeCompare(a.from));
}

// Each issue: { text, fix? } where fix is an action id handled in applyFix()
export function findDiscrepancies() {
  const data = current();
  const issues = [];

  FIELDS.filter(f => f.path).forEach(f => {
    const value = getPath(f.path);
    const def = getDefault(f.path);
    if (value === undefined || value === '') {
      issues.push({ text: `${f.label}: hodnota chýba.` });
    } else if (def !== undefined && value === def && f.type !== 'time' && f.path[1] !== 'defaultKm') {
      issues.push({ text: `${f.label}: hodnota je stále ukážková ("${value}").` });
    }
  });

  const times = data.config.defaultTimes || {};
  const hasTimes = ['arrival', 'breakStart', 'breakEnd', 'departure'].every(k => times[k]);
  const workHours = hasTimes
    ? calculateHoursBetween(times.arrival, times.departure) - calculateHoursBetween(times.breakStart, times.breakEnd)
    : 8;
  if (Math.abs(workHours - 8) > 0.01) {
    issues.push({ text: `Pracovný čas ${times.arrival} - ${times.departure} bez prestávky dáva ${workHours.toFixed(2)} h, deň typu 8 počíta 8 h.` });
  }

  const storedRates = data.scConfig.perDiem;
  if (storedRates) {
    const stored = [storedRates.rate5to12, storedRates.rate12to18, storedRates.rateOver18].map(formatRate).join(' / ');
    issues.push({
      text: `Súbor obsahuje starú kópiu sadzieb stravného (${stored}). Aplikácia ju nepoužíva, platí tabuľka sadzieb nižšie.`,
      fix: 'removePerDiem', fixLabel: 'Odstrániť',
    });
  }

  const rates = data.scConfig.perDiemRates;
  const seenFrom = new Set();
  rates.forEach(r => {
    if (seenFrom.has(r.from)) issues.push({ text: `Sadzby stravného: viac riadkov s platnosťou ${formatFrom(r.from)}.` });
    seenFrom.add(r.from);
    if (RATE_KEYS.some(k => !(Number(r[k]) > 0))) issues.push({ text: `Sadzby stravného ${formatFrom(r.from)}: niektorá sadzba nie je kladné číslo.` });
  });
  defaultPerDiemRates.forEach(def => {
    const own = rates.find(r => r.from === def.from);
    if (!own) {
      issues.push({
        text: `Aplikácia pozná sadzby ${formatRateRow(def)}, ktoré v súbore chýbajú.`,
        fix: `addDefaultRate:${def.from}`, fixLabel: 'Doplniť',
      });
    } else if (RATE_KEYS.some(k => Number(own[k]) !== def[k])) {
      issues.push({
        text: `Sadzby ${formatFrom(def.from)} v súbore (${RATE_KEYS.map(k => formatRate(own[k])).join(' / ')}) sa líšia od sadzieb v aplikácii (${RATE_KEYS.map(k => formatRate(def[k])).join(' / ')}).`,
        fix: `addDefaultRate:${def.from}`, fixLabel: 'Prevziať z aplikácie',
      });
    }
  });

  const { companyAddress, address } = data.scConfig;
  if (companyAddress !== undefined) {
    issues.push({
      text: companyAddress === address
        ? 'Súbor obsahuje pole companyAddress s rovnakou hodnotou ako adresa zamestnávateľa.'
        : `Cestovný príkaz používa companyAddress ("${companyAddress}"), nie adresu zamestnávateľa ("${address}").`,
      fix: 'mergeCompanyAddress', fixLabel: 'Prevziať companyAddress ako adresu',
    });
  }

  if (!data.config.signaturePng || data.config.signaturePng === PLACEHOLDER_SIGNATURE) {
    issues.push({ text: 'Podpis nie je nahratý (súbor má prázdny obrázok). Použite tlačidlo "Nahrať podpis".' });
  }

  const vacationYears = new Set(Object.keys(data.months)
    .filter(key => Object.values(data.months[key].days || {}).includes('D'))
    .map(key => key.split('-')[1]));
  [...vacationYears].sort().forEach(year => {
    if (data.config.vacationEntitlement?.[year] == null) {
      const used = calculateYearVacationDays(data.months, year);
      issues.push({ text: `Rok ${year}: čerpaných ${used} dní dovolenky, ale nárok nie je zadaný (zadajte ho v záložke Dovolenky).` });
    }
  });

  ['config', 'scConfig'].forEach(section => {
    Object.keys(data[section] || {})
      .filter(key => !KNOWN_KEYS[section].includes(key))
      .forEach(key => issues.push({
        text: `Neznáme pole ${section}.${key} = ${JSON.stringify(data[section][key])}. Aplikácia ho nepoužíva.`,
        fix: `removeKey:${section}.${key}`, fixLabel: 'Odstrániť',
      }));
  });

  return issues;
}

export function applyFix(fix) {
  const data = current();
  if (fix === 'removePerDiem') {
    delete data.scConfig.perDiem;
  } else if (fix === 'mergeCompanyAddress') {
    data.scConfig.address = data.scConfig.companyAddress;
    delete data.scConfig.companyAddress;
  } else if (fix.startsWith('addDefaultRate:')) {
    const from = fix.slice('addDefaultRate:'.length);
    const def = defaultPerDiemRates.find(r => r.from === from);
    const rates = data.scConfig.perDiemRates.filter(r => r.from !== from);
    data.scConfig.perDiemRates = [...rates, { ...def }];
    sortRates();
  } else if (fix.startsWith('removeKey:')) {
    const [section, key] = fix.slice('removeKey:'.length).split('.');
    delete data[section][key];
  }
}

export function applyField(index, rawValue) {
  const field = FIELDS[index];
  if (!field?.path) return;
  const value = field.type === 'number' ? (parseInt(rawValue, 10) || 0) : rawValue;
  setPath(field.path, value);
}

export function applyRateEdit(index, key, rawValue) {
  const row = current().scConfig.perDiemRates[index];
  if (!row) return;
  if (key === 'from') row.from = rawValue;
  else if (RATE_KEYS.includes(key)) row[key] = parseFloat(rawValue) || 0;
  sortRates();
}

export function addRateRow() {
  sortRates();
  const rates = current().scConfig.perDiemRates;
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  rates.push({ ...rates[0], from });
  sortRates();
}

export function removeRateRow(index) {
  const rates = current().scConfig.perDiemRates;
  if (rates.length > 1) rates.splice(index, 1);
}

function formatValue(path, value) {
  if (value === undefined) return '(nie je)';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function getLabel(path) {
  const field = FIELDS.find(f => f.path?.join('.') === path);
  if (field) return field.label;
  if (path === 'scConfig.perDiem') return 'Stará kópia sadzieb (perDiem)';
  return path;
}

// List of { label, from, to } between the loaded data and the draft
export function getSettingsChanges() {
  const draft = getDraft();
  if (!draft) return [];
  const changes = [];
  // One change per rate row, matched by its start month
  const diffRates = (before, after) => {
    const froms = [...new Set([...before, ...after].map(r => r.from))].sort().reverse();
    const formatRates = r => (r ? RATE_KEYS.map(k => formatRate(r[k])).join(' / ') : '(nie je)');
    froms.forEach(from => {
      const a = before.find(r => r.from === from);
      const b = after.find(r => r.from === from);
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        changes.push({ label: `Sadzby stravného ${formatFrom(from)}`, from: formatRates(a), to: formatRates(b) });
      }
    });
  };
  const walk = (before, after, prefix) => {
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    keys.forEach(key => {
      const path = `${prefix}.${key}`;
      const a = before?.[key];
      const b = after?.[key];
      const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
      if (path === 'scConfig.perDiemRates') {
        diffRates(a || [], b || []);
      } else if (path !== 'scConfig.perDiem' && isObj(a) && isObj(b)) {
        walk(a, b, path);
      } else if (JSON.stringify(a) !== JSON.stringify(b)) {
        changes.push({ label: getLabel(path), from: formatValue(path, a), to: formatValue(path, b) });
      }
    });
  };
  walk(state.data.config, draft.config, 'config');
  walk(state.data.scConfig, draft.scConfig, 'scConfig');
  return changes;
}

export function renderSettingsChanges(changes) {
  return `
    <h2>Uložiť zmeny do súboru?</h2>
    <table class="settings-changes">
      <thead><tr><th>Pole</th><th>Pôvodná hodnota</th><th>Nová hodnota</th></tr></thead>
      <tbody>${changes.map(c => `
        <tr><td>${escapeHtml(c.label)}</td><td>${escapeHtml(c.from)}</td><td>${escapeHtml(c.to)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="settings-dialog-buttons">
      <button class="settings-dialog-back">Späť k úpravám</button>
      <button class="settings-dialog-save primary">Uložiť do súboru</button>
    </div>`;
}

export function renderSettings() {
  const editing = isEditingSettings();
  const disabled = editing ? '' : ' disabled';
  const issues = findDiscrepancies();
  const issuesHtml = issues.length === 0
    ? '<p class="settings-ok">Žiadne nezrovnalosti.</p>'
    : `<ul class="settings-issues">${issues.map(issue => `
        <li><span>${escapeHtml(issue.text)}</span>${issue.fix && editing
          ? ` <button class="settings-fix-btn" data-fix="${escapeHtml(issue.fix)}">${escapeHtml(issue.fixLabel)}</button>`
          : ''}</li>`).join('')}</ul>`;

  const fieldsHtml = FIELDS.map((f, idx) => {
    if (f.section) return `<h3>${f.section}</h3>`;
    const value = getPath(f.path);
    return `
      <label class="settings-field">
        <span class="settings-label">${f.label}</span>
        <input type="${f.type || 'text'}" data-field="${idx}" value="${escapeHtml(value)}"${disabled} />
        <span class="settings-use">${f.use || ''}</span>
      </label>`;
  }).join('');

  const rates = current().scConfig.perDiemRates;
  const ratesHtml = rates.map((r, idx) => `
    <tr>
      <td><input type="month" data-rate="${idx}" data-key="from" value="${escapeHtml(r.from)}"${disabled} />${r.from ? '' : ' <span class="meta">bez začiatku</span>'}</td>
      ${RATE_KEYS.map(k => `<td><input type="number" step="0.01" min="0" data-rate="${idx}" data-key="${k}" value="${escapeHtml(formatRate(r[k]))}"${disabled} /></td>`).join('')}
      <td>${editing && rates.length > 1 ? `<button class="settings-rate-del danger" data-rate-del="${idx}">Vymazať</button>` : ''}</td>
    </tr>`).join('');

  const modeHtml = editing
    ? `<div class="settings-mode settings-mode-edit">Úpravy sú len v prehliadači. Súbor sa zmení až po "Uložiť". <button class="settings-cancel">Zrušiť úpravy</button></div>`
    : '<div class="settings-mode">Na zmenu hodnôt kliknite na "Upraviť".</div>';

  return `
    ${modeHtml}
    <section class="settings-section">
      <h2>Nezrovnalosti (${issues.length})</h2>
      ${issuesHtml}
    </section>
    <section class="settings-section">
      <h2>Hodnoty v súbore</h2>
      <div class="settings-fields">${fieldsHtml}</div>
    </section>
    <section class="settings-section">
      <h2>Sadzby stravného (EUR)</h2>
      <p class="meta">Cesta použije riadok s najnovšou platnosťou, ktorá nie je neskôr ako mesiac cesty. Riadok bez začiatku platí pre všetky staršie cesty.</p>
      <table class="settings-rates">
        <thead><tr><th>Platnosť od</th><th>5 - 12 h</th><th>12 - 18 h</th><th>nad 18 h</th><th></th></tr></thead>
        <tbody>${ratesHtml}</tbody>
      </table>
      ${editing ? '<button class="settings-rate-add">+ Nové sadzby</button>' : ''}
    </section>`;
}
