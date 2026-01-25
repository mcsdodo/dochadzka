(function () {
  const elements = {
    unsupported: document.getElementById('unsupported'),
    insecure: document.getElementById('insecure'),
    createBtn: document.getElementById('createBtn'),
    openBtn: document.getElementById('openBtn'),
    reconnectBtn: document.getElementById('reconnectBtn'),
    editBtn: document.getElementById('editBtn'),
    signatureBtn: document.getElementById('signatureBtn'),
    printBtn: document.getElementById('printBtn'),
    monthNav: document.getElementById('monthNav'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    newMonthBtn: document.getElementById('newMonthBtn'),
    monthLabel: document.getElementById('monthLabel'),
    summary: document.getElementById('summary'),
    metaMonth: document.getElementById('metaMonth'),
    metaEmployer: document.getElementById('metaEmployer'),
    metaEmployee: document.getElementById('metaEmployee'),
    table: document.getElementById('attendanceTable'),
    tableBody: document.getElementById('tableBody'),
    totalValue: document.getElementById('totalValue'),
    legend: document.getElementById('legend'),
    signatureBlock: document.getElementById('signatureBlock'),
    signatureImg: document.getElementById('signatureImg'),
    fileName: document.getElementById('fileName'),
    // View tabs
    tabDochadzka: document.getElementById('tabDochadzka'),
    tabSC: document.getElementById('tabSC'),
    dochadzkaView: document.getElementById('dochadzkaView'),
    scView: document.getElementById('scView'),
    // SC view elements
    tripNav: document.getElementById('tripNav'),
    prevTrip: document.getElementById('prevTrip'),
    nextTrip: document.getElementById('nextTrip'),
    tripLabel: document.getElementById('tripLabel'),
    tripList: document.getElementById('tripList'),
    tripControls: document.getElementById('tripControls'),
    tripStartDay: document.getElementById('tripStartDay'),
    tripEndDay: document.getElementById('tripEndDay'),
    tripStartTime: document.getElementById('tripStartTime'),
    tripEndTime: document.getElementById('tripEndTime'),
    tripKm: document.getElementById('tripKm'),
    scDocuments: document.getElementById('scDocuments'),
    cestovnyPrikaz: document.getElementById('cestovnyPrikaz'),
    vyuctovanie: document.getElementById('vyuctovanie'),
  };

  const state = {
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

  const DB_NAME = 'dochadzka-db';
  const DB_STORE = 'handles';
  const HANDLE_KEY = 'last-handle';

  const defaultConfig = {
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

  const defaultScConfig = {
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

  function formatMonthKey(year, monthIndex) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    return `${mm}-${year}`;
  }

  function getSortedMonthKeys(months) {
    return Object.keys(months || {}).sort((a, b) => {
      const [am, ay] = a.split('-').map(Number);
      const [bm, by] = b.split('-').map(Number);
      return ay === by ? am - bm : ay - by;
    });
  }

  const holidayCache = new Map();

  function calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveHandle(handle) {
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

  async function loadStoredHandle() {
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

  async function clearStoredHandle() {
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

  function getSlovakHolidays(year) {
    if (holidayCache.has(year)) return holidayCache.get(year);
    const holidays = new Set([
      '01-01', '01-06', '05-01', '05-08', '07-05', '08-29', '09-01', '11-01', '11-17', '12-24', '12-25', '12-26',
    ]);
    const easter = calculateEaster(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    const mmdd = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    holidays.add(mmdd(goodFriday));
    holidays.add(mmdd(easterMonday));
    holidayCache.set(year, holidays);
    return holidays;
  }

  function parseMonthKey(key) {
    if (!key) return null;
    const [m, y] = key.split('-').map(Number);
    if (!m || !y) return null;
    return { year: y, monthIndex: m - 1 };
  }

  function isWeekendDay(monthKey, dayKey) {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return false;
    const day = Number(dayKey);
    if (!Number.isFinite(day)) return false;
    const d = new Date(parsed.year, parsed.monthIndex, day);
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  }

  function isHolidayDay(monthKey, dayKey) {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return false;
    const set = getSlovakHolidays(parsed.year);
    const mmdd = `${String(parsed.monthIndex + 1).padStart(2, '0')}-${String(Number(dayKey)).padStart(2, '0')}`;
    return set.has(mmdd);
  }

  function isSunday(monthKey, dayKey) {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return false;
    const day = Number(dayKey);
    if (!Number.isFinite(day)) return false;
    const d = new Date(parsed.year, parsed.monthIndex, day);
    return d.getDay() === 0;
  }

  function generateMonth(year, monthIndex) {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const holidays = getSlovakHolidays(year);
    const days = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dayKey = String(day).padStart(2, '0');
      const mmdd = `${String(monthIndex + 1).padStart(2, '0')}-${dayKey}`;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend) {
        days[dayKey] = '0';
      } else if (holidays.has(mmdd)) {
        days[dayKey] = 'S';
      } else {
        days[dayKey] = '8';
      }
    }
    return { days };
  }

  function normalizeData(input) {
    const cfg = { ...defaultConfig, ...(input.config || {}) };
    cfg.defaultTimes = { ...defaultConfig.defaultTimes, ...(input.config?.defaultTimes || {}) };
    const scCfg = { ...defaultScConfig, ...(input.scConfig || {}) };
    scCfg.perDiem = { ...defaultScConfig.perDiem, ...(input.scConfig?.perDiem || {}) };
    const months = { ...(input.months || {}) };
    // Ensure each month has trips array
    Object.keys(months).forEach(key => {
      if (!months[key].trips) months[key].trips = [];
    });
    return { ...input, config: cfg, scConfig: scCfg, months };
  }

  // SC Functions
  function findSCBlocks(monthData) {
    const days = monthData.days || {};
    const dayKeys = Object.keys(days)
      .filter(key => days[key] === 'SC')
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (dayKeys.length === 0) return [];
    const blocks = [];
    let startDay = dayKeys[0];
    let endDay = dayKeys[0];
    for (let i = 1; i < dayKeys.length; i++) {
      const currentDay = parseInt(dayKeys[i], 10);
      const previousDay = parseInt(dayKeys[i - 1], 10);
      if (currentDay === previousDay + 1) {
        endDay = dayKeys[i];
      } else {
        blocks.push({ startDay, endDay });
        startDay = dayKeys[i];
        endDay = dayKeys[i];
      }
    }
    blocks.push({ startDay, endDay });
    return blocks;
  }

  function syncTrips(monthData, monthKey, scConfig) {
    const detectedBlocks = findSCBlocks(monthData);
    const existingTrips = monthData.trips || [];
    const updatedTrips = [...existingTrips];

    // Collect all SC days
    const scDays = new Set();
    for (const block of detectedBlocks) {
      const start = parseInt(block.startDay, 10);
      const end = parseInt(block.endDay, 10);
      for (let d = start; d <= end; d++) scDays.add(d);
    }

    // Find days covered by existing trips
    const coveredDays = new Set();
    for (const trip of existingTrips) {
      const start = parseInt(trip.startDay, 10);
      const end = parseInt(trip.endDay, 10);
      for (let d = start; d <= end; d++) coveredDays.add(d);
    }

    // Find uncovered SC days and group into contiguous blocks
    const uncoveredDays = [...scDays].filter(d => !coveredDays.has(d)).sort((a, b) => a - b);
    if (uncoveredDays.length > 0) {
      let blockStart = uncoveredDays[0];
      let blockEnd = uncoveredDays[0];
      for (let i = 1; i <= uncoveredDays.length; i++) {
        if (i < uncoveredDays.length && uncoveredDays[i] === blockEnd + 1) {
          blockEnd = uncoveredDays[i];
        } else {
          const startDay = String(blockStart).padStart(2, '0');
          const endDay = String(blockEnd).padStart(2, '0');
          updatedTrips.push({
            id: `${startDay}-${endDay}-${monthKey}`,
            startDay,
            endDay,
            confirmed: false,
            startTime: scConfig.defaultStartTime,
            endTime: '',
            km: scConfig.defaultKm,
          });
          if (i < uncoveredDays.length) {
            blockStart = uncoveredDays[i];
            blockEnd = uncoveredDays[i];
          }
        }
      }
    }

    return updatedTrips;
  }

  function calculateHoursBetween(startTime, endTime) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    return (endMins - startMins) / 60;
  }

  function getPerDiem(hours, rates) {
    if (hours < 5) return 0;
    if (hours <= 12) return rates.rate5to12;
    if (hours <= 18) return rates.rate12to18;
    return rates.rateOver18;
  }

  function renderCestovnyPrikaz(trip, monthKey, config, scConfig) {
    const [month, year] = monthKey.split('-');
    const originAddr = scConfig.origin;
    const startDateStr = `${originAddr}, ${trip.startDay}.${month}.${year} ${trip.startTime}`;
    const endDateStr = `${originAddr}, ${trip.endDay}.${month}.${year} ${trip.endTime || '??:??'}`;
    const firstDayOfMonth = `01.${month}.${year}`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const lastDayOfMonth = `${lastDay}.${month}.${year}`;
    return `
      <div class="cp-doc">
        <div class="cp-title-bar">CESTOVNÝ PRÍKAZ</div>

        <div class="cp-header">
          <div class="cp-header-left">
            <div class="cp-company">${config.employerName}</div>
            <div class="cp-address">${scConfig.companyAddress || scConfig.address}</div>
          </div>
          <div class="cp-header-right">
            <div class="cp-field"><span class="cp-label">Osobné číslo</span><span class="cp-value"></span></div>
            <div class="cp-field"><span class="cp-label">Útvar</span><span class="cp-value"></span></div>
            <div class="cp-field"><span class="cp-label">Telefón, linka</span><span class="cp-value"></span></div>
          </div>
        </div>

        <div class="cp-section cp-bordered">
          <div class="cp-field-full"><span class="cp-label-num">2. Priezvisko, meno, titul zamestnanca:</span><span class="cp-value-large">${config.employeeName}</span></div>
          <div class="cp-field-inline">
            <span class="cp-label">Normálna pracovná doba</span>
            <span class="cp-label">od</span><span class="cp-value-box">08:00</span>
            <span class="cp-label">do</span><span class="cp-value-box">16:30</span>
          </div>
        </div>

        <div class="cp-section cp-bordered">
          <div class="cp-field-full"><span class="cp-label-num">3. Bydlisko</span><span class="cp-value-large">${scConfig.origin}</span></div>
        </div>

        <table class="cp-journey-table">
          <thead>
            <tr>
              <th>Začiatok cesty<br><small>(miesto, dátum, hodina)</small></th>
              <th>Miesto konania</th>
              <th>Účel a priebeh cesty</th>
              <th>Koniec cesty<br><small>(miesto, dátum, hodina)</small></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${startDateStr}</td>
              <td>${scConfig.destination}</td>
              <td>${scConfig.purpose}</td>
              <td>${endDateStr}</td>
            </tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
          </tbody>
        </table>

        <div class="cp-section">
          <div class="cp-field-full"><span class="cp-label-num">4. Spolucestujúci</span><span class="cp-dots"></span></div>
        </div>

        <div class="cp-section">
          <div class="cp-field-full"><span class="cp-label-num">5. Určený dopravný prostriedok:</span><span class="cp-value-large">${scConfig.vehicleType} ${scConfig.licensePlate}</span></div>
        </div>

        <div class="cp-section">
          <div class="cp-field-full"><span class="cp-label-num">6. Predpokladaná čiastka výdajov v EUR</span><span class="cp-dots"></span></div>
        </div>

        <div class="cp-section">
          <div class="cp-field-full">
            <span class="cp-label-num">7. Povolená záloha v EUR</span><span class="cp-dots-short"></span>
            <span class="cp-label">vyplatená dňa</span><span class="cp-dots-short"></span>
            <span class="cp-label">pokladničný doklad číslo</span><span class="cp-dots-short"></span>
          </div>
          <div class="cp-mid-signatures">
            <div class="cp-sig-block">
              <div class="cp-sig-top"></div>
              <div class="cp-sig-line"></div>
              <div class="cp-sig-label">Podpis pokladníka</div>
            </div>
            <div class="cp-sig-block">
              <div class="cp-sig-top">
                <span class="cp-sig-date">${firstDayOfMonth}</span>
                ${config.signaturePng ? `<img src="${config.signaturePng}" alt="Podpis" class="cp-sig-img" />` : ''}
              </div>
              <div class="cp-sig-line"></div>
              <div class="cp-sig-label">Dátum a podpis pracovníka oprávneného k povoleniu cesty</div>
            </div>
          </div>
        </div>

        <div class="cp-section cp-accounting">
          <div class="cp-accounting-left">
            <div class="cp-label-num">8. VÝDAJOVÝ A PRÍJMOVÝ DOKLAD číslo</div>
            <div class="cp-accounting-body">
              <div class="cp-field-full"><span>Účtovná náhrada bola preskúšaná a upravená v EUR</span><span class="cp-dots"></span></div>
              <div class="cp-field-full"><span>Vyplatená záloha</span><span class="cp-dots-short"></span><span>EUR</span><span class="cp-dots"></span></div>
              <div class="cp-field-full"><span>Doplatok - Preplatok</span><span class="cp-dots-short"></span><span>EUR</span><span class="cp-dots"></span></div>
              <div class="cp-field-full"><span>Slovom</span><span class="cp-dots"></span></div>
            </div>
          </div>
          <div class="cp-accounting-right">
            <div class="cp-accounting-box">
              <div class="cp-accounting-title">Účtovací predpis</div>
              <table class="cp-accounting-table">
                <tr><th>Má dať</th><th>Dal</th><th>Čiastka</th><th>Stredisko</th><th>Zákazka</th></tr>
                <tr><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td></td><td></td><td></td><td></td><td></td></tr>
              </table>
              <div class="cp-accounting-footer">Poznámka o zaúčtovaní</div>
            </div>
          </div>
        </div>

        <div class="cp-footer-signatures">
          <div class="cp-sig-block">
            <div class="cp-sig-top">
              <span class="cp-sig-date">${lastDayOfMonth}</span>
            </div>
            <div class="cp-sig-line"></div>
            <div class="cp-sig-label">Dátum a podpis pracovníka,<br>ktorý upravil vyúčtovanie</div>
          </div>
          <div class="cp-sig-block">
            <div class="cp-sig-top"></div>
            <div class="cp-sig-line"></div>
            <div class="cp-sig-label">Dátum a podpis pokladníka</div>
          </div>
          <div class="cp-sig-block">
            <div class="cp-sig-top"></div>
            <div class="cp-sig-line"></div>
            <div class="cp-sig-label">Dátum a podpis príjemcu<br>(preukaz totožnosti)</div>
          </div>
          <div class="cp-sig-block">
            <div class="cp-sig-top">
              <span class="cp-sig-date">${lastDayOfMonth}</span>
              ${config.signaturePng ? `<img src="${config.signaturePng}" alt="Podpis" class="cp-sig-img" />` : ''}
            </div>
            <div class="cp-sig-line"></div>
            <div class="cp-sig-label">Schválil<br>(dátum a podpis)</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderVyuctovanie(trip, monthKey, config, scConfig) {
    const [month, year] = monthKey.split('-');
    const startDay = parseInt(trip.startDay, 10);
    const endDay = parseInt(trip.endDay, 10);
    const isSingleDay = startDay === endDay;
    const rates = scConfig.perDiem;
    const homeAddr = scConfig.origin;
    const destAddr = scConfig.destination;
    let tableRows = '';
    let totalKm = 0;
    let totalPerDiem = 0;

    for (let d = startDay; d <= endDay; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${dayStr}.${month}.${year}`;
      let aus = '', km = '', timeFrom = '00:00', timeTo = '23:59';
      let odchodPlace = destAddr, prichodPlace = destAddr;

      if (isSingleDay) {
        aus = 'AUS'; km = trip.km;
        timeFrom = trip.startTime; timeTo = trip.endTime || '23:59';
        odchodPlace = homeAddr; prichodPlace = homeAddr;
      } else if (d === startDay) {
        aus = 'AUS'; km = trip.km;
        timeFrom = trip.startTime; timeTo = '23:59';
        odchodPlace = homeAddr; prichodPlace = destAddr;
      } else if (d === endDay) {
        aus = 'AUS'; km = trip.km;
        timeFrom = '00:00'; timeTo = trip.endTime || '23:59';
        odchodPlace = destAddr; prichodPlace = homeAddr;
      }

      const hours = calculateHoursBetween(timeFrom, timeTo);
      const perDiem = getPerDiem(hours, rates);
      if (km !== '') totalKm += parseInt(km) || 0;
      totalPerDiem += perDiem;

      tableRows += `
        <tr class="vu-day-row">
          <td rowspan="2" class="vu-date">${dateStr}</td>
          <td class="vu-label">Odchod</td>
          <td class="vu-place">${odchodPlace}</td>
          <td>${aus}</td>
          <td>${km}</td>
          <td class="vu-time">${timeFrom}</td>
          <td></td>
          <td rowspan="2">${perDiem.toFixed(2)}</td>
          <td rowspan="2"></td>
          <td rowspan="2"></td>
          <td rowspan="2"></td>
          <td rowspan="2">${perDiem.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="vu-label">Príchod</td>
          <td class="vu-place">${prichodPlace}</td>
          <td></td>
          <td></td>
          <td class="vu-time">${timeTo}</td>
          <td></td>
        </tr>`;
    }

    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const lastDayOfMonth = `${lastDay}.${month}.${year}`;

    return `
      <div class="vu-doc">
        <div class="vu-title-bar">VYÚČTOVANIE PRACOVNEJ CESTY</div>

        <table class="vu-table">
          <thead>
            <tr class="vu-header-row">
              <th rowspan="3">Dátum</th>
              <th colspan="2" rowspan="2">Odchod - Príchod<br>Miesto rokovania<br><small>podčiarknite</small></th>
              <th rowspan="2">Použitý dopr.<br>prostriedok<br><sup>1)</sup></th>
              <th rowspan="2">Vzdialenosť<br>v km<br><sup>2)</sup></th>
              <th rowspan="2">Začiatok<br>a koniec<br>pracovného<br>výkonu<br>(hodina)</th>
              <th rowspan="2">Cestovné<br>výdavky<br>a miestna<br>preprava</th>
              <th>Stravné</th>
              <th>Ubytovanie</th>
              <th>Potrebné<br>vedľajšie<br>výdavky</th>
              <th>Iné<br>a vyššie<br>náhrady</th>
              <th>Celkom</th>
            </tr>
            <tr class="vu-header-row">
              <th>EUR</th>
              <th>EUR</th>
              <th>EUR</th>
              <th>EUR</th>
              <th>EUR</th>
            </tr>
            <tr class="vu-header-nums">
              <th>1</th>
              <th>2</th>
              <th>3</th>
              <th>4</th>
              <th>5</th>
              <th>6</th>
              <th>7</th>
              <th>8</th>
              <th>9</th>
              <th>10</th>
              <th>11</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        <div class="vu-footer-section">
          <div class="vu-footer-left">
            <div class="vu-meals">Bolo poskytnuté bezplatné stravovanie: <s>áno</s> - nie</div>
            <div class="vu-legend">
              <div><sup>1)</sup> Uvádzajte v skratke</div>
              <div class="vu-legend-cols">
                <div class="vu-legend-col">
                  <div>O - Osobný vlak</div>
                  <div>R - Rýchlik</div>
                  <div>A - Autobus</div>
                  <div>L - Lietadlo</div>
                </div>
                <div class="vu-legend-col">
                  <div>AUS - auto služobné</div>
                  <div>AUV - auto vlastné</div>
                  <div>MOS - motocykel služobný</div>
                  <div>MOV - motocykel vlastný</div>
                </div>
              </div>
              <div><sup>2)</sup> Počet km uvádzajte len pri použití iného ako verejného hromadného dopravného prostriedku</div>
            </div>
          </div>
          <div class="vu-footer-right">
            <table class="vu-totals-table">
              <tr><td>Celkom</td><td class="vu-amount">${totalPerDiem.toFixed(2)}</td></tr>
              <tr><td>Záloha</td><td class="vu-amount"></td></tr>
              <tr><td>Doplatok - Preplatok</td><td class="vu-amount">${totalPerDiem.toFixed(2)}</td></tr>
            </table>
          </div>
        </div>

        <div class="vu-declaration">
          Vyhlasujem, že všetky údaje som uviedol úplne a správne.
        </div>

        <div class="vu-sig-row">
          <div class="vu-sig-block">
            <div class="vu-sig-top">
              <span class="vu-sig-date">${lastDayOfMonth}</span>
              ${config.signaturePng ? `<img src="${config.signaturePng}" alt="Podpis" class="vu-sig-img" />` : ''}
            </div>
            <div class="vu-sig-line"></div>
            <div class="vu-sig-label">Dátum a podpis zamestnanca</div>
          </div>
        </div>
      </div>
    `;
  }

  function createSampleData() {
    const now = new Date();
    const monthKey = formatMonthKey(now.getFullYear(), now.getMonth());
    const months = {};
    months[monthKey] = generateMonth(now.getFullYear(), now.getMonth());
    const firstDays = Object.keys(months[monthKey].days).slice(0, 3);
    if (firstDays[0]) months[monthKey].days[firstDays[0]] = '0';
    if (firstDays[1]) months[monthKey].days[firstDays[1]] = 'D';
    if (firstDays[2]) months[monthKey].days[firstDays[2]] = '8';
    return { config: { ...defaultConfig }, months };
  }

  async function verifyPermission(fileHandle, withWrite) {
    if (!fileHandle) return false;
    const opts = withWrite ? { mode: 'readwrite' } : {};
    if ((await fileHandle.queryPermission(opts)) === 'granted') return true;
    if ((await fileHandle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  function downloadData(filename = 'dochadzka.json') {
    if (!state.data) return;
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  async function loadFromHandle(handle) {
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
      render();
      return true;
    } catch (err) {
      console.error('Nepodarilo sa načítať súbor', err);
      return false;
    }
  }

  async function createSampleFile() {
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
      render();
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err);
    }
  }

  async function openFile() {
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
          render();
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

  async function reconnectFile() {
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

  function getDayKeys(monthKey) {
    const month = state.data?.months?.[monthKey];
    if (!month) return [];
    return Object.keys(month.days).sort();
  }

  function setSelectedDay(index) {
    const dayKeys = getDayKeys(state.selectedMonthKey);
    if (!dayKeys.length) return;
    const bounded = ((index % dayKeys.length) + dayKeys.length) % dayKeys.length;
    state.selectedDayIndex = bounded;
    render(true);
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

  function getTimesForValue(value) {
    const defaults = state.data?.config?.defaultTimes || defaultConfig.defaultTimes;
    if (value === '8') return { arrival: defaults.arrival, breakStart: defaults.breakStart, breakEnd: defaults.breakEnd, departure: defaults.departure, hours: '8' };
    if (value === '0') return { arrival: '-', breakStart: '-', breakEnd: '-', departure: '-', hours: '0' };
    if (value === 'SC') return { arrival: '-', breakStart: '-', breakEnd: '-', departure: '-', hours: 'SC' };
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

  function scheduleSave() {
    if (!state.fileHandle) return;
    clearTimeout(state.saveTimeout);
    state.saveTimeout = setTimeout(saveFile, 100);
  }

  async function saveFile() {
    if (!state.fileHandle) return;
    try {
      if (!(await verifyPermission(state.fileHandle, true))) return;
      const writable = await state.fileHandle.createWritable();
      await writable.write(JSON.stringify(state.data, null, 2));
      await writable.close();
    } catch (err) {
      console.error('save error', err);
    }
  }

  function addNewMonth() {
    const keys = getSortedMonthKeys(state.data.months);
    let year;
    let monthIndex;
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

  function renderSCView() {
    const monthData = state.data.months[state.selectedMonthKey];
    // Sync trips with detected SC blocks
    const updatedTrips = syncTrips(monthData, state.selectedMonthKey, state.data.scConfig);
    if (JSON.stringify(updatedTrips) !== JSON.stringify(monthData.trips)) {
      monthData.trips = updatedTrips;
      scheduleSave();
    }
    const trips = monthData.trips || [];
    const confirmedTrips = trips.filter(t => t.confirmed);

    // Trip list
    if (trips.length === 0) {
      elements.tripList.innerHTML = '<div class="meta">Žiadne služobné cesty v tomto mesiaci.</div>';
    } else {
      elements.tripList.innerHTML = trips.map((trip, idx) => {
        const startD = parseInt(trip.startDay, 10);
        const endD = parseInt(trip.endDay, 10);
        const days = endD - startD + 1;
        const [month, year] = state.selectedMonthKey.split('-');
        const dateRange = `${trip.startDay}.${month} - ${trip.endDay}.${month}.${year}`;
        const statusClass = trip.confirmed ? 'trip-confirmed' : 'trip-unconfirmed';
        const statusText = trip.confirmed ? '✓ potvrdené' : '';
        const confirmBtn = trip.confirmed ? '' : `<button data-idx="${idx}" class="confirm-trip-btn">Potvrdiť</button>`;
        const selectBtn = trip.confirmed ? `<button data-idx="${idx}" class="select-trip-btn ghost">Zobraziť</button>` : '';
        const deleteBtn = `<button data-idx="${idx}" class="delete-trip-btn danger">Vymazať</button>`;
        return `<div class="trip-item ${statusClass}"><span>${dateRange} (${days} ${days === 1 ? 'deň' : 'dní'}) ${statusText}</span><span>${confirmBtn}${selectBtn} ${deleteBtn}</span></div>`;
      }).join('');
    }

    // Trip navigation and controls
    if (confirmedTrips.length > 0) {
      if (state.selectedTripIndex >= confirmedTrips.length) state.selectedTripIndex = 0;
      const trip = confirmedTrips[state.selectedTripIndex];
      elements.tripNav.classList.remove('hidden');
      elements.tripLabel.textContent = `[${trip.id}]`;
      elements.prevTrip.disabled = state.selectedTripIndex <= 0;
      elements.nextTrip.disabled = state.selectedTripIndex >= confirmedTrips.length - 1;

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
      elements.tripNav.classList.add('hidden');
      elements.tripControls.classList.add('hidden');
      elements.scDocuments.classList.add('hidden');
    }
  }

  function render(focusAfterRender = false) {
    elements.unsupported.style.display = state.fsSupported ? 'none' : 'block';
    elements.insecure.classList.toggle('hidden', state.isSecure);
    elements.reconnectBtn.textContent = state.lastFileName ? `Pripojiť: ${state.lastFileName}` : 'Pripojiť';
    elements.reconnectBtn.disabled = !state.lastFileName;
    elements.openBtn.disabled = false;
    elements.createBtn.disabled = false;
    elements.fileName.textContent = state.lastFileName ? `Súbor: ${state.lastFileName}` : '';

    const hasData = Boolean(state.data && state.selectedMonthKey);

    // View tabs
    elements.tabDochadzka.classList.toggle('active', state.currentView === 'dochadzka');
    elements.tabSC.classList.toggle('active', state.currentView === 'sc');
    elements.dochadzkaView.classList.toggle('hidden', state.currentView !== 'dochadzka');
    elements.scView.classList.toggle('hidden', state.currentView !== 'sc');

    // Edit button only for dochadzka view
    elements.editBtn.disabled = !hasData || state.currentView !== 'dochadzka';
    elements.editBtn.textContent = state.editMode ? 'Hotovo' : 'Upraviť';
    elements.editBtn.classList.toggle('editing', state.editMode);
    elements.signatureBtn.disabled = !hasData;
    elements.printBtn.disabled = !hasData;
    elements.monthNav.classList.toggle('hidden', !hasData);
    elements.summary.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
    elements.table.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
    elements.legend.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
    elements.signatureBlock.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');

    if (!hasData) {
      elements.scView.classList.add('hidden');
      return;
    }

    // Render SC view if active
    if (state.currentView === 'sc') {
      renderSCView();
      return;
    }

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

    const currentMonth = state.data.months[state.selectedMonthKey];
    const dayKeys = getDayKeys(state.selectedMonthKey);
    if (state.selectedDayIndex >= dayKeys.length) state.selectedDayIndex = dayKeys.length - 1;

    elements.metaMonth.textContent = state.selectedMonthKey;
    elements.metaEmployer.textContent = state.data.config?.employerName || '';
    elements.metaEmployee.textContent = state.data.config?.employeeName || '';

    const rows = dayKeys.map((dayKey, idx) => {
      const value = currentMonth.days[dayKey];
      const times = getTimesForValue(value);
      const selected = idx === state.selectedDayIndex;
      const weekend = isWeekendDay(state.selectedMonthKey, dayKey);
      const holiday = isHolidayDay(state.selectedMonthKey, dayKey);
      const sunday = isSunday(state.selectedMonthKey, dayKey);
      const rowClass = [weekend ? 'weekend-row' : '', holiday ? 'holiday-row' : '', sunday ? 'week-end' : ''].filter(Boolean).join(' ');
      return `
        <tr data-day="${dayKey}" data-index="${idx}" class="${rowClass}">
          <td>${dayKey}</td>
          <td>${times.arrival}</td>
          <td>${times.breakStart}</td>
          <td>${times.breakEnd}</td>
          <td>${times.departure}</td>
          <td class="hours-cell" ${state.editMode ? 'tabindex="0"' : ''} data-index="${idx}" ${selected && state.editMode ? 'aria-current="true"' : ''}>${times.hours}</td>
        </tr>
      `;
    }).join('');
    elements.tableBody.innerHTML = rows;

    const total = calculateTotal(state.selectedMonthKey);
    elements.totalValue.textContent = total;

    if (state.data.config?.signaturePng) {
      elements.signatureImg.src = state.data.config.signaturePng;
    } else {
      elements.signatureImg.removeAttribute('src');
    }

    const highlightSelection = () => {
      elements.tableBody.querySelectorAll('.hours-cell').forEach((cell) => {
        const idx = Number(cell.dataset.index);
        cell.classList.toggle('selected', state.editMode && idx === state.selectedDayIndex);
      });
    };

    elements.tableBody.querySelectorAll('.hours-cell').forEach((cell) => {
      const idx = Number(cell.dataset.index);
      cell.addEventListener('focus', () => {
        state.selectedDayIndex = idx;
        highlightSelection();
      });
      cell.addEventListener('click', () => {
        state.selectedDayIndex = idx;
        cell.focus();
        highlightSelection();
      });
    });

    highlightSelection();
    if (focusAfterRender) {
      const activeCell = elements.tableBody.querySelector(`.hours-cell[data-index="${state.selectedDayIndex}"]`);
      if (activeCell) activeCell.focus({ preventScroll: false });
    }
  }

  function loadTestData() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('test')) return false;
    const stored = localStorage.getItem('testData');
    if (!stored) return false;
    try {
      const data = normalizeData(JSON.parse(stored));
      state.data = data;
      state.fileHandle = null;
      const monthKeys = getSortedMonthKeys(data.months);
      state.selectedMonthKey = monthKeys[0] || null;
      state.selectedDayIndex = 0;
      state.lastFileName = 'test-mode.json';
      render(false);
      console.log('[TEST MODE] Loaded data from localStorage');
      return true;
    } catch (err) {
      console.error('[TEST MODE] Failed to load:', err);
      return false;
    }
  }

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
    function setViewFromHash() {
      const hash = window.location.hash;
      if (hash === '#sluzobne-cesty') {
        state.currentView = 'sc';
      } else {
        state.currentView = 'dochadzka';
      }
    }
    function navigateToView(view) {
      const hash = view === 'sc' ? '#sluzobne-cesty' : '#dochadzka';
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      } else {
        state.currentView = view;
        render(false);
      }
    }
    elements.tabDochadzka.addEventListener('click', () => navigateToView('dochadzka'));
    elements.tabSC.addEventListener('click', () => navigateToView('sc'));
    window.addEventListener('hashchange', () => { setViewFromHash(); render(false); });
    setViewFromHash(); // Set initial view from hash

    // Trip navigation
    elements.prevTrip.addEventListener('click', () => { state.selectedTripIndex--; render(false); });
    elements.nextTrip.addEventListener('click', () => { state.selectedTripIndex++; render(false); });

    // Trip list click handlers (confirm/select)
    elements.tripList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      const trips = state.data.months[state.selectedMonthKey].trips;
      if (btn.classList.contains('confirm-trip-btn')) {
        trips[idx].confirmed = true;
        state.selectedTripIndex = trips.filter(t => t.confirmed).length - 1;
        scheduleSave();
        render(false);
      } else if (btn.classList.contains('select-trip-btn')) {
        const confirmedTrips = trips.filter(t => t.confirmed);
        const tripId = trips[idx].id;
        state.selectedTripIndex = confirmedTrips.findIndex(t => t.id === tripId);
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
    });

    // Trip time/km input handlers
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
        // Sync trips to create new ones for uncovered SC days
        monthData.trips = syncTrips(monthData, state.selectedMonthKey, state.data.scConfig);
        scheduleSave();
        renderSC();
      }
    };
    elements.tripStartDay.addEventListener('change', updateTrip);
    elements.tripEndDay.addEventListener('change', updateTrip);
    elements.tripStartTime.addEventListener('change', updateTrip);
    elements.tripEndTime.addEventListener('change', updateTrip);
    elements.tripKm.addEventListener('change', updateTrip);

    if (!state.fsSupported) {
      elements.unsupported.style.display = 'block';
    }
    render(false);

    // Test mode: load from localStorage if ?test in URL
    if (loadTestData()) return;

    (async () => {
      const stored = await loadStoredHandle();
      if (stored) {
        const ok = await loadFromHandle(stored);
        if (!ok) await clearStoredHandle();
      }
    })();
  }

  init();
})();
