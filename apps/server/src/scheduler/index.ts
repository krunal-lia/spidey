import cron, { type ScheduledTask } from "node-cron";
import { eq } from "drizzle-orm";
import { db, monitors, notificationChannels, checkLogs } from "../db";
import { scrapePage, findKeywords } from "../scraper";
import { dispatchNotifications } from "../notifiers";
import type { NotificationChannel } from "@spidey/shared";

// Map of monitorId -> running cron task
const jobs = new Map<number, ScheduledTask>();

/**
 * Convert interval in minutes to a cron expression.
 * e.g. 1 → "* /1 * * * *", 5 → "* /5 * * * *", 60 → "0 * * * *"
 */
function intervalToCron(minutes: number): string {
  if (minutes < 1) minutes = 1;
  if (minutes < 60) {
    return `*/${minutes} * * * *`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `0 */${hours} * * *`;
  }
  return `${remainingMinutes} */${hours} * * *`;
}

/**
 * Run a single check for a monitor: scrape, compare, log, notify.
 */
export async function runCheck(monitorId: number): Promise<void> {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, monitorId))
    .limit(1);

  if (!monitor) {
    console.warn(`Monitor ${monitorId} not found, skipping check`);
    return;
  }

  let statusCode: number | null = null;
  let changed = false;
  let keywordsMatched: string[] | null = null;
  let error: string | null = null;
  let shouldNotify = false;
  let notificationMessage = "";

  try {
    const result = await scrapePage(monitor.url);
    statusCode = result.statusCode;

    // Change detection
    if (
      monitor.checkMode === "change" ||
      monitor.checkMode === "both"
    ) {
      if (
        monitor.lastContentHash !== null &&
        result.hash !== monitor.lastContentHash
      ) {
        changed = true;
        shouldNotify = true;
        notificationMessage = "Content changed on the page!";
      }
    }

    // Keyword detection
    if (
      monitor.checkMode === "keyword" ||
      monitor.checkMode === "both"
    ) {
      if (monitor.keywords) {
        const matched = findKeywords(result.text, monitor.keywords);
        if (matched.length > 0) {
          keywordsMatched = matched;
          shouldNotify = true;
          notificationMessage = `Keywords matched: ${matched.join(", ")}`;
        }
      }
    }

    // Both mode: combine messages
    if (monitor.checkMode === "both" && changed && keywordsMatched?.length) {
      notificationMessage = `Content changed AND keywords matched: ${keywordsMatched.join(", ")}`;
    }

    // Update the monitor's tracking fields
    await db
      .update(monitors)
      .set({
        lastCheckedAt: new Date(),
        lastContentHash: result.hash,
        lastStatus: changed || (keywordsMatched?.length ?? 0) > 0 ? "changed" : "ok",
      })
      .where(eq(monitors.id, monitorId));

    // Fire notifications
    if (shouldNotify) {
      const channels = await db
        .select()
        .from(notificationChannels)
        .where(eq(notificationChannels.monitorId, monitorId));
      console.log('sending noitification on channles', channels);
      await dispatchNotifications(
        channels as unknown as NotificationChannel[],
        monitor.name,
        monitor.url,
        notificationMessage
      );
    } else {
      console.log('No changes or keyword matches for monitor ${monitorId}, skipping notifications');
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    await db
      .update(monitors)
      .set({
        lastCheckedAt: new Date(),
        lastStatus: "error",
      })
      .where(eq(monitors.id, monitorId));
  }

  // Log the check
  await db.insert(checkLogs).values({
    monitorId,
    statusCode,
    changed,
    keywordsMatched,
    error,
  });
}

/**
 * Start the cron job for a single monitor.
 */
export function startMonitor(monitorId: number, intervalMinutes: number): void {
  // Stop existing job if any
  stopMonitor(monitorId);

  const cronExpr = intervalToCron(intervalMinutes);
  console.log(
    `Scheduling monitor ${monitorId} with cron "${cronExpr}" (every ${intervalMinutes}m)`
  );

  const task = cron.schedule(cronExpr, () => {
    runCheck(monitorId).catch((err) => {
      console.error(`Check failed for monitor ${monitorId}:`, err);
    });
  });

  jobs.set(monitorId, task);
}

/**
 * Stop the cron job for a single monitor.
 */
export function stopMonitor(monitorId: number): void {
  const existing = jobs.get(monitorId);
  if (existing) {
    existing.stop();
    jobs.delete(monitorId);
    console.log(`Stopped monitor ${monitorId}`);
  }
}

/**
 * Restart a monitor's cron job (e.g. after interval change).
 */
export function restartMonitor(
  monitorId: number,
  intervalMinutes: number
): void {
  startMonitor(monitorId, intervalMinutes);
}

/**
 * Load all active monitors from DB and start their cron jobs.
 * Called once at server startup.
 */
export async function initScheduler(): Promise<void> {
  const activeMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.isActive, true));

  console.log(`Starting scheduler for ${activeMonitors.length} active monitors`);

  for (const monitor of activeMonitors) {
    startMonitor(monitor.id, monitor.intervalMinutes);
  }
}

/**
 * Stop all running cron jobs (for graceful shutdown).
 */
export function stopAll(): void {
  for (const [id, task] of jobs) {
    task.stop();
    console.log(`Stopped monitor ${id}`);
  }
  jobs.clear();
}
