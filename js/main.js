// Main application entry point

import { elements } from './elements.js';
import { state, defaultConfig } from './state.js';
import {
  getSortedMonthKeys, formatMonthKey, generateMonth,
  isWeekendDay, isHolidayDay, isSunday, getDayOfWeek
} from './utils.js';
import { setStateFromHash, updateHash } from './router.js';
import {
  setRenderFunction, createSampleFile, openFile, reconnectFile,
  loadStoredHandle, loadFromHandle, scheduleSave, normalizeData
} from './storage.js';
import { syncTrips } from './trips.js';
import { renderCestovnyPrikaz, renderVyuctovanie } from './documents.js';
import { syncVacations, calculateWorkingDays } from './vacations.js';
import { renderVacationRequest } from './vacation-document.js';

// Helper functions
function getDayKeys(monthKey) {
  const month = state.data?.months?.[monthKey];
  if (!month) return [];
  return Object.keys(month.days).sort();
}

function selectMonth(newKey) {
  if (!state.data?.months[newKey]) return;
  state.selectedMonthKey = newKey;
  state.selectedDayIndex = 0;
  render();
}

function changeMonth(step) {
  const keys = getSortedMonthKeys(state.data?.months || {});
  const idx = keys.indexOf(state.selectedMonthKey);
  const next = keys[idx + step];
  if (next) selectMonth(next);
}

function setSelectedDay(index) {
  const dayKeys = getDayKeys(state.selectedMonthKey);
  if (!dayKeys.length) return;
  const bounded = ((index % dayKeys.length) + dayKeys.length) % dayKeys.length;
  state.selectedDayIndex = bounded;
  render(true);
}

function getTimesForValue(value) {
  const defaults = state.data?.config?.defaultTimes || defaultConfig.defaultTimes;
  if (value === '8') return { arrival: defaults.arrival, breakStart: defaults.breakStart, breakEnd: defaults.breakEnd, departure: defaults.departure, hours: '8' };
  if (value === '0') return { arrival: '-', breakStart: '-', breakEnd: '-', departure: '-', hours: '0' };
  if (value === 'SC') return { arrival: defaults.arrival, breakStart: defaults.breakStart, breakEnd: defaults.breakEnd, departure: defaults.departure, hours: 'SC' };
  return { arrival: '-', breakStart: '-', breakEnd: '-', departure: '-', hours: value };
}

function calculateTotal(monthKey) {
  const dayKeys = getDayKeys(monthKey);
  return dayKeys.reduce((sum, key) => {
    const v = state.data.months[monthKey].days[key];
    if (v === 'SC') return sum + 8;
    const asNum = Number(v);
    return sum + (Number.isFinite(asNum) ? asNum : 0);
  }, 0);
}

function addNewMonth() {
  const keys = getSortedMonthKeys(state.data.months);
  let year, monthIndex;
  if (!keys.length) {
    const now = new Date();
    year = now.getFullYear();
    monthIndex = now.getMonth();
  } else {
    const last = keys[keys.length - 1];
    const [m, y] = last.split('-').map(Number);
    year = y;
    monthIndex = m - 1;
    monthIndex += 1;
    if (monthIndex > 11) { monthIndex = 0; year += 1; }
  }
  const newKey = formatMonthKey(year, monthIndex);
  state.data.months[newKey] = generateMonth(year, monthIndex);
  state.selectedMonthKey = newKey;
  state.selectedDayIndex = 0;
  scheduleSave();
  render();
}

