export type CheckMode = "change" | "keyword" | "both";
export type MonitorStatus = "ok" | "changed" | "error" | "pending";
export type ChannelType = "desktop" | "email" | "telegram" | "slack" | "discord";

export interface Monitor {
  id: number;
  name: string;
  url: string;
  intervalMinutes: number;
  keywords: string | null;
  checkMode: CheckMode;
  isActive: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
  lastContentHash: string | null;
  lastStatus: MonitorStatus | null;
  channels?: NotificationChannel[];
}

export interface NotificationChannel {
  id: number;
  monitorId: number;
  type: ChannelType;
  config: ChannelConfig;
  enabled: boolean;
}

export interface ChannelConfig {
  // desktop — no config
  // email
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  from?: string;
  to?: string;
  // telegram
  botToken?: string;
  chatId?: string;
  // slack / discord
  webhookUrl?: string;
}

export interface CheckLog {
  id: number;
  monitorId: number;
  checkedAt: string;
  statusCode: number | null;
  changed: boolean;
  keywordsMatched: string[] | null;
  error: string | null;
}

// API request/response shapes

export interface CreateMonitorBody {
  name: string;
  url: string;
  intervalMinutes?: number;
  keywords?: string;
  checkMode?: CheckMode;
}

export interface UpdateMonitorBody extends Partial<CreateMonitorBody> {
  isActive?: boolean;
}

export interface CreateChannelBody {
  type: ChannelType;
  config: ChannelConfig;
  enabled?: boolean;
}

export interface UpdateChannelBody extends Partial<CreateChannelBody> {}

export interface LogsResponse {
  logs: CheckLog[];
  total: number;
  page: number;
  pageSize: number;
}
