// 2026 FIFA World Cup - Real group draw and match schedule
// Source: Official FIFA draw held December 5, 2025

export interface Team {
  name: string;
  code: string;
  flag: string;
}

export interface GroupMatch {
  matchId: string;
  group: string;
  matchNumber: number;
  home: string;
  away: string;
  date: string;
  venue: string;
  city: string;
}

export interface Group {
  id: string;
  name: string;
  teams: string[];
}

// All 48 teams organized into 12 groups of 4
export const GROUPS: Group[] = [
  {
    id: 'A',
    name: 'Group A',
    teams: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  },
  {
    id: 'B',
    name: 'Group B',
    teams: ['Canada', 'Switzerland', 'Qatar', 'Bosnia and Herzegovina'],
  },
  {
    id: 'C',
    name: 'Group C',
    teams: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  },
  {
    id: 'D',
    name: 'Group D',
    teams: ['United States', 'Paraguay', 'Australia', 'Turkey'],
  },
  {
    id: 'E',
    name: 'Group E',
    teams: ['Germany', 'Curacao', "Cote d'Ivoire", 'Ecuador'],
  },
  {
    id: 'F',
    name: 'Group F',
    teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  },
  {
    id: 'G',
    name: 'Group G',
    teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  },
  {
    id: 'H',
    name: 'Group H',
    teams: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  },
  {
    id: 'I',
    name: 'Group I',
    teams: ['France', 'Senegal', 'Norway', 'Iraq'],
  },
  {
    id: 'J',
    name: 'Group J',
    teams: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  },
  {
    id: 'K',
    name: 'Group K',
    teams: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  },
  {
    id: 'L',
    name: 'Group L',
    teams: ['England', 'Croatia', 'Ghana', 'Panama'],
  },
];

