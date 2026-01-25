// Document rendering for Cestovný príkaz and Vyúčtovanie

import { calculateHoursBetween } from './utils.js';
import { getPerDiem } from './trips.js';

export function renderCestovnyPrikaz(trip, monthKey, config, scConfig) {
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

export function renderVyuctovanie(trip, monthKey, config, scConfig) {
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
