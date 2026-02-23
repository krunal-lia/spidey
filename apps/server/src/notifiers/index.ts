import type { NotificationChannel } from "@spidey/shared";
import { sendDesktop } from "./desktop";
import { sendEmail } from "./email";
import { sendTelegram } from "./telegram";
import { sendSlack } from "./slack";
import { sendDiscord } from "./discord";

export async function dispatchNotifications(
  channels: NotificationChannel[],
  monitorName: string,
  url: string,
  message: string
): Promise<void> {
  const activeChannels = channels.filter((c) => c.enabled);

  await Promise.allSettled(
    activeChannels.map(async (channel) => {
      try {
        switch (channel.type) {
          case "desktop":
            await sendDesktop(monitorName, url, message);
            break;

          case "email":
            await sendEmail(
              channel.config as Parameters<typeof sendEmail>[0],
              monitorName,
              url,
              message
            );
            break;

          case "telegram":
            await sendTelegram(
              channel.config as Parameters<typeof sendTelegram>[0],
              monitorName,
              url,
              message
            );
            break;

          case "slack":
            await sendSlack(
              channel.config as Parameters<typeof sendSlack>[0],
              monitorName,
              url,
              message
            );
            break;

          case "discord":
            await sendDiscord(
              channel.config as Parameters<typeof sendDiscord>[0],
              monitorName,
              url,
              message
            );
            break;

          default:
            console.warn(`Unknown notification channel type: ${channel.type}`);
        }
      } catch (err) {
        console.error(
          `Failed to send ${channel.type} notification for monitor ${monitorName}:`,
          err
        );
      }
    })
  );
}