function uploadSignature() {
  if (!state.data) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.data.config.signaturePng = reader.result;
      scheduleSave();
      render();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function handleKeydown(e) {
  if (!state.data || !state.selectedMonthKey || !state.editMode) return;
  const key = e.key;
  if (key === 'ArrowUp') {
    e.preventDefault();
    setSelectedDay(state.selectedDayIndex - 1);
    return;
  }
  if (key === 'ArrowDown') {
    e.preventDefault();
    setSelectedDay(state.selectedDayIndex + 1);
    return;
  }

  const upper = key.toUpperCase();
  const valid = ['8', '0', 'D', 'P', 'O', 'S', 'I'];
  if (!valid.includes(upper)) return;
  const dayKeys = getDayKeys(state.selectedMonthKey);
  const dayKey = dayKeys[state.selectedDayIndex];
  if (!dayKey) return;
  const current = state.data.months[state.selectedMonthKey].days[dayKey];
  let nextValue = current;
  if (upper === '8') nextValue = '8';
  else if (upper === '0') nextValue = '0';
  else if (upper === 'D') nextValue = 'D';
  else if (upper === 'P') nextValue = 'PN';
  else if (upper === 'O') nextValue = 'O';
  else if (upper === 'I') nextValue = 'IN';
  else if (upper === 'S') nextValue = 'SC';
  if (nextValue !== current) {
    state.data.months[state.selectedMonthKey].days[dayKey] = nextValue;
    scheduleSave();
    render(true);
  }
}

// SC View rendering
function renderSCView() {
  const monthData = state.data.months[state.selectedMonthKey];
  const updatedTrips = syncTrips(monthData, state.selectedMonthKey, state.data.scConfig);
  if (JSON.stringify(updatedTrips) !== JSON.stringify(monthData.trips)) {
    monthData.trips = updatedTrips;
    scheduleSave();
  }

  elements.dochadzkaView.classList.add('hidden');
  elements.scView.classList.remove('hidden');
  elements.tabDochadzka.classList.remove('active');
  elements.tabSC.classList.add('active');

  const trips = monthData.trips || [];
  const confirmedTrips = trips.filter(t => t.confirmed);

  if (trips.length === 0) {
    elements.tripList.innerHTML = '<div class="meta">Žiadne služobné cesty v tomto mesiaci.</div>';
  } else {
    const selectedTrip = confirmedTrips[state.selectedTripIndex];
    elements.tripList.innerHTML = trips.map((trip, idx) => {
      const startD = parseInt(trip.startDay, 10);
      const endD = parseInt(trip.endDay, 10);
      const days = endD - startD + 1;
      const [month, year] = state.selectedMonthKey.split('-');
      const dateRange = `${trip.startDay}.${month} - ${trip.endDay}.${month}.${year}`;
      const isSelected = selectedTrip && trip.id === selectedTrip.id;
      const statusClass = trip.confirmed ? 'trip-confirmed' : 'trip-unconfirmed';
      const selectedClass = isSelected ? 'trip-selected' : '';
      const statusText = trip.confirmed ? '✓' : '';
      const confirmBtn = trip.confirmed ? '' : `<button data-idx="${idx}" class="confirm-trip-btn">Potvrdiť</button>`;
      const deleteBtn = `<button data-idx="${idx}" class="delete-trip-btn danger">Vymazať</button>`;
      return `<div class="trip-item ${statusClass} ${selectedClass}"><span>${dateRange} (${days} ${days === 1 ? 'deň' : 'dní'}) ${statusText}</span><span>${confirmBtn} ${deleteBtn}</span></div>`;
    }).join('');
  }

  if (confirmedTrips.length > 0) {
    if (state.selectedTripIndex >= confirmedTrips.length) state.selectedTripIndex = 0;
    const trip = confirmedTrips[state.selectedTripIndex];

    elements.tripControls.classList.remove('hidden');
    elements.tripStartDay.value = trip.startDay || '';
    elements.tripEndDay.value = trip.endDay || '';
    elements.tripStartTime.value = trip.startTime || '';
    elements.tripEndTime.value = trip.endTime || '';
    elements.tripKm.value = trip.km || '';

    elements.scDocuments.classList.remove('hidden');
    elements.cestovnyPrikaz.innerHTML = renderCestovnyPrikaz(trip, state.selectedMonthKey, state.data.config, state.data.scConfig);
    elements.vyuctovanie.innerHTML = renderVyuctovanie(trip, state.selectedMonthKey, state.data.config, state.data.scConfig);
  } else {
    elements.tripControls.classList.add('hidden');
    elements.scDocuments.classList.add('hidden');
  }
}

// Vacation View rendering
function renderVacationsView() {
  const monthData = state.data.months[state.selectedMonthKey];
  const updatedVacations = syncVacations(monthData, state.selectedMonthKey);
  if (JSON.stringify(updatedVacations) !== JSON.stringify(monthData.vacations)) {
    monthData.vacations = updatedVacations;
    scheduleSave();
  }

  elements.dochadzkaView.classList.add('hidden');
  elements.scView.classList.add('hidden');
  elements.vacationsView.classList.remove('hidden');
  elements.tabDochadzka.classList.remove('active');
  elements.tabSC.classList.remove('active');
  elements.tabVacations.classList.add('active');

  const vacations = monthData.vacations || [];
  const confirmedVacations = vacations.filter(v => v.confirmed);

  if (vacations.length === 0) {
    elements.vacationList.innerHTML = '<div class="meta">Žiadne dovolenky v tomto mesiaci.</div>';
  } else {
    const selectedVacation = confirmedVacations[state.selectedVacationIndex];
    elements.vacationList.innerHTML = vacations.map((vacation, idx) => {
      const startD = parseInt(vacation.startDay, 10);
      const endD = parseInt(vacation.endDay, 10);
      const [month, year] = state.selectedMonthKey.split('-');
      const dateRange = `${vacation.startDay}.${month} - ${vacation.endDay}.${month}.${year}`;
      const workingDays = vacation.workingDaysOverride !== null
        ? vacation.workingDaysOverride
        : calculateWorkingDays(vacation.startDay, vacation.endDay, state.selectedMonthKey, monthData);
      const isSelected = selectedVacation && vacation.id === selectedVacation.id;
      const statusClass = vacation.confirmed ? 'vacation-confirmed' : 'vacation-unconfirmed';
      const selectedClass = isSelected ? 'vacation-selected' : '';
      const statusText = vacation.confirmed ? '✓' : '';
      const confirmBtn = vacation.confirmed ? '' : `<button data-idx="${idx}" class="confirm-vacation-btn">Potvrdiť</button>`;
      const deleteBtn = `<button data-idx="${idx}" class="delete-vacation-btn danger">Vymazať</button>`;
      return `<div class="vacation-item ${statusClass} ${selectedClass}"><span>${dateRange} (${workingDays} ${workingDays === 1 ? 'deň' : 'dní'}) ${statusText}</span><span>${confirmBtn} ${deleteBtn}</span></div>`;
    }).join('');
  }

  if (confirmedVacations.length > 0) {
    if (state.selectedVacationIndex >= confirmedVacations.length) state.selectedVacationIndex = 0;
    const vacation = confirmedVacations[state.selectedVacationIndex];

    elements.vacationControls.classList.remove('hidden');
    elements.vacationStartDay.value = vacation.startDay || '';
    elements.vacationEndDay.value = vacation.endDay || '';
    const workingDays = vacation.workingDaysOverride !== null
      ? vacation.workingDaysOverride
      : calculateWorkingDays(vacation.startDay, vacation.endDay, state.selectedMonthKey, monthData);
    elements.vacationWorkingDays.value = vacation.workingDaysOverride !== null ? vacation.workingDaysOverride : '';
    elements.vacationWorkingDays.placeholder = workingDays;

    elements.vacationDocuments.classList.remove('hidden');
    elements.vacationRequest.innerHTML = renderVacationRequest(vacation, state.selectedMonthKey, state.data.config, workingDays);
  } else {
    elements.vacationControls.classList.add('hidden');
    elements.vacationDocuments.classList.add('hidden');
  }
}

// Main render function
function render(focusAfterRender = false) {
  elements.unsupported.style.display = state.fsSupported ? 'none' : 'block';
  elements.insecure.classList.toggle('hidden', state.isSecure);
  elements.reconnectBtn.textContent = state.lastFileName ? `Pripojiť: ${state.lastFileName}` : 'Pripojiť';
  elements.reconnectBtn.disabled = !state.lastFileName;
  elements.openBtn.disabled = false;

  const hasData = state.data !== null;
  elements.dochadzkaView.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
  elements.scView.classList.toggle('hidden', !hasData || state.currentView !== 'sc');
  elements.vacationsView.classList.toggle('hidden', !hasData || state.currentView !== 'vacations');
  elements.tabDochadzka.classList.toggle('active', state.currentView === 'dochadzka');
  elements.tabSC.classList.toggle('active', state.currentView === 'sc');
  elements.tabVacations.classList.toggle('active', state.currentView === 'vacations');

  elements.fileName.textContent = state.lastFileName || '';
  elements.editBtn.disabled = !hasData;
  elements.editBtn.textContent = state.editMode ? 'Hotovo' : 'Upraviť';
  elements.editBtn.classList.toggle('editing', state.editMode);
  elements.signatureBtn.disabled = !hasData;
  elements.printBtn.disabled = !hasData;
  elements.monthNav.classList.toggle('hidden', !hasData);
  elements.summary.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
  elements.table.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
  elements.legend.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
  elements.daySummary.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
  elements.signatureBlock.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');

  if (!hasData) {
    elements.scView.classList.add('hidden');
    return;
  }

  // Update month navigation (shared between views)
  const monthKeys = getSortedMonthKeys(state.data.months);
  if (!state.selectedMonthKey || !state.data.months[state.selectedMonthKey]) {
    state.selectedMonthKey = monthKeys[0];
  }
  const currentIndex = monthKeys.indexOf(state.selectedMonthKey);
  const prevLabel = monthKeys[currentIndex - 1] || '–';
  const nextLabel = monthKeys[currentIndex + 1] || '–';
  elements.prevMonth.textContent = `◀ ${prevLabel}`;
  elements.nextMonth.textContent = `${nextLabel} ▶`;
  elements.prevMonth.disabled = currentIndex <= 0;
  elements.nextMonth.disabled = currentIndex >= monthKeys.length - 1;
  elements.monthLabel.textContent = `[${state.selectedMonthKey}]`;

  // Render SC view if active
  if (state.currentView === 'sc') {
    renderSCView();
    updateHash();
    return;
  }

  // Render Vacations view if active
  if (state.currentView === 'vacations') {
    renderVacationsView();
    updateHash();
    return;
  }

  const currentMonth = state.data.months[state.selectedMonthKey];
  const dayKeys = getDayKeys(state.selectedMonthKey);
  if (state.selectedDayIndex >= dayKeys.length) state.selectedDayIndex = dayKeys.length - 1;

  elements.metaMonth.textContent = state.selectedMonthKey;
  elements.metaEmployer.textContent = state.data.config.employerName;
  elements.metaEmployee.textContent = state.data.config.employeeName;

  const totalHours = calculateTotal(state.selectedMonthKey);
  elements.tableBody.innerHTML = dayKeys.map((dayKey, idx) => {
    const value = currentMonth.days[dayKey];
    const times = getTimesForValue(value);
    const selected = idx === state.selectedDayIndex;
    const weekend = isWeekendDay(state.selectedMonthKey, dayKey);
    const holiday = isHolidayDay(state.selectedMonthKey, dayKey);
    const sunday = isSunday(state.selectedMonthKey, dayKey);
    const dow = getDayOfWeek(state.selectedMonthKey, dayKey);
    const cellClass = state.editMode && selected ? 'hours-cell editable selected' : 'hours-cell editable';
    return `
      <tr class="${weekend ? 'weekend-row' : ''} ${holiday ? 'holiday-row' : ''} ${sunday ? 'sunday-row' : ''}">
        <td>${dayKey}.${state.selectedMonthKey.split('-')[0]} ${dow}</td>
        <td>${times.arrival}</td>
        <td>${times.breakStart}</td>
        <td>${times.breakEnd}</td>
        <td>${times.departure}</td>
        <td class="${cellClass}" tabindex="${state.editMode ? '0' : '-1'}" data-index="${idx}">${times.hours}</td>
      </tr>`;
  }).join('');

  elements.totalValue.textContent = totalHours;

  // Calculate day type counts
  const counts = {};
  dayKeys.forEach((dayKey) => {
    const value = currentMonth.days[dayKey] ?? '0';
    counts[value] = (counts[value] || 0) + 1;
  });

  // Render day summary
  const labels = { '8': 'Práca', 'D': 'Dovolenka', 'SC': 'Služobná cesta', 'PN': 'PN', 'O': 'OČR', 'IN': 'Iná neprítomnosť', 'S': 'Sviatok' };
  const order = ['8', 'SC', 'D', 'PN', 'O', 'IN', 'S'];
  const summaryParts = order
    .filter(key => counts[key])
    .map(key => `${labels[key] || key}: ${counts[key]}`);

  // Add any custom hour values not in order (exclude 0)
  Object.keys(counts).forEach(key => {
    if (!order.includes(key) && key !== '0' && counts[key]) {
      summaryParts.push(`${key}h: ${counts[key]}`);
    }
  });

  elements.daySummary.textContent = summaryParts.join(' | ');

  if (state.data.config.signaturePng) {
    elements.signatureImg.src = state.data.config.signaturePng;
    elements.signatureBlock.classList.remove('hidden');
  } else {
    elements.signatureBlock.classList.add('hidden');
  }

  const highlightSelection = () => {
    elements.tableBody.querySelectorAll('.hours-cell').forEach((cell, idx) => {
      cell.classList.toggle('selected', state.editMode && idx === state.selectedDayIndex);
    });
  };

  highlightSelection();
  if (focusAfterRender) {
    const activeCell = elements.tableBody.querySelector(`.hours-cell[data-index="${state.selectedDayIndex}"]`);
    if (activeCell) activeCell.focus({ preventScroll: false });
  }
  updateHash();
}

// Inject render function into storage module
setRenderFunction(render);

// Test mode for loading from localStorage
function loadTestData() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('test')) return false;
  const stored = localStorage.getItem('testData');
  if (!stored) return false;
  try {
    const data = normalizeData(JSON.parse(stored));
    state.data = data;
    const monthKeys = getSortedMonthKeys(data.months);
    state.selectedMonthKey = monthKeys[0] || null;
    state.selectedDayIndex = 0;
    state.lastFileName = 'test-mode.json';
    render();
    return true;
  } catch (err) {
    console.error('[TEST MODE] Failed to load:', err);
    return false;
  }
}

