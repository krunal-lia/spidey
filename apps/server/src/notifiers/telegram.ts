interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export async function sendTelegram(
  config: TelegramConfig,
  monitorName: string,
  url: string,
  message: string
): Promise<void> {
  const text = `*Spidey — ${monitorName}*\n${message}\n\n[Open page](${url})`;

  const response = await fetch(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API error ${response.status}: ${body}`);
  }
}
