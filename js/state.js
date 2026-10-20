// Application state and default configurations

export const DB_NAME = 'dochadzka-db';
export const DB_STORE = 'handles';
export const HANDLE_KEY = 'last-handle';

export const state = {
  fsSupported: 'showOpenFilePicker' in window && 'showSaveFilePicker' in window,
  isSecure: window.isSecureContext,
  fileHandle: null,
  data: null,
  selectedMonthKey: null,
  selectedDayIndex: 0,
  saveTimeout: null,
  lastFileName: localStorage.getItem('lastFileName') || '',
  editMode: false,
  currentView: 'dochadzka', // 'dochadzka' | 'sc' | 'vacations'
  selectedTripIndex: 0,
  selectedVacationIndex: 0,
};

export const defaultConfig = {
  employeeName: 'Jozef Mrkvička',
  employerName: 'Šéf zemegule s.r.o.',
  defaultTimes: {
    arrival: '08:00',
    breakStart: '11:30',
    breakEnd: '12:00',
    departure: '16:30',
  },
  signaturePng: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
};

export const defaultScConfig = {
  address: 'Adresa 123, 010 01 Mesto',
  origin: 'Domov 1, 010 01 Mesto',
  destination: 'Miesto konania',
  purpose: 'Účel cesty',
  vehicleType: 'firemné vozidlo',
  licensePlate: 'XX-000XX',
  defaultKm: 370,
  defaultStartTime: '04:30',
};

// Per diem rates by first month of validity (YYYY-MM), newest first.
// New rates from 1.12.2026 apply to November 2026 trips too.
export const perDiemRates = [
  { from: '2026-11', rate5to12: 9.80, rate12to18: 14.60, rateOver18: 21.70 },
  { from: '0000-01', rate5to12: 9.30, rate12to18: 13.80, rateOver18: 20.60 },
];
