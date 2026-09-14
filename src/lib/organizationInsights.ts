import { teamName } from '../data/teams'
import type { Play } from '../types'
import { analyzeFrame, interpolateFrames } from './playEngine'

export interface OrganizationSnapshot {
  title: string
  scope: string
  headline: string
  summary: string
  coachingPoint: string
  laneMix: Array<{ label: string; count: number; percentage: number }>
  averageConfidence: number
  isVerified: boolean
}

export function buildOrganizationSnapshot(teamId: string, catalog: Play[]): OrganizationSnapshot {
  const teamPlays = catalog.filter((play) => play.team === teamId)
  const verified = teamPlays.filter((play) => play.rights.status === 'cleared' && play.sourceType !== 'simulation')
  const sample = verified.length >= 5 ? verified : teamPlays.filter((play) => play.sourceType === 'simulation').slice(0, 10)
  const reads = sample.map((play) => {
    const decisionTime = Math.min(1.2, play.frames[play.frames.length - 1].time)
    return analyzeFrame(interpolateFrames(play.frames, decisionTime), play.ballCarrierId)
  })
  const labels = ['Press inside', 'Bounce left', 'Bounce right']
  const laneMix = labels.map((label) => {
    const count = reads.filter((read) => read.recommended.label === label).length
    return { label, count, percentage: sample.length ? Math.round(count / sample.length * 100) : 0 }
  }).sort((a, b) => b.count - a.count)
  const leader = laneMix[0]
  const averageConfidence = reads.length ? Math.round(reads.reduce((sum, read) => sum + read.confidence, 0) / reads.length) : 0
  const averageBox = reads.length ? reads.reduce((sum, read) => sum + read.boxCount, 0) / reads.length : 0
  const isVerified = verified.length >= 5

  return {
    title: `${teamName(teamId)} run-game lens`,
    scope: isVerified ? `${verified.length} verified plays` : `${sample.length} simulated reps`,
    headline: leader ? `${leader.label} appears most often` : 'More plays are needed',
    summary: leader
      ? `The model preferred ${leader.label.toLowerCase()} on ${leader.percentage}% of this sample, with ${averageBox.toFixed(1)} defenders in the modeled box on average.`
      : 'Import verified plays to build an organization-level picture.',
    coachingPoint: leader?.label === 'Press inside'
      ? 'Review whether interior double teams are creating vertical displacement early enough for the back to stay square.'
      : leader?.label === 'Bounce left'
        ? 'Review play-side edge leverage and whether the runner is pressing long enough to widen the force defender.'
        : 'Review backside pursuit control and whether perimeter blocks hold through the runner’s decision window.',
    laneMix,
    averageConfidence,
    isVerified,
  }
}
