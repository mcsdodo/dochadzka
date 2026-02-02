// Utility functions for date handling, formatting, and holidays

const holidayCache = new Map();

export function formatMonthKey(year, monthIndex) {
  const mm = String(monthIndex + 1).padStart(2, '0');
  return `${mm}-${year}`;
}

export function getSortedMonthKeys(months) {
  return Object.keys(months || {}).sort((a, b) => {
    const [am, ay] = a.split('-').map(Number);
    const [bm, by] = b.split('-').map(Number);
    // Sort in reverse chronological order (most recent first)
    return ay === by ? bm - am : by - ay;
  });
}

export function parseMonthKey(key) {
  if (!key) return null;
  const [m, y] = key.split('-').map(Number);
  if (!m || !y) return null;
  return { year: y, monthIndex: m - 1 };
}

export function calculateEaster(year) {
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

export function getSlovakHolidays(year) {
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

export function isWeekendDay(monthKey, dayKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return false;
  const day = Number(dayKey);
  if (!Number.isFinite(day)) return false;
  const d = new Date(parsed.year, parsed.monthIndex, day);
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function isHolidayDay(monthKey, dayKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return false;
  const set = getSlovakHolidays(parsed.year);
  const mmdd = `${String(parsed.monthIndex + 1).padStart(2, '0')}-${String(Number(dayKey)).padStart(2, '0')}`;
  return set.has(mmdd);
}

export function isSunday(monthKey, dayKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return false;
  const day = Number(dayKey);
  if (!Number.isFinite(day)) return false;
  const d = new Date(parsed.year, parsed.monthIndex, day);
  return d.getDay() === 0;
}

export function generateMonth(year, monthIndex) {
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

export function calculateHoursBetween(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  return (endMins - startMins) / 60;
}

export function getDayOfWeek(monthKey, dayKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return '';
  const day = Number(dayKey);
  const date = new Date(parsed.year, parsed.monthIndex, day);
  return ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][date.getDay()];
}
