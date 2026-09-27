# ⏱️ TicTocWork - Contor Ore Muncă

**TicTocWork** este o aplicație modernă, completă și intuitivă pentru pontajul orelor de muncă, calculul salariului și analiza detaliată a activității. Construită pe un stack hibrid performant (React 19 + Vite + Capacitor 8), aplicația rulează atât în browser (Web), cât și nativ pe dispozitive mobile (**Android** și **iOS**).

---

## ✨ Funcționalități Principale

- 🕒 **Pontaj Rapid & Sesiuni de Lucru:**
  - **Buton Master START / STOP MUNCĂ** integrat ergonomic direct în centrul barei de navigare (Floating Dock), mereu la îndemână din orice pagină a aplicației.
  - Trecere dinamică între starea inactivă (START MUNCĂ - relief verde tactil) și starea activă (STOP MUNCĂ - alertă roșie pulsantă și modal de confirmare).
  - Ture rapide 1-Click cu presetări pentru fabrică (Schimbul 1: 06:30–16:30, Schimbul 2: 16:30–flexibil, Schimbul 1 scurt: 06:30–15:00).
  - Temporizator în timp real pentru sesiunea activă.
  - Reguli de rotunjire inteligentă a orelor (la 30 minute sau 1 oră).
  - Gestionare automată a turelor care trec de miezul nopții.

- 🚫 **Renunțarea la Geofencing (Autonomie & Confidențialitate):**
  - S-a renunțat complet la monitorizarea automată prin Geofencing / GPS în favoarea autonomiei bateriei și a protecției absolute a confidențialității utilizatorului.
  - Înlocuit cu sistemul ultra-rapid de **1-Click Pontaj Rapid & Schimburi Fabrică** și butonul Master central din navbar.
  - Zero permisiuni intruzive de localizare de fundal și zero consum suplimentar de baterie.

- 💰 **Calculator de Salariu:**
  - **Mod Simplu:** Tarif orar standard × Total ore lucrate.
  - **Mod Detaliat:** Defalcare automată pe ore normale, ore de noapte (+spor de noapte), ore suplimentare și calcul valoare tichete de masă.

- 📅 **Istoric și Calendar Activitate:**
  - Vizualizare sesiuni grupate pe zile și calendar lunar.
  - Adăugare, editare sau ștergere manuală a sesiunilor de lucru.
  - Integrare automată a sărbătorilor legale din România.

- 📊 **Statistici & Grafice Interactive:**
  - Grafice săptămânale și lunare pentru evidențierea orelor lucrate (normale vs. suplimentare, zi vs. noapte) generate cu **Recharts**.
  - Carduri sumare de productivitate (total ore, medii, venit estimat).

- 🔔 **Notificări Locale & Push:**
  - Notificări locale la sosire/plecare și mesaje de reamintire pontaj.

- 🌓 **Interfață Neo-Skeuomorphic & Dark Mode:**
  - Design premium Neumorphic / Neo-Skeuomorphic tactil, cu relief 3D, umbre duble contrastante și indicatori LED de stare.
  - Bară de navigare plutitoare (Floating Dock) ergonomică, cu acces rapid la: Acasă, Istoric, butonul central START/STOP MUNCĂ, Calcul și Setări.
  - Optimizat complet pentru ecrane tactile de orice dimensiune (iOS și Android).
  - Suport complet pentru temă luminoasă (Light) și întunecată (Dark).

- 💾 **Persistență Locală a Datelor:**
  - Salvare securizată pe dispozitiv folosind `@capacitor/preferences` (funcționează complet offline).

---

## 🛠️ Tehnologii Utilizate

| Tehnologie | Rol |
|---|---|
| **React 19** | Bibliotecă UI modernă pentru interfață reactivă |
| **TypeScript** | Securitate tipizată și arhitectură robustă de cod |
| **Vite 7** | Build tool ultra-rapid pentru dezvoltare și bundling |
| **Tailwind CSS 4** | Sistem modern de stilizare și design responsive |
| **Capacitor 8** | Runtime cross-platform pentru rulare nativă pe Android & iOS |
| **Tesseract.js** | Scanare și recunoaștere automată (OCR) a fluturașilor de salariu |
| **Recharts** | Generare diagrame și grafice statistice |
| **Lucide React** | Set complet de pictograme vectoriale |
| **date-fns** | Parsare, manipulare și formatare date calendaristice |

---

## 📁 Structura Proiectului

