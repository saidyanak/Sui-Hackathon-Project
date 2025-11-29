module community_platform::profile {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use std::vector;

    // Error codes
    const EProfileAlreadyExists: u64 = 1;
    const EProfileNotFound: u64 = 2;
    const ENotAuthorized: u64 = 3;
    const EInvalidInput: u64 = 4;

    // User Profile - On-chain kullanıcı bilgileri
    public struct UserProfile has key, store {
        id: UID,
        user_address: address,         // zkLogin virtual wallet adresi
        intra_id: String,              // 42 Intra ID (örn: "syanak")
        email: String,                 // Email (zkLogin için)
        display_name: String,          // Görünen isim
        created_at: u64,               // Profil oluşturma zamanı

        // İstatistikler (NFT koşulları için)
        stats: UserStats,

        // Achievement tracking
        achievements: vector<ID>,      // Kazanılan NFT ID'leri

        // Reputation & Activity
        reputation_score: u64,         // Topluluk katkı puanı
        is_active: bool,               // Profil aktif mi?
    }

    // Kullanıcı istatistikleri
    public struct UserStats has store, copy, drop {
        tasks_created: u64,            // Oluşturulan task sayısı
        tasks_completed: u64,          // Tamamlanan task sayısı (katılıp bitirdiği)
        tasks_participated: u64,       // Katıldığı task sayısı
        donations_made: u64,           // Yapılan bağış sayısı
        total_donated_amount: u64,     // Toplam bağışlanan miktar (MIST)
        votes_cast: u64,               // Verilen oy sayısı
        proposals_approved: u64,       // Onaylanan proposal'ları
    }

    // Global Profile Registry - Tüm kullanıcıların merkezi kaydı
    public struct ProfileRegistry has key {
        id: UID,
        // address -> profile_id mapping
        profiles: Table<address, ID>,
        // intra_id -> address mapping (42 Intra ile arama için)
        intra_to_address: Table<String, address>,
        total_users: u64,
        admin: address,
    }

    // Events
    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        user_address: address,
        intra_id: String,
        email: String,
        timestamp: u64,
    }

    public struct ProfileUpdated has copy, drop {
        profile_id: ID,
        user_address: address,
        field_updated: String,
        timestamp: u64,
    }

    public struct StatsUpdated has copy, drop {
        user_address: address,
        stat_type: String,  // "task_created", "task_completed", "donation", etc.
        new_value: u64,
        timestamp: u64,
    }

    public struct AchievementAdded has copy, drop {
        user_address: address,
        achievement_id: ID,
        total_achievements: u64,
        timestamp: u64,
    }

    public struct ReputationChanged has copy, drop {
        user_address: address,
        old_reputation: u64,
        new_reputation: u64,
        reason: String,
        timestamp: u64,
    }

    // Initialize the registry (deploy zamanı bir kez çalışır)
    fun init(ctx: &mut TxContext) {
        let registry = ProfileRegistry {
            id: object::new(ctx),
            profiles: table::new(ctx),
            intra_to_address: table::new(ctx),
            total_users: 0,
            admin: tx_context::sender(ctx),
        };

        transfer::share_object(registry);
    }

    // Yeni kullanıcı profili oluştur
    // Frontend'den zkLogin ile giriş yapan kullanıcı için çağrılır
    public entry fun create_profile(
        registry: &mut ProfileRegistry,
        intra_id: vector<u8>,
        email: vector<u8>,
        display_name: vector<u8>,
        ctx: &mut TxContext
    ) {
        let user_address = tx_context::sender(ctx);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Kullanıcı zaten kayıtlı mı kontrol et
        assert!(!table::contains(&registry.profiles, user_address), EProfileAlreadyExists);

        let intra_id_string = string::utf8(intra_id);

        // Profil oluştur
        let profile_uid = object::new(ctx);
        let profile_id = object::uid_to_inner(&profile_uid);

        let profile = UserProfile {
            id: profile_uid,
            user_address,
            intra_id: intra_id_string,
            email: string::utf8(email),
            display_name: string::utf8(display_name),
            created_at: timestamp,
            stats: UserStats {
                tasks_created: 0,
                tasks_completed: 0,
                tasks_participated: 0,
                donations_made: 0,
                total_donated_amount: 0,
                votes_cast: 0,
                proposals_approved: 0,
            },
            achievements: vector::empty(),
            reputation_score: 0,
            is_active: true,
        };

        // Registry'ye ekle
        table::add(&mut registry.profiles, user_address, profile_id);
        table::add(&mut registry.intra_to_address, intra_id_string, user_address);
        registry.total_users = registry.total_users + 1;

        event::emit(ProfileCreated {
            profile_id,
            user_address,
            intra_id: intra_id_string,
            email: string::utf8(email),
            timestamp,
        });

        // Profili kullanıcıya transfer et (owned object)
        transfer::transfer(profile, user_address);
    }

    // Sponsorlu profil oluşturma - Sponsor wallet başka bir kullanıcı için profil oluşturur
    // Backend tarafından kullanılır (backend gas öder, kullanıcının profili oluşturulur)
    public entry fun create_profile_sponsored(
        registry: &mut ProfileRegistry,
        user_wallet_address: address,  // Profil oluşturulacak kullanıcının zkLogin wallet adresi
        intra_id: vector<u8>,
        email: vector<u8>,
        display_name: vector<u8>,
        ctx: &mut TxContext
    ) {
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Kullanıcı zaten kayıtlı mı kontrol et (sponsor değil, gerçek kullanıcı adresini kontrol et)
        assert!(!table::contains(&registry.profiles, user_wallet_address), EProfileAlreadyExists);

        let intra_id_string = string::utf8(intra_id);

        // Profil oluştur
        let profile_uid = object::new(ctx);
        let profile_id = object::uid_to_inner(&profile_uid);

        let profile = UserProfile {
            id: profile_uid,
            user_address: user_wallet_address,  // Gerçek kullanıcının adresi
            intra_id: intra_id_string,
            email: string::utf8(email),
            display_name: string::utf8(display_name),
            created_at: timestamp,
            stats: UserStats {
                tasks_created: 0,
                tasks_completed: 0,
                tasks_participated: 0,
                donations_made: 0,
                total_donated_amount: 0,
                votes_cast: 0,
                proposals_approved: 0,
            },
            achievements: vector::empty(),
            reputation_score: 0,
            is_active: true,
        };

        // Registry'ye ekle (gerçek kullanıcı adresini kullan)
        table::add(&mut registry.profiles, user_wallet_address, profile_id);
        table::add(&mut registry.intra_to_address, intra_id_string, user_wallet_address);
        registry.total_users = registry.total_users + 1;

        event::emit(ProfileCreated {
            profile_id,
            user_address: user_wallet_address,
            intra_id: intra_id_string,
            email: string::utf8(email),
            timestamp,
        });

        // Profili kullanıcıya transfer et (gerçek kullanıcıya)
        transfer::transfer(profile, user_wallet_address);
    }

    // Task oluşturulduğunda çağrılır
    public fun increment_tasks_created(profile: &mut UserProfile, ctx: &mut TxContext) {
        profile.stats.tasks_created = profile.stats.tasks_created + 1;
        profile.reputation_score = profile.reputation_score + 10; // +10 reputation

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(StatsUpdated {
            user_address: profile.user_address,
            stat_type: string::utf8(b"tasks_created"),
            new_value: profile.stats.tasks_created,
            timestamp,
        });
    }

    // Task'a katıldığında çağrılır
    public fun increment_tasks_participated(profile: &mut UserProfile, ctx: &mut TxContext) {
        profile.stats.tasks_participated = profile.stats.tasks_participated + 1;
        profile.reputation_score = profile.reputation_score + 5; // +5 reputation

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(StatsUpdated {
            user_address: profile.user_address,
            stat_type: string::utf8(b"tasks_participated"),
            new_value: profile.stats.tasks_participated,
            timestamp,
        });
    }

    // Task tamamlandığında çağrılır
    public fun increment_tasks_completed(profile: &mut UserProfile, ctx: &mut TxContext) {
        profile.stats.tasks_completed = profile.stats.tasks_completed + 1;
        profile.reputation_score = profile.reputation_score + 15; // +15 reputation

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(StatsUpdated {
            user_address: profile.user_address,
            stat_type: string::utf8(b"tasks_completed"),
            new_value: profile.stats.tasks_completed,
            timestamp,
        });
    }

    // Bağış yapıldığında çağrılır
    public fun increment_donations(
        profile: &mut UserProfile,
        amount: u64,
        ctx: &mut TxContext
    ) {
        profile.stats.donations_made = profile.stats.donations_made + 1;
        profile.stats.total_donated_amount = profile.stats.total_donated_amount + amount;
        profile.reputation_score = profile.reputation_score + 3; // +3 reputation per donation

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(StatsUpdated {
            user_address: profile.user_address,
            stat_type: string::utf8(b"donations_made"),
            new_value: profile.stats.donations_made,
            timestamp,
        });
    }

    // Oy kullanıldığında çağrılır
    public fun increment_votes_cast(profile: &mut UserProfile, ctx: &mut TxContext) {
        profile.stats.votes_cast = profile.stats.votes_cast + 1;
        profile.reputation_score = profile.reputation_score + 2; // +2 reputation

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(StatsUpdated {
            user_address: profile.user_address,
            stat_type: string::utf8(b"votes_cast"),
            new_value: profile.stats.votes_cast,
            timestamp,
        });
    }

    // Bağış yapıldığında çağrılır
    public fun increment_donations_made(profile: &mut UserProfile, ctx: &mut TxContext) {
        profile.stats.donations_made = profile.stats.donations_made + 1;
        profile.reputation_score = profile.reputation_score + 10; // +10 reputation for donations

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(StatsUpdated {
            user_address: profile.user_address,
            stat_type: string::utf8(b"donations_made"),
            new_value: profile.stats.donations_made,
            timestamp,
        });
    }

    // Bağış miktarını güncelle
    public fun add_donation_amount(profile: &mut UserProfile, amount: u64, ctx: &mut TxContext) {
        profile.stats.total_donated_amount = profile.stats.total_donated_amount + amount;

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(StatsUpdated {
            user_address: profile.user_address,
            stat_type: string::utf8(b"total_donated_amount"),
            new_value: profile.stats.total_donated_amount,
            timestamp,
        });
    }

    // Proposal onaylandığında çağrılır
    public fun increment_proposals_approved(profile: &mut UserProfile, ctx: &mut TxContext) {
        profile.stats.proposals_approved = profile.stats.proposals_approved + 1;
        profile.reputation_score = profile.reputation_score + 20; // +20 reputation

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(StatsUpdated {
            user_address: profile.user_address,
            stat_type: string::utf8(b"proposals_approved"),
            new_value: profile.stats.proposals_approved,
            timestamp,
        });
    }

    // Achievement NFT ekle
    public fun add_achievement(
        profile: &mut UserProfile,
        achievement_id: ID,
        ctx: &mut TxContext
    ) {
        vector::push_back(&mut profile.achievements, achievement_id);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(AchievementAdded {
            user_address: profile.user_address,
            achievement_id,
            total_achievements: vector::length(&profile.achievements),
            timestamp,
        });
    }

    // Manuel reputation güncelleme (admin tarafından)
    public entry fun update_reputation(
        profile: &mut UserProfile,
        new_reputation: u64,
        reason: vector<u8>,
        ctx: &mut TxContext
    ) {
        let old_reputation = profile.reputation_score;
        profile.reputation_score = new_reputation;

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        event::emit(ReputationChanged {
            user_address: profile.user_address,
            old_reputation,
            new_reputation,
            reason: string::utf8(reason),
            timestamp,
        });
    }

    // Profil bilgilerini güncelle
    public entry fun update_display_name(
        profile: &mut UserProfile,
        new_name: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == profile.user_address, ENotAuthorized);

        profile.display_name = string::utf8(new_name);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let profile_id = object::uid_to_inner(&profile.id);
        event::emit(ProfileUpdated {
            profile_id,
            user_address: profile.user_address,
            field_updated: string::utf8(b"display_name"),
            timestamp,
        });
    }

    // Profili devre dışı bırak
    public entry fun deactivate_profile(
        profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == profile.user_address, ENotAuthorized);
        profile.is_active = false;
    }

    // View functions (getter'lar)
    public fun get_profile_info(profile: &UserProfile): (address, String, String, String, u64, bool) {
        (
            profile.user_address,
            profile.intra_id,
            profile.email,
            profile.display_name,
            profile.created_at,
            profile.is_active
        )
    }

    public fun get_stats(profile: &UserProfile): UserStats {
        profile.stats
    }

    public fun get_reputation(profile: &UserProfile): u64 {
        profile.reputation_score
    }

    // Individual stat getters for external modules
    public fun get_tasks_completed(profile: &UserProfile): u64 {
        profile.stats.tasks_completed
    }

    public fun get_donations_made(profile: &UserProfile): u64 {
        profile.stats.donations_made
    }

    public fun get_total_donated_amount(profile: &UserProfile): u64 {
        profile.stats.total_donated_amount
    }

    public fun get_tasks_created(profile: &UserProfile): u64 {
        profile.stats.tasks_created
    }

    public fun get_tasks_participated(profile: &UserProfile): u64 {
        profile.stats.tasks_participated
    }

    public fun get_votes_cast(profile: &UserProfile): u64 {
        profile.stats.votes_cast
    }

    public fun get_proposals_approved(profile: &UserProfile): u64 {
        profile.stats.proposals_approved
    }

    public fun get_achievements_count(profile: &UserProfile): u64 {
        vector::length(&profile.achievements)
    }

    public fun get_total_users(registry: &ProfileRegistry): u64 {
        registry.total_users
    }

    // NFT eligibility check functions (achievement koşulları için)
    public fun is_eligible_for_first_task(profile: &UserProfile): bool {
        profile.stats.tasks_completed >= 1
    }

    public fun is_eligible_for_active_participant(profile: &UserProfile): bool {
        profile.stats.tasks_participated >= 10
    }

    public fun is_eligible_for_generous_donor(profile: &UserProfile): bool {
        // 10 SUI = 10_000_000_000 MIST
        profile.stats.total_donated_amount >= 10_000_000_000
    }

    public fun is_eligible_for_community_leader(profile: &UserProfile): bool {
        profile.stats.proposals_approved >= 5
    }

    public fun is_eligible_for_supporter(profile: &UserProfile): bool {
        profile.stats.donations_made >= 20
    }

    public fun is_eligible_for_volunteer(profile: &UserProfile): bool {
        profile.stats.tasks_completed >= 50
    }

    public fun is_eligible_for_legendary(profile: &UserProfile): bool {
        // Legendary: 100+ reputation ve 20+ task completed
        profile.reputation_score >= 100 && profile.stats.tasks_completed >= 20
    }

    // Test/Debug fonksiyonu (sadece testnet için)
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
