export type ThemePreference = 'light' | 'dark' | 'system';
export interface UserProfile { id: string; name: string; favoriteTeamId: number | null; createdAt: string; updatedAt: string; }
export interface UserPreferences { id: string; userId: string; theme: ThemePreference; notificationsEnabled: boolean; matchStartNotifications: boolean; matchResultNotifications: boolean; }
export interface Team { id: number; name: string; code: string | null; logo: string | null; country: string | null; founded: number | null; venue: string | null; city: string | null; }
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'unknown';
export interface Fixture { id: number; idEvent?: string | null; date: string; timestamp: number | null; status: MatchStatus; statusShort: string; elapsed: number | null; venue: string | null; homeTeam: Team; awayTeam: Team; homeGoals: number | null; awayGoals: number | null; round: string | null; }
export interface FixtureEvent { id?: string | null; time: number | null; type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var' | 'unknown'; detail: string | null; description?: string | null; player: string | null; assist: string | null; secondaryPlayer?: string | null; team?: string | null; teamId: number | null; }
export interface MatchStatistic { label: string; home: string | number | null; away: string | number | null; }
export interface MatchLineupPlayer { id?: string | null; player: string; team: string | null; teamId: number | null; home: boolean | null; position: string | null; number: string | number | null; substitute: boolean | null; }
export interface NewsArticle { id: string; title: string; description: string | null; image: string | null; sourceName: string; publishedAt: string; url: string; content: string | null; }
export interface Standing { rank: number; team: Team; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; form: string | null; }
