// Shared ESPN team-name matching. ESPN displayNames can differ from the
// names in our schedule, and fixtures can in principle be listed with
// home/away flipped — every consumer of the ESPN scoreboard must tolerate
// both, or results silently fail to match (e.g. Bosnia, June 12 2026).

export function normalizeTeam(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Names where ESPN's displayName can differ from our schedule's. Diacritics
// matter: normalizeTeam strips them, so "Türkiye" → "trkiye" ≠ "turkey" —
// the variant must be listed explicitly.
export const TEAM_ALIASES: Record<string, string[]> = {
  'Bosnia and Herzegovina': ['Bosnia-Herzegovina', 'Bosnia & Herzegovina', 'Bosnia'],
  'United States': ['USA', 'United States of America'],
  "Cote d'Ivoire": ["Côte d'Ivoire", 'Ivory Coast'],
  'Czechia': ['Czech Republic'],
  'South Korea': ['Korea Republic'],
  'Iran': ['IR Iran'],
  'Turkey': ['Türkiye', 'Turkiye'],
  'Curacao': ['Curaçao'],
  'Cabo Verde': ['Cape Verde'],
  'DR Congo': ['Congo DR', 'Democratic Republic of the Congo', 'Congo'],
};

export function teamKeys(team: string): string[] {
  const names = [team, ...(TEAM_ALIASES[team] ?? [])];
  return Array.from(new Set(names.map(normalizeTeam)));
}
