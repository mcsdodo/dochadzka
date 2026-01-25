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
  currentView: 'dochadzka', // 'dochadzka' | 'sc'
  selectedTripIndex: 0,
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
  perDiem: {
    rate5to12: 9.30,
    rate12to18: 13.90,
    rateOver18: 20.60,
  },
};
