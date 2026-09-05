#!/bin/bash

echo "📱 Create iOS .ipa Script"
echo "========================="
echo ""

# Culori pentru output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Build web
echo -e "${YELLOW}🔨 Step 1: Building web app...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Web build complete${NC}"
echo ""

# 2. Sync Capacitor
echo -e "${YELLOW}📲 Step 2: Syncing with iOS...${NC}"
npx cap sync ios
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Sync failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Sync complete${NC}"
echo ""

# 3. Informații pentru pasul următor
echo -e "${YELLOW}📋 Step 3: Create .ipa in Xcode${NC}"
echo ""
echo "URMĂREȘTE ACEȘTI PAȘI:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Se va deschide Xcode..."
echo ""
echo "2. În Xcode:"
echo "   • Schimbă target-ul din dropdown (lângă butonul Run)"
echo "   • De la 'iPhone simulat' la: 'Any iOS Device (arm64)'"
echo ""
echo "3. Meniu → Product → Archive"
echo "   (Așteaptă să se compileze - poate dura câteva minute)"
echo ""
echo "4. După finalizare, în fereastra 'Organizer':"
echo "   • Selectează arhiva creată"
echo "   • Click pe 'Distribute App'"
echo "   • Alege: 'Development'"
echo "   • Urmează pașii și exportă .ipa"
echo ""
echo "5. Salvează .ipa pe Desktop!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Apasă Enter pentru a deschide Xcode...${NC}"
read

# 4. Deschide Xcode
npx cap open ios

echo ""
echo -e "${GREEN}✅ Script complet!${NC}"
echo ""
echo "PASUL URMĂTOR:"
echo "Urmează instrucțiunile de mai sus pentru a crea .ipa în Xcode"
echo ""
echo "NOTĂ: Vei avea nevoie să te loghezi cu Apple ID-ul tău"
echo "      (gratuit, nu trebuie să plătești nimic!)"
