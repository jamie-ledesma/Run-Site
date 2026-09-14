export interface UniformPalette {
  primary: string
  secondary: string
  helmet: string
  number: string
  pants: string
}

const palettes: Record<string, UniformPalette> = {
  ARI: { primary: '#97233f', secondary: '#000000', helmet: '#ffffff', number: '#ffffff', pants: '#ffffff' },
  ATL: { primary: '#a71930', secondary: '#000000', helmet: '#000000', number: '#ffffff', pants: '#000000' },
  BAL: { primary: '#241773', secondary: '#9e7c0c', helmet: '#000000', number: '#ffffff', pants: '#ffffff' },
  BUF: { primary: '#00338d', secondary: '#c60c30', helmet: '#ffffff', number: '#ffffff', pants: '#ffffff' },
  CAR: { primary: '#0085ca', secondary: '#101820', helmet: '#a5acaf', number: '#ffffff', pants: '#ffffff' },
  CHI: { primary: '#0b162a', secondary: '#c83803', helmet: '#0b162a', number: '#ffffff', pants: '#ffffff' },
  CIN: { primary: '#fb4f14', secondary: '#000000', helmet: '#fb4f14', number: '#ffffff', pants: '#ffffff' },
  CLE: { primary: '#311d00', secondary: '#ff3c00', helmet: '#ff3c00', number: '#ffffff', pants: '#ffffff' },
  DAL: { primary: '#003594', secondary: '#869397', helmet: '#c5ced6', number: '#ffffff', pants: '#c5ced6' },
  DEN: { primary: '#fb4f14', secondary: '#002244', helmet: '#002244', number: '#ffffff', pants: '#ffffff' },
  DET: { primary: '#0076b6', secondary: '#b0b7bc', helmet: '#b0b7bc', number: '#ffffff', pants: '#b0b7bc' },
  GB: { primary: '#203731', secondary: '#ffb612', helmet: '#ffb612', number: '#ffffff', pants: '#ffb612' },
  HOU: { primary: '#03202f', secondary: '#a71930', helmet: '#03202f', number: '#ffffff', pants: '#ffffff' },
  IND: { primary: '#002c5f', secondary: '#ffffff', helmet: '#ffffff', number: '#ffffff', pants: '#ffffff' },
  JAX: { primary: '#006778', secondary: '#d7a22a', helmet: '#101820', number: '#ffffff', pants: '#ffffff' },
  KC: { primary: '#e31837', secondary: '#ffb81c', helmet: '#e31837', number: '#ffffff', pants: '#ffffff' },
  LV: { primary: '#000000', secondary: '#a5acaf', helmet: '#a5acaf', number: '#ffffff', pants: '#a5acaf' },
  LAC: { primary: '#0080c6', secondary: '#ffc20e', helmet: '#ffffff', number: '#ffffff', pants: '#ffffff' },
  LAR: { primary: '#003594', secondary: '#ffa300', helmet: '#003594', number: '#ffffff', pants: '#ffa300' },
  MIA: { primary: '#008e97', secondary: '#fc4c02', helmet: '#ffffff', number: '#ffffff', pants: '#ffffff' },
  MIN: { primary: '#4f2683', secondary: '#ffc62f', helmet: '#4f2683', number: '#ffffff', pants: '#ffffff' },
  NE: { primary: '#002244', secondary: '#c60c30', helmet: '#c5ced6', number: '#ffffff', pants: '#c5ced6' },
  NO: { primary: '#101820', secondary: '#d3bc8d', helmet: '#d3bc8d', number: '#ffffff', pants: '#ffffff' },
  NYG: { primary: '#0b2265', secondary: '#a71930', helmet: '#0b2265', number: '#ffffff', pants: '#ffffff' },
  NYJ: { primary: '#125740', secondary: '#ffffff', helmet: '#125740', number: '#ffffff', pants: '#ffffff' },
  PHI: { primary: '#004c54', secondary: '#a5acaf', helmet: '#004c54', number: '#ffffff', pants: '#ffffff' },
  PIT: { primary: '#101820', secondary: '#ffb612', helmet: '#101820', number: '#ffffff', pants: '#ffb612' },
  SF: { primary: '#aa0000', secondary: '#b3995d', helmet: '#b3995d', number: '#ffffff', pants: '#b3995d' },
  SEA: { primary: '#002244', secondary: '#69be28', helmet: '#002244', number: '#ffffff', pants: '#ffffff' },
  TB: { primary: '#d50a0a', secondary: '#34302b', helmet: '#34302b', number: '#ffffff', pants: '#ffffff' },
  TEN: { primary: '#0c2340', secondary: '#4b92db', helmet: '#0c2340', number: '#ffffff', pants: '#ffffff' },
  WAS: { primary: '#5a1414', secondary: '#ffb612', helmet: '#5a1414', number: '#ffffff', pants: '#ffb612' },
}

export function getUniform(teamId: string) {
  return palettes[teamId] ?? { primary: '#244b76', secondary: '#d7e1da', helmet: '#d7e1da', number: '#ffffff', pants: '#ffffff' }
}
