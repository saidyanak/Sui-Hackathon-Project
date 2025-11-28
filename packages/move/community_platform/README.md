# 42 Community Platform - Sui Move Contracts

Bu proje, 42 Turkey kampüsü için topluluk yönetimi, görev sistemi ve NFT ödüllendirme platformunun Sui blockchain smart contract'larını içerir.

## 📁 Proje Yapısı

```
community_platform/
├── Move.toml           # Package konfigürasyonu
└── sources/
    ├── task.move       # Task yönetimi ve bağış sistemi
    ├── coalition.move  # Coalition (Ateş, Su, Hava, Toprak) yönetimi
    └── nft.move        # NFT achievement sistemi
```

## 🔧 Kurulum

### 1. Sui CLI Kurulumu

```bash
# Sui CLI'yi yükleyin
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

### 2. Wallet Oluşturma

```bash
# Yeni wallet oluştur
sui client new-address ed25519

# Aktif adresi kontrol et
sui client active-address

# Testnet'e geç
sui client switch --env testnet
```

### 3. Testnet Faucet (Token Alma)

```bash
# Testnet SUI token al
sui client faucet

# Balance kontrol et
sui client gas
```

## 🚀 Deployment

### 1. Contract'ı Derle

```bash
cd packages/move/community_platform
sui move build
```

### 2. Testnet'e Deploy Et

```bash
sui client publish --gas-budget 100000000
```

Deploy sonucunda alacağın çıktıdan şu bilgileri kaydet:

- **Package ID**: `0x...` (VITE_SUI_PACKAGE_ID olarak kullanılacak)
- **CoalitionRegistry Object ID**: Coalition registry'nin shared object ID'si
- **AchievementRegistry Object ID**: Achievement registry'nin shared object ID'si

### 3. Coalition'ları Initialize Et

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module coalition \
  --function initialize_coalitions \
  --args <COALITION_REGISTRY_OBJECT_ID> \
  --gas-budget 10000000
```

## 📋 Contract Modülleri

### 1. Task Module (`task.move`)

Task oluşturma, bağış yapma ve katılım sistemi.

**Ana Fonksiyonlar:**

- `create_task()` - Yeni task oluştur
- `donate()` - Task'e bağış yap
- `join_task()` - Task'e katıl
- `add_comment()` - Task'e yorum ekle
- `complete_task()` - Task'i tamamla (creator)
- `cancel_task()` - Task'i iptal et (creator)
- `withdraw_funds()` - Fonları çek (creator)

**Events:**

- `TaskCreated`
- `DonationReceived`
- `ParticipantJoined`
- `TaskCompleted`
- `TaskCancelled`
- `CommentAdded`
- `FundsWithdrawn`

**Örnek Kullanım:**

```bash
# Task oluştur
sui client call \
  --package <PACKAGE_ID> \
  --module task \
  --function create_task \
  --args \
    "42 Kahve Toplantısı" \
    "Kampüste haftalık kahve toplantısı düzenlemek için bağış kampanyası" \
    0 \
    0 \
    1000000000 \
    1735689600000 \
  --gas-budget 10000000
```

### 2. Coalition Module (`coalition.move`)

Dört coalition (Ateş, Su, Hava, Toprak) yönetimi ve puan sistemi.

**Ana Fonksiyonlar:**

- `initialize_coalitions()` - Tüm coalition'ları başlat
- `join_coalition()` - Bir coalition'a katıl
- `award_points()` - Kullanıcıya puan ver
- `update_rankings()` - Coalition sıralamalarını güncelle

**Events:**

- `CoalitionRegistryCreated`
- `CoalitionInitialized`
- `MemberJoined`
- `PointsAwarded`
- `CoalitionRankingUpdated`

### 3. NFT Module (`nft.move`)

Başarı NFT'leri ve achievement sistemi.

**Achievement Tipleri:**