// All 48 group stage matches
// Each group has 3 matchdays, 2 matches per matchday = 6 matches per group
// Match IDs: A1-A6, B1-B6, ..., L1-L6
export const GROUP_MATCHES: GroupMatch[] = [
  // GROUP A - Mexico, South Africa, South Korea, Czechia
  {
    matchId: 'A1',
    group: 'A',
    matchNumber: 1,
    home: 'Mexico',
    away: 'South Africa',
    date: '2026-06-11',
    venue: 'Estadio Azteca',
    city: 'Mexico City',
  },
  {
    matchId: 'A2',
    group: 'A',
    matchNumber: 2,
    home: 'South Korea',
    away: 'Czechia',
    date: '2026-06-11',
    venue: 'Estadio Akron',
    city: 'Guadalajara',
  },
  {
    matchId: 'A3',
    group: 'A',
    matchNumber: 3,
    home: 'Czechia',
    away: 'South Africa',
    date: '2026-06-18',
    venue: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
  },
  {
    matchId: 'A4',
    group: 'A',
    matchNumber: 4,
    home: 'Mexico',
    away: 'South Korea',
    date: '2026-06-18',
    venue: 'Estadio Akron',
    city: 'Guadalajara',
  },
  {
    matchId: 'A5',
    group: 'A',
    matchNumber: 5,
    home: 'Czechia',
    away: 'Mexico',
    date: '2026-06-24',
    venue: 'Estadio Azteca',
    city: 'Mexico City',
  },
  {
    matchId: 'A6',
    group: 'A',
    matchNumber: 6,
    home: 'South Africa',
    away: 'South Korea',
    date: '2026-06-24',
    venue: 'Estadio BBVA',
    city: 'Monterrey',
  },

  // GROUP B - Canada, Switzerland, Qatar, Bosnia and Herzegovina
  {
    matchId: 'B1',
    group: 'B',
    matchNumber: 1,
    home: 'Canada',
    away: 'Bosnia and Herzegovina',
    date: '2026-06-12',
    venue: 'BMO Field',
    city: 'Toronto',
  },
  {
    matchId: 'B2',
    group: 'B',
    matchNumber: 2,
    home: 'Qatar',
    away: 'Switzerland',
    date: '2026-06-13',
    venue: "Levi's Stadium",
    city: 'Santa Clara',
  },
  {
    matchId: 'B3',
    group: 'B',
    matchNumber: 3,
    home: 'Switzerland',
    away: 'Bosnia and Herzegovina',
    date: '2026-06-18',
    venue: 'SoFi Stadium',
    city: 'Inglewood',
  },
  {
    matchId: 'B4',
    group: 'B',
    matchNumber: 4,
    home: 'Canada',
    away: 'Qatar',
    date: '2026-06-18',
    venue: 'BC Place',
    city: 'Vancouver',
  },
  {
    matchId: 'B5',
    group: 'B',
    matchNumber: 5,
    home: 'Switzerland',
    away: 'Canada',
    date: '2026-06-24',
    venue: 'BC Place',
    city: 'Vancouver',
  },
  {
    matchId: 'B6',
    group: 'B',
    matchNumber: 6,
    home: 'Bosnia and Herzegovina',
    away: 'Qatar',
    date: '2026-06-24',
    venue: 'Lumen Field',
    city: 'Seattle',
  },

  // GROUP C - Brazil, Morocco, Haiti, Scotland
  {
    matchId: 'C1',
    group: 'C',
    matchNumber: 1,
    home: 'Brazil',
    away: 'Morocco',
    date: '2026-06-13',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
  },
  {
    matchId: 'C2',
    group: 'C',
    matchNumber: 2,
    home: 'Haiti',
    away: 'Scotland',
    date: '2026-06-13',
    venue: 'Gillette Stadium',
    city: 'Foxborough',
  },
  {
    matchId: 'C3',
    group: 'C',
    matchNumber: 3,
    home: 'Scotland',
    away: 'Morocco',
    date: '2026-06-19',
    venue: 'Gillette Stadium',
    city: 'Foxborough',
  },
  {
    matchId: 'C4',
    group: 'C',
    matchNumber: 4,
    home: 'Brazil',
    away: 'Haiti',
    date: '2026-06-19',
    venue: 'Lincoln Financial Field',
    city: 'Philadelphia',
  },
  {
    matchId: 'C5',
    group: 'C',
    matchNumber: 5,
    home: 'Scotland',
    away: 'Brazil',
    date: '2026-06-24',
    venue: 'Hard Rock Stadium',
    city: 'Miami Gardens',
  },
  {
    matchId: 'C6',
    group: 'C',
    matchNumber: 6,
    home: 'Morocco',
    away: 'Haiti',
    date: '2026-06-24',
    venue: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
  },

  // GROUP D - United States, Paraguay, Australia, Turkey
  {
    matchId: 'D1',
    group: 'D',
    matchNumber: 1,
    home: 'United States',
    away: 'Paraguay',
    date: '2026-06-12',
    venue: 'SoFi Stadium',
    city: 'Inglewood',
  },
  {
    matchId: 'D2',
    group: 'D',
    matchNumber: 2,
    home: 'Australia',
    away: 'Turkey',
    date: '2026-06-13',
    venue: 'BC Place',
    city: 'Vancouver',
  },
  {
    matchId: 'D3',
    group: 'D',
    matchNumber: 3,
    home: 'United States',
    away: 'Australia',
    date: '2026-06-19',
    venue: 'Lumen Field',
    city: 'Seattle',
  },
  {
    matchId: 'D4',
    group: 'D',
    matchNumber: 4,
    home: 'Turkey',
    away: 'Paraguay',
    date: '2026-06-19',
    venue: "Levi's Stadium",
    city: 'Santa Clara',
  },
  {
    matchId: 'D5',
    group: 'D',
    matchNumber: 5,
    home: 'United States',
    away: 'Turkey',
    date: '2026-06-25',
    venue: 'SoFi Stadium',
    city: 'Inglewood',
  },
  {
    matchId: 'D6',
    group: 'D',
    matchNumber: 6,
    home: 'Paraguay',
    away: 'Australia',
    date: '2026-06-25',
    venue: "Levi's Stadium",
    city: 'Santa Clara',
  },

  // GROUP E - Germany, Curacao, Cote d'Ivoire, Ecuador
  {
    matchId: 'E1',
    group: 'E',
    matchNumber: 1,
    home: 'Germany',
    away: 'Curacao',
    date: '2026-06-14',
    venue: 'NRG Stadium',
    city: 'Houston',
  },
  {
    matchId: 'E2',
    group: 'E',
    matchNumber: 2,
    home: "Cote d'Ivoire",
    away: 'Ecuador',
    date: '2026-06-14',
    venue: 'Lincoln Financial Field',
    city: 'Philadelphia',
  },
  {
    matchId: 'E3',
    group: 'E',
    matchNumber: 3,
    home: 'Germany',
    away: "Cote d'Ivoire",
    date: '2026-06-20',
    venue: 'BMO Field',
    city: 'Toronto',
  },
  {
    matchId: 'E4',
    group: 'E',
    matchNumber: 4,
    home: 'Ecuador',
    away: 'Curacao',
    date: '2026-06-20',
    venue: 'Arrowhead Stadium',
    city: 'Kansas City',
  },
  {
    matchId: 'E5',
    group: 'E',
    matchNumber: 5,
    home: 'Ecuador',
    away: 'Germany',
    date: '2026-06-25',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
  },
  {
    matchId: 'E6',
    group: 'E',
    matchNumber: 6,
    home: 'Curacao',
    away: "Cote d'Ivoire",
    date: '2026-06-25',
    venue: 'Lincoln Financial Field',
    city: 'Philadelphia',
  },

  // GROUP F - Netherlands, Japan, Sweden, Tunisia
  {
    matchId: 'F1',
    group: 'F',
    matchNumber: 1,
    home: 'Netherlands',
    away: 'Sweden',
    date: '2026-06-14',
    venue: 'NRG Stadium',
    city: 'Houston',
  },
  {
    matchId: 'F2',
    group: 'F',
    matchNumber: 2,
    home: 'Tunisia',
    away: 'Japan',
    date: '2026-06-15',
    venue: 'Estadio Akron',
    city: 'Guadalajara',
  },
  {
    matchId: 'F3',
    group: 'F',
    matchNumber: 3,
    home: 'Japan',
    away: 'Sweden',
    date: '2026-06-21',
    venue: "AT&T Stadium",
    city: 'Arlington',
  },
  {
    matchId: 'F4',
    group: 'F',
    matchNumber: 4,
    home: 'Tunisia',
    away: 'Netherlands',
    date: '2026-06-21',
    venue: 'Arrowhead Stadium',
    city: 'Kansas City',
  },
  {
    matchId: 'F5',
    group: 'F',
    matchNumber: 5,
    home: 'Japan',
    away: 'Netherlands',
    date: '2026-06-26',
    venue: 'NRG Stadium',
    city: 'Houston',
  },
  {
    matchId: 'F6',
    group: 'F',
    matchNumber: 6,
    home: 'Sweden',
    away: 'Tunisia',
    date: '2026-06-26',
    venue: 'Arrowhead Stadium',
    city: 'Kansas City',
  },

  // GROUP G - Belgium, Egypt, Iran, New Zealand
  {
    matchId: 'G1',
    group: 'G',
    matchNumber: 1,
    home: 'Belgium',
    away: 'Egypt',
    date: '2026-06-15',
    venue: 'Lumen Field',
    city: 'Seattle',
  },
  {
    matchId: 'G2',
    group: 'G',
    matchNumber: 2,
    home: 'Iran',
    away: 'New Zealand',
    date: '2026-06-15',
    venue: 'SoFi Stadium',
    city: 'Inglewood',
  },
  {
    matchId: 'G3',
    group: 'G',
    matchNumber: 3,
    home: 'Belgium',
    away: 'Iran',
    date: '2026-06-21',
    venue: 'Gillette Stadium',
    city: 'Foxborough',
  },
  {
    matchId: 'G4',
    group: 'G',
    matchNumber: 4,
    home: 'New Zealand',
    away: 'Egypt',
    date: '2026-06-21',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
  },
  {
    matchId: 'G5',
    group: 'G',
    matchNumber: 5,
    home: 'Belgium',
    away: 'New Zealand',
    date: '2026-06-26',
    venue: 'Lumen Field',
    city: 'Seattle',
  },
  {
    matchId: 'G6',
    group: 'G',
    matchNumber: 6,
    home: 'Egypt',
    away: 'Iran',
    date: '2026-06-26',
    venue: "Levi's Stadium",
    city: 'Santa Clara',
  },

  // GROUP H - Spain, Cabo Verde, Saudi Arabia, Uruguay
  {
    matchId: 'H1',
    group: 'H',
    matchNumber: 1,
    home: 'Spain',
    away: 'Cabo Verde',
    date: '2026-06-15',
    venue: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
  },
  {
    matchId: 'H2',
    group: 'H',
    matchNumber: 2,
    home: 'Saudi Arabia',
    away: 'Uruguay',
    date: '2026-06-15',
    venue: 'Hard Rock Stadium',
    city: 'Miami Gardens',
  },
  {
    matchId: 'H3',
    group: 'H',
    matchNumber: 3,
    home: 'Spain',
    away: 'Saudi Arabia',
    date: '2026-06-21',
    venue: "AT&T Stadium",
    city: 'Arlington',
  },
  {
    matchId: 'H4',
    group: 'H',
    matchNumber: 4,
    home: 'Uruguay',
    away: 'Cabo Verde',
    date: '2026-06-21',
    venue: 'Hard Rock Stadium',
    city: 'Miami Gardens',
  },
  {
    matchId: 'H5',
    group: 'H',
    matchNumber: 5,
    home: 'Spain',
    away: 'Uruguay',
    date: '2026-06-26',
    venue: "AT&T Stadium",
    city: 'Arlington',
  },
  {
    matchId: 'H6',
    group: 'H',
    matchNumber: 6,
    home: 'Cabo Verde',
    away: 'Saudi Arabia',
    date: '2026-06-26',
    venue: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
  },

  // GROUP I - France, Senegal, Norway, Iraq
  {
    matchId: 'I1',
    group: 'I',
    matchNumber: 1,
    home: 'France',
    away: 'Senegal',
    date: '2026-06-16',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
  },
  {
    matchId: 'I2',
    group: 'I',
    matchNumber: 2,
    home: 'Iraq',
    away: 'Norway',
    date: '2026-06-16',
    venue: 'Gillette Stadium',
    city: 'Foxborough',
  },
  {
    matchId: 'I3',
    group: 'I',
    matchNumber: 3,
    home: 'France',
    away: 'Iraq',
    date: '2026-06-22',
    venue: 'Lincoln Financial Field',
    city: 'Philadelphia',
  },
  {
    matchId: 'I4',
    group: 'I',
    matchNumber: 4,
    home: 'Norway',
    away: 'Senegal',
    date: '2026-06-22',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
  },
  {
    matchId: 'I5',
    group: 'I',
    matchNumber: 5,
    home: 'France',
    away: 'Norway',
    date: '2026-06-26',
    venue: "AT&T Stadium",
    city: 'Arlington',
  },
  {
    matchId: 'I6',
    group: 'I',
    matchNumber: 6,
    home: 'Senegal',
    away: 'Iraq',
    date: '2026-06-26',
    venue: 'Lincoln Financial Field',
    city: 'Philadelphia',
  },

  // GROUP J - Argentina, Algeria, Austria, Jordan
  {
    matchId: 'J1',
    group: 'J',
    matchNumber: 1,
    home: 'Argentina',
    away: 'Algeria',
    date: '2026-06-16',
    venue: 'Arrowhead Stadium',
    city: 'Kansas City',
  },
  {
    matchId: 'J2',
    group: 'J',
    matchNumber: 2,
    home: 'Austria',
    away: 'Jordan',
    date: '2026-06-17',
    venue: "Levi's Stadium",
    city: 'Santa Clara',
  },
  {
    matchId: 'J3',
    group: 'J',
    matchNumber: 3,
    home: 'Argentina',
    away: 'Austria',
    date: '2026-06-22',
    venue: "AT&T Stadium",
    city: 'Arlington',
  },
  {
    matchId: 'J4',
    group: 'J',
    matchNumber: 4,
    home: 'Jordan',
    away: 'Algeria',
    date: '2026-06-22',
    venue: 'Arrowhead Stadium',
    city: 'Kansas City',
  },
  {
    matchId: 'J5',
    group: 'J',
    matchNumber: 5,
    home: 'Algeria',
    away: 'Austria',
    date: '2026-06-27',
    venue: 'Arrowhead Stadium',
    city: 'Kansas City',
  },
  {
    matchId: 'J6',
    group: 'J',
    matchNumber: 6,
    home: 'Jordan',
    away: 'Argentina',
    date: '2026-06-27',
    venue: "AT&T Stadium",
    city: 'Arlington',
  },

  // GROUP K - Portugal, DR Congo, Uzbekistan, Colombia
  {
    matchId: 'K1',
    group: 'K',
    matchNumber: 1,
    home: 'Portugal',
    away: 'DR Congo',
    date: '2026-06-17',
    venue: 'NRG Stadium',
    city: 'Houston',
  },
  {
    matchId: 'K2',
    group: 'K',
    matchNumber: 2,
    home: 'Uzbekistan',
    away: 'Colombia',
    date: '2026-06-17',
    venue: 'Estadio Azteca',
    city: 'Mexico City',
  },
  {
    matchId: 'K3',
    group: 'K',
    matchNumber: 3,
    home: 'Portugal',
    away: 'Uzbekistan',
    date: '2026-06-23',
    venue: 'NRG Stadium',
    city: 'Houston',
  },
  {
    matchId: 'K4',
    group: 'K',
    matchNumber: 4,
    home: 'Colombia',
    away: 'DR Congo',
    date: '2026-06-23',
    venue: 'Estadio Akron',
    city: 'Guadalajara',
  },
  {
    matchId: 'K5',
    group: 'K',
    matchNumber: 5,
    home: 'Colombia',
    away: 'Portugal',
    date: '2026-06-27',
    venue: 'Hard Rock Stadium',
    city: 'Miami Gardens',
  },
  {
    matchId: 'K6',
    group: 'K',
    matchNumber: 6,
    home: 'DR Congo',
    away: 'Uzbekistan',
    date: '2026-06-27',
    venue: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
  },

  // GROUP L - England, Croatia, Ghana, Panama
  {
    matchId: 'L1',
    group: 'L',
    matchNumber: 1,
    home: 'England',
    away: 'Croatia',
    date: '2026-06-17',
    venue: "AT&T Stadium",
    city: 'Arlington',
  },
  {
    matchId: 'L2',
    group: 'L',
    matchNumber: 2,
    home: 'Ghana',
    away: 'Panama',
    date: '2026-06-17',
    venue: 'BMO Field',
    city: 'Toronto',
  },
  {
    matchId: 'L3',
    group: 'L',
    matchNumber: 3,
    home: 'England',
    away: 'Ghana',
    date: '2026-06-23',
    venue: 'Gillette Stadium',
    city: 'Foxborough',
  },
  {
    matchId: 'L4',
    group: 'L',
    matchNumber: 4,
    home: 'Panama',
    away: 'Croatia',
    date: '2026-06-23',
    venue: 'BMO Field',
    city: 'Toronto',
  },
  {
    matchId: 'L5',
    group: 'L',
    matchNumber: 5,
    home: 'Panama',
    away: 'England',
    date: '2026-06-27',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
  },
  {
    matchId: 'L6',
    group: 'L',
    matchNumber: 6,
    home: 'Croatia',
    away: 'Ghana',
    date: '2026-06-27',
    venue: 'Lincoln Financial Field',
    city: 'Philadelphia',
  },
];

