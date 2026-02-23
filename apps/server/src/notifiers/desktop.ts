import notifier from "node-notifier";

// Path to a custom sound file — drop any .mp3/.aiff/.wav here.
// Falls back to a built-in macOS system sound if not set.
const CUSTOM_SOUND = process.env.SPIDEY_SOUND_PATH;
const SOUND_VOLUME = process.env.SPIDEY_SOUND_VOLUME ?? "10"; // 1.0 = normal, higher = louder

export async function sendDesktop(
  monitorName: string,
  url: string,
  message: string
): Promise<void> {
  if (process.env.SPIDEY_ENV === "production") return;

  // Visual notification (silent — sound handled by afplay below)
  notifier.notify({
    title: `Spidey — ${monitorName}`,
    message,
    subtitle: url,
    sound: false,
    wait: false,
  });

  // Play sound via afplay so we can crank the volume
  const soundFile =
    CUSTOM_SOUND ?? "/System/Library/Sounds/Funk.aiff";

  Bun.spawn(["afplay", "-v", SOUND_VOLUME, soundFile], {
    stdout: "ignore",
    stderr: "ignore",
  });
}
