// Business trip (Služobná cesta) logic

export function findSCBlocks(monthData) {
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

export function syncTrips(monthData, monthKey, scConfig) {
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

export function getPerDiem(hours, rates) {
  if (hours < 5) return 0;
  if (hours <= 12) return rates.rate5to12;
  if (hours <= 18) return rates.rate12to18;
  return rates.rateOver18;
}