// Get all teams across all groups
export const ALL_TEAMS: string[] = GROUPS.flatMap((g) => g.teams).sort();

// Get matches for a specific group
export function getGroupMatches(groupId: string): GroupMatch[] {
  return GROUP_MATCHES.filter((m) => m.group === groupId);
}

// Get match by ID
export function getMatch(matchId: string): GroupMatch | undefined {
  return GROUP_MATCHES.find((m) => m.matchId === matchId);
}

// Check if a match is locked (started - within 1 hour of match date)
export function isMatchLocked(_match: GroupMatch, kickoffIso?: string | null): boolean {
  if (!kickoffIso) return false;
  return new Date() >= new Date(kickoffIso);
}

// Knockout bracket rounds
export const BRACKET_ROUNDS = [
  { id: 'R32', name: 'Round of 32', slots: 32, points: 2 },
  { id: 'R16', name: 'Round of 16', slots: 16, points: 3 },
  { id: 'QF', name: 'Quarter-Finals', slots: 8, points: 5 },
  { id: 'SF', name: 'Semi-Finals', slots: 4, points: 8 },
  { id: 'Final', name: 'Final', slots: 2, points: 13 },
];

export const SCORING = {
  groupCorrect: 1,    // correct pick (or picked draw and it was a draw)
  groupWrong: -1,     // wrong pick when match had a decisive result
  groupDrawNoCall: 0, // match drew but you didn't pick draw
  groupRank1: 4,
  groupRank2: 3,
  groupRank3: 2,
  groupRank4: 1,
  r32: 2,
  r16: 3,
  qf: 5,
  sf: 8,
  final: 13,
  champion: 20,
};

