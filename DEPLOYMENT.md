# 🚀 Teklif360 Deployment Guide

Bu uygulama 2 parçadan oluşur:
1. **Frontend** (React + Vite) → Netlify'da host edilecek
2. **Backend** (Express Proxy) → Railway'de host edilecek

## 📦 Backend Deployment (Railway.app)

### 1. Railway Hesabı Oluştur
- https://railway.app adresine git
- GitHub ile giriş yap (ücretsiz)

### 2. Backend'i Deploy Et

```bash
# Server klasörüne git
cd server

# Railway CLI kur (opsiyonel)
npm install -g @railway/cli

# Railway'e login
railway login

# Yeni proje oluştur
railway init

# Deploy et
railway up
```

**VEYA** Railway Dashboard'dan:
1. "New Project" → "Deploy from GitHub repo"
2. `server` klasörünü seç
3. Environment Variables ekle:
   - `NODE_ENV` = `production`
4. Deploy butonu

### 3. Backend URL'ini Kaydet
Deploy sonrası URL alacaksınız:
```
https://teklif360-backend-production.up.railway.app
```

### 4. CORS Güncelle
`server/server.js` dosyasında:
```javascript
const allowedOrigins = [
  'http://localhost:8080',
  'https://your-netlify-app.netlify.app'  // ← Buraya Netlify URL'inizi ekleyin
];
```

## 🌐 Frontend Deployment (Netlify)

### 1. Environment Variable Ayarla

`.env.production` dosyası oluştur:
```env
VITE_API_URL=https://your-railway-backend.up.railway.app
```

### 2. API Config Dosyası Oluştur

`src/config/api.ts`:
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

### 3. Servisleri Güncelle

`src/services/oskabulutAuth.ts` ve `oskabulutScraper.ts` dosyalarında:
```typescript
import { API_BASE_URL } from '@/config/api';

// Önce: const response = await axios.post('http://localhost:3001/api/login', ...);
// Sonra: const response = await axios.post(`${API_BASE_URL}/api/login`, ...);
```

### 4. Build ve Deploy

```bash
# Build
npm run build

# Netlify CLI ile deploy (opsiyonel)
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

**VEYA** Netlify Dashboard'dan:
1. "New site from Git"
2. GitHub repo'nuzu seç
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Environment variables:
   - `VITE_API_URL` = `https://your-railway-backend.up.railway.app`
5. Deploy!

## 🔧 Alternative: Vercel (Full-Stack)

Vercel hem frontend hem backend'i host edebilir:

### 1. API Routes Oluştur
```
/api/login.js
/api/search.js
```

### 2. vercel.json
```json
{
  "version": 2,
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build" },
    { "src": "api/**/*.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```

### 3. Deploy
```bash
npm install -g vercel
vercel
```

## 📋 Deployment Checklist

- [ ] Railway'de backend deploy edildi
- [ ] Backend URL'i alındı
- [ ] Frontend'de `VITE_API_URL` ayarlandı
- [ ] CORS allowed origins güncellendi
- [ ] Frontend build edildi
- [ ] Netlify'da deploy edildi
- [ ] Netlify URL'i backend CORS'a eklendi
- [ ] Test: Netlify'dan Oskabulut login çalışıyor mu?

## 🐛 Troubleshooting

### Backend'e erişilemiyor
- Railway logs kontrol et: `railway logs`
- Health check test et: `https://your-backend.railway.app/health`

### CORS hatası
- Backend'de Netlify URL'i allowed origins'a ekli mi?
- Credentials: true ayarlı mı?

### Login çalışmıyor
- Backend'de session timeout artır (30 dakika → 60 dakika)
- Cookie settings kontrol et

## 💰 Maliyet Tahmini

**Railway (Backend):**
- Ücretsiz: $5 kredi/ay
- Backend çok az kaynak kullanır, ücretsiz yeterli

**Netlify (Frontend):**
- Ücretsiz: 100GB bandwidth/ay
- Static site, sınır yok

**Toplam: $0/ay** ✅

## 📚 Kaynaklar

- Railway Docs: https://docs.railway.app
- Netlify Docs: https://docs.netlify.com
- Vite Env Variables: https://vitejs.dev/guide/env-and-mode.html
