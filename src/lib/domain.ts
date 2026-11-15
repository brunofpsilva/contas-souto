// Fixed domain values, shared by the database, validation and the UI.
// What is stored is a key; the label shown on screen comes from the dictionaries in src/i18n.

export const CATEGORIES = [
  "deed_and_taxes",
  "renovation",
  "furniture",
  "appliances",
  "kitchen",
  "utilities",
  "moving",
  "decoration",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["planned", "paid"] as const;
export type Status = (typeof STATUSES)[number];

export const SYNC_SOURCES = ["manual", "cron"] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];

export const DESCRIPTION_MAX = 120;
export const NOTE_MAX = 200;
export const ROOM_NAME_MAX = 40;

/** Form and URL value for expenses with no room (not a table row; it can't be deleted). */
export const NO_ROOM = "none";
