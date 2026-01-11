# Dochádzka

Jednoduchá webová aplikácia na evidenciu pracovného času zamestnanca. Funguje kompletne v prehliadači, bez potreby servera.

**Demo:** https://mcsdodo.github.io/dochadzka/

## Ako začať

### 1. Vytvorenie nového súboru

1. Otvorte aplikáciu v prehliadači Chrome alebo Edge
2. Kliknite na tlačidlo **Vytvoriť súbor**
3. Vyberte miesto na uloženie súboru `dochadzka.json`
4. Súbor obsahuje vzorové údaje pre aktuálny mesiac

### 2. Úprava konfigurácie

Otvorte súbor `dochadzka.json` v textovom editore a upravte:

```json
{
  "config": {
    "employeeName": "Vaše meno",
    "employerName": "Názov zamestnávateľa",
    "defaultTimes": {
      "arrival": "08:00",
      "breakStart": "11:30",
      "breakEnd": "12:00",
      "departure": "16:30"
    }
  }
}
```

### 3. Opätovné pripojenie súboru

Pri ďalšej návšteve kliknite na tlačidlo **Pripojiť** pre rýchle načítanie posledného súboru.

## Úprava údajov

Aplikácia sa štandardne otvára v režime **prezerania**. Pre úpravu údajov:

1. Kliknite na zelené tlačidlo **Upraviť** (vpravo hore)
2. Teraz môžete klikať na bunky a používať klávesové skratky
3. Po dokončení kliknite na červené tlačidlo **Hotovo**

Zmeny sa automaticky ukladajú do súboru.

## Ovládanie klávesnicou

V režime úprav (po kliknutí na **Upraviť**):

| Klávesa | Hodnota | Význam |
|---------|---------|--------|
| `8` | 8 | Plný pracovný deň |
| `0` | 0 | Voľný deň |
| `D` | D | Dovolenka |
| `P` | PN | Práceneschopnosť |
| `O` | O | OČR (ošetrovanie člena rodiny) |
| `S` | SC | Služobná cesta |
| `I` | IN | Iná neprítomnosť |

Navigácia medzi dňami: **šípky hore/dole**

## Pridanie podpisu

1. Kliknite na tlačidlo **Nahrať podpis**
2. Vyberte obrázok s podpisom (PNG, JPG)
3. Podpis sa uloží do JSON súboru a zobrazí sa pri tlači

## Tlač

1. Kliknite na tlačidlo **Tlačiť**
2. V dialógu tlače vyberte tlačiareň alebo "Uložiť ako PDF"
3. Odporúčané nastavenie: A4, na výšku

## Mesiace

- **Nový mesiac:** Kliknite na **+ Nový mesiac** pre pridanie ďalšieho mesiaca
- **Navigácia:** Použite tlačidlá **◀** a **▶** pre prepínanie medzi mesiacmi

Pri vytvorení nového mesiaca sa automaticky:
- Víkendy označia ako `0`
- Slovenské sviatky označia ako `S` (sviatok)
- Pracovné dni označia ako `8`

## Slovenské sviatky

Aplikácia automaticky rozpoznáva:
- Fixné sviatky (1.1., 6.1., 1.5., 8.5., 5.7., 29.8., 1.9., 1.11., 17.11., 24.-26.12.)
- Pohyblivé sviatky (Veľký piatok, Veľkonočný pondelok)

## Podpora prehliadačov

- **Chrome, Edge, Opera** - plná podpora (automatické ukladanie)
- **Firefox, Safari** - obmedzená podpora (manuálne sťahovanie JSON)

## Licencia

MIT
