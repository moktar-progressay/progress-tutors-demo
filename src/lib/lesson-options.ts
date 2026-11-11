/** Shared teaching levels and site-specific room choices. */
export const LEVEL_OPTIONS = ["KS1", "KS2", "KS3", "GCSE", "A Level", "Degree", "Masters", "Other"] as const;

/** Distinguish rooms sharing a name by floor, so existing lessons save unambiguously. */
export const FRESTON_ROOMS = [
  "Training Room (Ground Floor)",
  "Board Room (Ground Floor)",
  "Office Room (Ground Floor)",
  "Interview Room (Ground Floor)",
  "Break Out (Ground Floor)",
  "Break Out (First Floor)",
  "Progressay Office (First Floor)",
] as const;

export function isFrestonSite(name: string | null | undefined): boolean {
  return /freston/i.test(name ?? "");
}
