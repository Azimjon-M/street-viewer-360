# Street Viewer 360 🌐

360° panorama ko'ruvchi - Insta360 X5 rasmlarini interaktiv Street View rejimida ko'rsatish uchun zamonaviy React ilovasi.

## ✨ Xususiyatlar

- 🔄 **360° Panorama Ko'rish** - To'liq interaktiv panorama ko'ruvchi
- 📍 **Pin Navigatsiyasi** - Bir rasmdan ikkinchisiga pin'lar orqali o'tish
- 🎨 **Zamonaviy Dizayn** - Dark mode, glassmorphism effektlari
- ⚡ **Tez va Yengil** - Pannellum kutubxonasi asosida
- 📱 **Responsive** - Har qanday ekranda ishlaydi
- 🖱️ **To'liq Boshqaruv** - Sichqoncha, touch, keyboard bilan navigate qilish

## 🚀 O'rnatish

### 1. Dependencies o'rnatish

```bash
npm install
```

### 2. Development server ishga tushirish

```bash
npm run dev
```

Brauzerda `http://localhost:5173` ochiladi.

### 3. Production build

```bash
npm run build
```

## 📸 O'z Panoramalaringizni Qo'shish

### Qadam 1: Rasmlarni Joylashtirish

Insta360 X5 bilan olingan equirectangular (360°) rasmlaringizni `/public/panoramas` papkasiga joylang:

```
public/
  panoramas/
    scene1.jpg
    scene2.jpg
    scene3.jpg
```

**Muhim:** Rasmlar equirectangular formatda bo'lishi kerak (2:1 aspect ratio, masalan 6080x3040 yoki shunga o'xshash).

### Qadam 2: Scene Ma'lumotlarini Yangilash

`src/data/scenes.js` faylini oching va o'z ma'lumotlaringiz bilan yangilang:

```javascript
export const scenesData = [
  {
    id: 'scene1',
    title: 'Sizning Manzilingiz',
    description: 'Tavsif',
    image: '/panoramas/scene1.jpg',  // O'z rasm nomingiz
    initialView: {
      pitch: 0,    // Vertikal burchak (-90 dan +90 gacha)
      yaw: 0,      // Gorizontal burchak (0-360)
      hfov: 100    // Ko'rish maydoni
    },
    hotspots: [
      {
        id: 'hotspot1',
        type: 'custom',
        pitch: -5,   // Pin qayerda joylashishi (vertikal)
        yaw: 45,     // Pin qayerda joylashishi (gorizontal)
        cssClass: 'custom-hotspot',
        createTooltipFunc: (hotSpotDiv) => {
          hotSpotDiv.innerHTML = `
            <div class="hotspot-tooltip">
              <span>Keyingi joy</span>
            </div>
          `;
        },
        clickHandlerFunc: () => 'scene2'  // Qaysi scene'ga o'tishi
      }
    ]
  }
];
```

### Pin Koordinatalarini Topish

1. Dev server'ni ishga tushiring (`npm run dev`)
2. Brauzerda panoramani oching
3. F12 bosing (Developer Console)
4. Console'da quyidagi kodni yozing:

```javascript
// Panorama viewerni topish
const viewer = window.viewer;

// Hozirgi pitch va yaw'ni ko'rish
setInterval(() => {
  console.log(`Pitch: ${viewer.getPitch()}, Yaw: ${viewer.getYaw()}`);
}, 1000);
```

4. Panoramani aylantirib, pin qo'ymoqchi bo'lgan joyingiz bo'yicha ko'rsatilgan koordinatalarni yozib oling
5. Shu koordinatalarni `scenes.js` faylidagi hotspot'larga qo'shing

## 🎨 Dizaynni Sozlash

`src/index.css` fayldagi CSS o'zgaruvchilarini o'zgartirib, ranglarni sozlashingiz mumkin:

```css
:root {
  --color-accent-primary: #4f46e5;  /* Asosiy rang */
  --color-accent-secondary: #7c3aed; /* Ikkilamchi rang */
  /* ... */
}
```

## 📁 Fayl Strukturasi

```
street-viewer-360/
├── public/
│   └── panoramas/          # 360° rasmlar shu yerda
├── src/
│   ├── components/
│   │   └── PanoramaViewer/ # Asosiy viewer komponenti
│   ├── data/
│   │   └── scenes.js       # Scene va hotspot ma'lumotlari
│   ├── App.jsx             # Asosiy ilova
│   └── index.css           # Global dizayn sistemi
└── package.json
```

## 🛠️ Texnologiyalar

- **React** - UI kutubxonasi
- **Vite** - Build tool
- **Pannellum** - 360° panorama viewer

## 💡 Maslahatlar

1. **Rasm Hajmi:** Yaxshi sifat uchun kamida 4K (4096x2048) panoramalar ishlating
2. **Hotspot Joylashuvi:** Pin'larni yaxshi ko'rinadigan joylarga qo'ying
3. **Navigation:** Har bir scene'dan kamida 1-2 ta pin bilan boshqa joy'larga yo'l bering
4. **Tavsif:** Har bir scene uchun tushunarli title va description yozing

## 🐛 Muammolar

### Panorama yuklanmayapti
- Rasm yo'lini tekshiring (`/public/panoramas/yourimage.jpg`)
- Rasm format: equirectangular (2:1 ratio)
- Browser console'ni tekshiring (F12)

### Pin'lar ko'rinmayapti
- Pitch va Yaw koordinatalarini tekshiring
- `hotspots` array to'g'ri yozilganini tasdiqlang

### Performance past
- Rasm hajmini kichikroq qiling (masalan JPG sifatini 85% ga tushiring)
- Ko'p scene'lar bo'lsa, lazy loading qo'shing

## 📦 GitHub'ga Yuklash

```bash
# Git repository yaratish
git init

# O'zgarishlarni qo'shish
git add .
git commit -m "Initial commit: Street Viewer 360 app"

# GitHub'ga yuklash
git branch -M main
git remote add origin https://github.com/USERNAME/street-viewer-360.git
git push -u origin main
```

## 📝 License

MIT License - O'zingizning loyihalaringizda erkin foydalaning!

---

**Muallif:** Yaratilgan Antigravity AI tomonidan

Savollar yoki taklif lar uchun issue oching! 🚀
