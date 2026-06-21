module traceai::audit_ledger {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::string::{String};
    use sui::event;

    /// Struct representing a single, verifiable customer support ticket audit log
    public struct AuditRecord has key, store {
        id: UID,
        ticket_id: String,
        customer_name: String,
        issue_type: String,
        status: String,
        walrus_blob_id: String,
        sha256_hash: String,
        timestamp: u64,
    }

    /// Event emitted when an audit record is successfully logged on-chain
    public struct AuditLoggedEvent has copy, drop {
        object_id: address,
        ticket_id: String,
        walrus_blob_id: String,
        sha256_hash: String,
    }

    /// Entry point for logging an audit. It instantiates the record,
    /// emits the confirmation event, and transfers the record object to the sender.
    public entry fun log_audit(
        ticket_id: String,
        customer_name: String,
        issue_type: String,
        status: String,
        walrus_blob_id: String,
        sha256_hash: String,
        timestamp: u64,
        ctx: &mut TxContext
    ) {
        let id = object::new(ctx);
        let object_id = object::uid_to_address(&id);
        
        let record = AuditRecord {
            id,
            ticket_id,
            customer_name,
            issue_type,
            status,
            walrus_blob_id,
            sha256_hash,
            timestamp,
        };

        event::emit(AuditLoggedEvent {
            object_id,
            ticket_id,
            walrus_blob_id,
            sha256_hash,
        });

        transfer::public_transfer(record, tx_context::sender(ctx));
    }
}
