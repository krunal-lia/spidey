import notifier from "node-notifier";

export async function sendDesktop(
  monitorName: string,
  url: string,
  message: string
): Promise<void> {
  if (process.env.SPIDEY_ENV === "production") return;

  notifier.notify({
    title: `Spidey — ${monitorName}`,
    message,
    subtitle: url,
    sound: "Funk",
    wait: false,
  });
}
