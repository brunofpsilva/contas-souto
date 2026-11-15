// Sentences the app shows when updating the balances fails. The technical message (with HTTP
// codes and variable names) stays in the server log and in the syncs table; the screen picks
// the sentence by the error code, which also works for older errors.
import type { Messages } from "@/i18n/config";

type SyncText = Exclude<keyof Messages["sync"], "availableIn">;

const SENTENCES: Record<string, SyncText> = {
  no_token: "noConnection",
  invalid_token: "accessDenied",
  forbidden: "accessDenied",
  premium: "premium",
  consent: "consent",
  server_error: "unavailable",
  http_error: "noConnection",
  no_connection: "noConnection",
  bad_format: "badFormat",
  in_progress: "inProgress",
  too_soon: "tooSoon",
};

/** Errors that go away on their own: the sentence says when to try again. */
const WITH_WAIT: Record<string, SyncText> = {
  initial_sync: "initialSync",
  rate_limited: "rateLimited",
};

export function syncErrorMessage(t: Messages, code: string | null | undefined, minutes?: number | null): string {
  const wait = WITH_WAIT[code ?? ""];
  if (wait) return `${t.sync[wait]} ${t.sync.availableIn(minutes)}`;
  return t.sync[SENTENCES[code ?? ""] ?? "noConnection"];
}
