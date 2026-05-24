> **afterburn** · `snr-oracle` · [LES-2024-001]
>
> **This PR touches a file linked to a past incident.**
>
> `src/payments/webhook_handler.py` was involved in **PAY-2024-031501**
> (2024-03-15, SEV-2, 47 min) — connection pool exhaustion caused by a missing
> index on a `webhook_events` table query, exposed under Stripe retry load.
>
> **Lesson [LES-2024-001]:** Webhook handler tables need indexed lookup columns
> before reaching production load. Missing index + retry storm = connection pool
> exhaustion. *(confidence: 0.70)*
>
> **What to check before merging:** `handle_refund` queries `PaymentRecord` by
> `stripe_charge_id` via `filter_by`. Confirm that column is indexed in the
> migration that created `payment_records`. The `filter_by` pattern will full-scan
> at scale if the column is unindexed — the same failure mode as PAY-2024-031501.
>
> This is informational. afterburn does not block merges.
> Dismiss if the concern is already addressed.