// Flag emoji map for all 48 teams
export const TEAM_FLAGS: Record<string, string> = {
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czechia': '🇨🇿',
  'Canada': '🇨🇦',
  'Switzerland': '🇨🇭',
  'Qatar': '🇶🇦',
  'Bosnia and Herzegovina': '🇧🇦',
  'Brazil': '🇧🇷',
  'Morocco': '🇲🇦',
  'Haiti': '🇭🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'United States': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turkey': '🇹🇷',
  'Germany': '🇩🇪',
  'Curacao': '🇨🇼',
  "Cote d'Ivoire": '🇨🇮',
  'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱',
  'Japan': '🇯🇵',
  'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪',
  'Egypt': '🇪🇬',
  'Iran': '🇮🇷',
  'New Zealand': '🇳🇿',
  'Spain': '🇪🇸',
  'Cabo Verde': '🇨🇻',
  'Saudi Arabia': '🇸🇦',
  'Uruguay': '🇺🇾',
  'France': '🇫🇷',
  'Senegal': '🇸🇳',
  'Norway': '🇳🇴',
  'Iraq': '🇮🇶',
  'Argentina': '🇦🇷',
  'Algeria': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordan': '🇯🇴',
  'Portugal': '🇵🇹',
  'DR Congo': '🇨🇩',
  'Uzbekistan': '🇺🇿',
  'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
};

