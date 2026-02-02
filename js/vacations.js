// Vacation (Dovolenka) logic
import { isWeekendDay, isHolidayDay } from './utils.js';

export function findVacationBlocks(monthData, monthKey) {
  // Step 1: Get all "D" days, EXCLUDING those on weekends/holidays
  // (D marks on weekends/holidays are ignored - they don't count as vacation)
  const validDDays = Object.keys(monthData.days || {})
    .filter(dayKey => {
      if (monthData.days[dayKey] !== 'D') return false;
      // Skip D marks on weekends or holidays - not valid vacation days
      if (isWeekendDay(monthKey, dayKey)) return false;
      if (isHolidayDay(monthKey, dayKey)) return false;
      return true;
    })
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  if (validDDays.length === 0) return [];

  // Step 2: For each consecutive pair of valid D days:
  //   - Check all days between them
  //   - If ANY day is a working day (not weekend, not holiday, not "D") → break block
  //   - Otherwise → extend current block
  const blocks = [];
  let startDay = validDDays[0];
  let endDay = validDDays[0];

  for (let i = 1; i < validDDays.length; i++) {
    const currentDay = parseInt(validDDays[i], 10);
    const previousDay = parseInt(validDDays[i - 1], 10);

    // Check if days are continuous (weekends/holidays don't break continuity)
    let continuous = true;
    for (let d = previousDay + 1; d < currentDay; d++) {
      const dayKey = String(d).padStart(2, '0');
      if (isWeekendDay(monthKey, dayKey)) continue; // OK, doesn't break
      if (isHolidayDay(monthKey, dayKey)) continue; // OK, doesn't break
      if (monthData.days[dayKey] === 'D') continue; // Also a D day, OK
      // If we reach here, it's a working day → breaks continuity
      continuous = false;
      break;
    }

    if (continuous) {
      endDay = validDDays[i];
    } else {
      blocks.push({ startDay, endDay });
      startDay = validDDays[i];
      endDay = validDDays[i];
    }
  }
  blocks.push({ startDay, endDay });
  return blocks;
}

export function syncVacations(monthData, monthKey) {
  const detectedBlocks = findVacationBlocks(monthData, monthKey);
  const existingVacations = monthData.vacations || [];
  const updatedVacations = [...existingVacations];

  // Collect all valid D days (excluding weekends/holidays)
  const dDays = new Set();
  for (const block of detectedBlocks) {
    const start = parseInt(block.startDay, 10);
    const end = parseInt(block.endDay, 10);
    for (let d = start; d <= end; d++) {
      const dayKey = String(d).padStart(2, '0');
      // Only count valid vacation days
      if (monthData.days[dayKey] === 'D' &&
          !isWeekendDay(monthKey, dayKey) &&
          !isHolidayDay(monthKey, dayKey)) {
        dDays.add(d);
      }
    }
  }

  // Find days covered by existing vacations
  const coveredDays = new Set();
  for (const vacation of existingVacations) {
    const start = parseInt(vacation.startDay, 10);
    const end = parseInt(vacation.endDay, 10);
    for (let d = start; d <= end; d++) {
      const dayKey = String(d).padStart(2, '0');
      // Only count days that are valid vacation days
      if (monthData.days[dayKey] === 'D' &&
          !isWeekendDay(monthKey, dayKey) &&
          !isHolidayDay(monthKey, dayKey)) {
        coveredDays.add(d);
      }
    }
  }

  // Find uncovered D days and group into contiguous blocks
  const uncoveredDays = [...dDays].filter(d => !coveredDays.has(d)).sort((a, b) => a - b);
  if (uncoveredDays.length > 0) {
    let blockStart = uncoveredDays[0];
    let blockEnd = uncoveredDays[0];
    for (let i = 1; i <= uncoveredDays.length; i++) {
      // Check continuity considering weekends/holidays
      let continuous = false;
      if (i < uncoveredDays.length) {
        const currentDay = uncoveredDays[i];
        continuous = true;
        for (let d = blockEnd + 1; d < currentDay; d++) {
          const dayKey = String(d).padStart(2, '0');
          if (isWeekendDay(monthKey, dayKey)) continue;
          if (isHolidayDay(monthKey, dayKey)) continue;
          if (monthData.days[dayKey] === 'D') continue;
          continuous = false;
          break;
        }
      }

      if (continuous && i < uncoveredDays.length) {
        blockEnd = uncoveredDays[i];
      } else {
        const startDay = String(blockStart).padStart(2, '0');
        const endDay = String(blockEnd).padStart(2, '0');

        // Get current date for requestDate
        const now = new Date();
        const requestDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

        updatedVacations.push({
          id: `v-${startDay}-${endDay}-${monthKey}`,
          startDay,
          endDay,
          confirmed: false,
          workingDaysOverride: null,
          requestDate
        });
        if (i < uncoveredDays.length) {
          blockStart = uncoveredDays[i];
          blockEnd = uncoveredDays[i];
        }
      }
    }
  }

  return updatedVacations;
}

export function calculateWorkingDays(startDay, endDay, monthKey, monthData) {
  const start = parseInt(startDay, 10);
  const end = parseInt(endDay, 10);
  let count = 0;

  for (let day = start; day <= end; day++) {
    const dayKey = String(day).padStart(2, '0');
    if (isWeekendDay(monthKey, dayKey)) continue;
    if (isHolidayDay(monthKey, dayKey)) continue;
    // Only count days that are actually marked as "D"
    if (monthData.days[dayKey] === 'D') {
      count++;
    }
  }

  return count;
}
