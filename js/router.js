// URL hash routing (format: #view/month/tripId)

import { state } from './state.js';

export function parseHash() {
  const hash = window.location.hash.slice(1);
  const parts = hash.split('/');
  let view = 'dochadzka';
  if (parts[0] === 'sluzobne-cesty') view = 'sc';
  else if (parts[0] === 'dovolenky') view = 'vacations';

  return {
    view,
    month: parts[1] || null,
    tripId: view === 'sc' ? (parts[2] || null) : null,
    vacationId: view === 'vacations' ? (parts[2] || null) : null
  };
}

export function buildHash(view, month, tripId, vacationId) {
  let viewPart = 'dochadzka';
  if (view === 'sc') viewPart = 'sluzobne-cesty';
  else if (view === 'vacations') viewPart = 'dovolenky';

  let hash = `#${viewPart}`;
  if (month) hash += `/${month}`;
  if (tripId && view === 'sc') hash += `/${tripId}`;
  if (vacationId && view === 'vacations') hash += `/${vacationId}`;
  return hash;
}

export function setStateFromHash() {
  const { view, month, tripId, vacationId } = parseHash();
  state.currentView = view;
  if (month && state.data?.months?.[month]) {
    state.selectedMonthKey = month;
  }
  if (tripId && view === 'sc' && state.data?.months?.[state.selectedMonthKey]) {
    const trips = state.data.months[state.selectedMonthKey].trips || [];
    const confirmedTrips = trips.filter(t => t.confirmed);
    const idx = confirmedTrips.findIndex(t => t.id === tripId);
    if (idx >= 0) state.selectedTripIndex = idx;
  }
  if (vacationId && view === 'vacations' && state.data?.months?.[state.selectedMonthKey]) {
    const vacations = state.data.months[state.selectedMonthKey].vacations || [];
    const confirmedVacations = vacations.filter(v => v.confirmed);
    const idx = confirmedVacations.findIndex(v => v.id === vacationId);
    if (idx >= 0) state.selectedVacationIndex = idx;
  }
}

export function updateHash() {
  if (!state.data) return;
  const trips = state.data.months?.[state.selectedMonthKey]?.trips || [];
  const confirmedTrips = trips.filter(t => t.confirmed);
  const selectedTrip = confirmedTrips[state.selectedTripIndex];
  const tripId = state.currentView === 'sc' && selectedTrip ? selectedTrip.id : null;

  const vacations = state.data.months?.[state.selectedMonthKey]?.vacations || [];
  const confirmedVacations = vacations.filter(v => v.confirmed);
  const selectedVacation = confirmedVacations[state.selectedVacationIndex];
  const vacationId = state.currentView === 'vacations' && selectedVacation ? selectedVacation.id : null;

  const newHash = buildHash(state.currentView, state.selectedMonthKey, tripId, vacationId);
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}