// Bracket slot definitions
// Left half: R32 slots 0-7 → R16 slots 0-3 → QF slots 0-1 → SF slot 0 → Final
// Right half: R32 slots 8-15 → R16 slots 4-7 → QF slots 2-3 → SF slot 1 → Final
export const BRACKET_SLOTS: { round: string; slot: number; label: string }[] = [
  // R32 - left half (slots 0-7)
  { round: 'R32', slot: 0, label: '1A vs 2B' },
  { round: 'R32', slot: 1, label: '1C vs 2D' },
  { round: 'R32', slot: 2, label: '1E vs 2F' },
  { round: 'R32', slot: 3, label: '1G vs 2H' },
  { round: 'R32', slot: 4, label: '1I vs 2J' },
  { round: 'R32', slot: 5, label: '1K vs 2L' },
  { round: 'R32', slot: 6, label: '3rd Best (1)' },
  { round: 'R32', slot: 7, label: '3rd Best (2)' },
  // R32 - right half (slots 8-15)
  { round: 'R32', slot: 8,  label: '2A vs 1B' },
  { round: 'R32', slot: 9,  label: '2C vs 1D' },
  { round: 'R32', slot: 10, label: '2E vs 1F' },
  { round: 'R32', slot: 11, label: '2G vs 1H' },
  { round: 'R32', slot: 12, label: '2I vs 1J' },
  { round: 'R32', slot: 13, label: '2K vs 1L' },
  { round: 'R32', slot: 14, label: '3rd Best (3)' },
  { round: 'R32', slot: 15, label: '3rd Best (4)' },
  // R16 - left half (slots 0-3)
  { round: 'R16', slot: 0, label: 'R16 Match 1' },
  { round: 'R16', slot: 1, label: 'R16 Match 2' },
  { round: 'R16', slot: 2, label: 'R16 Match 3' },
  { round: 'R16', slot: 3, label: 'R16 Match 4' },
  // R16 - right half (slots 4-7)
  { round: 'R16', slot: 4, label: 'R16 Match 5' },
  { round: 'R16', slot: 5, label: 'R16 Match 6' },
  { round: 'R16', slot: 6, label: 'R16 Match 7' },
  { round: 'R16', slot: 7, label: 'R16 Match 8' },
  // QF - left half (slots 0-1)
  { round: 'QF', slot: 0, label: 'QF Match 1' },
  { round: 'QF', slot: 1, label: 'QF Match 2' },
  // QF - right half (slots 2-3)
  { round: 'QF', slot: 2, label: 'QF Match 3' },
  { round: 'QF', slot: 3, label: 'QF Match 4' },
  // SF
  { round: 'SF', slot: 0, label: 'Semi-Final 1' },
  { round: 'SF', slot: 1, label: 'Semi-Final 2' },
  // Final
  { round: 'Final', slot: 0, label: 'World Cup Final' },
];

// Given a round and slot that won, compute the parent round and slot
export function getParentSlot(round: string, slot: number): { round: string; slot: number } | null {
  switch (round) {
    case 'R32':
      if (slot < 8) return { round: 'R16', slot: Math.floor(slot / 2) };
      return { round: 'R16', slot: 4 + Math.floor((slot - 8) / 2) };
    case 'R16':
      if (slot < 4) return { round: 'QF', slot: Math.floor(slot / 2) };
      return { round: 'QF', slot: 2 + Math.floor((slot - 4) / 2) };
    case 'QF':
      if (slot < 2) return { round: 'SF', slot: 0 };
      return { round: 'SF', slot: 1 };
    case 'SF':
      return { round: 'Final', slot: 0 };
    default:
      return null;
  }
}

// Given a parent slot, find which two child slots feed into it
export function getChildSlots(round: string, slot: number): { round: string; slots: number[] } | null {
  switch (round) {
    case 'R16':
      if (slot < 4) return { round: 'R32', slots: [slot * 2, slot * 2 + 1] };
      return { round: 'R32', slots: [8 + (slot - 4) * 2, 8 + (slot - 4) * 2 + 1] };
    case 'QF':
      if (slot < 2) return { round: 'R16', slots: [slot * 2, slot * 2 + 1] };
      return { round: 'R16', slots: [4 + (slot - 2) * 2, 4 + (slot - 2) * 2 + 1] };
    case 'SF':
      if (slot === 0) return { round: 'QF', slots: [0, 1] };
      return { round: 'QF', slots: [2, 3] };
    case 'Final':
      return { round: 'SF', slots: [0, 1] };
    default:
      return null;
  }
}

// ─── Extended team metadata ───────────────────────────────────────────────────

export interface TeamMeta {
  flag: string;      // flagcdn.com 2-letter code, e.g. "mx". England="gb-eng", Scotland="gb-sct"
  fifaRank: number;  // approximate FIFA ranking
  odds: string;      // tournament winner fractional odds, e.g. "9/2"
  players: { name: string; position: string }[];  // 3 key players
}

