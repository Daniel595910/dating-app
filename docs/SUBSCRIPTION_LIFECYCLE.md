# Subscription Lifecycle

## Full flow (happy path)

1. User opens `/profile/vip`
2. Chooses currency (saved to `profiles.billing_currency` if first time)
3. Clicks Upgrade on a plan
4. Frontend → `initialize-payment` Edge Function
   - Validates: authenticated, plan exists (server-side), currency valid
   - Creates `payments` row (status = 'pending')
   - Calls Paystack `/transaction/initialize`
   - Returns `authorization_url`
5. User redirected to Paystack, completes payment
6. Paystack redirects back to `/profile/vip/checkout/callback?reference=xxx`
7. Frontend → `verify-payment` Edge Function
   - Validates: authenticated, owns payment
   - Calls Paystack `/transaction/verify`
   - Cross-checks amount + currency
   - Updates `payments` → 'success'
   - Idempotently creates `subscriptions` row (status='active')
   - Updates `vip_accounts` and `profiles.is_vip`
8. **Independently**, Paystack sends `charge.success` webhook
   - `paystack-webhook` verifies HMAC signature
   - Inserts into `webhook_events` (idempotent)
   - If verify-payment already activated → no-op
   - If verify-payment hasn't run yet → activates VIP

Both paths are idempotent and safe to run in any order.

## Recurring renewal

- Paystack charges card on renewal date
- Paystack fires `invoice.update` (success) or `invoice.payment_failed` (failure)
- `paystack-webhook` handles:
  - On success: extends `current_period_end`, updates `vip_accounts.plan_expires_at`
  - On failure: sets `subscriptions.status = 'failed'`, notifies user (future)

## Cancellation

- User clicks "Cancel" in app (future UI)
- Frontend calls Edge Function to call Paystack `/subscription/disable`
- Paystack fires `subscription.disable` webhook
- `paystack-webhook` sets `subscriptions.status = 'cancelled'`, `cancel_at_period_end = true`
- VIP remains active until `current_period_end`
- Background job (future) sets VIP inactive after period ends

## Non-renewal

- User cancels auto-renew but keeps access
- `subscription.not_renew` webhook → status = 'non_renewing'
- Period continues, then VIP expires (no renewal)

## Failure handling

If Edge Function fails after payment success:
- `payments` stays 'pending'
- Webhook still fires → activates
- Result: eventual consistency, no lost payments

If webhook fails to process:
- Row stays in `webhook_events` with `processing_error`
- Admin can retry via SQL
- Paystack retries automatically every few hours (up to 3 days)
