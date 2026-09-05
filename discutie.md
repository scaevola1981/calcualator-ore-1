# TikTok Work v6.2.0 — Arhitectură, Logică Financiară & Specificații Tehnice

Document de referință complet pentru dezvoltarea și reconstrucția aplicației în regim Clean Start.

---

## 1. Arhitectură Tehnică & UI/UX

* **Stack Tehnologic:** React, Vite, Capacitor (țintă iOS/Android & Web), Tailwind CSS, `@capacitor/preferences`.
* **Stil Vizual:** Glassmorphism complet (carduri cu `backdrop-blur: 20px`, transparențe, borduri subtile albe semi-transparente).
* **Tematică:**
  * **Light Mode:** Fundal `#F5F7FA`, text `#1F2937`.
  * **Dark Mode:** Fundal `#0D1B2A`, text `#FFFFFF`.
* **Navigație:** Floating Bottom NavBar de culoare bleumarin închis (`#0D1B2A`), colțuri rotunjite la `20px`, indicator activ tip punct subtil sub tabul curent.
* **Elemente Identitare:** Calendar cu marcaj Tricolor (Albastru-Galben-Roșu 🇷🇴) pentru toate Sărbătorile Legale din România.

---

## 2. Motorul de Timp și Înregistrare

* **Rotunjire Timp:** FĂRĂ rotunjire la intrare/ieșire (se înregistrează timpul real de lucru).
* **Pauză de Masă:** Se scade automat **exact 30 de minute** din fiecare sesiune zilnică lucrată.
* **Zile de Lucru Standard:** Luni - Vineri (normă întreagă: 8h/zi).
* **Sărbători & Weekend:** Orice oră lucrată în weekend (Sâmbătă/Duminică) sau în zilele de Sărbătoare Legală reprezintă timp suplimentar integral.

---

## 3. Logica Financiară și de Salarizare

### Parametri de Bază
* **Salariu Net de Bază:** 4200.00 RON (pentru norma lunară de bază).
* **Salariu Brut de Încadrare:** 7180.00 RON.
* **Tarif Orar de Bază ($Rate_{orar}$):**
  $$Rate_{orar} = \frac{Salariu_{net}}{Zile_{lucratoare} \times 8}$$
  *(Exemplu: lună cu 20 de zile lucrătoare = 160h $\rightarrow 4200 / 160 = 26.25 \text{ RON/oră}$)*.

### Sporuri & Beneficii
* **Ore de Noapte (25%):**
  * Interval eligibil: **22:00 – 06:00**.
  * Valoare spor: $25\% \times Rate_{orar}$ pentru fiecare oră din interval.
* **Spor de Regie / Weekend (1%):**
  * Bază de calcul: Salariul de încadrare ($7180 \text{ RON}$).
  * Valoare fixă lunară: $7180 \times 1\% = 71.80 \text{ RON}$.
* **Tichete de Masă:**
  * Valoare: **22 RON / zi lucrată**.
  * Condiție strictă: Se acordă **exclusiv pentru zilele de Luni până Vineri** care nu sunt Sărbători Legale (fără tichete în weekend sau sărbători).
  * Notă contabilă: Contravaloarea lor se distribuie pe cardul dedicat de bonuri și se reține din restul de plată lichidare dacă este inclusă inițial în calculul net brutizat.

---

## 4. Logica de Audit a Orelor Suplimentare („Mecanismul Fabricii”)

Fabrica aplică o schemă contabilă de compensare pentru a nu depăși plafonul legal de ore suplimentare:
* **Ore Reale Suplimentare:** Toate orele lucrate peste norma zilnică de 8h, plus toate orele din weekend și sărbători. Regula de plată convenită este **1:1** ($1\text{h suplimentară} = 1\text{h normală}$).
* **Artificiul Contabil al Fabricii:** Împarte numărul de ore suplimentare la 2 și le declară/plătește pe fluturaș la cotă de **200%**:
  $$Ore_{fluturas} = \frac{Ore_{reale}}{2}$$
  $$Valoare = Ore_{fluturas} \times (Rate_{orar} \times 2)$$
* **Regula de Audit a Agentului AI:**
  * Monitorizează totalul de ore reale lucrate ($T_{real}$).
  * Compară cu fluturașul: dacă $(Ore_{fluturas} \times 2) < Ore_{reale}$, activează **Cardul de Alertă Chihlimbar (Amber)** și explică diferența în RON pierdută de utilizator.

---

## 5. Structura Paginilor & Funcționalități Aplicație

* **Pagina Acasă (Home):**
  * Grid 1x2 pentru statistici (Ore Normale vs Ore Suplimentare).
  * Card dedicat pentru tichete de masă acumulate.
  * Buton oval de acțiune „Start / Stop Muncă”.
* **Pagina Istoric (History):**
  * Calendar patriotic cu marcaje tricolore (🇷🇴) pe sărbători legale.
  * Card „Total General” și listă detaliată a fiecărei sesiuni zilnice.
  * Modal de adăugare/editare manuală cu validare anti-suprapunere.
* **Modulul de Audit Financiar:**
  * Formular de introducere a datelor de pe fluturaș: Venit brut, ore suplimentare (200%), ore noapte, avans reținut (ex: 1500 RON), tichete reținute (ex: 440 RON), rest de plată.
  * Calcul reconciliere:
    $$RestPlata_{calculat} = VenitNet_{total} - Avans - Tichete$$
  * Card Amber declanșat automat la discrepanțe între $RestPlata_{calculat}$ și suma de pe fluturaș.
* **Agent Automatizare (Background / GPS):**
  * Geofencing la coordonatele fabricii: detectează sosirea/plecarea și pornește/oprește sesiunea exact, aplicând deducerea automată a pauzei de 30 min.