export const TEAM_META: Record<string, TeamMeta> = {
  // GROUP A — Mexico 15, S.Africa 60, S.Korea 25, Czechia 41
  'Mexico':           { flag: 'mx', fifaRank: 15, odds: '50/1',  players: [{ name: 'Hirving Lozano', position: 'FW' }, { name: 'Raúl Jiménez', position: 'FW' }, { name: 'Edson Álvarez', position: 'MF' }] },
  'South Africa':     { flag: 'za', fifaRank: 60, odds: '300/1', players: [{ name: 'Percy Tau', position: 'FW' }, { name: 'Ronwen Williams', position: 'GK' }, { name: 'Themba Zwane', position: 'MF' }] },
  'South Korea':      { flag: 'kr', fifaRank: 25, odds: '80/1',  players: [{ name: 'Son Heung-min', position: 'FW' }, { name: 'Kim Min-jae', position: 'DF' }, { name: 'Hwang Hee-chan', position: 'FW' }] },
  'Czechia':          { flag: 'cz', fifaRank: 41, odds: '250/1', players: [{ name: 'Patrik Schick', position: 'FW' }, { name: 'Vladimír Coufal', position: 'DF' }, { name: 'Tomáš Souček', position: 'MF' }] },
  // GROUP B — Canada 30, Switzerland 20, Qatar 55, Bosnia 65
  'Canada':           { flag: 'ca', fifaRank: 30, odds: '80/1',  players: [{ name: 'Alphonso Davies', position: 'DF' }, { name: 'Jonathan David', position: 'FW' }, { name: 'Tajon Buchanan', position: 'MF' }] },
  'Bosnia and Herzegovina': { flag: 'ba', fifaRank: 65, odds: '250/1', players: [{ name: 'Edin Džeko', position: 'FW' }, { name: 'Miralem Pjanić', position: 'MF' }, { name: 'Sandro Kulenović', position: 'FW' }] },
  'Qatar':            { flag: 'qa', fifaRank: 55, odds: '250/1', players: [{ name: 'Akram Afif', position: 'FW' }, { name: 'Almoez Ali', position: 'FW' }, { name: 'Hassan Al-Haydos', position: 'MF' }] },
  'Switzerland':      { flag: 'ch', fifaRank: 20, odds: '66/1',  players: [{ name: 'Granit Xhaka', position: 'MF' }, { name: 'Xherdan Shaqiri', position: 'MF' }, { name: 'Yann Sommer', position: 'GK' }] },
  // GROUP C — Brazil 6, Morocco 8, Haiti 83, Scotland 43
  'Brazil':           { flag: 'br', fifaRank: 6,  odds: '7/1',   players: [{ name: 'Vinícius Jr.', position: 'FW' }, { name: 'Rodrygo', position: 'FW' }, { name: 'Alisson', position: 'GK' }] },
  'Morocco':          { flag: 'ma', fifaRank: 8,  odds: '25/1',  players: [{ name: 'Achraf Hakimi', position: 'DF' }, { name: 'Sofyan Amrabat', position: 'MF' }, { name: 'Youssef En-Nesyri', position: 'FW' }] },
  'Haiti':            { flag: 'ht', fifaRank: 83, odds: '500/1', players: [{ name: 'Duckens Nazon', position: 'FW' }, { name: 'Frantzdy Pierrot', position: 'FW' }, { name: 'Derrick Etienne', position: 'MF' }] },
  'Scotland':         { flag: 'gb-sct', fifaRank: 43, odds: '200/1', players: [{ name: 'Andrew Robertson', position: 'DF' }, { name: 'Scott McTominay', position: 'MF' }, { name: 'Kieran Tierney', position: 'DF' }] },
  // GROUP D — USA 16, Paraguay 40, Australia 27, Turkey 22
  'United States':    { flag: 'us', fifaRank: 16, odds: '28/1',  players: [{ name: 'Christian Pulisic', position: 'FW' }, { name: 'Gio Reyna', position: 'MF' }, { name: 'Tyler Adams', position: 'MF' }] },
  'Paraguay':         { flag: 'py', fifaRank: 40, odds: '250/1', players: [{ name: 'Miguel Almirón', position: 'MF' }, { name: 'Gustavo Gómez', position: 'DF' }, { name: 'Antonio Sanabria', position: 'FW' }] },
  'Australia':        { flag: 'au', fifaRank: 27, odds: '100/1', players: [{ name: 'Mathew Ryan', position: 'GK' }, { name: 'Ajdin Hrustic', position: 'MF' }, { name: 'Mitchell Duke', position: 'FW' }] },
  'Turkey':           { flag: 'tr', fifaRank: 22, odds: '100/1', players: [{ name: 'Hakan Çalhanoğlu', position: 'MF' }, { name: 'Arda Güler', position: 'MF' }, { name: 'Zeki Çelik', position: 'DF' }] },
  // GROUP E — Germany 10, Curacao 82, Ivory Coast 35, Ecuador 23
  'Germany':          { flag: 'de', fifaRank: 10, odds: '9/1',   players: [{ name: 'Jamal Musiala', position: 'MF' }, { name: 'Florian Wirtz', position: 'MF' }, { name: 'Manuel Neuer', position: 'GK' }] },
  'Curacao':          { flag: 'cw', fifaRank: 82, odds: '750/1', players: [{ name: 'Cuco Martina', position: 'DF' }, { name: 'Leandro Bacuna', position: 'MF' }, { name: 'Gevaro Nepomuceno', position: 'FW' }] },
  "Cote d'Ivoire":    { flag: 'ci', fifaRank: 35, odds: '150/1', players: [{ name: 'Nicolas Pépé', position: 'FW' }, { name: 'Sébastien Haller', position: 'FW' }, { name: 'Franck Kessié', position: 'MF' }] },
  'Ecuador':          { flag: 'ec', fifaRank: 23, odds: '125/1', players: [{ name: 'Enner Valencia', position: 'FW' }, { name: 'Piero Hincapié', position: 'DF' }, { name: 'Moisés Caicedo', position: 'MF' }] },
  // GROUP F — Netherlands 7, Japan 19, Sweden 38, Tunisia 46
  'Netherlands':      { flag: 'nl', fifaRank: 7,  odds: '12/1',  players: [{ name: 'Virgil van Dijk', position: 'DF' }, { name: 'Frenkie de Jong', position: 'MF' }, { name: 'Cody Gakpo', position: 'FW' }] },
  'Japan':            { flag: 'jp', fifaRank: 19, odds: '40/1',  players: [{ name: 'Takefusa Kubo', position: 'FW' }, { name: 'Wataru Endo', position: 'MF' }, { name: 'Hiroki Ito', position: 'DF' }] },
  'Sweden':           { flag: 'se', fifaRank: 38, odds: '125/1', players: [{ name: 'Alexander Isak', position: 'FW' }, { name: 'Dejan Kulusevski', position: 'MF' }, { name: 'Victor Lindelöf', position: 'DF' }] },
  'Tunisia':          { flag: 'tn', fifaRank: 46, odds: '200/1', players: [{ name: 'Wahbi Khazri', position: 'FW' }, { name: 'Youssef Msakni', position: 'MF' }, { name: 'Montassar Talbi', position: 'DF' }] },
  // GROUP G — Belgium 9, Egypt 29, Iran 21, New Zealand 85
  'Belgium':          { flag: 'be', fifaRank: 9,  odds: '22/1',  players: [{ name: 'Kevin De Bruyne', position: 'MF' }, { name: 'Romelu Lukaku', position: 'FW' }, { name: 'Thibaut Courtois', position: 'GK' }] },
  'Egypt':            { flag: 'eg', fifaRank: 29, odds: '200/1', players: [{ name: 'Mohamed Salah', position: 'FW' }, { name: 'Omar Marmoush', position: 'FW' }, { name: 'Ahmed El-Shenawy', position: 'GK' }] },
  'Iran':             { flag: 'ir', fifaRank: 21, odds: '150/1', players: [{ name: 'Mehdi Taremi', position: 'FW' }, { name: 'Sardar Azmoun', position: 'FW' }, { name: 'Alireza Beiranvand', position: 'GK' }] },
  'New Zealand':      { flag: 'nz', fifaRank: 85, odds: '500/1', players: [{ name: 'Chris Wood', position: 'FW' }, { name: 'Ryan Thomas', position: 'MF' }, { name: 'Joe Bell', position: 'MF' }] },
  // GROUP H — Spain 2, Cabo Verde 69, Saudi Arabia 61, Uruguay 17
  'Spain':            { flag: 'es', fifaRank: 2,  odds: '5/1',   players: [{ name: 'Pedri', position: 'MF' }, { name: 'Lamine Yamal', position: 'FW' }, { name: 'Dani Olmo', position: 'MF' }] },
  'Cabo Verde':       { flag: 'cv', fifaRank: 69, odds: '400/1', players: [{ name: 'Ryan Mendes', position: 'MF' }, { name: 'Garry Rodrigues', position: 'FW' }, { name: 'Stopira', position: 'DF' }] },
  'Saudi Arabia':     { flag: 'sa', fifaRank: 61, odds: '300/1', players: [{ name: 'Salem Al-Dawsari', position: 'FW' }, { name: 'Mohammed Al-Owais', position: 'GK' }, { name: 'Sami Al-Najei', position: 'DF' }] },
  'Uruguay':          { flag: 'uy', fifaRank: 17, odds: '20/1',  players: [{ name: 'Darwin Núñez', position: 'FW' }, { name: 'Federico Valverde', position: 'MF' }, { name: 'Ronald Araújo', position: 'DF' }] },
  // GROUP I — France 1, Senegal 14, Norway 31, Iraq 57
  'France':           { flag: 'fr', fifaRank: 1,  odds: '9/2',   players: [{ name: 'Kylian Mbappé', position: 'FW' }, { name: 'Antoine Griezmann', position: 'FW' }, { name: 'Aurélien Tchouaméni', position: 'MF' }] },
  'Senegal':          { flag: 'sn', fifaRank: 14, odds: '66/1',  players: [{ name: 'Sadio Mané', position: 'FW' }, { name: 'Kalidou Koulibaly', position: 'DF' }, { name: 'Idrissa Gueye', position: 'MF' }] },
  'Iraq':             { flag: 'iq', fifaRank: 57, odds: '400/1', players: [{ name: 'Amjad Rashid', position: 'MF' }, { name: 'Mohanad Ali', position: 'FW' }, { name: 'Bashar Resan', position: 'MF' }] },
  'Norway':           { flag: 'no', fifaRank: 31, odds: '80/1',  players: [{ name: 'Erling Haaland', position: 'FW' }, { name: 'Martin Ødegaard', position: 'MF' }, { name: 'Alexander Sørloth', position: 'FW' }] },
  // GROUP J — Argentina 3, Algeria 28, Austria 24, Jordan 63
  'Argentina':        { flag: 'ar', fifaRank: 3,  odds: '11/2',  players: [{ name: 'Lionel Messi', position: 'FW' }, { name: 'Julián Álvarez', position: 'FW' }, { name: 'Rodrigo De Paul', position: 'MF' }] },
  'Algeria':          { flag: 'dz', fifaRank: 28, odds: '150/1', players: [{ name: 'Riyad Mahrez', position: 'FW' }, { name: 'Islam Slimani', position: 'FW' }, { name: 'Youcef Atal', position: 'MF' }] },
  'Austria':          { flag: 'at', fifaRank: 24, odds: '100/1', players: [{ name: 'David Alaba', position: 'DF' }, { name: 'Marcel Sabitzer', position: 'MF' }, { name: 'Marko Arnautovic', position: 'FW' }] },
  'Jordan':           { flag: 'jo', fifaRank: 63, odds: '400/1', players: [{ name: 'Ahmad Hayel', position: 'GK' }, { name: 'Muhannad Nasani', position: 'MF' }, { name: "Baha' Faisal", position: 'DF' }] },
  // GROUP K — Portugal 5, DR Congo 46, Uzbekistan 50, Colombia 13
  'Portugal':         { flag: 'pt', fifaRank: 5,  odds: '7/1',   players: [{ name: 'Cristiano Ronaldo', position: 'FW' }, { name: 'Bernardo Silva', position: 'MF' }, { name: 'Rúben Dias', position: 'DF' }] },
  'DR Congo':         { flag: 'cd', fifaRank: 46, odds: '300/1', players: [{ name: 'Chancel Mbemba', position: 'DF' }, { name: 'Cédric Bakambu', position: 'FW' }, { name: 'Arthur Masuaku', position: 'DF' }] },
  'Uzbekistan':       { flag: 'uz', fifaRank: 50, odds: '300/1', players: [{ name: 'Eldor Shomurodov', position: 'FW' }, { name: 'Jasur Jalolov', position: 'FW' }, { name: 'Otabek Shukurov', position: 'MF' }] },
  'Colombia':         { flag: 'co', fifaRank: 13, odds: '22/1',  players: [{ name: 'Luis Díaz', position: 'FW' }, { name: 'James Rodríguez', position: 'MF' }, { name: 'Davinson Sánchez', position: 'DF' }] },
  // GROUP L — England 4, Croatia 11, Ghana 73, Panama 33
  'England':          { flag: 'gb-eng', fifaRank: 4,  odds: '6/1',   players: [{ name: 'Harry Kane', position: 'FW' }, { name: 'Jude Bellingham', position: 'MF' }, { name: 'Bukayo Saka', position: 'FW' }] },
  'Croatia':          { flag: 'hr', fifaRank: 11, odds: '50/1',  players: [{ name: 'Luka Modrić', position: 'MF' }, { name: 'Mateo Kovačić', position: 'MF' }, { name: 'Ivan Perišić', position: 'MF' }] },
  'Ghana':            { flag: 'gh', fifaRank: 73, odds: '200/1', players: [{ name: 'Thomas Partey', position: 'MF' }, { name: 'Jordan Ayew', position: 'FW' }, { name: 'Daniel Amartey', position: 'DF' }] },
  'Panama':           { flag: 'pa', fifaRank: 33, odds: '500/1', players: [{ name: 'Rolando Blackburn', position: 'FW' }, { name: 'Alfredo Stephens', position: 'MF' }, { name: 'Édgar Bárcenas', position: 'MF' }] },
};

