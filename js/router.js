// URL hash routing (format: #view/month/tripId)

import { state } from './state.js';

export function parseHash() {
  const hash = window.location.hash.slice(1);
  const parts = hash.split('/');
  return {
    view: parts[0] === 'sluzobne-cesty' ? 'sc' : 'dochadzka',
    month: parts[1] || null,
    tripId: parts[2] || null
  };
}

export function buildHash(view, month, tripId) {
  const viewPart = view === 'sc' ? 'sluzobne-cesty' : 'dochadzka';
  let hash = `#${viewPart}`;
  if (month) hash += `/${month}`;
  if (tripId && view === 'sc') hash += `/${tripId}`;
  return hash;
}

export function setStateFromHash() {
  const { view, month, tripId } = parseHash();
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
}

export function updateHash() {
  if (!state.data) return;
  const trips = state.data.months?.[state.selectedMonthKey]?.trips || [];
  const confirmedTrips = trips.filter(t => t.confirmed);
  const selectedTrip = confirmedTrips[state.selectedTripIndex];
  const tripId = state.currentView === 'sc' && selectedTrip ? selectedTrip.id : null;
  const newHash = buildHash(state.currentView, state.selectedMonthKey, tripId);
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}
