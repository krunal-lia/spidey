interface DiscordConfig {
  webhookUrl: string;
}

export async function sendDiscord(
  config: DiscordConfig,
  monitorName: string,
  url: string,
  message: string
): Promise<void> {
  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `**Spidey — ${monitorName}**\n${message}\n${url}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord webhook error ${response.status}: ${body}`);
  }
}
