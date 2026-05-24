# Incident PAY-2024-031501 — Connection Pool Exhaustion in Payments Service

**Date:** 2024-03-15
**Severity:** SEV-2
**Duration:** 47 minutes (14:23–15:10 UTC)
**Author:** @mwilson (on-call SRE)
**Status:** Resolved — action items open

---

## One-Line Summary

A missing database index on `webhook_events.stripe_event_id` caused full table
scans under Stripe retry load, exhausting the connection pool and propagating
timeouts to the orders service.

---

## Impact

- **Duration:** 47 minutes
- **Users affected:** ~3,200 users unable to confirm payment status during checkout
- **Revenue impact:** ~$14,400 estimated (checkout abandonment rate × 47 min)
- **Services degraded:** payments-service (primary), orders-service (downstream)
- **Error rate:** payments-service 5xx rate peaked at 68% during the window

---

## Timeline

| Time (UTC) | Event |
|---|---|
| 14:08 | Deploy `payments-service v2.4.1` to production (includes migration 0042) |
| 14:15 | Stripe begins retry storm following 5xx responses from v2.4.1 |
| 14:23 | PagerDuty fires: `payments-service connection pool exhausted` |
| 14:31 | On-call confirms full table scans on `webhook_events` in slow query log |
| 14:44 | Index applied directly to production database |
| 14:51 | payments-service restarted; connection pool recovers |
| 15:10 | orders-service timeouts clear; incident closed |

---

## Root Cause Analysis

Migration `0042_webhook_events.py` added a `stripe_event_id` column to the
`webhook_events` table for idempotency checking but **did not create an index**.

The webhook handler queries `webhook_events` by `stripe_event_id` on every
incoming Stripe event. Under normal load (< 50 events/min), full table scans were
fast enough to go undetected in staging. When Stripe's retry logic amplified event
volume to ~900 events/min following the initial 5xx spike, each lookup triggered a
full scan on a 2.1M-row table. Connection hold time increased from ~3ms to ~800ms,
exhausting the pool of 50 connections within eight minutes.

The orders service polls payment status synchronously during checkout. Once
payments-service connections were exhausted, payment status calls began timing out
at the 10-second mark, triggering confirmation failures for active checkouts.

**Root cause:** Missing index on `webhook_events.stripe_event_id` causing O(n)
scans under high write volume.

**Trigger:** Stripe retry storm following initial 5xx rate spike post-deploy.

---

## Mitigation

1. `CREATE INDEX CONCURRENTLY idx_stripe_event_id ON webhook_events(stripe_event_id);`
   — applied directly to production at 14:44 UTC.
2. Restarted `payments-service` to flush stalled connections at 14:51 UTC.

**Band-aid note:** The index was applied manually post-incident. Migration 0042,
which introduced the column, did not include the index. The root cause — no index
validation in the migration pipeline — has not been permanently addressed.

---

## Action Items

| # | Action | Owner | Due |
|---|---|---|---|
| 1 | Add migration linter rule: warn on new columns used in WHERE clauses without indexes | @jpark | 2024-03-29 |
| 2 | Retroactively add index to migration 0042 and document in rollback guide | @mwilson | 2024-03-22 |
| 3 | Configure Stripe webhook receiver to apply exponential backoff on retry storms | @lchen | 2024-04-05 |

---

## Files Touched

- `src/payments/webhook_handler.py` — idempotency check query (the hot path)
- `src/payments/db/migrations/0042_webhook_events.py` — missing index
- `src/orders/payment_status.py` — downstream timeout propagation
