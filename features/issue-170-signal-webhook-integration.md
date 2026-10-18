# Issue #170 - Signal Webhook Integration

Maps implemented features to acceptance criteria.

## Implemented

- **Webhook management page** – `WebhookSettings` component; mount in settings page.
- **Custom webhook URL input** – Validated URL input with HTTP prefix check.
- **Select event types** – Toggle chips for `new_signal`, `trade_execution`, `portfolio_alert`; stored per webhook.
- **Test webhook button** – Calls `dispatchWebhookEvent` with sample payload; shows status feedback.
- **Webhook payload format** – `WebhookPayload` type exported; sample payloads in `buildSamplePayload()`.
- **Delivery history** – Last 50 deliveries per webhook stored in Zustand/localStorage; collapsible list with status codes.
- **Retry failed deliveries** – `sendWithRetry` retries up to 3× with exponential back-off (1s, 2s, 3s).
- **Webhook signing** – HMAC-SHA256 via SubtleCrypto; signature in `X-StellarSwipe-Signature` header; secret shown (copyable) in UI.
- **Delete webhook** – Trash icon removes webhook from store.
- **Rate limiting indicator** – `rateLimit` counter displayed; color-coded yellow when < 10 remaining; decremented on each dispatch.

## Files

| File                             | Role                                                     |
| -------------------------------- | -------------------------------------------------------- |
| `store/useWebhookStore.ts`       | Persistent Zustand store for webhooks & delivery history |
| `services/webhookService.ts`     | HMAC signing, retry dispatch, sample payload builder     |
| `components/WebhookSettings.tsx` | Full management UI                                       |
