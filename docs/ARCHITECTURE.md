# Architecture and tradeoffs

Two RSS feeds are fetched independently with Promise.allSettled. Valid stories within the preceding 72 hours are sorted newest first; normalized equal titles are deduplicated, then five are selected. Fewer than five stops the worker. This preserves a predictable briefing size but can omit a useful partial digest during an outage.

The model sees title, feed excerpt, source and URL and is asked for “What happened / Why it matters / What to watch next.” Prompt constraints do not prove factual accuracy or defend fully against feed prompt injection. Preview summaries before relying on them.

The local state is written only after a successful Slack response. The original retry strategy attempts each operation three times with increasing delays. This improves transient-failure recovery but provides at-least-once tendencies rather than transactional delivery. A durable outbox, lock and remote reconciliation would be future improvements. State corruption currently behaves like absent state and may allow another post.

New verification covers deterministic recency filtering, future timestamps, malformed dates, ordering, count and duplicate-title suppression. Live feed availability, model output quality, webhook delivery and scheduler reliability remain outside this test run.
