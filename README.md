# 🏛️ Dede's - Decentralized Community Platform

> A Web2 + Web3 hybrid platform for community management, proposal voting, donations, and NFT achievements on Sui Blockchain

![Sui](https://img.shields.io/badge/Sui-Blockchain-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)
![Move](https://img.shields.io/badge/Move-Language-green)

## 🎯 Project Overview

**Dede's** is a decentralized community platform that enables organizations, clubs, and individuals to create proposals, collect donations, vote on initiatives, and earn NFT achievements. Built for the **Sui Hackathon 2024**.

### 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **42 OAuth + zkLogin** | Seamless Web2 → Web3 onboarding with automatic wallet creation |
| 💰 **Real SUI Donations** | Direct SUI token transfers to community treasury |
| 🗳️ **On-Chain Voting** | Transparent voting system stored on Sui blockchain |
| 🏆 **NFT Achievements** | Earn achievement NFTs for contributions |
| 📊 **Leaderboard** | Track top contributors with reputation scoring |
| 💬 **Discussion System** | Comment and discuss proposals |

### 📋 Task Types

1. **🎁 Donation Tasks** - Crowdfunding for community needs (e.g., "Buy a coffee machine for the office")
2. **👥 Participation Tasks** - Events requiring sign-ups (e.g., "Volleyball tournament")
3. **🔄 Voting Tasks** - Community decisions with Yes/No voting
4. **🌐 Hybrid Tasks** - Combination of donations + participation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React + TypeScript + Tailwind + @mysten/dapp-kit               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Home   │ │ Tasks   │ │ Profile │ │ Leader  │ │ zkLogin │   │
│  │  Page   │ │ Detail  │ │  Page   │ │  board  │ │  Flow   │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼────────────────────────────────────┐
│                         BACKEND                                  │
│  Node.js + Express + TypeScript + Prisma                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │  Auth   │ │  Tasks  │ │ Profile │ │  User   │               │
│  │ Routes  │ │ Routes  │ │ Routes  │ │ Routes  │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │  Sui Network  │   │  42 Intra     │
│   (Prisma)    │   │   (Testnet)   │   │   OAuth API   │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool |
| **Tailwind CSS** | Styling |
| **Zustand** | State Management |
| **React Query** | Server State & Caching |
| **@mysten/dapp-kit** | Sui Wallet Integration |
| **@mysten/zklogin** | Zero-Knowledge Login |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express.js** | Web Framework |
| **TypeScript** | Type Safety |
| **Prisma** | ORM |
| **PostgreSQL** | Database |
| **Passport.js** | OAuth Authentication |
| **JWT** | Token Management |

### Blockchain
| Technology | Purpose |
|------------|---------|
| **Sui Network** | L1 Blockchain |
| **Move Language** | Smart Contracts |
| **Sui Wallet** | External Wallet Support |
| **zkLogin** | Web2 → Web3 Bridge |

---

## 📦 Smart Contracts

### Deployed on Sui Testnet

| Contract | Package ID |
|----------|------------|
| **community_platform** | `0x741ed80886eac111ca2439baa6bbe22d155e73661ed8a5b13f1115423a90553e` |

### Move Modules

#### 1. `task.move` - Task Management
```move
// Core Functions
- create_task()           // Create new proposal
- donate_to_sponsor()     // Real SUI transfer to treasury
- record_donation_sponsored() // Record sponsored donations
- vote()                  // Cast yes/no vote
- participate()           // Join participation task
- add_comment()           // Add discussion comment
- complete_task()         // Mark task as completed
```

#### 2. `profile.move` - User Profiles
```move
// Core Functions
- create_profile()        // Create on-chain profile
- update_profile()        // Update profile data
- add_reputation()        // Increase reputation score
```

#### 3. `nft.move` - Achievement NFTs
```move
// Core Functions
- mint_achievement()      // Mint achievement NFT
- transfer_nft()          // Transfer NFT ownership
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- PostgreSQL
- Sui CLI (optional)
- Sui Wallet Browser Extension

### Installation

```bash
# Clone repository
git clone https://github.com/saidyanak/Sui-Hackathon-Project.git
cd "Dede's"

# Install dependencies
npm install
cd packages/backend && npm install
cd ../frontend && npm install
```

### Environment Setup

**Backend** (`packages/backend/.env`):
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dedes_db"
JWT_SECRET="your-secret-key"

# 42 OAuth
OAUTH_42_CLIENT_ID="your-client-id"
OAUTH_42_CLIENT_SECRET="your-client-secret"
OAUTH_42_CALLBACK_URL="http://localhost:3000/api/auth/42/callback"

# Sui
PACKAGE_ID="0x741ed80886eac111ca2439baa6bbe22d155e73661ed8a5b13f1115423a90553e"
PROFILE_REGISTRY_ID="0xaebf22af17f39e2fe57cd4ec73b1d855f23d47b2d9eded2a24853ad92b58fbdc"
SPONSOR_ADDRESS="0xc41d4455273841e9cb81ae9f6034c0966a61bb540892a5fd8caa9614e2c44115"

FRONTEND_URL="http://localhost:5173"
```

**Frontend** (`packages/frontend/.env`):
```env
VITE_API_URL="http://localhost:3000"
VITE_PACKAGE_ID="0x741ed80886eac111ca2439baa6bbe22d155e73661ed8a5b13f1115423a90553e"
VITE_PROFILE_REGISTRY_ID="0xaebf22af17f39e2fe57cd4ec73b1d855f23d47b2d9eded2a24853ad92b58fbdc"
VITE_SPONSOR_ADDRESS="0xc41d4455273841e9cb81ae9f6034c0966a61bb540892a5fd8caa9614e2c44115"
```

### Database Setup

```bash
cd packages/backend
npx prisma migrate dev --name init
npx prisma generate
```

### Run Development Servers

```bash
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Frontend
cd packages/frontend
npm run dev
```

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

---

## 🔗 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/42` | Initiate 42 OAuth |
| GET | `/api/auth/42/callback` | OAuth callback |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/:id` | Get task details |
| POST | `/api/tasks` | Create new task |
| POST | `/api/tasks/:id/vote` | Vote on task |
| POST | `/api/tasks/:id/participate` | Join task |
| POST | `/api/tasks/:id/comment` | Add comment |
| POST | `/api/tasks/:id/donate-sponsored` | Record donation |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/leaderboard` | Get leaderboard |
| POST | `/api/user/wallet` | Update wallet address |
| POST | `/api/user/mint-achievement` | Mint NFT |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| POST | `/api/profile/update-donation-stats` | Update donation stats |

---

## 🎨 Application Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Dashboard with task list, stats, sidebar |
| `/login` | Login | 42 OAuth login page |
| `/zklogin` | zkLogin | Sui wallet creation flow |
| `/tasks/create` | Create Task | New proposal form |
| `/tasks/:id` | Task Detail | Full task view with voting, donations, comments |
| `/profile` | Profile | User profile with stats and NFTs |
| `/leaderboard` | Leaderboard | Top contributors ranking |

---

## 📊 Scoring System

The leaderboard ranks users based on their contributions:

| Action | Points |
|--------|--------|
| 💰 Donate 1 SUI | +10 points |
| 📝 Create Task | +50 points |
| 🙋 Participate in Task | +20 points |
| 🗳️ Cast Vote | +5 points |

**Formula**: `Score = (totalDonated / 1e9) * 10 + tasksCreated * 50 + tasksParticipated * 20 + votesCount * 5`

---

## 🏆 NFT Achievements

Users earn NFT badges for:

- 🎖️ **First Donation** - Make your first donation
- 🏅 **Top Donor** - Weekly/Monthly donation leader
- ⭐ **Task Creator** - Create a successful proposal
- 🎯 **Active Participant** - Participate in 10+ tasks
- 👑 **Community Leader** - Reach 1000+ reputation

---

## 📁 Project Structure

```
Dede's/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/          # DB, Passport, Sponsor config
│   │   │   ├── middlewares/     # Auth middleware
│   │   │   ├── routes/          # API routes
│   │   │   ├── types/           # TypeScript types
│   │   │   ├── utils/           # JWT utilities
│   │   │   └── index.ts         # Server entry
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Database schema
│   │   └── package.json
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/      # React components
│   │   │   ├── pages/           # Route pages
│   │   │   ├── services/        # API services
│   │   │   ├── stores/          # Zustand stores
│   │   │   ├── hooks/           # Custom hooks
│   │   │   └── App.tsx          # Main app
│   │   └── package.json
│   │
│   └── move/
│       └── community_platform/
│           ├── sources/
│           │   ├── task.move    # Task management
│           │   ├── profile.move # User profiles
│           │   └── nft.move     # Achievement NFTs
│           └── Move.toml
│
├── README.md
├── SUNUM.md                     # Turkish presentation
└── package.json
```

---

## 🔐 Security

- ✅ 42 OAuth for authentication
- ✅ JWT tokens with expiration
- ✅ Helmet.js security headers
- ✅ Rate limiting on API
- ✅ CORS configuration
- ✅ Input validation
- ✅ Wallet signatures for transactions
- ✅ No private keys stored on backend

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Commit Convention

```
feat: New feature
fix: Bug fix
docs: Documentation
style: Formatting
refactor: Code refactoring
test: Add tests
chore: Maintenance
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Sui Foundation** - For the hackathon and Sui blockchain
- **42 Network** - For OAuth integration support
- **Mysten Labs** - For excellent Sui SDKs

---

## 👥 Team

Built with ❤️ for **Sui Hackathon 2024**

- GitHub: [@saidyanak](https://github.com/saidyanak)

---

## 📞 Contact

- **GitHub Issues**: For bug reports and feature requests
- **Discord**: Join our community server

---

> **Note**: This project is actively developed for the Sui Hackathon. Smart contracts are deployed on Sui Testnet.

## 🔗 Links

- [Sui Documentation](https://docs.sui.io)
- [Move Language Book](https://move-book.com)
- [@mysten/dapp-kit](https://sdk.mystenlabs.com/dapp-kit)
- [zkLogin Guide](https://docs.sui.io/concepts/cryptography/zklogin)
