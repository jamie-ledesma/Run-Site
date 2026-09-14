export type TeamSide = 'offense' | 'defense'

export interface FieldPoint {
  x: number
  y: number
}

export interface PlayerState extends FieldPoint {
  id: string
  jersey: string
  side: TeamSide
  role?: string
  vx: number
  vy: number
}

export interface PlayFrame {
  time: number
  players: PlayerState[]
}

export interface PlayRights {
  status: 'demo' | 'cleared' | 'restricted'
  owner?: string
  licenseReference?: string
  publicDisplay: boolean
  derivativeVisuals: boolean
}

export interface Play {
  id: string
  team: string
  opponent: string
  title: string
  quarter: number
  clock: string
  down: number
  distance: number
  lineOfScrimmage: number
  ballCarrierId: string
  actualYards: number
  sourceType: 'simulation' | 'tracking' | 'video'
  videoUrl?: string
  videoOffsetSeconds?: number
  frames: PlayFrame[]
  rights: PlayRights
}

export interface PlayManifest extends Omit<Play, 'frames'> {
  framesUrl: string
}

export interface CandidatePath {
  id: string
  label: string
  points: FieldPoint[]
  score: number
  expectedYards: number
  risk: number
  rawRisk: number
  blockHelp: number
  cutCost: number
}

export interface RationaleFactor {
  label: string
  value: string
  detail: string
  tone: 'positive' | 'neutral' | 'warning'
}

export interface FrameAnalysis {
  recommended: CandidatePath
  alternatives: CandidatePath[]
  confidence: number
  explanation: string
  primaryThreatId?: string
  rationale: RationaleFactor[]
  boxCount: number
}
