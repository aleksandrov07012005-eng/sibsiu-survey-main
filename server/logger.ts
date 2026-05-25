const lokiUrl = process.env.LOKI_URL;
const lokiJobName = process.env.LOKI_JOB_NAME || "sibsiu-app";

type LogLevel = "info" | "error" | "warn";

async function sendToLoki(
  level: LogLevel,
  message: string,
  meta?: Record<string, any>,
) {
  if (!lokiUrl) return;

  const ts = BigInt(Date.now()) * 1_000_000n;
  const line = JSON.stringify({ level, message, ...meta });

  const body = {
    streams: [
      {
        stream: {
          job: lokiJobName,
          level,
        },
        values: [[ts.toString(), line]],
      },
    ],
  };

  try {
    await fetch(lokiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Failed to send log to Loki", error);
  }
}

export const logger = {
  info(message: string, meta?: Record<string, any>) {
    console.log(message, meta ?? "");
    void sendToLoki("info", message, meta);
  },
  error(message: string, meta?: Record<string, any>) {
    console.error(message, meta ?? "");
    void sendToLoki("error", message, meta);
  },
  warn(message: string, meta?: Record<string, any>) {
    console.warn(message, meta ?? "");
    void sendToLoki("warn", message, meta);
  },
};
