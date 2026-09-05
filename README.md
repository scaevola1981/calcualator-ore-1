# ⏱️ TicTocWork - Contor Ore Muncă

**TicTocWork** este o aplicație modernă, completă și intuitivă pentru pontajul orelor de muncă, calculul salariului, urmărirea automată prin geofencing GPS și analiza detaliată a activității. Construită pe un stack hibrid performant (React 19 + Vite + Capacitor 8), aplicația rulează atât în browser (Web), cât și nativ pe dispozitive mobile (**Android** și **iOS**).

---

## ✨ Funcționalități Principale

- 🕒 **Pontaj Rapid & Sesiuni de Lucru:**
  - Pornire și oprire pontaj cu un singur click.
  - Temporizator în timp real pentru sesiunea activă.
  - Reguli de rotunjire inteligentă a orelor (la 30 minute sau 1 oră).
  - Gestionare automată a turelor care trec de miezul nopții.

- 📍 **Geofencing GPS Inteligent:**
  - Selectare punct de lucru pe o hartă interactivă (OpenStreetMap / Leaflet).
  - Setare rază de acoperire (geofence).
  - Notificări și pontare automată/asistată la intrarea sau părăsirea zonei de lucru.

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

- 🌓 **Interfață Modernă & Dark Mode:**
  - Design premium, responsive, optimizat pentru experiență touch mobilă.
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
| **Leaflet & React-Leaflet** | Hărți interactive pentru configurarea geofence-ului |
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
│   │   ├── CalculatorPage.tsx # Calculator salariu (simplu & detaliat)
│   │   ├── HistoryPage.tsx    # Istoric pontaj și calendar
│   │   ├── SettingsPage.tsx   # Setări profil, financiare și geofencing
│   │   ├── GeofenceMapModal.tsx # Modal hartă Leaflet
│   │   ├── ChartCard.tsx      # Grafic săptămânal ore lucrate
│   │   ├── DayNightChart.tsx  # Distribuție ore zi / noapte
│   │   └── ...
│   ├── hooks/                 # Custom hooks (ex: useGeofencing.ts)
│   ├── services/              # Servicii (notificări, geolocație)
│   ├── utils/                 # Algoritmi rotunjire timp, sărbători legale RO, formatare date
│   ├── App.tsx                # Containerul principal și rutarea stării
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

- **Locație (GPS):** Utilizată exclusiv local pentru funcția de geofencing (verificarea prezenței la locul de muncă). Nu sunt trimise date de poziționare către servere externe.
- **Notificări:** Folosite strict local pentru a vă alerta la începerea sau terminarea turei de lucru.
- **Date Financiare:** Setările de salariu, bonuri de masă și istoricul pontajelor sunt stocate pe memoria dispozitivului dumneavoastră.

---

## 📄 Licență

Acest proiect este licențiat sub licența **ISC**.
