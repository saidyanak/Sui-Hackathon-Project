# 🚀 Setup Guide - 42 Community Platform

## İlk Kurulum Adımları

### 1. Bağımlılıkları Yükleyin

```bash
# Root dizinde
npm install

# Backend bağımlılıkları
cd packages/backend
npm install

# Frontend bağımlılıkları
cd ../frontend
npm install
```

### 2. PostgreSQL Database Kurun

#### Option A: Docker ile (Önerilen)

```bash
docker run --name postgres-community \
  -e POSTGRES_USER=community \
  -e POSTGRES_PASSWORD=community123 \
  -e POSTGRES_DB=community_db \
  -p 5432:5432 \
  -d postgres:15
```

#### Option B: Local PostgreSQL

- PostgreSQL'i bilgisayarınıza kurun
- Yeni bir database oluşturun: `community_db`

### 3. Backend Environment Variables

```bash
cd packages/backend
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# Database (Docker kullanıyorsanız)
DATABASE_URL="postgresql://community:community123@localhost:5432/community_db"

# JWT
JWT_SECRET="super-secret-key-change-this-in-production"

# 42 OAuth Credentials
# https://profile.intra.42.fr/oauth/applications adresinden alın
OAUTH_42_CLIENT_ID="your-42-client-id"
OAUTH_42_CLIENT_SECRET="your-42-client-secret"
OAUTH_42_CALLBACK_URL="http://localhost:3000/api/auth/42/callback"

# Google OAuth Credentials
# https://console.cloud.google.com/ adresinden alın
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Frontend URL
FRONTEND_URL="http://localhost:5173"

# Server
PORT=3000
NODE_ENV=development
```

### 4. Frontend Environment Variables

```bash
cd packages/frontend
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
VITE_API_URL=http://localhost:3000
```

### 5. Database Migration (Prisma)

```bash
cd packages/backend

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Prisma Studio ile database'i görüntüleyin
npx prisma studio
```

## 🔑 OAuth Credentials Alma

### 42 Intra OAuth

1. https://profile.intra.42.fr/oauth/applications adresine gidin
2. "New Application" tıklayın
3. Bilgileri doldurun:
   - **Name:** 42 Community Platform (Local Dev)
   - **Redirect URI:** `http://localhost:3000/api/auth/42/callback`
   - **Scopes:** `public` seçin
4. Save edin
5. **UID** → `OAUTH_42_CLIENT_ID`
6. **SECRET** → `OAUTH_42_CLIENT_SECRET`

### Google OAuth

1. https://console.cloud.google.com/ adresine gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" → "Credentials"
4. "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
7. **Client ID** → `GOOGLE_CLIENT_ID`
8. **Client Secret** → `GOOGLE_CLIENT_SECRET`

## 🏃 Projeyi Çalıştırma

### Option 1: Her İkisini Birden (Root'tan)

```bash
# Root dizinde
npm run dev
```

Bu komut hem backend hem frontend'i aynı anda başlatır.

### Option 2: Ayrı Ayrı

**Terminal 1 - Backend:**
```bash
cd packages/backend
npm run dev
```
Backend: http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd packages/frontend
npm run dev
```
Frontend: http://localhost:5173

## ✅ Test Etme

1. Browser'da http://localhost:5173 açın
2. Login sayfası görünmeli
3. "42 Intra ile Giriş Yap" veya "Google ile Giriş Yap" butonuna tıklayın
4. OAuth ile giriş yapın
5. Başarılı girişten sonra anasayfaya yönlendirileceksiniz

## 📊 Database'e Test Verisi Ekleme

Prisma Studio ile manuel olarak task ekleyebilirsiniz:

```bash
cd packages/backend
npx prisma studio
```

Veya bir seed script oluşturabilirsiniz (opsiyonel).

## 🐛 Yaygın Sorunlar ve Çözümler

### Problem: "Port 3000 already in use"

**Çözüm:**
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Problem: "Cannot connect to database"

**Çözüm:**
1. PostgreSQL'in çalıştığından emin olun
2. `.env` dosyasındaki `DATABASE_URL` doğru mu kontrol edin
3. Docker kullanıyorsanız: `docker ps` ile container'ın çalıştığını kontrol edin

### Problem: "Prisma Client not found"

**Çözüm:**
```bash
cd packages/backend
npx prisma generate
```

### Problem: OAuth redirect çalışmıyor

**Çözüm:**
1. OAuth application ayarlarında redirect URL'lerin doğru olduğundan emin olun
2. `.env` dosyasındaki callback URL'lerin doğru olduğundan emin olun
3. Frontend ve Backend URL'lerinin eşleştiğinden emin olun

## 📝 Sonraki Adımlar

✅ Backend ve Frontend çalışıyor
✅ OAuth ile login yapabiliyorsunuz
✅ Anasayfada task listesini görebiliyorsunuz

**Şimdi yapabilecekleriniz:**

1. **Task Oluşturma:** Task create sayfası ekleyin
2. **Task Detay:** Task detay sayfası ekleyin
3. **Sui Wallet:** Wallet bağlantısı ekleyin
4. **Donation Sistemi:** Bağış yapma özelliği ekleyin
5. **NFT Sistemi:** NFT minting ekleyin

Her adım için [ROADMAP.md](ROADMAP.md) dosyasına bakabilirsiniz.

## 🆘 Yardım

Takıldığınız yerde bana sorabilirsiniz! Her adımda kod yazabilirim.
