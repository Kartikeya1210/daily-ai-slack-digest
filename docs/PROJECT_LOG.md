# Project Log: Daily AI Slack Digest

## Goal

Build a daily AI-news briefing for a Slack channel that reduces information overload while keeping the user aware of high-impact developments.

## User Need

The user wanted five important AI links each morning, but later identified a key constraint: there was not enough time to read, watch, or listen to every item. The digest therefore evolved from a link list into a plain-English decision aid.

## Key Decisions

| Decision | Rationale |
| --- | --- |
| Limit the briefing to five items | Keeps the daily reading load manageable. |
| Prefer recent, high-signal sources | Reduces duplicate or stale stories. |
| Use `What happened / Why it matters / What to watch next` | Gives context, impact, and a useful follow-up in language a young reader can understand. |
| Use a Slack Incoming Webhook | Allows direct posting without depending on an interactive chat session. |
| Use Windows Task Scheduler | Avoids missed runs caused by an in-app local scheduler. |
| Add a backup trigger and local delivery state | Retries an unavailable morning run without creating duplicate posts. |

## Build Process

1. Created a daily Slack digest and selected five items based on recency, impact, source quality, variety, and lack of duplication.
2. Added a recovery validator after early missed runs.
3. Investigated delivery history and found that the scheduler, not Slack, was missing executions.
4. Replaced the delivery mechanism with a standalone Node.js worker, Slack Incoming Webhook, and Windows Scheduled Task.
5. Added AI-generated summaries and a readability-focused message structure.

## Challenges and Responses

### Missed scheduled runs

**Challenge:** The original local automation did not consistently start at its scheduled time.

**Response:** Moved the runtime to Windows Task Scheduler, which is separate from the chat application. The worker also retries failed network calls.

### Preventing duplicate posts

**Challenge:** A backup schedule can accidentally post the same digest twice.

**Response:** The worker writes the date of a confirmed successful delivery to local state. Any later run on the same date exits without posting.

### Making news useful, not just current

**Challenge:** A raw link list still requires substantial time and context switching.

**Response:** The project uses an LLM to turn each selected story into three short, easy-to-read explanations.

### Publishing a safe portfolio version

**Challenge:** The working folder contained unrelated job-search automation and local credentials. Publishing the whole workspace would have made the portfolio unfocused and risked exposing configuration details.

**Response:** Extracted the digest into a standalone project with its own dependency manifest, `.env.example`, `.gitignore`, README, and project log. Runtime state, logs, API keys, and Slack webhook URLs remain excluded from GitHub.

### GitHub authentication across Windows profiles

**Challenge:** The GitHub connector could read the account profile but did not have write access to the newly created repository. GitHub CLI was then authenticated from an Administrator PowerShell profile, while the automated environment used a different Windows profile.

**Response:** Used the authenticated Administrator GitHub CLI session to push the committed portfolio project. This reinforced the decision to keep the project self-contained and to document the exact setup path rather than depend on one interactive development environment.

## Documentation Practice

This file is maintained as a living project record. Each meaningful change should add a brief entry covering:

1. The problem or new requirement.
2. The decision made and why.
3. The implementation or operational change.
4. The result, including any remaining limitation.

## Value

- Reduces a broad news scan to five prioritized items.
- Adds explanation before the user opens a link.
- Delivers the result in an existing work channel rather than another app or inbox.
- Builds reliability into the workflow through retries, an independent scheduler, and duplicate prevention.

## Portfolio Summary

Designed and built a reliable daily AI-news delivery system that collects current stories, uses an LLM to explain their relevance in plain English, and posts a concise briefing to Slack. After diagnosing missed in-app scheduled jobs, redesigned the system around Windows Task Scheduler and Slack Incoming Webhooks with retry and deduplication safeguards.