- `FIRST_TASK` (0) - İlk task tamamlama
- `FIRST_DONATION` (1) - İlk bağış
- `TASK_CREATOR` (2) - İlk task oluşturma
- `GENEROUS_DONOR` (3) - 10+ SUI bağış
- `ACTIVE_PARTICIPANT` (4) - 10+ task katılımı
- `COALITION_HERO` (5) - 1000+ coalition puanı
- `COMMUNITY_LEADER` (6) - 5+ başarılı task
- `SUPPORTER` (7) - 20+ task'e bağış
- `VOLUNTEER` (8) - 50+ participation task
- `LEGENDARY` (9) - 10000+ coalition puanı

**Ana Fonksiyonlar:**

- `create_user_achievements()` - User achievement tracker oluştur
- `claim_achievement()` - Achievement NFT claim et
- `mint_achievement()` - NFT mint et

**Events:**

- `AchievementUnlocked`
- `NFTMinted`
- `AchievementClaimed`

## 🔍 Object Query'leri

### Task'leri Listele

```bash
sui client objects --filter StructType --type <PACKAGE_ID>::task::Task
```

### Specific Task Detaylarını Gör

```bash
sui client object <TASK_OBJECT_ID> --json
```

### Coalition Member Bilgilerini Gör

```bash
sui client object <COALITION_MEMBER_OBJECT_ID> --json
```

## 🌐 Frontend Entegrasyonu

### .env Konfigürasyonu

```env
VITE_SUI_PACKAGE_ID=0x... # Deploy edilmiş package ID
VITE_SUI_NETWORK=testnet
VITE_COALITION_REGISTRY_ID=0x... # Coalition registry object ID
VITE_ACHIEVEMENT_REGISTRY_ID=0x... # Achievement registry object ID
```

### TypeScript Kullanım Örneği

```typescript
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Task oluştur
const tx = new TransactionBlock();
tx.moveCall({
  target: `${PACKAGE_ID}::task::create_task`,
  arguments: [
    tx.pure('Task Başlığı'),
    tx.pure('Açıklama'),
    tx.pure(0), // DONATION type
    tx.pure(0), // Ateş coalition
    tx.pure(1000000000), // 1 SUI
    tx.pure(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün
  ],
});

const result = await wallet.signAndExecuteTransactionBlock({
  transactionBlock: tx,
});
```

## 🧪 Test

Test dosyaları yakında eklenecek.

```bash
sui move test
```

## 📊 Veri Yapıları

### Task Object

```move
struct Task {
    id: UID,
    title: String,
    description: String,
    task_type: u8,  // 0: DONATION, 1: PARTICIPATION, 2: HYBRID
    status: u8,     // 0: ACTIVE, 1: COMPLETED, 2: CANCELLED
    creator: address,
    coalition_id: u8,
    target_amount: u64,
    current_amount: u64,
    balance: Balance<SUI>,
    participants: vector<address>,
    donations: vector<Donation>,
    comments: vector<Comment>,
    start_date: u64,
    end_date: u64,
    created_at: u64,
}
```

### Coalition Member

```move
struct CoalitionMember {
    id: UID,
    user_address: address,
    coalition_id: u8,
    points: u64,
    joined_at: u64,
    tasks_completed: u64,
    donations_made: u64,
}
```

### Achievement NFT

```move
struct AchievementNFT {
    id: UID,
    name: String,
    description: String,
    achievement_type: u8,
    image_url: Url,
    earned_at: u64,
    recipient: address,
    coalition_id: u8,
    metadata: AchievementMetadata,
}
```

## 🛠️ Geliştirme Notları

- **Gas Budget**: Karmaşık işlemler için 10-100 million MIST ayırın
- **Shared Objects**: Task ve Registry'ler shared object olarak deploy edilir
- **Owned Objects**: CoalitionMember ve UserAchievements kullanıcıya ait objeler
- **Events**: Tüm önemli aksiyonlar event olarak emit edilir (indexing için)

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
