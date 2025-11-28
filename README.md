# 42 Community Platform - Monorepo Project

> 42 Türkiye öğrencileri için topluluk yönetimi, task sistemi ve NFT ödüllendirme platformu

## 🎯 Proje Hakkında

Bu proje, 42 Türkiye kampüsündeki öğrencilerin koalisyonlar, kulüpler ve bireysel olarak etkinlik düzenlemesini, topluluk isteklerini (task) yönetmesini ve bağış toplamasını sağlayan bir Web2 + Web3 hibrit platformudur.

### Ana Özellikler

- 🔐 **42 Intra OAuth** ile giriş (Web2)
- 💼 **Sui Wallet** entegrasyonu (Web3)
- 📝 **Task Sistemi** - Topluluk tarafından oluşturulan görevler
- 💰 **Bağış Sistemi** - SUI token ile bağış yapma
- 🏆 **NFT Achievement** - Başarılar için NFT ödülleri
- 💬 **Tartışma/Forum** - Task'lar için yorum sistemi

### Task Türleri

1. **Donation Tasks:** Bağış toplanması gereken görevler (örn: "Kampüse tost makinesi alalım")
2. **Participation Tasks:** Katılım gerektiren etkinlikler (örn: "Voleybol turnuvası")
3. **Hybrid Tasks:** Hem bağış hem katılım içeren görevler

### NFT Ödülleri

Kullanıcılar şu durumlarda NFT kazanır:
- Bir etkinliği tamamladığında
- Haftalık/aylık bağış birincisi olduğunda
- İlk bağışını yaptığında
- Özel başarılara ulaştığında

NFT'ler kullanıcı profilinde achievement rozetleri olarak görünür.

## 📁 Proje Yapısı

```
.
├── packages/
│   ├── backend/          # Node.js + Express + TypeScript + Prisma
│   │   ├── src/
│   │   │   ├── routes/       # API routes
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── services/     # Business logic
│   │   │   ├── middlewares/  # Auth, validation
│   │   │   ├── config/       # Configuration
│   │   │   └── index.js      # Server entry
│   │   ├── prisma/
│   │   │   └── schema.prisma # Database schema
│   │   ├── package.json
│   │   ├── .env.example
│   │   └── .gitignore
│   │
│   ├── frontend/         # React + TypeScript + Vite + Tailwind
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── pages/        # Route pages
│   │   │   ├── stores/       # Zustand stores
│   │   │   ├── services/     # API services
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── utils/        # Utilities
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   ├── tailwind.config.js
│   │   ├── package.json
│   │   └── .gitignore
│   │
│   └── contracts/        # Sui Move Smart Contracts
│       ├── donation/         # Donation contract
│       ├── nft/              # NFT achievement contract
│       └── Move.toml
│
├── package.json          # Root workspace yönetimi
├── .gitignore
├── README.md             # Bu dosya
├── TECH_STACK.md         # Detaylı teknoloji dokümanı
└── ROADMAP.md            # Geliştirme yol haritası
```

## 🛠️ Teknoloji Yığını

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **Passport.js** (42 OAuth)
- **JWT** (Authentication)
- **@mysten/sui.js** (Sui blockchain interaction)

### Frontend
- **React 18** + **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **Zustand** (State management)
- **React Router** (Routing)
- **React Query** (API caching)
- **@mysten/dapp-kit** (Sui wallet integration)

### Blockchain
- **Sui Network** (Testnet/Mainnet)
- **Sui Move** (Smart contract language)
- **Sui Wallet** (Browser extension)

Detaylı teknoloji açıklamaları için [TECH_STACK.md](TECH_STACK.md) dosyasına bakın.

## 🚀 Hızlı Başlangıç

### Ön Gereksinimler

- **Node.js** v18 veya üzeri
- **npm** v9 veya üzeri
- **PostgreSQL** (local veya Docker)
- **Git**
- **Sui Wallet** (browser extension - testnet için)

### Kurulum

1. **Repository'yi klonlayın:**

```bash
git clone <repo-url>
cd "Dede's"
```

2. **Bağımlılıkları yükleyin:**

```bash
# Root dizinde
npm install

# Backend
cd packages/backend
npm install

# Frontend
cd ../frontend
npm install

# Veya tek komutla (root'tan):
npm run install:all
```

3. **Environment değişkenlerini ayarlayın:**

```bash
# Backend
cd packages/backend
cp .env.example .env
```

`.env` dosyasını düzenleyin:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/community_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# 42 OAuth (https://profile.intra.42.fr/oauth/applications)
OAUTH_42_CLIENT_ID="your-42-client-id"
OAUTH_42_CLIENT_SECRET="your-42-client-secret"
OAUTH_42_CALLBACK_URL="http://localhost:3000/api/auth/42/callback"

# Sui Network
SUI_NETWORK="testnet"
SUI_PACKAGE_ID="your-deployed-package-id"

