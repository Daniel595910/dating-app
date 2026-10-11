# Currency Selection Rule (LOCKED)

## Rule

1. **New user (billing_currency = NULL):**
   - Profile country = `NG` → suggest `NGN`
   - Otherwise → suggest `USD`
   - Show BOTH currencies as options
   - User picks one
   - Saved to `profiles.billing_currency`
   - `subscriptions.currency` is set permanently on first payment

2. **Returning user:**
   - Always shows saved `billing_currency`
   - Never auto-changes

3. **During a subscription:**
   - `subscriptions.currency` is LOCKED
   - `subscriptions.amount` is LOCKED
   - Recurring charges always use the locked amount/currency
   - User cannot change currency without cancelling the subscription first

## What we DO NOT do

- ❌ Never derive currency from IP address
- ❌ Never derive currency from VPN
- ❌ Never auto-change currency on travel
- ❌ Never auto-change currency when user moves
- ❌ Never convert NGN ↔ USD using exchange rates
- ❌ Never accept currency from frontend without server-side validation

## Server-side enforcement

`initialize-payment` Edge Function:

1. Reads `plan_code` + `currency` from frontend request
2. Loads matching row from `vip_plans` (WHERE plan_code = ? AND currency = ? AND is_active = true)
3. If no row exists → 404. Do not guess.
4. Uses `vip_plans.amount` and `vip_plans.currency` — the frontend never sends amount.
5. Paystack receives the DB amount/currency.

`verify-payment` + `paystack-webhook`:

1. Load `payments` row by reference
2. Verify Paystack returned amount + currency MATCH the DB values
3. If mismatch → mark payment failed, do not activate VIP

## Database guarantees

- `payments` has `UNIQUE(paystack_reference)`
- `subscriptions` has `UNIQUE(paystack_subscription_code)`
- `subscriptions` has partial unique on `(user_id)` where status in (active, pending, non_renewing) — one active sub per user
- `webhook_events` has `UNIQUE(provider, event_id)` — idempotency

## Lifecycle states

| State | Meaning |
|---|---|
| `pending` | Payment initialized but not yet completed |
| `active` | Subscription active, VIP granted |
| `failed` | Payment failed (Paystack fired `invoice.payment_failed`) |
| `cancelled` | User cancelled (Paystack fired `subscription.disable`) |
| `expired` | Period ended and no renewal |
| `non_renewing` | Cancelled but active until period end |

Transitions:
- `pending` → `active` (charge.success + verify success)
- `active` → `failed` (invoice.payment_failed)
- `active` → `non_renewing` (subscription.not_renew)
- `active` / `non_renewing` → `cancelled` (subscription.disable)
- `failed` / `cancelled` → `expired` (background job or manual)

## Idempotency

Every webhook event is inserted into `webhook_events` with `UNIQUE(provider, event_id)`.
A duplicate insert returns 23505 → we return 200 without reprocessing.

Same for `subscriptions.paystack_subscription_code` uniqueness.

Result: even if Paystack sends `charge.success` 5 times, we activate VIP exactly once.
