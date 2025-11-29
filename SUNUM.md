# 🚀 42 Community Platform - Sui Blockchain Projesi

## 📋 İçindekiler
1. [Giriş](#-giriş)
2. [Mimari Yapı](#-mimari-yapı)
3. [Move Smart Contracts](#-move-smart-contracts)
4. [zkLogin Entegrasyonu](#-zklogin-entegrasyonu)
5. [Sponsored Transactions](#-sponsored-transactions)
6. [Frontend & Backend](#-frontend--backend)
7. [Sonuç](#-sonuç)

---

## 🎯 Giriş

### Proje Amacı
42 öğrencileri için Web3 tabanlı bir topluluk platformu. Kullanıcılar:
- **Tasklar oluşturabilir** (halısaha maçı, hackathon, proje fikirleri)
- **Oylama yapabilir** (community governance)
- **Bağış yapabilir** (SUI coin ile)
- **NFT Achievement kazanabilir** (başarı rozetleri)

### Neden Sui Blockchain?
| Özellik | Avantaj |
|---------|---------|
| **Shared Objects** | Tasklar herkes tarafından erişilebilir |
| **Owned Objects** | UserProfile sadece sahibi tarafından değiştirilebilir |
| **zkLogin** | Wallet olmadan Google/42 ile giriş |
| **Sponsored Transactions** | Kullanıcılar gas ödemeden işlem yapabilir |
| **Move Language** | Güvenli, resource-oriented programlama |

---

## 🏗 Mimari Yapı

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │   Home.tsx  │  │ Profile.tsx │  │TaskDetail.tsx│  │ Login.tsx  ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘│
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                  │
│                          ┌────────▼────────┐                        │
│                          │  Services Layer  │                        │
│                          │ (taskService,    │                        │
│                          │  profileService) │                        │
│                          └────────┬────────┘                        │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
           ┌────────▼────────┐           ┌───────▼───────┐
           │   BACKEND       │           │ SUI BLOCKCHAIN │
           │  (Express.js)   │           │   (Testnet)    │
           │                 │           │                │
           │ • zkLogin Auth  │           │ ┌────────────┐ │
           │ • Sponsor TX    │◄─────────►│ │task.move   │ │
           │ • User Stats    │           │ │(Shared)    │ │
           │                 │           │ └────────────┘ │
           │ ┌─────────────┐ │           │ ┌────────────┐ │
           │ │ SQLite DB   │ │           │ │profile.move│ │
           │ │ (Prisma)    │ │           │ │(Owned)     │ │
           │ └─────────────┘ │           │ └────────────┘ │
           │                 │           │ ┌────────────┐ │
           │ ┌─────────────┐ │           │ │nft.move    │ │
           │ │Sponsor Wallet│ │           │ │(Owned)     │ │
           │ └─────────────┘ │           │ └────────────┘ │
           └─────────────────┘           └────────────────┘
```

---

## 📜 Move Smart Contracts

### 1. Profile Modülü (`profile.move`)

**Amaç:** Kullanıcı profilleri ve istatistikleri on-chain'de tutmak.

#### Struct Tanımları:

```move
// UserProfile - Owned Object (sadece sahibi değiştirebilir)
public struct UserProfile has key, store {
    id: UID,
    user_address: address,         // zkLogin wallet adresi
    intra_id: String,              // 42 Intra ID
    email: String,                 // Email
    display_name: String,          // Görünen isim
    
    // İstatistikler
    stats: UserStats,
    
    // Kazanılan NFT'ler
    achievements: vector<ID>,
    
    // Reputation puanı
    reputation_score: u64,
}

// İstatistik yapısı
public struct UserStats has store, copy, drop {
    tasks_created: u64,
    tasks_completed: u64,
    tasks_participated: u64,
    donations_made: u64,
    total_donated_amount: u64,  // MIST cinsinden
    votes_cast: u64,
    proposals_approved: u64,
}
```

#### ProfileRegistry - Global Kayıt Merkezi:

```move
// ProfileRegistry - Shared Object (herkes okuyabilir)
public struct ProfileRegistry has key {
    id: UID,
    profiles: Table<address, ID>,          // address -> profile_id
    intra_to_address: Table<String, address>, // intra_id -> address
    total_users: u64,
    admin: address,
}
```

**🔑 Key Point:** `ProfileRegistry` shared object olduğu için frontend herhangi bir kullanıcının profil ID'sini adresinden bulabilir.

#### Sponsorlu Profil Oluşturma:

```move
// Backend tarafından çağrılır - kullanıcı gas ödemez
public entry fun create_profile_sponsored(
    registry: &mut ProfileRegistry,
    user_wallet_address: address,  // Gerçek kullanıcının adresi
    intra_id: vector<u8>,
    email: vector<u8>,
    display_name: vector<u8>,
    ctx: &mut TxContext
) {
    // Sponsor wallet tx'i imzalar ama
    // profil user_wallet_address'e transfer edilir
    transfer::transfer(profile, user_wallet_address);
}
```

---

### 2. Task Modülü (`task.move`)

**Amaç:** Community taskları oluşturma, oylama, katılma ve bağış sistemi.

#### Task Struct:

```move
// Task - SHARED Object (herkes erişebilir!)
public struct Task has key, store {
    id: UID,
    title: String,
    description: String,
    task_type: u8,              // 0: PARTICIPATION, 1: PROPOSAL
    status: u8,                 // 0: VOTING, 1: ACTIVE, 2: REJECTED...
    creator: address,
    budget_amount: u64,         // Hedef bütçe
    balance: Balance<SUI>,      // Toplanan bağışlar
    participants: vector<address>,
    comments: vector<Comment>,
    votes: vector<Vote>,
    donations: vector<DonationRecord>,
    max_participants: u64,
    voting_end_date: u64,
    created_at: u64,
}
```

**🔑 Neden Shared Object?**

| Owned Object | Shared Object |
|--------------|---------------|
| Sadece sahip değiştirebilir | Herkes değiştirebilir |
| Paralel işlem mümkün | Sıralı işlem (consensus) |
| Hızlı | Biraz yavaş ama gerekli |

**Tasklar shared olmalı çünkü:**
- ✅ Herkes oy kullanabilmeli
- ✅ Herkes katılabilmeli
- ✅ Herkes bağış yapabilmeli
- ✅ Herkes yorum yapabilmeli

#### Task Oluşturma Akışı:

```move
// Sponsorlu task oluşturma
public entry fun create_task_sponsored(
    creator_address: address,  // Gerçek kullanıcı
    title: vector<u8>,
    description: vector<u8>,
    task_type: u8,
    budget_amount: u64,
    max_participants: u64,
    voting_end_date: u64,
    ctx: &mut TxContext
) {
    let task = Task {
        // ... fields
        creator: creator_address,  // Sponsor değil, gerçek kullanıcı
        status: TASK_STATUS_VOTING, // Her task oylama ile başlar
    };
    
    event::emit(TaskCreated { ... });
    
    // Shared object olarak paylaş
    transfer::share_object(task);
}
```

#### Oylama Sistemi (özet)

- Aynı adres bir task için ikinci kez oy veremez (EAlreadyVoted koruması).
- Oylar `VoteCast` event’leri ile takip edilir ve frontend tarafından toplanır.

#### Bağış Sistemi (özet)

- SUI coin ile bağış yapılır; miktar task’ın bakiyesine eklenir.
- Bağış kayıtları listeye eklenir ve event’lerle izlenir.

---

### NFT Modülü (Özet)

Amaç: Achievement NFT’leri mint etmek ve kullanıcılara vermek.

#### Achievement Türleri (örnekler)

- İlk task, ilk bağış, task oluşturucu, aktif katılımcı, topluluk lideri, destekçi, gönüllü, efsanevi katkı.

#### NFT Yapısı (anlatım)

- NFT; ad, açıklama, tür, görsel URL, kazanılma zamanı ve alıcının adresini içerir.
- Metadata’da rarity (Common/Rare/Epic/Legendary) ve kullanıcının istatistikleri bulunur.

#### Sponsorlu NFT Mint (sorun ve çözüm)

- Sorun: Sponsor cüzdan, kullanıcının owned `UserProfile` nesnesine erişemez.
- Çözüm: `mint_achievement_direct_sponsored` ile profil nesnesi olmadan, backend eligibility doğrulayarak NFT’yi doğrudan kullanıcı adresine mint ve transfer et.

#### NFT Görselleri (DiceBear)

- Görseller DiceBear API’den üretilir; rarity’ye göre arka plan renkleri farklıdır.
- Bu yaklaşım depolama ve barındırma yükünü azaltır, görsel üretimini kolaylaştırır.

---

## 🔐 zkLogin Entegrasyonu

### Akış

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Kullanıcı  │────►│ Google/42    │────►│   Backend    │
│   (Frontend) │     │ OAuth Login  │     │   Callback   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ zkLogin Salt │
                                          │  Generation  │
                                          └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ Ephemeral    │
                                          │ Keypair      │
                                          └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ Virtual SUI  │
                                          │ Wallet Addr  │
                                          └──────────────┘
```

### Avantajlar

| Geleneksel Wallet | zkLogin |
|-------------------|---------|
| ❌ Seed phrase gerekli | ✅ Google/42 hesabı yeterli |
| ❌ Karmaşık setup | ✅ Tek tıkla giriş |
| ❌ Kayıp riski | ✅ OAuth ile kurtarma |
| ❌ Web3 bilgisi gerekli | ✅ Web2 deneyimi |

---

## 💸 Sponsored Transactions

### Neden Gerekli?

```text
Normal Transaction:
Kullanıcı → Gas Fee (SUI gerekli) → İşlem

Sponsored Transaction:
Kullanıcı → Backend → Sponsor Wallet (gas öder) → İşlem
```

**Kullanıcı hiç SUI sahibi olmadan işlem yapabilir!**

### Backend Sponsor Wallet Config:

```typescript
// sponsor.ts
const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY;

// Keypair yükle
const sponsorKeypair = Ed25519Keypair.fromSecretKey(seed);
console.log('✅ Sponsor wallet:', sponsorKeypair.getPublicKey().toSuiAddress());

// Transaction imzala ve gönder
export async function executeSponsoredTransaction(transaction: Transaction) {
    const result = await suiClient.signAndExecuteTransaction({
        transaction,
        signer: sponsorKeypair,  // Sponsor imzalar
        options: {
            showEffects: true,
            showObjectChanges: true,
        },
    });
    return result;
}
```

### Örnek: Sponsorlu Task Oluşturma

```typescript
// profile.routes.ts
router.post('/create-task-sponsored', authMiddleware, async (req, res) => {
    const { title, description, taskType, maxParticipants, votingEndDate } = req.body;
    
    // 1. Kullanıcının gerçek wallet adresini al
    const userAddress = req.user.realWalletAddress;
    
    // 2. Transaction oluştur
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::task::create_task_sponsored`,
        arguments: [
            tx.pure.address(userAddress),  // Gerçek kullanıcı
            tx.pure.vector('u8', encoder.encode(title)),
            tx.pure.vector('u8', encoder.encode(description)),
            tx.pure.u8(taskType),
            tx.pure.u64(budgetAmount),
            tx.pure.u64(maxParticipants),
            tx.pure.u64(votingEndDate),
        ],
    });
    
    // 3. Sponsor wallet imzalar
    const result = await executeSponsoredTransaction(tx);
    
    res.json({ success: true, digest: result.digest });
});
```

---

## 🎨 Frontend & Backend

### Frontend Stack

- **React + Vite** - Hızlı geliştirme
- **TailwindCSS** - Modern UI
- **@mysten/dapp-kit** - Sui wallet bağlantısı
- **@tanstack/react-query** - Data fetching
- **Zustand** - State management

### Backend Stack

- **Express.js** - API server
- **Prisma + SQLite** - Veritabanı
- **Passport.js** - OAuth authentication
- **@mysten/sui** - Blockchain interaction

### Veritabanı Şeması

```prisma
model User {
  id                String           @id @default(uuid())
  email             String           @unique
  username          String?          @unique
  intraId           Int?             @unique
  googleId          String?          @unique
  suiWalletAddress  String?          // zkLogin virtual wallet
  realWalletAddress String?          // Gerçek wallet (bağış için)
  profileId         String?          // On-chain UserProfile ID
  
  // Backend'de tutulan stats (on-chain yedek)
  tasksCreated      Int              @default(0)
  tasksParticipated Int              @default(0)
  votesCount        Int              @default(0)
  donationsCount    Int              @default(0)
  totalDonated      BigInt           @default(0)
  reputationScore   Int              @default(0)
  
  nftAchievements   NFTAchievement[]
}

model NFTAchievement {
  id              String   @id @default(uuid())
  userId          String
  nftObjectId     String?  @unique
  achievementType String
  createdAt       DateTime @default(now())
}
```

---

## 📊 Event Sistemi

### Blockchain Events (Move)

```move
// Task oluşturulduğunda
public struct TaskCreated has copy, drop {
    task_id: ID,
    creator: address,
    title: String,
    task_type: u8,
    budget_amount: u64,
    voting_end_date: u64,
    timestamp: u64,
}

// Oy kullanıldığında
public struct VoteCast has copy, drop {
    task_id: ID,
    voter: address,
    vote_type: u8,
    yes_votes: u64,
    no_votes: u64,
    timestamp: u64,
}

// NFT mint edildiğinde
public struct NFTMinted has copy, drop {
    nft_id: ID,
    recipient: address,
    achievement_type: u8,
    name: String,
    timestamp: u64,
}
```

### Frontend Event Dinleme

```typescript
// taskService.ts
async getTasks() {
    // Event query ile tüm TaskCreated eventlerini al
    const events = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::task::TaskCreated` },
        order: 'descending',
    });
    
    // Her task için detayları çek
    const tasks = await Promise.all(
        events.data.map(async (event) => {
            const taskId = event.parsedJson.task_id;
            const taskObject = await suiClient.getObject({
                id: taskId,
                options: { showContent: true },
            });
            return parseTask(taskObject);
        })
    );
    
    return tasks;
}
```

---

## 🔄 Owned vs Shared Objects

### Karşılaştırma

```text
┌─────────────────────────────────────────────────────────────┐
│                    OWNED OBJECTS                             │
│  ┌─────────────────┐                                        │
│  │   UserProfile   │ ◄── Sadece owner değiştirebilir        │
│  │   - stats       │                                        │
│  │   - reputation  │     ❌ Sponsor wallet erişemez          │
│  │   - achievements│     ✅ Paralel işlem mümkün             │
│  └─────────────────┘                                        │
│                                                              │
│  ┌─────────────────┐                                        │
│  │ AchievementNFT  │ ◄── Owner'ın cüzdanında                │
│  │   - name        │                                        │
│  │   - metadata    │     Transfer edilebilir                 │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   SHARED OBJECTS                             │
│  ┌─────────────────┐                                        │
│  │ ProfileRegistry │ ◄── Herkes okuyabilir                  │
│  │   - profiles    │     Admin değiştirebilir                │
│  └─────────────────┘                                        │
│                                                              │
│  ┌─────────────────┐                                        │
│  │     Task        │ ◄── Herkes etkileşebilir               │
│  │   - votes       │                                        │
│  │   - donations   │     ✅ Sponsor wallet erişebilir        │
│  │   - comments    │     ⚠️ Sıralı işlem (consensus)         │
│  │   - participants│                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Sonuç

### Başarılar

✅ **zkLogin ile Kolay Giriş** - Wallet olmadan blockchain kullanımı
✅ **Sponsored Transactions** - Gas ücreti olmadan işlem
✅ **Shared Objects** - Community governance için ideal
✅ **NFT Achievement Sistemi** - Gamification
✅ **On-chain + Off-chain Hibrit** - Performans ve güvenlik dengesi

### Öğrenilen Dersler

1. **Owned Object Erişim Sorunu** → Direct mint fonksiyonu ile çözüldü
2. **Package ID Değişimi** → Eski veriler blockchain'de kalır ama yeni kontrat görmez
3. **Event-based Data Fetching** → Task'ları event'lerden okumak en verimli yöntem

### Gelecek Geliştirmeler

- [ ] Real-time notifications (WebSocket)
- [ ] Task deadline reminder
- [ ] Leaderboard sistemi
- [ ] Multi-chain support
- [ ] Mobile app

---

## 📚 Teknik Referanslar

| Kaynak | Link |
|--------|------|
| Sui Move Docs | <https://docs.sui.io/build> |
| zkLogin Guide | <https://docs.sui.io/concepts/cryptography/zklogin> |
| Sui TypeScript SDK | <https://sdk.mystenlabs.com/typescript> |
| DiceBear API | <https://dicebear.com/styles/shapes> |

---

## 🏆 Demo

**Package ID:** `0x23f3d3cacebf80e2ac83590077136caf574d261f056ba149bd607c4ab756cee2`

**ProfileRegistry:** `0xbdb946bc9a3c9440c30a6f862fa4239fd44a88aed69edf1f2872ecda57109756`

**Network:** Sui Testnet

---

_42 Community Platform - Built with ❤️ on Sui Blockchain_
