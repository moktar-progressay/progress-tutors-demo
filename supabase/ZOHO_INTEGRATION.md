# Zoho Billing read-only sync

The `zoho-sync` Edge Function imports customers, plans, subscriptions, invoices and
payments. Zoho remains the financial ledger. The function cannot send invoices or
take payments.

## Required Supabase secrets

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_ORGANIZATION_ID`
- `ZOHO_API_DOMAIN`, for example `https://www.zohoapis.eu`
- `ZOHO_ACCOUNTS_URL`, normally `https://accounts.zoho.eu`
- `ZOHO_SYNC_SECRET`, a long random value reserved for scheduled calls

Create a Zoho Self Client for the Progressay Zoho organisation and grant read-only
access to customers, plans, subscriptions, invoices and payments. Store every value
as a Supabase Edge Function secret. Never add credentials to this repository or to a
`VITE_` environment variable.

## Deployment order

1. Apply `20260923131228_add_zoho_sync_foundation.sql`.
2. Add the required secrets.
3. Deploy the `zoho-sync` function.
4. Open Payments and run **Sync now**.
5. Compare counts and totals with Zoho before enabling any future write operations.

The function accepts authenticated administrators from the application. Automated
calls must send the configured value in the `x-sync-secret` header.
