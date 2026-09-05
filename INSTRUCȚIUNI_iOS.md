# 📱 Cum să instalezi aplicația pe iPhone FĂRĂ cont plătit

## ⚠️ IMPORTANT: iOS ≠ Android

**Pe Android:** Poți instala APK direct din orice sursă  
**Pe iOS:** Apple blochează instalarea directă - ai nevoie de cont Apple ID

---

## ✅ SOLUȚIA CEL MAI SIMPLĂ (GRATIS)

### **Folosește Apple ID-ul tău gratuit + Xcode**

**NU trebuie să plătești nimic!**

### Pași:

1. **Conectează iPhone-ul la Mac** prin cablu USB/Lightning

2. **Pe iPhone:** Când apare "Trust This Computer?", apasă **Trust**

3. **Rulează scriptul automat:**
   ```bash
   cd /Users/florindorobantu/Desktop/contor-updated
   ./create-ipa.sh
   ```

4. **În Xcode (se deschide automat):**
   
   a. **Signing & Capabilities** (în stânga):
      - Bifează ✅ **"Automatically manage signing"**
      - La **"Team"**: Click → **"Add an Account..."**
      - Intră cu Apple ID-ul tău (gratuit, e-mailul tău de Apple)
      
   b. **Selectează iPhone-ul:**
      - În bara de sus: `App > [Numele iPhone-ului tău]`
   
   c. **Apasă butonul ▶️ (Run)** sau **⌘ + R**

5. **Pe iPhone** (DOAR prima dată):
   - Setări → General → VPN & Device Management
   - Sub "Developer App" → Apasă pe Apple ID-ul tău
   - **Trust** → **Trust**

6. **Gata!** Aplicația este instalată pe iPhone

---

## 📦 Dacă vrei fișier .ipa (pentru AltStore)

### Ce este AltStore?
O aplicație care îți permite să instalezi .ipa pe iPhone fără Xcode, prin WiFi.

### Instalare AltStore:

1. **Descarcă AltStore:**
   - Mergi la: https://altstore.io
   - Descarcă pentru Mac
   - Instalează AltStore pe Mac

2. **Instalează AltStore pe iPhone:**
   - Conectează iPhone-ul la Mac (prima dată)
   - Deschide AltStore pe Mac
   - Urmează instrucțiunile să instalezi AltStore app pe iPhone

3. **Creează .ipa:**
   - Rulează scriptul: `./create-ipa.sh`
   - În Xcode urmează instrucțiunile pentru Archive
   - Exportă .ipa pe Desktop

4. **Instalează prin AltStore:**
   - Deschide AltStore pe iPhone
   - My Apps → + → Selectează fișierul .ipa
   - Instalează!

---

## ⏰ Limitări (cont GRATUIT)

- **Aplicația expiră după 7 zile**
- Trebuie reinstalată (reconectezi iPhone și apeși Run în Xcode, sau refresh în AltStore)

### Dacă vrei instalare permanentă:
- Apple Developer Program: **$99/an**
- Sau: Jailbreak (nu recomandat)

---

## 🆚 Comparație Metode

| Metodă | Cost | Dificultate | Expirare | Internet necesar |
|--------|------|-------------|----------|------------------|
| **Xcode + Cablu** | GRATIS | Ușor | 7 zile | Nu (după setup) |
| **AltStore** | GRATIS | Mediu | 7 zile (auto-refresh) | Da (refresh la 7 zile) |
| **Developer ($99)** | $99/an | Ușor | Niciodată | Nu |

---

## ✅ RECOMANDARE

**Pentru tine:** Folosește **Xcode + Cablu** (cel mai simplu, gratis)

1. Conectezi iPhone-ul o dată la 7 zile
2. Apeși Run în Xcode
3. Gata!

**Total timp:** 2-3 minute la fiecare 7 zile

---

## 🐛 Probleme?

### "No Provisioning Profile"
→ Soluție: Bifează "Automatically manage signing" în Xcode

### "Untrusted Developer"
→ Soluție: Settings → General → VPN & Device Management → Trust

### Aplicația nu pornește
→ Soluție: Reconectează iPhone-ul și apeși Run din nou în Xcode

---

## 📞 Contact Apple Developer

Dacă vrei să plătești pentru cont permanent:
- https://developer.apple.com
- $99/an
- Aplicația nu mai expiră
- Poți publica în App Store

---

**Mult succes! 🚀**
