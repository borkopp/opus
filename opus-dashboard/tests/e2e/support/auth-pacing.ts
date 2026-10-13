// Better Auth allows three OTP sends per IP, then requires 60 seconds without
// another accepted send. It does not discard individual requests as they age.
const AUTH_SEND_LIMIT = 3;
const AUTH_SEND_RESET_MS = 61_000;

type MailboxMessage = {
  receivedAt: number;
  tags?: Array<{ name: string; value: string }>;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing isolated test environment: ${name}`);
  return value;
}

/** Call immediately before sending an auth OTP through the UI. */
export async function waitForAuthEmailSend() {
  if (process.env.OPUS_E2E_ISOLATED !== "1") {
    throw new Error("Auth pacing requires the isolated E2E environment.");
  }
  const url = new URL("/messages", requiredEnv("OPUS_E2E_MAILBOX_URL"));
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
  ) {
    throw new Error("Auth pacing requires the localhost test mailbox.");
  }

  // Mailbox history survives Playwright worker restarts. In the single-worker
  // suite each previous send has reached this mailbox before the next UI send.
  // Delivery timestamps occur after the request, making the extra second safe.
  // Failed sends remain test failures; this helper neither retries nor hides 429s.
  while (true) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${requiredEnv("OPUS_E2E_MAILBOX_TOKEN")}`,
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`Test mailbox failed: HTTP ${response.status}`);
    }
    const { messages } = (await response.json()) as {
      messages: MailboxMessage[];
    };
    const sends = messages
      .filter((message) =>
        message.tags?.some(
          (tag) => tag.name === "category" && tag.value === "auth_otp",
        ),
      )
      .map((message) => message.receivedAt)
      .sort((a, b) => a - b);
    const latest = sends.at(-1);
    if (latest === undefined || Date.now() - latest >= AUTH_SEND_RESET_MS) {
      return;
    }

    let count = 1;
    for (let index = sends.length - 2; index >= 0; index -= 1) {
      if (sends[index + 1] - sends[index] >= AUTH_SEND_RESET_MS) break;
      count += 1;
    }
    if (count < AUTH_SEND_LIMIT) return;

    const waitMs = latest + AUTH_SEND_RESET_MS - Date.now();
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(waitMs, 60_000)),
    );
  }
}
