/**
 * Sector definitions for opportunity categorization
 * Used for multi-sector tagging and filtering
 */

export const SECTOR_LIST = [
  "All Sector",
  "Agritech",
  "AI",
  "Cleantech",
  "Climatetech",
  "Deeptech",
  "Ecommerce",
  "Edtech",
  "Energy",
  "Fintech",
  "Food Beverage",
  "Gaming",
  "Govtech",
  "Healthtech",
  "Hrtech",
  "Legaltech",
  "Logistics",
  "Manufacturing",
  "Media Entertainment",
  "Mobility",
  "Other",
  "Proptech",
  "Retail",
  "Spacetech",
  "Sportstech",
  "Travel Hospitality",
  "Web3",
] as const;

export type Sector = (typeof SECTOR_LIST)[number];

/**
 * Validate if a string is a valid sector
 */
export function isValidSector(sector: string): sector is Sector {
  return SECTOR_LIST.includes(sector as Sector);
}

/**
 * Filter and validate sectors array
 */
export function validateSectors(sectors: unknown[]): Sector[] {
  if (!Array.isArray(sectors)) return [];
  return sectors.filter((s): s is Sector => isValidSector(String(s)));
}

/**
 * Get display name for sector (already human-readable, but here for consistency)
 */
export function getSectorDisplayName(sector: Sector): string {
  return sector;
}
