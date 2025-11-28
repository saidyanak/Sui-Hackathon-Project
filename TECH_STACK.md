# 42 Türkiye Community Platform - Teknoloji Yığını

## 📋 Proje Özeti

42 Türkiye öğrencileri için topluluk yönetimi, task sistemi ve NFT ödüllendirme platformu.

### Ana Özellikler
- 42 Intra OAuth ile giriş (Web2)
- Sui Wallet entegrasyonu (Web3)
- Topluluk tarafından oluşturulan task'lar
- Bağış sistemi
- NFT Achievement sistemi (Sui blockchain)
- Tartışma/Forum sistemi
- Koalisyon ve kulüp yönetimi

## 🛠️ Önerilen Teknoloji Yığını

### Frontend

#### Core
- **React 18** - UI library
- **TypeScript** - Type safety için
- **Vite** - Hızlı build tool
- **React Router v6** - Routing

#### State Management
- **Zustand** - Basit ve güçlü state management
  - Neden? Redux'a göre daha az boilerplate, öğrenmesi kolay

#### UI/Styling
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** veya **Radix UI** - Accessible komponentler
- **Framer Motion** - Animasyonlar

#### Web3 Integration
- **@mysten/sui.js** - Sui TypeScript SDK
- **@mysten/dapp-kit** - Sui wallet bağlantısı için
- **@mysten/wallet-adapter** - Multi-wallet desteği

#### Form & Validation
- **React Hook Form** - Form yönetimi
- **Zod** - Schema validation

#### API Communication
- **Axios** veya **TanStack Query (React Query)** - API calls ve caching
  - React Query önerilir: Otomatik caching, refetching, loading states

### Backend

#### Core
- **Node.js (v18+)** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety

#### Database
- **PostgreSQL** - Ana veritabanı
  - Neden? İlişkisel veri için (users, tasks, comments, donations)
- **Prisma** - Modern ORM
  - Neden? TypeScript desteği, migration yönetimi, type-safety

#### Authentication
- **Passport.js** - OAuth stratejileri
  - `passport-oauth2` - 42 Intra OAuth için
- **JWT (jsonwebtoken)** - Session yönetimi
- **bcrypt** - Password hashing (opsiyonel ekstra auth için)

#### Blockchain Integration (Sui)
- **@mysten/sui.js** - Sui blockchain interaction
- Sui Full Node API ile iletişim
- NFT minting ve transfer işlemleri

#### File Upload (NFT görselleri için)
- **Multer** - File upload
- **Cloudinary** veya **AWS S3** - Resim storage
- **IPFS** - NFT metadata storage (opsiyonel, decentralized)

#### Real-time (Opsiyonel)
- **Socket.io** - Real-time notifications ve chat

#### Validation
- **Zod** - Request validation
- **express-validator** - Alternative

#### Security
- **helmet** - HTTP headers güvenliği
- **cors** - CORS yönetimi
- **rate-limit** - DDoS koruması
- **express-mongo-sanitize** - NoSQL injection koruması

### Blockchain

#### Sui Network
- **Sui Move** - Smart contract dili
- **Sui CLI** - Development tools
- **Sui Testnet** - Development ve test için
- **Sui Mainnet** - Production

#### NFT Standard
- **Sui NFT Standard** - Kiosk protocol kullanımı
- **Display Standard** - NFT metadata görüntüleme

### DevOps & Tools

#### Development
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **commitlint** - Commit message standardı

#### Testing
- **Vitest** - Unit testing (Vite ile uyumlu)
- **React Testing Library** - Component testing
- **Playwright** veya **Cypress** - E2E testing
- **Supertest** - API testing

#### Deployment
- **Docker** - Containerization
- **Docker Compose** - Local development
- **Vercel** veya **Netlify** - Frontend deployment
- **Railway** veya **Render** - Backend deployment
- **PostgreSQL Cloud** - Supabase, Neon, veya Railway

#### Monitoring
- **Sentry** - Error tracking
- **Vercel Analytics** - Frontend analytics

## 📦 Package Yapısı

```
packages/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Node.js + Express + TypeScript
├── contracts/         # Sui Move smart contracts
└── shared/            # Shared types ve utilities
```

## 🔐 Authentication Flow

```
1. User clicks "42 Intra ile Giriş Yap"
2. Redirect to 42 OAuth
3. Callback with auth code
4. Backend exchange code for access token
5. Fetch user data from 42 API
6. Create/update user in database
7. Generate JWT token
8. Return JWT to frontend
9. Store JWT in localStorage/cookie
10. User can now connect Sui wallet (optional)
```

