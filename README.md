# Daily AI Slack Digest

A lightweight automation that finds five recent AI stories, turns them into plain-English summaries, and posts the result to Slack each morning.

## The Problem

Following AI news takes time. Headlines are noisy, sources overlap, and a list of links does not explain why a story matters. This project creates a short daily briefing that is easy to understand without opening every article.

## What It Does

- Collects recent AI stories from Google News and TechCrunch.
- Removes duplicate headlines and selects five current stories.
- Uses Claude to write a simple explanation for each item:
  - What happened
  - Why it matters
  - What to watch next
- Posts directly to a chosen Slack channel using an Incoming Webhook.
- Runs independently through Windows Task Scheduler, with a 7:50 AM backup trigger.
- Retries temporary errors and records successful deliveries to prevent duplicate posts.

## Tech Stack

- Node.js
- Anthropic Messages API
- Slack Incoming Webhooks
- Google News RSS and TechCrunch RSS
- Windows Task Scheduler

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY`.
3. Create a Slack Incoming Webhook for the destination channel.
4. Set the webhook as a Windows user environment variable named `SLACK_WEBHOOK_URL`.
5. Run once with `npm run digest`.
6. Register `src/daily-ai-picks.js` in Windows Task Scheduler at 7:30 AM, with a backup run at 7:50 AM.

## Reliability Design

The first version used a local in-app scheduler. It occasionally missed runs because the scheduler host did not always dispatch jobs. The delivery path was redesigned around Windows Task Scheduler and a Slack Incoming Webhook so the task can run even when the app is closed. A local state file records the date of a successful post, making the backup run safe.

## Project Story

See [docs/PROJECT_LOG.md](docs/PROJECT_LOG.md) for the build process, decisions, challenges, and portfolio-ready outcomes.

## Security

Never commit `.env`, `SLACK_WEBHOOK_URL`, delivery logs, or state files. The webhook URL is a secret that can post to its assigned Slack channel.