```text
calcualator-ore-1/
├── android/                   # Proiectul nativ Android (Android Studio / Gradle)
├── ios/                       # Proiectul nativ iOS (Xcode / CocoaPods)
├── dist/                      # Fișierele compilate gata pentru producție
├── src/
│   ├── components/            # Componente React (Pagini, Carduri, Modale)
│   │   ├── CalculatorPage.tsx # Calculator salariu (simplu, detaliat & scanner OCR)
│   │   ├── HistoryPage.tsx    # Istoric pontaj și calendar
│   │   ├── SettingsPage.tsx   # Setări profil, parametri financiari și temă
│   │   ├── Shift2Modal.tsx    # Modal selecție oră Schimbul 2 (noapte)
│   │   ├── MonthlyReportModal.tsx # Export și raport lunar detaliat
│   │   ├── ChartCard.tsx      # Grafic săptămânal ore lucrate
│   │   ├── DayNightChart.tsx  # Distribuție ore zi / noapte
│   │   └── ...
│   ├── services/              # Servicii (notificări locale, alerte schimb)
│   ├── utils/                 # Algoritmi rotunjire timp, sărbători legale RO, export rapoarte
│   ├── App.tsx                # Containerul principal și bara de navigare cu butonul START/STOP
│   ├── main.tsx               # Punctul de intrare React
│   └── types.ts               # Definiții de tipuri TypeScript
├── capacitor.config.ts        # Configurația Capacitor (App ID, nume, webDir)
├── build-apk.sh               # Script automat de build APK Android
├── create-ipa.sh              # Script pregătire / build iOS
└── package.json               # Dependențe și comenzi npm
```

---

## 🚀 Ghid de Instalare și Rulare

### Cerințe Preliminare
- **Node.js**: v18+ (recomandat v20 sau mai nou)
- **npm**: v9+
- Pentru Android: **Android Studio** & Android SDK configurat
- Pentru iOS: Mac cu **Xcode** și CocoaPods instalate (`brew install cocoapods` / `sudo gem install cocoapods`)

---

### 1. Clonare și Instalare Dependențe

```bash
git clone <url-proiect>
cd calcualator-ore-1

# Instalare pachete
npm install
```

---

### 2. Dezvoltare Web (Local)

Pornirea serverului local Vite cu Hot-Module-Replacement (HMR):

```bash
npm run dev
```

Aplicația va fi accesibilă în browser la: [http://localhost:5173/](http://localhost:5173/)

---

### 3. Build pentru Producție

Pentru a compila aplicația web în directorul `dist/`:

```bash
npm run build
```

---

## 📱 Compilare și Rulare pe Dispozitive Mobile

După fiecare modificare adusă codului din `src/` și rularea comenzii `npm run build`, trebuie sincronizate fișierele web cu componentele native:

```bash
npx cap sync
```

### 🤖 Android

#### Opțiunea 1: Generare directă APK Debug
Poți folosi scriptul integrat:
```bash
chmod +x build-apk.sh
./build-apk.sh
```
Fisierul APK generat va fi disponibil la:
`android/app/build/outputs/apk/debug/app-debug.apk`

#### Opțiunea 2: Deschidere în Android Studio
```bash
npx cap open android
```
Din Android Studio poți rula aplicația direct pe un emulator sau pe un telefon fizic conectat prin USB (cu depanare USB activată).

---

### 🍎 iOS

#### Opțiunea 1: Deschidere în Xcode
```bash
npx cap open ios
```
1. Conectează iPhone-ul la Mac.
2. În Xcode, la secțiunea **Signing & Capabilities**, selectează contul tău Apple ID gratuit (**Personal Team**).
3. Selectează iPhone-ul tău din bara de sus și apasă **Run (⌘ + R)**.
4. Pe iPhone (doar la prima instalare): Mergi la *Settings → General → VPN & Device Management* și acordă încredere profilului de dezvoltator.

*(Pentru ghidul complet și detaliat privind instalarea pe iOS fără cont de dezvoltator plătit, consultați fișierul `INSTRUCȚIUNI_iOS.md`)*.

---

## 🧰 Comenzi Utile

| Comandă | Descriere |
|---|---|
| `npm run dev` | Pornește serverul Vite de dezvoltare |
| `npm run build` | Compilează aplicația web pentru producție (`dist/`) |
| `npm run preview` | Previzualizează local build-ul de producție |
| `npx cap sync` | Sincronizează `dist/` cu proiectele Android și iOS |
| `npx cap open android` | Deschide proiectul nativ în Android Studio |
| `npx cap open ios` | Deschide proiectul nativ în Xcode |
| `npm audit fix` | Corectează automat vulnerabilitățile cunoscute din pachete |

---

## 🔒 Permisiuni & Confidențialitate

- **Locație (GPS):** **Complet eliminată / dezactivată.** S-a renunțat la Geofencing; aplicația nu solicită permisiuni de geolocație și nu rulează procese de monitorizare GPS de fundal, protejând bateria și intimitatea utilizatorului.
- **Notificări:** Folosite strict local pentru a vă alerta la începerea sau terminarea turei de lucru, praguri de 8h/12h și reamintiri.
- **Cameră Foto & Galerie:** Folosite exclusiv opțional, la cererea utilizatorului, pentru scanarea automată (OCR) a fluturașilor de salariu.
- **Date Financiare & Pontaj:** Setările de salariu, bonuri de masă și istoricul pontajelor sunt stocate exclusiv pe memoria locală a dispozitivului dumneavoastră (funcționează 100% offline).

---

## 📄 Licență

Acest proiect este licențiat sub licența **ISC**.
