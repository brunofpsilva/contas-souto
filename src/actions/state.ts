// Result of a form action, shown by <ActionMessage>. `at` changes on every answer, so a form
// can tell two answers with the same text apart.
export type ActionState = { ok: boolean; message: string; at: number } | null;

export const reply = (ok: boolean, message: string): ActionState => ({ ok, message, at: Date.now() });
