import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(sourceDir, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
const timezone = process.env.DIGEST_TIMEZONE || 'America/New_York';
const stateDir = path.join(rootDir, 'data', 'daily-ai-picks');
const stateFile = path.join(stateDir, 'last-successful-post.json');
const logFile = path.join(stateDir, 'delivery.log');
const execFileAsync = promisify(execFile);

async function loadWindowsUserSetting(name) {
  if (process.platform !== 'win32' || process.env[name]) return;

  try {
    const { stdout } = await execFileAsync('reg.exe', ['query', 'HKCU\\Environment', '/v', name]);
    const match = stdout.match(new RegExp(`${name}\\s+REG_\\w+\\s+(.+)`, 'i'));
    if (match) process.env[name] = match[1].trim();
  } catch {
    // The setting is optional here; main() produces the actionable error if absent.
  }
}

function easternDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function cleanText(value = '') {
  return cheerio.load(value).text().replace(/\s+/g, ' ').trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'DailyAIPicks/1.0 (+local scheduled task)' },
  });
  if (!response.ok) throw new Error(`Feed request failed (${response.status}) for ${url}`);
  return response.text();
}

async function loadFeed(url, sourceName) {
  const xml = await fetchText(url);
  const $ = cheerio.load(xml, { xmlMode: true });
  return $('item').map((_, item) => ({
    title: cleanText($(item).find('title').first().text()),
    link: cleanText($(item).find('link').first().text()),
    description: cleanText($(item).find('description').first().text()),
    publishedAt: new Date(cleanText($(item).find('pubDate').first().text())),
    source: sourceName,
  })).get();
}

export function selectStories(stories, now = Date.now()) {
  const oldestAllowed = now - 3 * 24 * 60 * 60 * 1000;
  const seenTitles = new Set();
  return stories
    .filter((story) => story.title && story.link && Number.isFinite(story.publishedAt.getTime()))
    .filter((story) => story.publishedAt.getTime() >= oldestAllowed && story.publishedAt.getTime() <= now)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((story) => {
      const key = story.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .slice(0, 5);
}

async function summarize(stories) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sources = stories.map((story, index) => `${index + 1}. ${story.title}\nSource: ${story.source}\nLink: ${story.link}\nFeed summary: ${story.description}`).join('\n\n');
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 1600,
    messages: [{
      role: 'user',
      content: `Write a Slack message titled "Daily AI Picks - ${easternDate()}" using exactly these five stories. Use only the supplied facts; do not invent details. Write for a 12-year-old in plain English. For each numbered story include the heading, source type, direct link, and three short labeled lines: What happened, Why it matters, and What to watch next. Keep the whole message under 3,500 characters.\n\n${sources}`,
    }],
  });
  return response.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n').trim();
}

async function readLastPost() {
  try {
    return JSON.parse(await readFile(stateFile, 'utf8'));
  } catch {
    return null;
  }
}

async function log(message) {
  await mkdir(stateDir, { recursive: true });
  await appendFile(logFile, `${new Date().toISOString()} ${message}\n`);
}

async function retry(operation, label) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await log(`${label} attempt ${attempt} failed: ${error.message}`);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 30_000));
    }
  }
  throw lastError;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun) await loadWindowsUserSetting('SLACK_WEBHOOK_URL');
  if (!dryRun && !process.env.SLACK_WEBHOOK_URL) throw new Error('SLACK_WEBHOOK_URL is not available to this scheduled task.');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured in .env.');

  await mkdir(stateDir, { recursive: true });
  const today = easternDate();
  const lastPost = await readLastPost();
  if (!dryRun && lastPost?.date === today) {
    await log(`Skipped duplicate run for ${today}.`);
    return;
  }

  const feeds = [
    ['https://news.google.com/rss/search?q=artificial+intelligence+when%3A3d&hl=en-US&gl=US&ceid=US:en', 'Google News'],
    ['https://techcrunch.com/category/artificial-intelligence/feed/', 'TechCrunch'],
  ];
  const results = await Promise.allSettled(feeds.map(([url, source]) => loadFeed(url, source)));
  const stories = selectStories(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
  if (stories.length < 5) throw new Error(`Only found ${stories.length} recent AI stories; refusing to send an incomplete digest.`);

  const message = await retry(() => summarize(stories), 'Summary generation');
  if (!message || message.length > 3500) throw new Error('Summary is empty or exceeds 3500 characters');
  if (dryRun) { console.log(message); return; }
  await retry(async () => {
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      signal: AbortSignal.timeout(20000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    if (!response.ok) throw new Error(`Slack webhook failed (${response.status}).`);
  }, 'Slack delivery');

  await writeFile(stateFile, JSON.stringify({ date: today, postedAt: new Date().toISOString() }, null, 2));
  await log(`Posted ${stories.length} stories for ${today}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(async (error) => {
  await log(`Run failed: ${error.message}`);
  console.error(error.message);
  process.exitCode = 1;
});
