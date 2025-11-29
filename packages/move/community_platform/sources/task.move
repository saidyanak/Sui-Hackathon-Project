module community_platform::task {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::balance::{Self, Balance};
    use std::string::{Self, String};
    use std::vector;
    use community_platform::profile::{Self, UserProfile};

    // Error codes
    const ENotTaskCreator: u64 = 1;
    const ETaskNotVoting: u64 = 2;
    const ETaskNotActive: u64 = 3;
    const EInvalidTaskType: u64 = 4;
    const EInsufficientAmount: u64 = 5;
    const ETaskNotCompleted: u64 = 6;
    const EAlreadyParticipant: u64 = 7;
    const EAlreadyVoted: u64 = 8;
    const EParticipantLimitReached: u64 = 9;
    const ENotEnoughParticipants: u64 = 10;

    // Task types
    const TASK_TYPE_PARTICIPATION: u8 = 0;   // Katılım (halısaha, hackathon vb)
    const TASK_TYPE_PROPOSAL: u8 = 1;         // Para gerektiren proje (tost makinesi vb)

    // Task status
    const TASK_STATUS_VOTING: u8 = 0;        // Oylama aşamasında
    const TASK_STATUS_ACTIVE: u8 = 1;        // Onaylandı, aktif
    const TASK_STATUS_REJECTED: u8 = 2;      // Oylama reddedildi
    const TASK_STATUS_COMPLETED: u8 = 3;     // Tamamlandı
    const TASK_STATUS_CANCELLED: u8 = 4;     // İptal edildi

    // Vote types
    const VOTE_YES: u8 = 1;
    const VOTE_NO: u8 = 0;

    // Main Task object
    public struct Task has key, store {
        id: UID,
        title: String,
        description: String,
        task_type: u8,              // 0: PARTICIPATION, 1: PROPOSAL
        status: u8,                 // 0: VOTING, 1: ACTIVE, 2: REJECTED, 3: COMPLETED, 4: CANCELLED
        creator: address,
        budget_amount: u64,         // Proposal için bütçe (MIST)
        balance: Balance<SUI>,      // Toplanan bağışlar
        participants: vector<address>,
        comments: vector<Comment>,
        votes: vector<Vote>,
        donations: vector<DonationRecord>,  // Bağış kayıtları
        min_participants: u64,
        max_participants: u64,
        voting_end_date: u64,       // Oylama bitiş tarihi
        created_at: u64,
    }

    // Comment structure
    public struct Comment has store, copy, drop {
        author: address,
        content: String,
        timestamp: u64,
    }

    // Vote structure
    public struct Vote has store, copy, drop {
        voter: address,
        vote_type: u8,  // 1 = yes, 0 = no
        timestamp: u64,
    }

    // Donation record structure
    public struct DonationRecord has store, copy, drop {
        donor: address,
        amount: u64,
        message: String,
        timestamp: u64,
    }

    // Events
    public struct TaskCreated has copy, drop {
        task_id: ID,
        creator: address,
        title: String,
        task_type: u8,
        budget_amount: u64,
        voting_end_date: u64,
        timestamp: u64,
    }

    public struct VoteCast has copy, drop {
        task_id: ID,
        voter: address,
        vote_type: u8,
        yes_votes: u64,
        no_votes: u64,
        timestamp: u64,
    }

    public struct TaskApproved has copy, drop {
        task_id: ID,
        yes_votes: u64,
        no_votes: u64,
        timestamp: u64,
    }

    public struct TaskRejected has copy, drop {
        task_id: ID,
        yes_votes: u64,
        no_votes: u64,
        timestamp: u64,
    }

    public struct ParticipantJoined has copy, drop {
        task_id: ID,
        participant: address,
        total_participants: u64,
        timestamp: u64,
    }

    public struct TaskCompleted has copy, drop {
        task_id: ID,
        completion_type: String,
        total_participants: u64,
        timestamp: u64,
    }

    public struct TaskCancelled has copy, drop {
        task_id: ID,
        reason: String,
        timestamp: u64,
    }

    public struct CommentAdded has copy, drop {
        task_id: ID,
        author: address,
        content: String,
        timestamp: u64,
    }

    public struct FundsTransferred has copy, drop {
        task_id: ID,
        from: address,
        to: address,
        amount: u64,
        timestamp: u64,
    }

    // Donation kaydedildi eventi
    public struct DonationRecorded has copy, drop {
        task_id: ID,
        donor: address,
        amount: u64,
        message: String,
        total_donations: u64,
        timestamp: u64,
    }

    // Create a new task (starts in VOTING status)
    // Kullanıcı profili ile entegre - task oluşturulduğunda stats güncellenir
    public entry fun create_task(
        user_profile: &mut UserProfile,
        title: vector<u8>,
        description: vector<u8>,
        task_type: u8,
        budget_amount: u64,
        min_participants: u64,
        max_participants: u64,
        voting_end_date: u64,
        ctx: &mut TxContext
    ) {
        assert!(task_type <= TASK_TYPE_PROPOSAL, EInvalidTaskType);

        let creator = tx_context::sender(ctx);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(user_profile);
        assert!(creator == profile_address, ENotTaskCreator);

        let task_uid = object::new(ctx);
        let task_id = object::uid_to_inner(&task_uid);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let task = Task {
            id: task_uid,
            title: string::utf8(title),
            description: string::utf8(description),
            task_type,
            status: TASK_STATUS_VOTING,  // Tüm tasklar oylama ile başlar
            creator,
            budget_amount,
            balance: balance::zero(),
            participants: vector::empty(),
            comments: vector::empty(),
            votes: vector::empty(),
            donations: vector::empty(),
            min_participants,
            max_participants,
            voting_end_date,
            created_at: timestamp,
        };

        event::emit(TaskCreated {
            task_id,
            creator,
            title: task.title,
            task_type,
            budget_amount,
            voting_end_date,
            timestamp,
        });

        // Kullanıcı profilini güncelle
        profile::increment_tasks_created(user_profile, ctx);

        transfer::share_object(task);
    }

    // Sponsorlu task oluşturma - Backend sponsor wallet başka bir kullanıcı adına task oluşturur
    // Backend tarafından kullanılır (backend gas öder, kullanıcı adına task oluşturulur)
    // NOT: Bu fonksiyon profil güncelleme yapmaz, kullanıcı claim_task_creation() ile profilini güncelleyecek
    public entry fun create_task_sponsored(
        creator_address: address,  // Task'ı oluşturan kullanıcının adresi
        title: vector<u8>,
        description: vector<u8>,
        task_type: u8,
        budget_amount: u64,
        max_participants: u64,     // Katılımcı limiti (0 = sınırsız)
        voting_end_date: u64,
        ctx: &mut TxContext
    ) {
        assert!(task_type <= TASK_TYPE_PROPOSAL, EInvalidTaskType);

        let task_uid = object::new(ctx);
        let task_id = object::uid_to_inner(&task_uid);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let task = Task {
            id: task_uid,
            title: string::utf8(title),
            description: string::utf8(description),
            task_type,
            status: TASK_STATUS_VOTING,  // Tüm tasklar oylama ile başlar
            creator: creator_address,    // Gerçek kullanıcının adresi
            budget_amount,
            balance: balance::zero(),
            participants: vector::empty(),
            comments: vector::empty(),
            votes: vector::empty(),
            donations: vector::empty(),
            min_participants: 0,         // Min participants artık kullanılmıyor
            max_participants,
            voting_end_date,
            created_at: timestamp,
        };

        event::emit(TaskCreated {
            task_id,
            creator: creator_address,
            title: task.title,
            task_type,
            budget_amount,
            voting_end_date,
            timestamp,
        });

        // NOT: Profil güncellemesi claim_task_creation() ile yapılacak

        transfer::share_object(task);
    }

    // Task oluşturulduktan sonra kullanıcı bu fonksiyonu çağırarak profilini günceller
    // Bu sayede sponsorlu işlemlerde de stats takibi yapılabilir
    public entry fun claim_task_creation(
        task: &Task,
        creator_profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        let creator = tx_context::sender(ctx);

        // Sadece task creator'ı çağırabilir
        assert!(task.creator == creator, ENotTaskCreator);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(creator_profile);
        assert!(creator == profile_address, ENotTaskCreator);

        // Profili güncelle
        profile::increment_tasks_created(creator_profile, ctx);
    }

    // Sponsorlu oy kullanma - Backend sponsor wallet başka bir kullanıcı adına oy kullanır
    public entry fun vote_task_sponsored(
        task: &mut Task,
        voter_address: address,  // Oy kullanan kullanıcının adresi
        vote_type: u8, // 1 = yes, 0 = no
        ctx: &mut TxContext
    ) {
        assert!(task.status == TASK_STATUS_VOTING, ETaskNotVoting);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        // Check if already voted
        let mut i = 0;
        let len = vector::length(&task.votes);
        while (i < len) {
            if (vector::borrow(&task.votes, i).voter == voter_address) {
                abort EAlreadyVoted
            };
            i = i + 1;
        };

        // Add vote
        let vote = Vote {
            voter: voter_address,
            vote_type,
            timestamp,
        };
        vector::push_back(&mut task.votes, vote);

        // Count votes
        let (yes_votes, no_votes) = count_votes(task);

        event::emit(VoteCast {
            task_id,
            voter: voter_address,
            vote_type,
            yes_votes,
            no_votes,
            timestamp,
        });

        // NOT: Profil güncellemesi claim_vote() ile yapılacak
    }

    // Oy kullandıktan sonra kullanıcı bu fonksiyonu çağırarak profilini günceller
    public entry fun claim_vote(
        task: &Task,
        voter_profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        let voter = tx_context::sender(ctx);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(voter_profile);
        assert!(voter == profile_address, ENotTaskCreator);

        // Kullanıcı bu task'ta oy kullanmış olmalı
        assert!(has_voted(task, voter), ENotTaskCreator);

        // Profili güncelle
        profile::increment_votes_cast(voter_profile, ctx);
    }

    // Sponsorlu task'a katılma - Backend sponsor wallet başka bir kullanıcı adına katılır
    public entry fun join_task_sponsored(
        task: &mut Task,
        participant_address: address,  // Katılan kullanıcının adresi
        ctx: &mut TxContext
    ) {
        assert!(task.task_type == TASK_TYPE_PARTICIPATION, EInvalidTaskType);
        assert!(task.status == TASK_STATUS_ACTIVE, ETaskNotActive);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);
        let current_count = vector::length(&task.participants);

        // Check max participants limit
        if (task.max_participants > 0) {
            assert!(current_count < task.max_participants, EParticipantLimitReached);
        };

        // Check if already participant
        let mut i = 0;
        let len = vector::length(&task.participants);
        while (i < len) {
            if (*vector::borrow(&task.participants, i) == participant_address) {
                abort EAlreadyParticipant
            };
            i = i + 1;
        };

        vector::push_back(&mut task.participants, participant_address);

        event::emit(ParticipantJoined {
            task_id,
            participant: participant_address,
            total_participants: vector::length(&task.participants),
            timestamp,
        });

        // NOT: Profil güncellemesi claim_task_participation() ile yapılacak

        // Auto-complete if max reached
        if (task.max_participants > 0 && vector::length(&task.participants) >= task.max_participants) {
            task.status = TASK_STATUS_COMPLETED;
            event::emit(TaskCompleted {
                task_id,
                completion_type: string::utf8(b"participants_full"),
                total_participants: vector::length(&task.participants),
                timestamp,
            });
        };
    }

    // Task'a katıldıktan sonra kullanıcı bu fonksiyonu çağırarak profilini günceller
    public entry fun claim_task_participation(
        task: &Task,
        participant_profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        let participant = tx_context::sender(ctx);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(participant_profile);
        assert!(participant == profile_address, ENotTaskCreator);

        // Kullanıcı bu task'ın katılımcısı olmalı
        assert!(is_participant(task, participant), ENotTaskCreator);

        // Profili güncelle
        profile::increment_tasks_participated(participant_profile, ctx);
    }

    // Vote on a task (any task type can be voted on)
    // Kullanıcı profili ile entegre - oy kullanıldığında stats güncellenir
    public entry fun vote_task(
        task: &mut Task,
        user_profile: &mut UserProfile,
        vote_type: u8, // 1 = yes, 0 = no
        ctx: &mut TxContext
    ) {
        assert!(task.status == TASK_STATUS_VOTING, ETaskNotVoting);

        let voter = tx_context::sender(ctx);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(user_profile);
        assert!(voter == profile_address, ENotTaskCreator);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        // Check if already voted
        let mut i = 0;
        let len = vector::length(&task.votes);
        while (i < len) {
            if (vector::borrow(&task.votes, i).voter == voter) {
                abort EAlreadyVoted
            };
            i = i + 1;
        };

        // Add vote
        let vote = Vote {
            voter,
            vote_type,
            timestamp,
        };
        vector::push_back(&mut task.votes, vote);

        // Count votes
        let (yes_votes, no_votes) = count_votes(task);

        event::emit(VoteCast {
            task_id,
            voter,
            vote_type,
            yes_votes,
            no_votes,
            timestamp,
        });

        // Kullanıcı profilini güncelle
        profile::increment_votes_cast(user_profile, ctx);
    }

    // Finalize voting (can be called after voting_end_date)
    // For PROPOSAL: transfers budget from sponsor to creator if approved
    // For PARTICIPATION: just activates the task if approved
    public entry fun finalize_voting(
        task: &mut Task,
        sponsor_payment: Coin<SUI>, // Sponsor cüzdan buradan para gönderir (sadece PROPOSAL için)
        ctx: &mut TxContext
    ) {
        assert!(task.status == TASK_STATUS_VOTING, ETaskNotVoting);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        // Count votes
        let (yes_votes, no_votes) = count_votes(task);
        let total_votes = yes_votes + no_votes;

        // Check if >50% voted yes
        if (total_votes > 0 && yes_votes * 100 > total_votes * 50) {
            // APPROVED
            task.status = TASK_STATUS_ACTIVE;

            event::emit(TaskApproved {
                task_id,
                yes_votes,
                no_votes,
                timestamp,
            });

            // If PROPOSAL, transfer budget from sponsor to creator
            if (task.task_type == TASK_TYPE_PROPOSAL) {
                let amount = coin::value(&sponsor_payment);
                let sponsor = tx_context::sender(ctx);

                transfer::public_transfer(sponsor_payment, task.creator);

                event::emit(FundsTransferred {
                    task_id,
                    from: sponsor,
                    to: task.creator,
                    amount,
                    timestamp,
                });
                // NOT: Creator'ın profilini güncellemek için ayrı bir fonksiyon çağrılmalı
                // claim_proposal_approval() fonksiyonu ile
            } else {
                // PARTICIPATION - return payment to sender
                transfer::public_transfer(sponsor_payment, tx_context::sender(ctx));
            };
        } else {
            // REJECTED
            task.status = TASK_STATUS_REJECTED;

            // Return payment to sponsor
            transfer::public_transfer(sponsor_payment, tx_context::sender(ctx));

            event::emit(TaskRejected {
                task_id,
                yes_votes,
                no_votes,
                timestamp,
            });
        };
    }

    // Proposal onaylandıktan sonra creator bu fonksiyonu çağırarak profilini günceller
    public entry fun claim_proposal_approval(
        task: &Task,
        creator_profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        let creator = tx_context::sender(ctx);

        // Sadece task creator'ı çağırabilir
        assert!(task.creator == creator, ENotTaskCreator);

        // Sadece onaylanmış PROPOSAL task'lar için
        assert!(task.task_type == TASK_TYPE_PROPOSAL, EInvalidTaskType);
        assert!(task.status == TASK_STATUS_ACTIVE || task.status == TASK_STATUS_COMPLETED, ETaskNotActive);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(creator_profile);
        assert!(creator == profile_address, ENotTaskCreator);

        // Profili güncelle
        profile::increment_proposals_approved(creator_profile, ctx);
    }

    // Count votes helper
    fun count_votes(task: &Task): (u64, u64) {
        let mut yes_count = 0;
        let mut no_count = 0;
        let mut i = 0;
        let len = vector::length(&task.votes);

        while (i < len) {
            let vote = vector::borrow(&task.votes, i);
            if (vote.vote_type == VOTE_YES) {
                yes_count = yes_count + 1;
            } else {
                no_count = no_count + 1;
            };
            i = i + 1;
        };

        (yes_count, no_count)
    }

    // Join a participation task (only for PARTICIPATION type, only when ACTIVE)
    // Kullanıcı profili ile entegre - katıldığında stats güncellenir
    public entry fun join_task(
        task: &mut Task,
        user_profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        assert!(task.task_type == TASK_TYPE_PARTICIPATION, EInvalidTaskType);
        assert!(task.status == TASK_STATUS_ACTIVE, ETaskNotActive);

        let participant = tx_context::sender(ctx);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(user_profile);
        assert!(participant == profile_address, ENotTaskCreator);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);
        let current_count = vector::length(&task.participants);

        // Check max participants limit
        if (task.max_participants > 0) {
            assert!(current_count < task.max_participants, EParticipantLimitReached);
        };

        // Check if already participant
        let mut i = 0;
        let len = vector::length(&task.participants);
        while (i < len) {
            if (*vector::borrow(&task.participants, i) == participant) {
                abort EAlreadyParticipant
            };
            i = i + 1;
        };

        vector::push_back(&mut task.participants, participant);

        event::emit(ParticipantJoined {
            task_id,
            participant,
            total_participants: vector::length(&task.participants),
            timestamp,
        });

        // Kullanıcı profilini güncelle
        profile::increment_tasks_participated(user_profile, ctx);

        // Auto-complete if max reached
        if (task.max_participants > 0 && vector::length(&task.participants) >= task.max_participants) {
            task.status = TASK_STATUS_COMPLETED;
            event::emit(TaskCompleted {
                task_id,
                completion_type: string::utf8(b"participants_full"),
                total_participants: vector::length(&task.participants),
                timestamp,
            });
        };
    }

    // Add comment to task
    public entry fun add_comment(
        task: &mut Task,
        author: address,
        content: vector<u8>,
        ctx: &mut TxContext
    ) {
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        let comment = Comment {
            author,
            content: string::utf8(content),
            timestamp,
        };

        vector::push_back(&mut task.comments, comment);

        event::emit(CommentAdded {
            task_id,
            author,
            content: string::utf8(content),
            timestamp,
        });
    }

    // Complete task manually (only creator, only PARTICIPATION tasks)
    public entry fun complete_task(
        task: &mut Task,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == task.creator, ENotTaskCreator);
        assert!(task.status == TASK_STATUS_ACTIVE, ETaskNotActive);
        assert!(task.task_type == TASK_TYPE_PARTICIPATION, EInvalidTaskType);

        // Check min participants requirement
        if (task.min_participants > 0) {
            assert!(vector::length(&task.participants) >= task.min_participants, ENotEnoughParticipants);
        };

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        task.status = TASK_STATUS_COMPLETED;

        event::emit(TaskCompleted {
            task_id,
            completion_type: string::utf8(b"manual"),
            total_participants: vector::length(&task.participants),
            timestamp,
        });
        // NOT: Katılımcılar claim_task_completion() fonksiyonu ile profillerini güncelleyecek
    }

    // Task tamamlandıktan sonra katılımcılar bu fonksiyonu çağırarak profillerini günceller
    // Bu sayede NFT koşullarına (tasks_completed) uygunluk kontrolü yapılabilir
    public entry fun claim_task_completion(
        task: &Task,
        participant_profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        let participant = tx_context::sender(ctx);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(participant_profile);
        assert!(participant == profile_address, ENotTaskCreator);

        // Task tamamlanmış olmalı
        assert!(task.status == TASK_STATUS_COMPLETED, ETaskNotActive);

        // Kullanıcı bu task'ın katılımcısı olmalı
        assert!(is_participant(task, participant), ENotTaskCreator);

        // Profili güncelle
        profile::increment_tasks_completed(participant_profile, ctx);
    }

    // Cancel task (only creator)
    public entry fun cancel_task(
        task: &mut Task,
        reason: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == task.creator, ENotTaskCreator);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        task.status = TASK_STATUS_CANCELLED;

        event::emit(TaskCancelled {
            task_id,
            reason: string::utf8(reason),
            timestamp,
        });
    }

    // View functions (getters)
    public fun get_task_info(task: &Task): (String, String, u8, u8, address) {
        (
            task.title,
            task.description,
            task.task_type,
            task.status,
            task.creator
        )
    }

    public fun get_task_budget(task: &Task): u64 {
        task.budget_amount
    }

    public fun get_task_dates(task: &Task): (u64, u64) {
        (
            task.voting_end_date,
            task.created_at
        )
    }

    public fun get_participants_count(task: &Task): u64 {
        vector::length(&task.participants)
    }

    public fun get_comments_count(task: &Task): u64 {
        vector::length(&task.comments)
    }

    public fun get_votes_count(task: &Task): (u64, u64) {
        count_votes(task)
    }

    public fun get_participant_limits(task: &Task): (u64, u64) {
        (task.min_participants, task.max_participants)
    }

    public fun is_participant(task: &Task, addr: address): bool {
        let mut i = 0;
        let len = vector::length(&task.participants);
        while (i < len) {
            if (*vector::borrow(&task.participants, i) == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    public fun has_voted(task: &Task, addr: address): bool {
        let mut i = 0;
        let len = vector::length(&task.votes);
        while (i < len) {
            if (vector::borrow(&task.votes, i).voter == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    // Sponsorlu bağış kaydı - Backend sponsor wallet bağışı kaydeder
    // Gerçek SUI transferi frontend'den sponsor wallet'a yapılır
    public entry fun record_donation_sponsored(
        task: &mut Task,
        donor_address: address,
        amount: u64,
        message: vector<u8>,
        ctx: &mut TxContext
    ) {
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        // Bağış kaydı oluştur
        let donation = DonationRecord {
            donor: donor_address,
            amount,
            message: string::utf8(message),
            timestamp,
        };

        vector::push_back(&mut task.donations, donation);

        // Event emit et
        event::emit(DonationRecorded {
            task_id,
            donor: donor_address,
            amount,
            message: string::utf8(message),
            total_donations: vector::length(&task.donations),
            timestamp,
        });
    }

    // Bağış yaptıktan sonra kullanıcı profilini günceller (claim donation NFT için)
    public entry fun claim_donation(
        task: &Task,
        donor_profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        let donor = tx_context::sender(ctx);

        // Profil sahibi kontrolü
        let (profile_address, _, _, _, _, _) = profile::get_profile_info(donor_profile);
        assert!(donor == profile_address, ENotTaskCreator);

        // Kullanıcı bu task'a bağış yapmış olmalı
        assert!(has_donated(task, donor), ENotTaskCreator);

        // Profili güncelle - donation stats
        profile::increment_donations_made(donor_profile, ctx);
    }

    // Kullanıcının bağış yapıp yapmadığını kontrol et
    public fun has_donated(task: &Task, addr: address): bool {
        let mut i = 0;
        let len = vector::length(&task.donations);
        while (i < len) {
            if (vector::borrow(&task.donations, i).donor == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    // Toplam bağış miktarını döndür
    public fun get_total_donations_amount(task: &Task): u64 {
        let mut total = 0u64;
        let mut i = 0;
        let len = vector::length(&task.donations);
        while (i < len) {
            total = total + vector::borrow(&task.donations, i).amount;
            i = i + 1;
        };
        total
    }

    // Bağış sayısını döndür
    public fun get_donations_count(task: &Task): u64 {
        vector::length(&task.donations)
    }
}

