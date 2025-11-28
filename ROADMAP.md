# 🗺️ Development Roadmap - 42 Community Platform

## Geliştirme Sırası ve Adımlar

Bu dokümant, projeyi sıfırdan başlatıp production'a kadar götürecek adım adım yol haritasıdır.

---

## 🎯 Phase 1: Project Setup & Foundation (1 hafta)

### 1.1 Development Environment Setup
**Süre:** 1 gün

- [ ] Node.js ve npm kurulumu kontrol
- [ ] Git repository oluştur
- [ ] Monorepo yapısını kur
- [ ] VSCode extensions yükle (ESLint, Prettier, Tailwind)
- [ ] 42 Intra API credentials al (https://profile.intra.42.fr/oauth/applications)

**Yapılacaklar:**
```bash
# Git repo oluştur
git init
git remote add origin <your-repo-url>

# Monorepo packages oluştur (DONE)
# Root package.json, backend ve frontend package.json (DONE)
```

### 1.2 Backend Setup
**Süre:** 1-2 gün

- [ ] TypeScript konfigürasyonu
- [ ] Express server setup
- [ ] Environment variables (.env)
- [ ] PostgreSQL kurulum (local veya Docker)
- [ ] Prisma ORM setup
- [ ] Database schema tasarımı
- [ ] Basic middleware (cors, helmet, express.json)
- [ ] Error handling middleware

**Yapılacaklar:**
```bash
cd packages/backend
npm install typescript @types/node @types/express ts-node nodemon
npm install express cors helmet dotenv
npm install prisma @prisma/client
npm install jsonwebtoken bcrypt passport passport-oauth2
npm install zod express-rate-limit

# Prisma init
npx prisma init
```

**Dosyalar:**
- `tsconfig.json` - TypeScript config
- `prisma/schema.prisma` - Database schema
- `src/config/` - Configuration files
- `src/middlewares/` - Auth, error handling
- `src/types/` - TypeScript types

### 1.3 Frontend Setup
**Süre:** 1 gün

- [ ] TypeScript konfigürasyonu
- [ ] Tailwind CSS kurulum
- [ ] React Router setup
- [ ] Folder structure oluştur
- [ ] Base components (Layout, Navbar, Footer)
- [ ] Zustand store setup
- [ ] Axios/React Query setup

**Yapılacaklar:**
```bash
cd packages/frontend
npm install -D typescript @types/react @types/react-dom
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer
npm install zustand axios @tanstack/react-query
npm install react-hook-form zod @hookform/resolvers

# Tailwind init
npx tailwindcss init -p
```

**Folder Structure:**
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── layout/       # Layout components
│   └── features/     # Feature-specific components
├── pages/            # Route pages
├── hooks/            # Custom hooks
├── stores/           # Zustand stores
├── services/         # API services
├── utils/            # Utilities
├── types/            # TypeScript types
└── styles/           # Global styles
```

### 1.4 Database Schema Implementation
**Süre:** 1 gün

- [ ] Prisma schema yazımı
- [ ] Initial migration oluştur
- [ ] Seed data hazırla (coalitions, test users)
- [ ] Database test

**Prisma Schema (packages/backend/prisma/schema.prisma):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id              String    @id @default(uuid())
  intraId         Int       @unique
  username        String    @unique
  email           String    @unique
  firstName       String?
  lastName        String?
  avatar          String?
  suiWalletAddress String?
  coalitionId     String?
  role            UserRole  @default(USER)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  coalition       Coalition?  @relation(fields: [coalitionId], references: [id])
  tasksCreated    Task[]      @relation("TaskCreator")
  donations       Donation[]
  participations  TaskParticipant[]
  comments        Comment[]
  nftAchievements NFTAchievement[]
}

enum UserRole {
  USER
  COALITION_LEADER
  ADMIN
}

model Coalition {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  color       String
  leaderId    String?
  createdAt   DateTime @default(now())

  users       User[]
  tasks       Task[]
}

model Task {
  id            String     @id @default(uuid())
  title         String
  description   String
  type          TaskType
  status        TaskStatus @default(OPEN)
  creatorId     String
  coalitionId   String?
  targetAmount  Float?
  currentAmount Float      @default(0)
  startDate     DateTime?
  endDate       DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  creator       User       @relation("TaskCreator", fields: [creatorId], references: [id])
  coalition     Coalition? @relation(fields: [coalitionId], references: [id])
  donations     Donation[]
  participants  TaskParticipant[]
  comments      Comment[]
}

enum TaskType {
  DONATION
  PARTICIPATION
  HYBRID
}

enum TaskStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model Donation {
  id              String   @id @default(uuid())
  taskId          String
  userId          String
  amount          Float
  transactionHash String   @unique
  createdAt       DateTime @default(now())

  task            Task     @relation(fields: [taskId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
}

model TaskParticipant {
  id        String              @id @default(uuid())
  taskId    String
  userId    String
  status    ParticipantStatus   @default(REGISTERED)
  createdAt DateTime            @default(now())

  task      Task                @relation(fields: [taskId], references: [id])
  user      User                @relation(fields: [userId], references: [id])

  @@unique([taskId, userId])
}

enum ParticipantStatus {
  REGISTERED
  ATTENDED
  COMPLETED
  CANCELLED
}

model Comment {
  id        String   @id @default(uuid())
  taskId    String
  userId    String
  parentId  String?
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  task      Task     @relation(fields: [taskId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
}

model NFTAchievement {
  id              String   @id @default(uuid())
  userId          String
  nftObjectId     String   @unique
  achievementType String
  taskId          String?
  metadataUrl     String?
  imageUrl        String?
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id])
}
```

**Migration:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🔐 Phase 2: Authentication (42 OAuth) (3-4 gün)

### 2.1 Backend Auth Implementation
**Süre:** 2 gün

- [ ] Passport OAuth2 strategy setup
- [ ] 42 Intra OAuth endpoints
- [ ] JWT token generation
- [ ] Auth middleware
- [ ] User CRUD operations

**Routes:**
```
POST /api/auth/42/login       - Initiate 42 OAuth
GET  /api/auth/42/callback    - OAuth callback
POST /api/auth/logout         - Logout
GET  /api/auth/me             - Get current user
```

**Files to create:**
```
src/
├── routes/
│   └── auth.routes.ts
├── controllers/
│   └── auth.controller.ts
├── services/
│   └── auth.service.ts
├── middlewares/
│   └── auth.middleware.ts
└── config/
    └── passport.config.ts
```

### 2.2 Frontend Auth Implementation
**Süre:** 2 gün

- [ ] Login page
- [ ] Auth context/store
- [ ] Protected routes
- [ ] Token management
- [ ] Auto-refresh token
- [ ] Logout functionality

**Files to create:**
```
src/
├── pages/
│   ├── Login.tsx
│   └── Callback.tsx
├── stores/
│   └── authStore.ts
├── services/
│   └── authService.ts
├── components/
│   └── ProtectedRoute.tsx
└── hooks/
    └── useAuth.ts
```

**Basic Flow:**
```typescript
// authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  login: () => void;
  logout: () => void;
  setUser: (user: User) => void;
}

// Login button redirects to:
// http://localhost:3000/api/auth/42/login
// Backend redirects to 42 OAuth
// 42 redirects back to /api/auth/42/callback
// Backend creates JWT and redirects to frontend/callback?token=xxx
// Frontend stores token and fetches user data
```

---

## 📝 Phase 3: Task Management System (1 hafta)

### 3.1 Backend Task CRUD
**Süre:** 2-3 gün

- [ ] Task CRUD endpoints
- [ ] Task filtering (by type, coalition, status)
- [ ] Pagination
- [ ] Task validation (Zod schemas)
- [ ] Permission checks (creator, admin)

**Routes:**
```
GET    /api/tasks              - Get all tasks (with filters)
GET    /api/tasks/:id          - Get single task
POST   /api/tasks              - Create task (auth required)
PUT    /api/tasks/:id          - Update task (creator/admin only)
DELETE /api/tasks/:id          - Delete task (creator/admin only)
GET    /api/tasks/:id/comments - Get task comments
POST   /api/tasks/:id/comments - Add comment
```

**Files:**
```
src/
├── routes/
│   └── task.routes.ts
├── controllers/
│   └── task.controller.ts
├── services/
│   └── task.service.ts
└── validators/
    └── task.validator.ts
```

### 3.2 Frontend Task UI
**Süre:** 2-3 gün

- [ ] Task list page (with filters)
- [ ] Task detail page
- [ ] Create task form
- [ ] Edit task form
- [ ] Task card component
- [ ] Comment section

**Pages:**
```
src/
├── pages/
│   ├── Tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskDetail.tsx
│   │   ├── CreateTask.tsx
│   │   └── EditTask.tsx
├── components/
│   └── features/
│       └── tasks/
│           ├── TaskCard.tsx
│           ├── TaskFilter.tsx
│           ├── TaskForm.tsx
│           └── CommentSection.tsx
└── services/
    └── taskService.ts
```

### 3.3 Comments System
**Süre:** 1 gün

- [ ] Backend comment endpoints
- [ ] Frontend comment UI
- [ ] Reply to comments
- [ ] Delete comment (owner/admin)

---

## 💼 Phase 4: Sui Wallet Integration (3-4 gün)

### 4.1 Frontend Wallet Connection
**Süre:** 2 gün

- [ ] @mysten/dapp-kit setup
- [ ] Wallet connection button
- [ ] Wallet state management
- [ ] Network selection (testnet/mainnet)
- [ ] Disconnect wallet

**Install:**
```bash
cd packages/frontend
npm install @mysten/sui.js @mysten/dapp-kit @mysten/wallet-adapter-wallet-standard
```

**Setup:**
```typescript
// main.tsx
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui.js/client';

const queryClient = new QueryClient();
const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
};

<QueryClientProvider client={queryClient}>
  <SuiClientProvider networks={networks} defaultNetwork="testnet">
    <WalletProvider>
      <App />
    </WalletProvider>
  </SuiClientProvider>
</QueryClientProvider>
```

**Components:**
```
src/components/
└── wallet/
    ├── ConnectWallet.tsx
    ├── WalletButton.tsx
    └── WalletInfo.tsx
```

### 4.2 Backend Wallet Integration
**Süre:** 1 gün

- [ ] Save wallet address to user profile
- [ ] Verify wallet ownership (sign message)
- [ ] Wallet update endpoint

**Route:**
```
PUT /api/users/wallet - Update user's wallet address
```

---

## 💰 Phase 5: Donation System (1 hafta)

### 5.1 Sui Smart Contract (Move)
**Süre:** 2-3 gün

- [ ] Sui Move öğrenme
- [ ] Donation contract yazma
- [ ] Contract deployment (testnet)
- [ ] Contract testing

**Create package:**
```bash
mkdir packages/contracts
cd packages/contracts
sui move new donation_contract
```

**Basic Move Module:**
```move
module donation_contract::donate {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public entry fun donate(
        payment: Coin<SUI>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        transfer::public_transfer(payment, recipient);
    }
}
```

### 5.2 Backend Donation Processing
**Süre:** 1-2 gün

- [ ] Sui client setup
- [ ] Transaction verification
- [ ] Donation recording
- [ ] Webhook for transaction confirmation

**Routes:**
```
POST /api/tasks/:id/donate     - Initiate donation
POST /api/donations/verify     - Verify transaction
GET  /api/tasks/:id/donations  - Get task donations
```

### 5.3 Frontend Donation UI
**Süre:** 1-2 gün

- [ ] Donation modal/form
- [ ] Transaction signing
- [ ] Transaction status tracking
- [ ] Donation history

---

## 🏆 Phase 6: NFT Achievement System (1 hafta)

### 6.1 NFT Smart Contract (Move)
**Süre:** 2-3 gün

- [ ] NFT module yazma
- [ ] Mint function
- [ ] Display standard implementation
- [ ] Achievement types tanımlama

**Achievement Types:**
```
- TASK_COMPLETED: Task'ı tamamladı
- TOP_DONOR_WEEKLY: Haftalık en çok bağış
- TOP_DONOR_MONTHLY: Aylık en çok bağış
- FIRST_DONATION: İlk bağış
- PARTICIPANT: Etkinliğe katıldı
- ORGANIZER: Etkinlik organize etti
```

**Basic NFT Module:**
```move
module nft_contract::achievement {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};
    use sui::url::{Self, Url};
    use sui::display;

    struct AchievementNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: Url,
        achievement_type: String,
        earned_at: u64,
    }

    public entry fun mint(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        achievement_type: vector<u8>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let nft = AchievementNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            achievement_type: string::utf8(achievement_type),
            earned_at: tx_context::epoch(ctx),
        };
        transfer::public_transfer(nft, recipient);
    }
}
```

### 6.2 Backend NFT Minting
**Süre:** 2 gün

- [ ] NFT metadata generator
- [ ] Image generation/upload (IPFS)
- [ ] Mint trigger system
- [ ] Achievement tracking

**Routes:**
```
POST /api/nft/mint            - Admin mint NFT
GET  /api/users/:id/nfts      - Get user's NFTs
GET  /api/nft/achievements    - Get all achievement types
```

**Minting Triggers:**
- Task completion
- Donation milestones
- Weekly leaderboard
- Monthly leaderboard

### 6.3 Frontend NFT Display
**Süre:** 1-2 gün

- [ ] User profile NFT gallery
- [ ] NFT card component
- [ ] Achievement badges
- [ ] Leaderboard with NFT rewards

---

## 👥 Phase 7: Community Features (1 hafta)

### 7.1 Coalition Management
**Süre:** 2 gün

- [ ] Coalition pages
- [ ] Coalition leaderboard
- [ ] Coalition-specific tasks
- [ ] Coalition stats

### 7.2 User Profiles
**Süre:** 2 gün

- [ ] Public profile page
- [ ] User stats (donations, tasks, NFTs)
- [ ] Activity feed

## 🧪 Phase 8: Testing & Polish (1 hafta)

### 8.1 Testing
**Süre:** 3-4 gün

- [ ] Backend unit tests
- [ ] API integration tests
- [ ] Frontend component tests
- [ ] E2E tests (critical flows)
- [ ] Smart contract tests

### 8.2 Bug Fixes & Optimization
**Süre:** 2-3 gün

- [ ] Fix identified bugs
- [ ] Database query optimization
- [ ] Frontend performance
- [ ] Image optimization
- [ ] Code refactoring

### 8.3 Security Audit
**Süre:** 1 gün

- [ ] SQL injection check
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Input validation
- [ ] Environment variables check

---

## 🚀 Phase 9: Deployment (2-3 gün)

### 9.1 Production Setup
- [ ] Environment variables setup
- [ ] Database migration (production)
- [ ] Smart contract deployment (mainnet)
- [ ] Domain setup
- [ ] SSL certificates

### 9.2 Backend Deployment
**Options:**
- Railway
- Render
- Heroku
- DigitalOcean

### 9.3 Frontend Deployment
**Options:**
- Vercel (Recommended)
- Netlify
- Cloudflare Pages

### 9.4 Database Hosting
**Options:**
- Supabase
- Neon
- Railway PostgreSQL
- AWS RDS

### 9.5 Monitoring Setup
- [ ] Sentry error tracking
- [ ] Analytics
- [ ] Uptime monitoring
- [ ] Log aggregation

---

## 📊 Toplam Tahmini Süre

| Phase | Süre |
|-------|------|
| Phase 1: Setup | 1 hafta |
| Phase 2: Auth | 3-4 gün |
| Phase 3: Tasks | 1 hafta |
| Phase 4: Wallet | 3-4 gün |
| Phase 5: Donations | 1 hafta |
| Phase 6: NFT | 1 hafta |
| Phase 7: Community | 1 hafta |
| Phase 8: Testing | 1 hafta |
| Phase 9: Deploy | 2-3 gün |
| **TOPLAM** | **6-8 hafta** |

*Not: Bu süre tek kişi full-time çalışma varsayımıyla hesaplanmıştır. Part-time çalışıyorsanız 2-3 katına çıkabilir.*

---

## 🎯 MVP (Minimum Viable Product) Özellikleri

Eğer hızlı bir şekilde test etmek istiyorsanız, önce bu özellikleri geliştirin:

**MVP Checklist:**
- ✅ 42 OAuth login
- ✅ User profile
- ✅ Create/view tasks
- ✅ Task comments
- ✅ Wallet connection
- ✅ Basic donation (without smart contract, direct transfer)
- ✅ Simple NFT minting (admin panel)
- ✅ Basic UI/UX

**MVP Süresi: 3-4 hafta**

---

## 📝 Önemli Notlar

1. **Sui Testnet Kullanın:** Başlangıçta mainnet'e geçmeyin, önce testnet'te test edin.

2. **Database Backup:** Düzenli backup alın.

3. **Git Workflow:** Feature branch'ler kullanın, main'e direkt push yapmayın.

4. **Documentation:** Kod yazarken dokümante edin.

5. **Environment Variables:** Asla .env dosyalarını commit etmeyin.

6. **Security:** Production'a geçmeden security audit yapın.

7. **Mobile First:** UI'ı mobil uyumlu tasarlayın.

8. **Performance:** Image lazy loading, pagination, caching kullanın.

