interface SlackConfig {
  webhookUrl: string;
}

export async function sendSlack(
  config: SlackConfig,
  monitorName: string,
  url: string,
  message: string
): Promise<void> {
  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `*Spidey — ${monitorName}*\n${message}\n<${url}|Open page>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook error ${response.status}: ${body}`);
  }
}
