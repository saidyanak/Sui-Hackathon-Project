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
    const ETaskAlreadyCompleted: u64 = 2;
    const ETaskNotActive: u64 = 3;
    const EInvalidTaskType: u64 = 4;
    const EInsufficientAmount: u64 = 5;
    const ETaskNotCompleted: u64 = 6;
    const EAlreadyParticipant: u64 = 7;

    // Task types
    const TASK_TYPE_DONATION: u8 = 0;
    const TASK_TYPE_PARTICIPATION: u8 = 1;
    const TASK_TYPE_HYBRID: u8 = 2;

    // Task status
    const TASK_STATUS_ACTIVE: u8 = 0;
    const TASK_STATUS_COMPLETED: u8 = 1;
    const TASK_STATUS_CANCELLED: u8 = 2;

    // Main Task object stored on-chain
    public struct Task has key, store {
        id: UID,
        title: String,
        description: String,
        task_type: u8,
        status: u8,
        creator: address,
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

    // Donation record
    public struct Donation has store, copy, drop {
        donor: address,
        amount: u64,
        timestamp: u64,
        message: String,
    }

    // Comment structure
    public struct Comment has store, copy, drop {
        author: address,
        content: String,
        timestamp: u64,
    }

    // Events
    public struct TaskCreated has copy, drop {
        task_id: ID,
        creator: address,
        title: String,
        task_type: u8,
        target_amount: u64,
        timestamp: u64,
    }

    public struct DonationReceived has copy, drop {
        task_id: ID,
        donor: address,
        amount: u64,
        total_amount: u64,
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
        completion_type: String, // "target_reached" or "manual"
        final_amount: u64,
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

    public struct FundsWithdrawn has copy, drop {
        task_id: ID,
        recipient: address,
        amount: u64,
        timestamp: u64,
    }

    // Create a new task
    public entry fun create_task(
        title: vector<u8>,
        description: vector<u8>,
        task_type: u8,
        target_amount: u64,
        end_date: u64,
        ctx: &mut TxContext
    ) {
        assert!(task_type <= TASK_TYPE_HYBRID, EInvalidTaskType);

        let task_uid = object::new(ctx);
        let task_id = object::uid_to_inner(&task_uid);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let task = Task {
            id: task_uid,
            title: string::utf8(title),
            description: string::utf8(description),
            task_type,
            status: TASK_STATUS_ACTIVE,
            creator: tx_context::sender(ctx),
            target_amount,
            current_amount: 0,
            balance: balance::zero(),
            participants: vector::empty(),
            donations: vector::empty(),
            comments: vector::empty(),
            start_date: timestamp,
            end_date,
            created_at: timestamp,
        };

        event::emit(TaskCreated {
            task_id,
            creator: tx_context::sender(ctx),
            title: task.title,
            task_type,
            target_amount,
            timestamp,
        });

        transfer::share_object(task);
    }

    // Donate to a task
    public entry fun donate(
        task: &mut Task,
        payment: Coin<SUI>,
        message: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(task.status == TASK_STATUS_ACTIVE, ETaskNotActive);

        let amount = coin::value(&payment);
        let donor = tx_context::sender(ctx);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        // Add to balance
        let coin_balance = coin::into_balance(payment);
        balance::join(&mut task.balance, coin_balance);

        // Update amount
        task.current_amount = task.current_amount + amount;

        // Record donation
        let donation = Donation {
            donor,
            amount,
            timestamp,
            message: string::utf8(message),
        };
        vector::push_back(&mut task.donations, donation);

        event::emit(DonationReceived {
            task_id,
            donor,
            amount,
            total_amount: task.current_amount,
            timestamp,
        });

        // Auto-complete if target reached
        if (task.current_amount >= task.target_amount) {
            task.status = TASK_STATUS_COMPLETED;
            event::emit(TaskCompleted {
                task_id,
                completion_type: string::utf8(b"target_reached"),
                final_amount: task.current_amount,
                total_participants: vector::length(&task.participants),
                timestamp,
            });
        };
    }

    // Join a task as participant
    public entry fun join_task(
        task: &mut Task,
        ctx: &mut TxContext
    ) {
        assert!(task.status == TASK_STATUS_ACTIVE, ETaskNotActive);

        let participant = tx_context::sender(ctx);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

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

    // Complete task manually (only creator)
    public entry fun complete_task(
        task: &mut Task,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == task.creator, ENotTaskCreator);
        assert!(task.status == TASK_STATUS_ACTIVE, ETaskNotActive);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        task.status = TASK_STATUS_COMPLETED;

        event::emit(TaskCompleted {
            task_id,
            completion_type: string::utf8(b"manual"),
            final_amount: task.current_amount,
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
        assert!(task.status == TASK_STATUS_ACTIVE, ETaskNotActive);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);

        task.status = TASK_STATUS_CANCELLED;

        event::emit(TaskCancelled {
            task_id,
            reason: string::utf8(reason),
            timestamp,
        });
    }

    // Withdraw funds (only creator, only when completed)
    public entry fun withdraw_funds(
        task: &mut Task,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == task.creator, ENotTaskCreator);
        assert!(task.status == TASK_STATUS_COMPLETED, ETaskNotCompleted);

        let amount = balance::value(&task.balance);
        assert!(amount > 0, EInsufficientAmount);

        let timestamp = tx_context::epoch_timestamp_ms(ctx);
        let task_id = object::uid_to_inner(&task.id);
        let recipient = task.creator;

        let withdrawn_balance = balance::withdraw_all(&mut task.balance);
        let coin = coin::from_balance(withdrawn_balance, ctx);

        transfer::public_transfer(coin, recipient);

        event::emit(FundsWithdrawn {
            task_id,
            recipient,
            amount,
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

    public fun get_task_amounts(task: &Task): (u64, u64, u64) {
        (
            task.target_amount,
            task.current_amount,
            balance::value(&task.balance)
        )
    }

    public fun get_task_dates(task: &Task): (u64, u64, u64) {
        (
            task.start_date,
            task.end_date,
            task.created_at
        )
    }

    public fun get_participants_count(task: &Task): u64 {
        vector::length(&task.participants)
    }

    public fun get_donations_count(task: &Task): u64 {
        vector::length(&task.donations)
    }

    public fun get_comments_count(task: &Task): u64 {
        vector::length(&task.comments)
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
}