## 💰 Bağış & NFT Flow

```
### Bağış İşlemi:
1. User selects task
2. User clicks "Bağış Yap"
3. Connect Sui wallet (if not connected)
4. Enter amount (SUI)
5. Sign transaction with wallet
6. Backend verifies transaction on Sui blockchain
7. Update task donation amount in database
8. Trigger NFT mint if milestone reached

### NFT Achievement:
1. Event triggered (task completion, donation milestone)
2. Backend determines achievement type
3. Call Sui smart contract to mint NFT
4. NFT transferred to user's wallet
5. Update user profile with achievement
6. Display NFT on profile page
```

## 🗄️ Database Schema (Temel)

```
Users
- id
- intra_id (42 API'den)
- username
- email
- avatar
- sui_wallet_address (nullable)
- coalition_id
- created_at

Tasks
- id
- title
- description
- type (donation, participation, hybrid)
- creator_id (user)
- coalition_id (nullable)
- target_amount (nullable)
- current_amount
- status (open, in_progress, completed)
- start_date
- end_date
- created_at

Donations
- id
- task_id
- user_id
- amount
- transaction_hash (Sui blockchain)
- created_at

TaskParticipants
- id
- task_id
- user_id
- status (registered, attended, completed)
- created_at

Comments
- id
- task_id
- user_id
- parent_id (for replies)
- content
- created_at

NFTAchievements
- id
- user_id
- nft_id (Sui object ID)
- achievement_type
- task_id (nullable)
- metadata_url
- created_at

Coalitions
- id
- name (Ateş, Su, Hava, Toprak)
- description
- leader_id
- created_at
```

## 🎯 Development Priorities

### Phase 1 - MVP (2-3 hafta)
1. ✅ Project setup (monorepo)
2. 🔐 42 OAuth authentication
3. 👤 User profile
4. 📝 Basic task CRUD
5. 💬 Task comments/discussion
6. 🎨 Basic UI

### Phase 2 - Web3 Integration (2 hafta)
7. 💼 Sui wallet connection
8. 📜 NFT smart contracts (Move)
9. 💰 Donation system
10. 🏆 NFT minting system

### Phase 3 - Community Features (1-2 hafta)
11. 🎭 Coalition management
12. 👥 Task participation system
13. 📊 Leaderboards
14. 🔔 Notification system

### Phase 4 - Polish & Deploy (1 hafta)
15. 🧪 Testing
16. 🚀 Deployment
17. 📱 Mobile responsiveness
18. ⚡ Performance optimization

## 💡 Alternatif Teknolojiler

### Database Alternatifleri
- **MongoDB** - Daha esnek schema, ama ilişkisel veri için PostgreSQL daha iyi
- **Supabase** - PostgreSQL + Auth + Storage + Real-time, hızlı MVP için iyi

### State Management Alternatifleri
- **Redux Toolkit** - Daha karmaşık, ama yaygın kullanılıyor
- **Jotai** - Atomic state management
- **Recoil** - Facebook'tan, atomik state

### Backend Alternatifleri
- **NestJS** - Enterprise-grade, TypeScript-first, Angular-like
- **Fastify** - Express'den daha hızlı
- **tRPC** - End-to-end type safety (frontend-backend)

### Blockchain Alternatifleri
- **IPFS (Pinata/NFT.Storage)** - NFT metadata için decentralized storage
- **Arweave** - Permanent storage alternative

## 🔧 Gerekli API'ler

1. **42 Intra API**
   - OAuth endpoint
   - User data endpoint
   - Coalition data

2. **Sui Network**
   - Fullnode RPC
   - Faucet (testnet)
   - Explorer API

## 📚 Öğrenme Kaynakları

- Sui Docs: https://docs.sui.io
- Sui Move by Example: https://examples.sui.io
- @mysten/dapp-kit: https://sdk.mystenlabs.com/dapp-kit
- Prisma Docs: https://www.prisma.io/docs
- React Query: https://tanstack.com/query

## ⚠️ Önemli Notlar

1. **Security**
   - 42 OAuth secret'larını .env'de sakla
   - JWT secret'ı güçlü tut
   - Wallet private key'leri ASLA backend'de saklama
   - Rate limiting ekle
   - Input validation yap

2. **Blockchain**
   - Testnet'te geliştir
   - Gas fee'leri hesapla
   - Transaction failure handling
   - Wallet connection error handling

3. **Performance**
   - Database indexing (user_id, task_id, etc.)
   - API caching (React Query)
   - Image optimization
   - Lazy loading
