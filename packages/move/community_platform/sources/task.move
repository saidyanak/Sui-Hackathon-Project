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

    // Create a new task (starts in VOTING status)
    public entry fun create_task(
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

        let task_uid = object::new(ctx);
        let task_id = object::uid_to_inner(&task_uid);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let task = Task {
            id: task_uid,
            title: string::utf8(title),
            description: string::utf8(description),
            task_type,
            status: TASK_STATUS_VOTING,  // Tüm tasklar oylama ile başlar
            creator: tx_context::sender(ctx),
            budget_amount,
            balance: balance::zero(),
            participants: vector::empty(),
            comments: vector::empty(),
            votes: vector::empty(),
            min_participants,
            max_participants,
            voting_end_date,
            created_at: timestamp,
        };

        event::emit(TaskCreated {
            task_id,
            creator: tx_context::sender(ctx),
            title: task.title,
            task_type,
            budget_amount,
            voting_end_date,
            timestamp,
        });

        transfer::share_object(task);
    }

    // Vote on a task (any task type can be voted on)
    public entry fun vote_task(
        task: &mut Task,
        voter: address, // Voter address (for sponsored transactions)
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
    public entry fun join_task(
        task: &mut Task,
        ctx: &mut TxContext
    ) {
        assert!(task.task_type == TASK_TYPE_PARTICIPATION, EInvalidTaskType);
        assert!(task.status == TASK_STATUS_ACTIVE, ETaskNotActive);

        let participant = tx_context::sender(ctx);
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
}
