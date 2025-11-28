module community_platform::nft {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::url::{Self, Url};
    use sui::display;
    use sui::package;
    use std::string::{Self, String};

    // Error codes
    const ENotAuthorized: u64 = 1;
    const EInvalidAchievementType: u64 = 2;
    const EAlreadyClaimed: u64 = 3;

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
    }

    // One-time witness for Display
    public struct NFT has drop {}

    // Achievement registry to prevent duplicate claims
    public struct AchievementRegistry has key {
        id: UID,
        admin: address,
    }

    // User's achievement tracking
    public struct UserAchievements has key, store {
        id: UID,
        user_address: address,
        claimed_achievements: vector<u8>,
        total_nfts: u64,
    }

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

    public struct AchievementClaimed has copy, drop {
        user_address: address,
        achievement_type: u8,
        total_achievements: u64,
        timestamp: u64,
    }

    // Initialize the module
    fun init(otw: NFT, ctx: &mut TxContext) {
        let registry_uid = object::new(ctx);
        let admin = tx_context::sender(ctx);

        let registry = AchievementRegistry {
            id: registry_uid,
            admin,
        };

        transfer::share_object(registry);

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

    // Mint achievement NFT
    public fun mint_achievement(
        achievement_type: u8,
        recipient: address,
        tasks_completed: u64,
        donations_made: u64,
        total_donated_amount: u64,
        ctx: &mut TxContext
    ): AchievementNFT {
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let (name, description, image_url, rarity) = get_achievement_details(achievement_type);

        let metadata = AchievementMetadata {
            rarity,
            tasks_completed,
            donations_made,
            total_donated_amount,
        };

        let nft_uid = object::new(ctx);
        let nft_id = object::uid_to_inner(&nft_uid);

        let nft = AchievementNFT {
            id: nft_uid,
            name,
            description,
            achievement_type,
            image_url: url::new_unsafe_from_bytes(*string::bytes(&image_url)),
            earned_at: timestamp,
            recipient,
            metadata,
        };

        event::emit(AchievementUnlocked {
            recipient,
            achievement_type,
            achievement_name: name,
            rarity,
            timestamp,
        });

        event::emit(NFTMinted {
            nft_id,
            recipient,
            achievement_type,
            name,
            timestamp,
        });

        nft
    }

    // Public entry function to claim and mint achievement
    public entry fun claim_achievement(
        user_achievements: &mut UserAchievements,
        achievement_type: u8,
        tasks_completed: u64,
        donations_made: u64,
        total_donated_amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == user_achievements.user_address, ENotAuthorized);

        // Check if already claimed
        let mut i = 0;
        let len = vector::length(&user_achievements.claimed_achievements);
        while (i < len) {
            if (*vector::borrow(&user_achievements.claimed_achievements, i) == achievement_type) {
                abort EAlreadyClaimed
            };
            i = i + 1;
        };

        // Mark as claimed
        vector::push_back(&mut user_achievements.claimed_achievements, achievement_type);
        user_achievements.total_nfts = user_achievements.total_nfts + 1;

        // Mint NFT
        let nft = mint_achievement(
            achievement_type,
            user_achievements.user_address,
            tasks_completed,
            donations_made,
            total_donated_amount,
            ctx
        );

        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        event::emit(AchievementClaimed {
            user_address: user_achievements.user_address,
            achievement_type,
            total_achievements: user_achievements.total_nfts,
            timestamp,
        });

        // Transfer NFT to recipient
        transfer::public_transfer(nft, user_achievements.user_address);
    }

    // Create user achievements tracker
    public entry fun create_user_achievements(ctx: &mut TxContext) {
        let user_achievements = UserAchievements {
            id: object::new(ctx),
            user_address: tx_context::sender(ctx),
            claimed_achievements: vector::empty(),
            total_nfts: 0,
        };

        transfer::transfer(user_achievements, tx_context::sender(ctx));
    }

    // Helper function to get achievement details
    fun get_achievement_details(achievement_type: u8): (String, String, String, String) {
        if (achievement_type == ACHIEVEMENT_FIRST_TASK) {
            (
                string::utf8(b"First Task"),
                string::utf8(b"Completed your first task in the community"),
                string::utf8(b"https://example.com/nft/first_task.png"),
                string::utf8(b"Common")
            )
        } else if (achievement_type == ACHIEVEMENT_FIRST_DONATION) {
            (
                string::utf8(b"First Donation"),
                string::utf8(b"Made your first donation to support the community"),
                string::utf8(b"https://example.com/nft/first_donation.png"),
                string::utf8(b"Common")
            )
        } else if (achievement_type == ACHIEVEMENT_TASK_CREATOR) {
            (
                string::utf8(b"Task Creator"),
                string::utf8(b"Created your first community task"),
                string::utf8(b"https://example.com/nft/task_creator.png"),
                string::utf8(b"Rare")
            )
        } else if (achievement_type == ACHIEVEMENT_GENEROUS_DONOR) {
            (
                string::utf8(b"Generous Donor"),
                string::utf8(b"Donated more than 10 SUI to community tasks"),
                string::utf8(b"https://example.com/nft/generous_donor.png"),
                string::utf8(b"Rare")
            )
        } else if (achievement_type == ACHIEVEMENT_ACTIVE_PARTICIPANT) {
            (
                string::utf8(b"Active Participant"),
                string::utf8(b"Participated in 10+ community tasks"),
                string::utf8(b"https://example.com/nft/active_participant.png"),
                string::utf8(b"Rare")
            )
        } else if (achievement_type == ACHIEVEMENT_COMMUNITY_LEADER) {
            (
                string::utf8(b"Community Leader"),
                string::utf8(b"Created 5+ successful community tasks"),
                string::utf8(b"https://example.com/nft/community_leader.png"),
                string::utf8(b"Epic")
            )
        } else if (achievement_type == ACHIEVEMENT_SUPPORTER) {
            (
                string::utf8(b"Community Supporter"),
                string::utf8(b"Donated to 20+ different tasks"),
                string::utf8(b"https://example.com/nft/supporter.png"),
                string::utf8(b"Epic")
            )
        } else if (achievement_type == ACHIEVEMENT_VOLUNTEER) {
            (
                string::utf8(b"Super Volunteer"),
                string::utf8(b"Completed 50+ participation tasks"),
                string::utf8(b"https://example.com/nft/volunteer.png"),
                string::utf8(b"Legendary")
            )
        } else if (achievement_type == ACHIEVEMENT_LEGENDARY) {
            (
                string::utf8(b"Legendary Contributor"),
                string::utf8(b"Made an extraordinary contribution to the community"),
                string::utf8(b"https://example.com/nft/legendary.png"),
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

    public fun get_user_achievement_count(user_achievements: &UserAchievements): u64 {
        user_achievements.total_nfts
    }

    public fun has_claimed(user_achievements: &UserAchievements, achievement_type: u8): bool {
        let mut i = 0;
        let len = vector::length(&user_achievements.claimed_achievements);
        while (i < len) {
            if (*vector::borrow(&user_achievements.claimed_achievements, i) == achievement_type) {
                return true
            };
            i = i + 1;
        };
        false
    }
}
