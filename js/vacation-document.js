// Vacation request document rendering

import { getSlovakHolidays } from './utils.js';

function getFirstWorkingDayAfterVacation(endDay, month, year, holidays) {
  let date = new Date(parseInt(year), parseInt(month) - 1, parseInt(endDay) + 1);

  // Check subsequent days until we find a working day
  while (true) {
    const day = date.getDate();
    const monthNum = date.getMonth() + 1;
    const yearNum = date.getFullYear();
    const dayOfWeek = date.getDay();
    const dateKey = `${String(day).padStart(2, '0')}.${String(monthNum).padStart(2, '0')}.${yearNum}`;

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Check if it's not a holiday
      if (!holidays.includes(dateKey)) {
        return dateKey;
      }
    }

    // Move to next day
    date.setDate(date.getDate() + 1);
  }
}

export function renderVacationRequest(vacation, monthKey, config, workingDays) {
  const [month, year] = monthKey.split('-');

  // Format start and end dates with leading zeros
  const startDate = `${String(vacation.startDay).padStart(2, '0')}.${month}.${year}`;
  const endDate = `${String(vacation.endDay).padStart(2, '0')}.${month}.${year}`;

  // Calculate approval date (1st of the month)
  const approvalDate = `01.${month}.${year}`;

  // Get Slovak holidays for the year
  const holidays = getSlovakHolidays(parseInt(year));
  const holidayDates = Array.from(holidays).map(mmdd => {
    const [month, day] = mmdd.split('-');
    return `${day}.${month}.${year}`;
  });

  // Calculate first working day after vacation
  const firstWorkingDay = getFirstWorkingDayAfterVacation(vacation.endDay, month, year, holidayDates);

  return `
    <div class="vacation-doc">
      <div class="vacation-title-bar">D O V O L E N K A</div>

      <div class="vacation-header">
        <div class="vacation-header-left">
          <div class="vacation-field-inline">
            <span class="vacation-label">Priezvisko a meno, titul</span>
            <div class="vacation-underline">${config.employeeName}</div>
          </div>
          <div class="vacation-field-inline">
            <span class="vacation-label">Útvar</span>
            <div class="vacation-underline">${config.utvar || ''}</div>
          </div>
        </div>
        <div class="vacation-header-right">
          <div class="vacation-field-stacked">
            <span class="vacation-label-small">Osobné číslo</span>
            <div class="vacation-underline-short"></div>
          </div>
          <div class="vacation-field-stacked">
            <span class="vacation-label-small">Číslo útvaru</span>
            <div class="vacation-underline-short"></div>
          </div>
        </div>
      </div>

      <div class="vacation-content">
        <div class="vacation-request-line">
          <span class="vacation-label">Žiada o dovolenku na zotavenie za kalendárny rok</span>
          <div class="vacation-year-underline"></div>
        </div>

        <div class="vacation-request-line">
          <span class="vacation-label">od</span>
          <span class="vacation-value-underline">${startDate}</span>
          <span class="vacation-label">do</span>
          <span class="vacation-value-underline">${endDate}</span>
          <span class="vacation-label">vrátane, t. j.</span>
          <span class="vacation-value-underline">${workingDays}</span>
          <span class="vacation-label">pracovných dní.</span>
        </div>

        <div class="vacation-request-line">
          <span class="vacation-label">Miesto pobytu na dovolenke</span>
          <span class="vacation-dots"></span>
        </div>

        <div class="vacation-signature-top">
          <div class="vacation-sig-date">
            <span>${vacation.requestDate}</span>
            <div class="vacation-sig-line"></div>
            <div class="vacation-sig-label">Dátum</div>
          </div>
          <div class="vacation-sig-employee">
            ${config.signaturePng ? `<img src="${config.signaturePng}" alt="Podpis" class="vacation-sig-img" />` : ''}
            <div class="vacation-sig-line"></div>
            <div class="vacation-sig-label">Podpis zamestnanca</div>
          </div>
        </div>

        <table class="vacation-approval-table">
          <thead>
            <tr>
              <th class="vacation-th-label"></th>
              <th class="vacation-th-datum">Dátum</th>
              <th class="vacation-th-ved">Ved. útvaru</th>
              <th class="vacation-th-pers">Pers. útvar</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="vacation-td-label">Schválil</td>
              <td class="vacation-td-value">${approvalDate}</td>
              <td class="vacation-td-value"></td>
              <td class="vacation-td-value"></td>
            </tr>
            <tr>
              <td class="vacation-td-label">Skutočný nástup dovolenky</td>
              <td class="vacation-td-value">${startDate}</td>
              <td class="vacation-td-value"></td>
              <td class="vacation-td-value"></td>
            </tr>
            <tr>
              <td class="vacation-td-label">Nástup do zamestnania po dovolenke</td>
              <td class="vacation-td-value">${firstWorkingDay}</td>
              <td class="vacation-td-value"></td>
              <td class="vacation-td-value"></td>
            </tr>
            <tr>
              <td colspan="3" class="vacation-td-used">Z tejto dovolenky sa skutočne čerpalo ${workingDays} pracovných dní.</td>
              <td class="vacation-td-value"></td>
            </tr>
            <tr>
              <td colspan="4" class="vacation-td-notes">Poznámky o mzdových nárokoch, neodovzdaných nástrojoch, pracovných pomôckach a i. uveďte na zadnej strane.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}