export function getTeamMeta(name: string): TeamMeta {
  return TEAM_META[name] ?? { flag: 'un', fifaRank: 99, odds: 'N/A', players: [] };
}

export function getFlagUrl(code: string): string {
  return `https://flagcdn.com/w40/${code}.png`;
}

// Compute approximate decimal odds from FIFA rankings.
// Returns { home, draw, away } as decimal odds (e.g. 2.10).
export function computeMatchOdds(
  homeTeam: string,
  awayTeam: string
): { home: number; draw: number; away: number } {
  const homeRank = getTeamMeta(homeTeam).fifaRank;
  const awayRank = getTeamMeta(awayTeam).fifaRank;

  // Rank difference: positive = home team is ranked higher (smaller number)
  const diff = awayRank - homeRank;

  // Logistic probability for each outcome.
  // k=0.020 reduces over-weighting of rank gaps; draw floor raised to match
  // real international football draw rates (~25-30%).
  const k = 0.020;
  const pHome = 1 / (1 + Math.exp(-(k * diff + 0.05)));
  const pAway = 1 / (1 + Math.exp(k * diff + 0.05));
  const pDraw = Math.max(0.22, 0.40 - 0.002 * Math.abs(diff));

  const total = pHome + pAway + pDraw;

  // Apply 8% bookmaker margin and convert to decimal odds
  const m = 1.08;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    home: round2(m / (pHome / total)),
    draw: round2(m / (pDraw / total)),
    away: round2(m / (pAway / total)),
  };
}

