import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  intervalMinutes: integer("interval_minutes").notNull().default(5),
  keywords: text("keywords"), // comma-separated, optional
  checkMode: text("check_mode").notNull().default("change"), // 'change' | 'keyword' | 'both'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastCheckedAt: timestamp("last_checked_at"),
  lastContentHash: text("last_content_hash"),
  lastStatus: text("last_status"), // 'ok' | 'changed' | 'error' | 'pending'
});

export const notificationChannels = pgTable("notification_channels", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id")
    .notNull()
    .references(() => monitors.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'desktop' | 'email' | 'telegram' | 'slack' | 'discord'
  config: jsonb("config").notNull().$type<Record<string, unknown>>(),
  enabled: boolean("enabled").notNull().default(true),
});

export const checkLogs = pgTable("check_logs", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id")
    .notNull()
    .references(() => monitors.id, { onDelete: "cascade" }),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
  statusCode: integer("status_code"),
  changed: boolean("changed").notNull().default(false),
  keywordsMatched: jsonb("keywords_matched").$type<string[]>(),
  error: text("error"),
});
