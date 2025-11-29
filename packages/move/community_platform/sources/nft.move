module community_platform::nft {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::url::{Self, Url};
    use sui::display;
    use sui::package;
    use std::string::{Self, String};
    use community_platform::profile::{Self, UserProfile};

    // Error codes
    const ENotAuthorized: u64 = 1;
    const EInvalidAchievementType: u64 = 2;
    const ENotEligible: u64 = 3;

    // Achievement types
    const ACHIEVEMENT_FIRST_TASK: u8 = 0;
    const ACHIEVEMENT_FIRST_DONATION: u8 = 1;
    const ACHIEVEMENT_TASK_CREATOR: u8 = 2;
    const ACHIEVEMENT_GENEROUS_DONOR: u8 = 3;  // Donated > 10 SUI total
    const ACHIEVEMENT_ACTIVE_PARTICIPANT: u8 = 4;  // Participated in 10+ tasks
    const ACHIEVEMENT_COMMUNITY_LEADER: u8 = 5;  // Created 5+ successful tasks
    const ACHIEVEMENT_SUPPORTER: u8 = 6;  // Donated to 20+ tasks
    const ACHIEVEMENT_VOLUNTEER: u8 = 7;  // Completed 50+ participation tasks
    const ACHIEVEMENT_LEGENDARY: u8 = 8;  // Legendary contributor

    // Achievement NFT
    public struct AchievementNFT has key, store {
        id: UID,
        name: String,
        description: String,
        achievement_type: u8,
        image_url: Url,
        earned_at: u64,
        recipient: address,
        metadata: AchievementMetadata,
    }

    // Metadata for the achievement
    public struct AchievementMetadata has store, copy, drop {
        rarity: String,  // "Common", "Rare", "Epic", "Legendary"
        tasks_completed: u64,
        donations_made: u64,
        total_donated_amount: u64,
        reputation_score: u64,
    }

    // One-time witness for Display
    public struct NFT has drop {}

    // Events
    public struct AchievementUnlocked has copy, drop {
        recipient: address,
        achievement_type: u8,
        achievement_name: String,
        rarity: String,
        timestamp: u64,
    }

    public struct NFTMinted has copy, drop {
        nft_id: ID,
        recipient: address,
        achievement_type: u8,
        name: String,
        timestamp: u64,
    }

    // Initialize the module
    fun init(otw: NFT, ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        // Create display for NFTs (for wallets and marketplaces)
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"rarity"),
            string::utf8(b"achievement_type"),
        ];

        let values = vector[
            string::utf8(b"{name}"),
            string::utf8(b"{description}"),
            string::utf8(b"{image_url}"),
            string::utf8(b"{metadata.rarity}"),
            string::utf8(b"{achievement_type}"),
        ];

        let publisher = package::claim(otw, ctx);
        let mut display_obj = display::new_with_fields<AchievementNFT>(
            &publisher, keys, values, ctx
        );
        display::update_version(&mut display_obj);

        transfer::public_transfer(publisher, admin);
        transfer::public_transfer(display_obj, admin);
    }

    // Mint achievement NFT - UserProfile ile entegre
    // Bu fonksiyon NFT'yi mint eder VE UserProfile'a achievement ID'yi ekler
    public entry fun claim_and_mint_achievement(
        user_profile: &mut UserProfile,
        achievement_type: u8,
        ctx: &mut TxContext
    ) {
        let user_address = tx_context::sender(ctx);

        // Kullanıcı kendi profili mi kontrol et
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(user_profile);
        assert!(user_address == profile_address, ENotAuthorized);

        // Eligibility check - kullanıcı bu achievement'ı kazanmaya uygun mu?
        assert!(check_eligibility(user_profile, achievement_type), ENotEligible);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let (name, description, image_url, rarity) = get_achievement_details(achievement_type);

        let metadata = AchievementMetadata {
            rarity,
            tasks_completed: profile::get_tasks_completed(user_profile),
            donations_made: profile::get_donations_made(user_profile),
            total_donated_amount: profile::get_total_donated_amount(user_profile),
            reputation_score: profile::get_reputation(user_profile),
        };

        let nft_uid = object::new(ctx);
        let nft_id = object::uid_to_inner(&nft_uid);

        let nft = AchievementNFT {
            id: nft_uid,
            name,
            description,
            achievement_type,
            image_url: url::new_unsafe_from_bytes(*string::as_bytes(&image_url)),
            earned_at: timestamp,
            recipient: user_address,
            metadata,
        };

        event::emit(AchievementUnlocked {
            recipient: user_address,
            achievement_type,
            achievement_name: name,
            rarity,
            timestamp,
        });

        event::emit(NFTMinted {
            nft_id,
            recipient: user_address,
            achievement_type,
            name,
            timestamp,
        });

        // UserProfile'a achievement ekle
        profile::add_achievement(user_profile, nft_id, ctx);

        // NFT'yi kullanıcıya transfer et
        transfer::public_transfer(nft, user_address);
    }

    // Sponsorlu NFT claim - Backend sponsor wallet başka bir kullanıcı adına NFT mint eder
    // Bu fonksiyon wallet bağlamadan NFT almak için kullanılır
    public entry fun claim_and_mint_achievement_sponsored(
        user_profile: &mut UserProfile,
        recipient_address: address,  // NFT'yi alacak kullanıcının adresi
        achievement_type: u8,
        ctx: &mut TxContext
    ) {
        // Profil sahibi kontrolü - recipient_address profil sahibi olmalı
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(user_profile);
        assert!(recipient_address == profile_address, ENotAuthorized);

        // Eligibility check - kullanıcı bu achievement'ı kazanmaya uygun mu?
        assert!(check_eligibility(user_profile, achievement_type), ENotEligible);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let (name, description, image_url, rarity) = get_achievement_details(achievement_type);

        let metadata = AchievementMetadata {
            rarity,
            tasks_completed: profile::get_tasks_completed(user_profile),
            donations_made: profile::get_donations_made(user_profile),
            total_donated_amount: profile::get_total_donated_amount(user_profile),
            reputation_score: profile::get_reputation(user_profile),
        };

        let nft_uid = object::new(ctx);
        let nft_id = object::uid_to_inner(&nft_uid);

        let nft = AchievementNFT {
            id: nft_uid,
            name,
            description,
            achievement_type,
            image_url: url::new_unsafe_from_bytes(*string::as_bytes(&image_url)),
            earned_at: timestamp,
            recipient: recipient_address,
            metadata,
        };

        event::emit(AchievementUnlocked {
            recipient: recipient_address,
            achievement_type,
            achievement_name: name,
            rarity,
            timestamp,
        });

        event::emit(NFTMinted {
            nft_id,
            recipient: recipient_address,
            achievement_type,
            name,
            timestamp,
        });

        // UserProfile'a achievement ekle
        profile::add_achievement(user_profile, nft_id, ctx);

        // NFT'yi kullanıcıya transfer et (recipient_address'e)
        transfer::public_transfer(nft, recipient_address);
    }

    // Doğrudan NFT mint - UserProfile kullanmadan (Eligibility backend'de kontrol edilir)
    // Bu fonksiyon owned object erişim sorunu olmadan sponsor wallet ile çalışır
    public entry fun mint_achievement_direct_sponsored(
        recipient_address: address,  // NFT'yi alacak kullanıcının adresi
        achievement_type: u8,
        // Backend'den gelen stats (eligibility kontrolü için)
        tasks_completed: u64,
        donations_made: u64,
        total_donated: u64,
        reputation_score: u64,
        ctx: &mut TxContext
    ) {
        // Achievement type valid mi?
        assert!(achievement_type <= ACHIEVEMENT_LEGENDARY, EInvalidAchievementType);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let (name, description, image_url, rarity) = get_achievement_details(achievement_type);

        let metadata = AchievementMetadata {
            rarity,
            tasks_completed,
            donations_made,
            total_donated_amount: total_donated,
            reputation_score,
        };

        let nft_uid = object::new(ctx);
        let nft_id = object::uid_to_inner(&nft_uid);

        let nft = AchievementNFT {
            id: nft_uid,
            name,
            description,
            achievement_type,
            image_url: url::new_unsafe_from_bytes(*string::as_bytes(&image_url)),
            earned_at: timestamp,
            recipient: recipient_address,
            metadata,
        };

        event::emit(AchievementUnlocked {
            recipient: recipient_address,
            achievement_type,
            achievement_name: name,
            rarity,
            timestamp,
        });

        event::emit(NFTMinted {
            nft_id,
            recipient: recipient_address,
            achievement_type,
            name,
            timestamp,
        });

        // NFT'yi kullanıcıya transfer et
        transfer::public_transfer(nft, recipient_address);
    }

    // Check if user is eligible for an achievement
    fun check_eligibility(user_profile: &UserProfile, achievement_type: u8): bool {
        if (achievement_type == ACHIEVEMENT_FIRST_TASK) {
            profile::is_eligible_for_first_task(user_profile)
        } else if (achievement_type == ACHIEVEMENT_ACTIVE_PARTICIPANT) {
            profile::is_eligible_for_active_participant(user_profile)
        } else if (achievement_type == ACHIEVEMENT_GENEROUS_DONOR) {
            profile::is_eligible_for_generous_donor(user_profile)
        } else if (achievement_type == ACHIEVEMENT_COMMUNITY_LEADER) {
            profile::is_eligible_for_community_leader(user_profile)
        } else if (achievement_type == ACHIEVEMENT_SUPPORTER) {
            profile::is_eligible_for_supporter(user_profile)
        } else if (achievement_type == ACHIEVEMENT_VOLUNTEER) {
            profile::is_eligible_for_volunteer(user_profile)
        } else if (achievement_type == ACHIEVEMENT_LEGENDARY) {
            profile::is_eligible_for_legendary(user_profile)
        } else {
            false
        }
    }

    // Helper function to get achievement details
    fun get_achievement_details(achievement_type: u8): (String, String, String, String) {
        if (achievement_type == ACHIEVEMENT_FIRST_TASK) {
            (
                string::utf8(b"First Task Completed"),
                string::utf8(b"Completed your first task in the 42 community"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=first-task&backgroundColor=4ade80"),
                string::utf8(b"Common")
            )
        } else if (achievement_type == ACHIEVEMENT_FIRST_DONATION) {
            (
                string::utf8(b"First Donation"),
                string::utf8(b"Made your first donation to support the community"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=first-donation&backgroundColor=f472b6"),
                string::utf8(b"Common")
            )
        } else if (achievement_type == ACHIEVEMENT_TASK_CREATOR) {
            (
                string::utf8(b"Task Creator"),
                string::utf8(b"Created your first community task"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=task-creator&backgroundColor=60a5fa"),
                string::utf8(b"Rare")
            )
        } else if (achievement_type == ACHIEVEMENT_GENEROUS_DONOR) {
            (
                string::utf8(b"Generous Donor"),
                string::utf8(b"Donated more than 10 SUI to community tasks"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=generous-donor&backgroundColor=38bdf8"),
                string::utf8(b"Rare")
            )
        } else if (achievement_type == ACHIEVEMENT_ACTIVE_PARTICIPANT) {
            (
                string::utf8(b"Active Participant"),
                string::utf8(b"Participated in 10+ community tasks"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=active-participant&backgroundColor=818cf8"),
                string::utf8(b"Rare")
            )
        } else if (achievement_type == ACHIEVEMENT_COMMUNITY_LEADER) {
            (
                string::utf8(b"Community Leader"),
                string::utf8(b"Created 5+ successful community tasks"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=community-leader&backgroundColor=a78bfa"),
                string::utf8(b"Epic")
            )
        } else if (achievement_type == ACHIEVEMENT_SUPPORTER) {
            (
                string::utf8(b"Community Supporter"),
                string::utf8(b"Donated to 20+ different tasks"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=supporter&backgroundColor=c084fc"),
                string::utf8(b"Epic")
            )
        } else if (achievement_type == ACHIEVEMENT_VOLUNTEER) {
            (
                string::utf8(b"Super Volunteer"),
                string::utf8(b"Completed 50+ participation tasks"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=super-volunteer&backgroundColor=fb923c"),
                string::utf8(b"Legendary")
            )
        } else if (achievement_type == ACHIEVEMENT_LEGENDARY) {
            (
                string::utf8(b"Legendary 42 Contributor"),
                string::utf8(b"Made an extraordinary contribution to the 42 Turkey community"),
                string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed=legendary-42&backgroundColor=fbbf24"),
                string::utf8(b"Legendary")
            )
        } else {
            abort EInvalidAchievementType
        }
    }

    // View functions
    public fun get_nft_info(nft: &AchievementNFT): (String, String, u8, address, u64) {
        (
            nft.name,
            nft.description,
            nft.achievement_type,
            nft.recipient,
            nft.earned_at
        )
    }

    public fun get_nft_metadata(nft: &AchievementNFT): AchievementMetadata {
        nft.metadata
    }

    // Test/Debug fonksiyonu
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let otw = NFT {};
        init(otw, ctx);
    }
}