export function computeMatchProbabilities(
  homeTeam: string,
  awayTeam: string
): { home: number; draw: number; away: number } {
  const homeRank = getTeamMeta(homeTeam).fifaRank;
  const awayRank = getTeamMeta(awayTeam).fifaRank;
  const diff = awayRank - homeRank;
  const k = 0.020;
  const pHome = 1 / (1 + Math.exp(-(k * diff + 0.05)));
  const pAway = 1 / (1 + Math.exp(k * diff + 0.05));
  const pDraw = Math.max(0.22, 0.40 - 0.002 * Math.abs(diff));
  const total = pHome + pAway + pDraw;
  return { home: pHome / total, draw: pDraw / total, away: pAway / total };
}

export interface GroupStanding {
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  pts: number;
}

export function computeGroupStandings(
  groupId: string,
  picks: Record<string, string>,
  tiebreakerOrder?: string[]
): GroupStanding[] {
  const group = GROUPS.find((g) => g.id === groupId);
  if (!group) return [];
  const matches = getGroupMatches(groupId);
  const table: Record<string, GroupStanding> = {};
  for (let i = 0; i < group.teams.length; i++) {
    const t = group.teams[i];
    table[t] = { team: t, p: 0, w: 0, d: 0, l: 0, pts: 0 };
  }
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const pick = picks[m.matchId];
    if (!pick) continue;
    table[m.home].p++;
    table[m.away].p++;
    if (pick === 'home') {
      table[m.home].w++; table[m.home].pts += 3; table[m.away].l++;
    } else if (pick === 'away') {
      table[m.away].w++; table[m.away].pts += 3; table[m.home].l++;
    } else {
      table[m.home].d++; table[m.home].pts++;
      table[m.away].d++; table[m.away].pts++;
    }
  }
  return group.teams
    .map((t) => table[t])
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.w !== a.w) return b.w - a.w;
      // True tie — apply user-resolved tiebreaker order if available
      if (tiebreakerOrder) {
        const ai = tiebreakerOrder.indexOf(a.team);
        const bi = tiebreakerOrder.indexOf(b.team);
        if (ai !== -1 && bi !== -1) return ai - bi;
      }
      return a.team.localeCompare(b.team);
    });
}

// Returns true if any adjacent teams in the standings are genuinely tied
// (same points AND same wins, meaning no deterministic sort without a tiebreaker)
export function groupHasTie(standings: GroupStanding[]): boolean {
  for (let i = 0; i < standings.length - 1; i++) {
    if (standings[i].pts === standings[i + 1].pts && standings[i].w === standings[i + 1].w) {
      return true;
    }
  }
  return false;
}

