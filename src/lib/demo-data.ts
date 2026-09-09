/**
 * Presentation-only constants. All operational records live in the shared database
 * (see src/lib/db.ts) — no sample people are defined here.
 */

export const ORG = "Progressay";

export type Role = "admin" | "tutor" | "parent" | "student";

export type CapacityStatus = "available" | "nearly" | "full" | "over";

export const CAPACITY_LABEL: Record<CapacityStatus, string> = {
  available: "Places available",
  nearly: "Nearly full",
  full: "Full",
  over: "Over capacity",
};

export function capacityStatus(enrolled: number, capacity: number): CapacityStatus {
  if (capacity <= 0) return "available";
  if (enrolled > capacity) return "over";
  if (enrolled === capacity) return "full";
  if (enrolled / capacity >= 0.8) return "nearly";
  return "available";
}
