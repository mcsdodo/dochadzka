// Vacation request document rendering

export function renderVacationRequest(vacation, monthKey, config, workingDays) {
  const [month, year] = monthKey.split('-');

  // Format start and end dates
  const startDate = `${vacation.startDay}.${month}.${year}`;
  const endDate = `${vacation.endDay}.${month}.${year}`;

  return `
    <div class="vacation-doc">
      <div class="vacation-title-bar">DOVOLENKA</div>

      <div class="vacation-content">
        <div class="vacation-field">
          <span class="vacation-label">Priezvisko a meno, titul:</span>
          <span class="vacation-value">${config.employeeName}</span>
        </div>

        <div class="vacation-request-text">
          žiada o dovolenku na zotavenie za<br>
          kalendárny rok ${year}
        </div>

        <div class="vacation-field">
          <span class="vacation-label">od</span>
          <span class="vacation-value">${startDate}</span>
          <span class="vacation-label">do</span>
          <span class="vacation-value">${endDate}</span>
          <span class="vacation-label">vrátane,</span>
        </div>

        <div class="vacation-field">
          <span class="vacation-label">t. j.</span>
          <span class="vacation-value">${workingDays}</span>
          <span class="vacation-label">pracovných dní.</span>
        </div>

        <div class="vacation-signature">
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
      </div>
    </div>
  `;
}
