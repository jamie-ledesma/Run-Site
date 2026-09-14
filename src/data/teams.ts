export interface NflTeam {
  id: string
  city: string
  name: string
}

export const nflTeams: NflTeam[] = [
  { id: 'ARI', city: 'Arizona', name: 'Cardinals' },
  { id: 'ATL', city: 'Atlanta', name: 'Falcons' },
  { id: 'BAL', city: 'Baltimore', name: 'Ravens' },
  { id: 'BUF', city: 'Buffalo', name: 'Bills' },
  { id: 'CAR', city: 'Carolina', name: 'Panthers' },
  { id: 'CHI', city: 'Chicago', name: 'Bears' },
  { id: 'CIN', city: 'Cincinnati', name: 'Bengals' },
  { id: 'CLE', city: 'Cleveland', name: 'Browns' },
  { id: 'DAL', city: 'Dallas', name: 'Cowboys' },
  { id: 'DEN', city: 'Denver', name: 'Broncos' },
  { id: 'DET', city: 'Detroit', name: 'Lions' },
  { id: 'GB', city: 'Green Bay', name: 'Packers' },
  { id: 'HOU', city: 'Houston', name: 'Texans' },
  { id: 'IND', city: 'Indianapolis', name: 'Colts' },
  { id: 'JAX', city: 'Jacksonville', name: 'Jaguars' },
  { id: 'KC', city: 'Kansas City', name: 'Chiefs' },
  { id: 'LV', city: 'Las Vegas', name: 'Raiders' },
  { id: 'LAC', city: 'Los Angeles', name: 'Chargers' },
  { id: 'LAR', city: 'Los Angeles', name: 'Rams' },
  { id: 'MIA', city: 'Miami', name: 'Dolphins' },
  { id: 'MIN', city: 'Minnesota', name: 'Vikings' },
  { id: 'NE', city: 'New England', name: 'Patriots' },
  { id: 'NO', city: 'New Orleans', name: 'Saints' },
  { id: 'NYG', city: 'New York', name: 'Giants' },
  { id: 'NYJ', city: 'New York', name: 'Jets' },
  { id: 'PHI', city: 'Philadelphia', name: 'Eagles' },
  { id: 'PIT', city: 'Pittsburgh', name: 'Steelers' },
  { id: 'SF', city: 'San Francisco', name: '49ers' },
  { id: 'SEA', city: 'Seattle', name: 'Seahawks' },
  { id: 'TB', city: 'Tampa Bay', name: 'Buccaneers' },
  { id: 'TEN', city: 'Tennessee', name: 'Titans' },
  { id: 'WAS', city: 'Washington', name: 'Commanders' },
]

export function teamName(teamId: string) {
  const team = nflTeams.find((item) => item.id === teamId)
  return team ? `${team.city} ${team.name}` : teamId
}