// Initialize application
function init() {
  elements.createBtn.addEventListener('click', createSampleFile);
  elements.openBtn.addEventListener('click', openFile);
  elements.reconnectBtn.addEventListener('click', reconnectFile);
  elements.editBtn.addEventListener('click', () => { state.editMode = !state.editMode; render(false); });
  elements.signatureBtn.addEventListener('click', uploadSignature);
  elements.printBtn.addEventListener('click', () => window.print());
  elements.newMonthBtn.addEventListener('click', () => { addNewMonth(); });
  elements.prevMonth.addEventListener('click', () => changeMonth(-1));
  elements.nextMonth.addEventListener('click', () => changeMonth(1));
  document.addEventListener('keydown', handleKeydown);

  // View tabs with hash routing
  elements.tabDochadzka.addEventListener('click', () => { state.currentView = 'dochadzka'; updateHash(); render(false); });
  elements.tabSC.addEventListener('click', () => { state.currentView = 'sc'; updateHash(); render(false); });
  elements.tabVacations.addEventListener('click', () => { state.currentView = 'vacations'; updateHash(); render(false); });
  window.addEventListener('hashchange', () => { setStateFromHash(); render(false); });
  setStateFromHash();

  // Trip list click handlers
  elements.tripList.addEventListener('click', (e) => {
    if (!state.data?.months?.[state.selectedMonthKey]) return;
    const trips = state.data.months[state.selectedMonthKey].trips;
    const btn = e.target.closest('button');
    if (btn) {
      const idx = parseInt(btn.dataset.idx, 10);
      if (btn.classList.contains('confirm-trip-btn')) {
        trips[idx].confirmed = true;
        state.selectedTripIndex = trips.filter(t => t.confirmed).length - 1;
        scheduleSave();
        render(false);
      } else if (btn.classList.contains('delete-trip-btn')) {
        if (confirm('Naozaj chcete vymazať túto služobnú cestu?')) {
          trips.splice(idx, 1);
          if (state.selectedTripIndex >= trips.filter(t => t.confirmed).length) {
            state.selectedTripIndex = Math.max(0, trips.filter(t => t.confirmed).length - 1);
          }
          scheduleSave();
          render(false);
        }
      }
      return;
    }
    // Click on trip item itself to select
    const tripItem = e.target.closest('.trip-item');
    if (tripItem && tripItem.classList.contains('trip-confirmed')) {
      const allItems = [...elements.tripList.querySelectorAll('.trip-item')];
      const idx = allItems.indexOf(tripItem);
      const tripId = trips[idx].id;
      const confirmedTrips = trips.filter(t => t.confirmed);
      state.selectedTripIndex = confirmedTrips.findIndex(t => t.id === tripId);
      render(false);
    }
  });

  // Vacation list click handlers
  elements.vacationList.addEventListener('click', (e) => {
    if (!state.data?.months?.[state.selectedMonthKey]) return;
    const vacations = state.data.months[state.selectedMonthKey].vacations;
    const btn = e.target.closest('button');
    if (btn) {
      const idx = parseInt(btn.dataset.idx, 10);
      if (btn.classList.contains('confirm-vacation-btn')) {
        vacations[idx].confirmed = true;
        state.selectedVacationIndex = vacations.filter(v => v.confirmed).length - 1;
        scheduleSave();
        render(false);
      } else if (btn.classList.contains('delete-vacation-btn')) {
        if (confirm('Naozaj chcete vymazať túto dovolenku?')) {
          vacations.splice(idx, 1);
          if (state.selectedVacationIndex >= vacations.filter(v => v.confirmed).length) {
            state.selectedVacationIndex = Math.max(0, vacations.filter(v => v.confirmed).length - 1);
          }
          scheduleSave();
          render(false);
        }
      }
      return;
    }
    // Click on vacation item itself to select
    const vacationItem = e.target.closest('.vacation-item');
    if (vacationItem && vacationItem.classList.contains('vacation-confirmed')) {
      const allItems = [...elements.vacationList.querySelectorAll('.vacation-item')];
      const idx = allItems.indexOf(vacationItem);
      const vacationId = vacations[idx].id;
      const confirmedVacations = vacations.filter(v => v.confirmed);
      state.selectedVacationIndex = confirmedVacations.findIndex(v => v.id === vacationId);
      render(false);
    }
  });

  // Trip controls input handlers
  const updateTrip = () => {
    const monthData = state.data.months[state.selectedMonthKey];
    const trips = monthData.trips;
    const confirmedTrips = trips.filter(t => t.confirmed);
    if (confirmedTrips[state.selectedTripIndex]) {
      const trip = confirmedTrips[state.selectedTripIndex];
      trip.startDay = String(parseInt(elements.tripStartDay.value, 10) || 1).padStart(2, '0');
      trip.endDay = String(parseInt(elements.tripEndDay.value, 10) || 1).padStart(2, '0');
      trip.startTime = elements.tripStartTime.value;
      trip.endTime = elements.tripEndTime.value;
      trip.km = parseInt(elements.tripKm.value, 10) || 0;
      monthData.trips = syncTrips(monthData, state.selectedMonthKey, state.data.scConfig);
      scheduleSave();
      renderSCView();
    }
  };
  elements.tripStartDay.addEventListener('change', updateTrip);
  elements.tripEndDay.addEventListener('change', updateTrip);
  elements.tripStartTime.addEventListener('change', updateTrip);
  elements.tripEndTime.addEventListener('change', updateTrip);
  elements.tripKm.addEventListener('change', updateTrip);

  // Vacation controls input handlers
  const updateVacation = () => {
    const monthData = state.data.months[state.selectedMonthKey];
    const vacations = monthData.vacations;
    const confirmedVacations = vacations.filter(v => v.confirmed);
    if (confirmedVacations[state.selectedVacationIndex]) {
      const vacation = confirmedVacations[state.selectedVacationIndex];
      vacation.startDay = String(parseInt(elements.vacationStartDay.value, 10) || 1).padStart(2, '0');
      vacation.endDay = String(parseInt(elements.vacationEndDay.value, 10) || 1).padStart(2, '0');
      monthData.vacations = syncVacations(monthData, state.selectedMonthKey);
      scheduleSave();
      renderVacationsView();
    }
  };
  elements.vacationStartDay.addEventListener('change', updateVacation);
  elements.vacationEndDay.addEventListener('change', updateVacation);

  // Working days override input handler
  elements.vacationWorkingDays.addEventListener('input', () => {
    const monthData = state.data.months[state.selectedMonthKey];
    const vacations = monthData.vacations;
    const confirmedVacations = vacations.filter(v => v.confirmed);
    if (confirmedVacations[state.selectedVacationIndex]) {
      const vacation = confirmedVacations[state.selectedVacationIndex];
      const value = elements.vacationWorkingDays.value.trim();
      if (value === '') {
        vacation.workingDaysOverride = null; // Use calculated
      } else {
        const num = parseInt(value, 10);
        if (num >= 1) {
          vacation.workingDaysOverride = num;
        }
      }
      scheduleSave();
      render(false);
    }
  });

  // Table cell click/focus handlers (event delegation to avoid memory leak)
  elements.tableBody.addEventListener('click', (e) => {
    const cell = e.target.closest('.hours-cell');
    if (!cell) return;
    const idx = Number(cell.dataset.index);
    state.selectedDayIndex = idx;
    cell.focus();
    elements.tableBody.querySelectorAll('.hours-cell').forEach((c, i) => {
      c.classList.toggle('selected', state.editMode && i === state.selectedDayIndex);
    });
  });
  elements.tableBody.addEventListener('focusin', (e) => {
    const cell = e.target.closest('.hours-cell');
    if (!cell) return;
    const idx = Number(cell.dataset.index);
    state.selectedDayIndex = idx;
    elements.tableBody.querySelectorAll('.hours-cell').forEach((c, i) => {
      c.classList.toggle('selected', state.editMode && i === state.selectedDayIndex);
    });
  });

  if (!state.fsSupported) {
    elements.unsupported.style.display = 'block';
  }
  render(false);

  if (loadTestData()) return;

  (async () => {
    const stored = await loadStoredHandle();
    if (stored) {
      await loadFromHandle(stored);
    }
  })();
}

init();