# Server
PORT=3000
NODE_ENV=development
```

4. **Database setup:**

```bash
cd packages/backend

# Prisma migration
npx prisma migrate dev --name init

# Seed data (coalitions)
npx prisma db seed
```

## 🏃 Çalıştırma

### Development Mode

**Backend:**
```bash
cd packages/backend
npm run dev
```
Backend: http://localhost:3000

**Frontend:**
```bash
cd packages/frontend
npm run dev
```
Frontend: http://localhost:5173

**Her ikisini birden (root'tan):**
```bash
npm run dev
```

### Production Build

**Frontend:**
```bash
cd packages/frontend
npm run build
npm run preview
```

## 📖 Geliştirme Rehberi

Detaylı geliştirme adımları ve yol haritası için [ROADMAP.md](ROADMAP.md) dosyasına bakın.

### Phase'ler

1. **Phase 1:** Project Setup & Foundation (1 hafta)
2. **Phase 2:** 42 OAuth Authentication (3-4 gün)
3. **Phase 3:** Task Management System (1 hafta)
4. **Phase 4:** Sui Wallet Integration (3-4 gün)
5. **Phase 5:** Donation System (1 hafta)
6. **Phase 6:** NFT Achievement System (1 hafta)
7. **Phase 7:** Community Features (1 hafta)
8. **Phase 8:** Testing & Polish (1 hafta)
9. **Phase 9:** Deployment (2-3 gün)

**Toplam:** 6-8 hafta (full-time)

## 🔗 API Endpoints

### Authentication
```
POST /api/auth/42/login       - 42 OAuth login başlat
GET  /api/auth/42/callback    - OAuth callback
POST /api/auth/logout         - Logout
GET  /api/auth/me             - Mevcut kullanıcı bilgisi
```

### Tasks
```
GET    /api/tasks              - Task listesi
GET    /api/tasks/:id          - Task detayı
POST   /api/tasks              - Yeni task oluştur
PUT    /api/tasks/:id          - Task güncelle
DELETE /api/tasks/:id          - Task sil
GET    /api/tasks/:id/comments - Task yorumları
POST   /api/tasks/:id/comments - Yorum ekle
```

### Donations
```
POST /api/tasks/:id/donate     - Bağış yap
POST /api/donations/verify     - Transaction doğrula
GET  /api/tasks/:id/donations  - Task bağışları
```

### Users
```
GET  /api/users/:id            - Kullanıcı profili
PUT  /api/users/wallet         - Wallet adresi güncelle
GET  /api/users/:id/nfts       - Kullanıcı NFT'leri
```

### NFT
```
POST /api/nft/mint             - NFT mint et (admin)
GET  /api/nft/achievements     - Achievement türleri
```

## 🎨 Frontend Routing

```
/                    - Ana sayfa
/login              - Login sayfası
/tasks              - Task listesi
/tasks/:id          - Task detay
/tasks/create       - Task oluştur
/profile/:id        - Kullanıcı profili
/coalitions         - Koalisyonlar
/leaderboard        - Sıralama
/my-nfts            - NFT koleksiyonum
```

## 🧪 Testing

```bash
# Backend tests
cd packages/backend
npm test

# Frontend tests
cd packages/frontend
npm test

# E2E tests
npm run test:e2e
```

## 📦 Deployment

### Frontend (Vercel)

```bash
cd packages/frontend
vercel
```

### Backend (Railway)

```bash
cd packages/backend
railway login
railway init
railway up
```

### Smart Contracts (Sui)

```bash
cd packages/contracts
sui client publish --gas-budget 100000000
```

Detaylı deployment talimatları için [ROADMAP.md](ROADMAP.md) - Phase 9'a bakın.

## 🔐 Güvenlik

- 42 OAuth credentials'ları `.env` dosyasında saklanır
- JWT secret güçlü ve rastgele olmalı
- Wallet private key'leri ASLA backend'de saklanmaz
- Rate limiting aktif
- Input validation (Zod)
- CORS yapılandırması
- Helmet.js güvenlik headers

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'feat: add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Commit Convention

```
feat: Yeni özellik
fix: Bug fix
docs: Dokümantasyon
style: Formatting
refactor: Code refactoring
test: Test ekleme
chore: Maintenance
```

## 📄 Lisans

ISC

## 🙏 Teşekkürler

- 42 Türkiye Community
- Sui Foundation
- Anthropic (Claude AI)

## 📞 İletişim

Sorularınız için:
- GitHub Issues
- 42 Slack: #community-platform

---

**Not:** Bu proje Sui Hackathon için geliştirilmiştir ve aktif geliştirme aşamasındadır.

## 📚 Kaynaklar

- [TECH_STACK.md](TECH_STACK.md) - Detaylı teknoloji açıklamaları
- [ROADMAP.md](ROADMAP.md) - Adım adım geliştirme rehberi
- [Sui Documentation](https://docs.sui.io)
- [42 API Documentation](https://api.intra.42.fr/apidoc)
