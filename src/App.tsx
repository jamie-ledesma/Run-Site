import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { CoachView } from './components/CoachView'
import { demoCatalog } from './data/demoCatalog'
import { nflTeams, teamName } from './data/teams'
import { buildOrganizationSnapshot } from './lib/organizationInsights'
import { analyzeFrame, findPlayer, interpolateFrames } from './lib/playEngine'
import type { FieldPoint, Play, PlayManifest } from './types'

type CameraView = 'coach' | 'rb'

const loadThreePlayView = () => import('./components/ThreePlayView').then((module) => ({ default: module.ThreePlayView }))
const ThreePlayView = lazy(loadThreePlayView)

function choosePlay(catalog: Play[], teamId: string, previousId?: string) {
  const choices = catalog.filter((play) => play.team === teamId && play.id !== previousId)
  return choices[Math.floor(Math.random() * choices.length)]
}

async function loadClearedCatalog(): Promise<Play[]> {
  const response = await fetch('/data/catalog.json')
  if (!response.ok) return []
  const manifests = await response.json() as PlayManifest[]
  return Promise.all(manifests.map(async (manifest) => {
    const frameResponse = await fetch(manifest.framesUrl)
    if (!frameResponse.ok) throw new Error(`Could not load tracking frames for ${manifest.id}`)
    const frames = await frameResponse.json()
    return { ...manifest, frames }
  }))
}

function actualPathFor(play: Play, time: number): FieldPoint[] {
  return play.frames
    .filter((frame) => frame.time <= time)
    .map((frame) => findPlayer(frame, play.ballCarrierId))
    .filter((player): player is NonNullable<typeof player> => Boolean(player))
    .map(({ x, y }) => ({ x, y }))
}

function TeamSelector({ selected, onChange }: { selected: string; onChange: (team: string) => void }) {
  return (
    <label className="team-field">
      <span>Choose your team</span>
      <select value={selected} onChange={(event) => onChange(event.target.value)}>
        {nflTeams.map((team) => <option key={team.id} value={team.id}>{team.city} {team.name}</option>)}
      </select>
    </label>
  )
}

function App() {
  const [started, setStarted] = useState(false)
  const [teamId, setTeamId] = useState('NE')
  const [catalog, setCatalog] = useState<Play[]>(demoCatalog)
  const [play, setPlay] = useState(() => choosePlay(demoCatalog, 'NE'))
  const [camera, setCamera] = useState<CameraView>('coach')
  const [time, setTime] = useState(1.35)
  const [playing, setPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showAi, setShowAi] = useState(true)
  const [showThreat, setShowThreat] = useState(true)
  const lastTick = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const maxTime = play.frames[play.frames.length - 1].time

  const frame = useMemo(() => interpolateFrames(play.frames, time), [play, time])
  const analysis = useMemo(() => analyzeFrame(frame, play.ballCarrierId), [frame, play.ballCarrierId])
  const actualPath = useMemo(() => actualPathFor(play, time), [play, time])
  const decisionAnalysis = useMemo(() => {
    const decisionTime = Math.min(1.2, maxTime)
    return analyzeFrame(interpolateFrames(play.frames, decisionTime), play.ballCarrierId)
  }, [play, maxTime])
  const organization = useMemo(() => buildOrganizationSnapshot(teamId, catalog), [teamId, catalog])
  const isComplete = time >= maxTime - .03
  const opportunityDifference = decisionAnalysis.recommended.expectedYards - play.actualYards

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => { void loadThreePlayView() }, 250)
    return () => window.clearTimeout(preloadTimer)
  }, [])

  useEffect(() => {
    loadClearedCatalog()
      .then((clearedPlays) => setCatalog([...demoCatalog, ...clearedPlays]))
      .catch((error) => console.warn('Rights-cleared catalog was not loaded:', error))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const target = time + (play.videoOffsetSeconds ?? 0)
    if (Math.abs(video.currentTime - target) > 0.04) video.currentTime = target
  }, [time, play.videoOffsetSeconds, play.videoUrl])

  useEffect(() => {
    if (!playing) {
      lastTick.current = null
      return
    }
    let animationId = 0
    const tick = (timestamp: number) => {
      const previous = lastTick.current ?? timestamp
      const delta = Math.min(0.08, (timestamp - previous) / 1000)
      lastTick.current = timestamp
      setTime((current) => {
        const next = current + delta * playbackSpeed
        if (next >= maxTime) {
          setPlaying(false)
          return maxTime
        }
        return next
      })
      animationId = requestAnimationFrame(tick)
    }
    animationId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationId)
  }, [playing, maxTime, playbackSpeed])

  const selectTeam = (nextTeam: string) => {
    setTeamId(nextTeam)
    setPlay(choosePlay(catalog, nextTeam))
    setTime(1.35)
    setPlaying(false)
  }

  const randomize = () => {
    setPlay(choosePlay(catalog, teamId, play.id))
    setTime(1.35)
    setPlaying(false)
  }

  const togglePlayback = () => {
    if (isComplete) {
      setTime(0)
      setPlaying(true)
      return
    }
    setPlaying((value) => !value)
  }

  if (!started) {
    return (
      <main className="landing">
        <nav className="landing-nav"><div className="brand"><span className="brand-mark">R</span> RunSight</div><span className="demo-pill">MVP prototype</span></nav>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">SEE THE RUN BEFORE IT HAPPENS</p>
            <h1>Find the lane hiding inside every rushing play.</h1>
            <p className="hero-text">Pick a team, watch the play from behind the quarterback, then step into a reconstructed running-back view to understand the best estimated path.</p>
            <div className="launch-card">
              <TeamSelector selected={teamId} onChange={setTeamId} />
              <button className="primary-button" onClick={() => { setPlay(choosePlay(catalog, teamId)); setStarted(true) }}>Show me a play <span aria-hidden="true">→</span></button>
              <p>Currently uses safe simulated tracking data. Licensed film can be imported play by play.</p>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="mini-field">
              <span className="mini-player offense p1">77</span><span className="mini-player offense p2">65</span><span className="mini-player offense p3">60</span>
              <span className="mini-player defense p4">54</span><span className="mini-player defense p5">52</span><span className="mini-player defense p6">23</span>
              <span className="mini-player runner p7">33</span>
              <svg viewBox="0 0 400 380"><path d="M200 332 C176 278 127 247 98 184 C78 141 88 94 60 55" /></svg>
            </div>
            <div className="insight-chip"><strong>Bounce left</strong><span>Best estimated lane</span></div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand brand-button" onClick={() => setStarted(false)}><span className="brand-mark">R</span> RunSight</button>
        <div className="header-actions">
          <TeamSelector selected={teamId} onChange={selectTeam} />
          <button className="primary-button compact" onClick={randomize}>↝ Random rushing play</button>
        </div>
      </header>

      <main className="film-room">
        <section className="viewer-column">
          <div className="play-heading">
            <div>
              <div className="matchup">{teamId} vs {play.opponent}</div>
              <div className="play-context">{play.title} · Q{play.quarter} {play.clock} · {play.down}{play.down === 1 ? 'st' : play.down === 2 ? 'nd' : 'rd'} &amp; {play.distance}</div>
            </div>
            <div className="camera-switch" role="group" aria-label="Camera view">
              <button className={camera === 'coach' ? 'active' : ''} onClick={() => setCamera('coach')}>▣ Behind QB</button>
              <button className={camera === 'rb' ? 'active' : ''} onClick={() => setCamera('rb')}>◉ RB view</button>
            </div>
          </div>

          <div className="video-card">
            <div className="video-stage">
              {play.videoUrl && camera === 'coach' ? (
                <>
                  <video ref={videoRef} className="source-video" src={play.videoUrl} muted playsInline preload="metadata" />
                  <CoachView
                    frame={frame}
                    ballCarrierId={play.ballCarrierId}
                    lineOfScrimmage={play.lineOfScrimmage}
                    recommendedPath={analysis.recommended}
                    actualPath={actualPath}
                    showAi={showAi}
                    showThreat={showThreat}
                    showFieldBackground={false}
                    offenseTeam={play.team}
                    defenseTeam={play.opponent}
                    primaryThreatId={analysis.primaryThreatId}
                  />
                </>
              ) : (
                <Suspense fallback={<div className="three-fallback">Building the 3D field…</div>}>
                  <ThreePlayView
                    frame={frame}
                    cameraView={camera}
                    ballCarrierId={play.ballCarrierId}
                    lineOfScrimmage={play.lineOfScrimmage}
                    offenseTeam={play.team}
                    defenseTeam={play.opponent}
                    recommendedPath={analysis.recommended}
                    actualPath={actualPath}
                    showAi={showAi}
                    showThreat={showThreat}
                    primaryThreatId={analysis.primaryThreatId}
                  />
                </Suspense>
              )}
              <span className="view-chip">{camera === 'coach' ? 'Behind-QB analysis' : 'Simulated RB perspective'}</span>
              <span className="confidence-chip">AI · {analysis.confidence}% confidence</span>
            </div>
            <div className="playback">
              <button className="play-button" onClick={togglePlayback}>{playing ? 'Ⅱ Pause' : isComplete ? '↺ Replay' : '▶ Play'}</button>
              <button className="icon-button" aria-label="Previous frame" onClick={() => setTime((value) => Math.max(0, value - 0.1))}>‹</button>
              <div className="timeline">
                <input aria-label="Play timeline" type="range" min="0" max={maxTime} step="0.01" value={time} onChange={(event) => { setPlaying(false); setTime(Number(event.target.value)) }} />
                <div><span>Handoff</span><strong>{time.toFixed(2)}s</strong><span>Finish</span></div>
              </div>
              <button className="icon-button" aria-label="Next frame" onClick={() => setTime((value) => Math.min(maxTime, value + 0.1))}>›</button>
              <label className="speed-control" aria-label="Playback speed">
                <select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))}>
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={1.5}>1.5×</option>
                  <option value={2}>2×</option>
                </select>
              </label>
            </div>
            <div className="overlay-controls">
              <label><input type="checkbox" checked={showAi} onChange={(event) => setShowAi(event.target.checked)} /> Best estimated lane</label>
              <label><input type="checkbox" checked={showThreat} onChange={(event) => setShowThreat(event.target.checked)} disabled={camera === 'rb'} /> Defender threat</label>
              <span><i className="legend-line actual" /> Actual path</span>
            </div>
          </div>
        </section>

        <aside className="analysis-column">
          <section className="analysis-card recommendation-card">
            <div className="section-heading"><h2>Best read</h2><span>At {time.toFixed(2)}s</span></div>
            <div className="big-read">{analysis.recommended.label}</div>
            <div className="sub-read">Estimated {analysis.recommended.expectedYards.toFixed(1)} yards available</div>
            <div className="meter-row"><span>Model confidence</span><strong>{analysis.confidence}%</strong></div>
            <div className="meter"><span style={{ width: `${analysis.confidence}%` }} /></div>
          </section>

          <section className="analysis-card">
            <div className="section-heading"><h2>Why this lane?</h2></div>
            <p className="explanation">{analysis.explanation}</p>
            <div className="rationale-list">
              {analysis.rationale.map((factor) => (
                <div className={`rationale-row ${factor.tone}`} key={factor.label}>
                  <span className="rationale-dot" aria-hidden="true" />
                  <div><strong>{factor.label}</strong><small>{factor.detail}</small></div>
                  <b>{factor.value}</b>
                </div>
              ))}
            </div>
            <p className="model-note">This interpretable model uses player motion, defender arrival, cut cost, and proximity-based blocking influence. Verified engagement and leverage labels are the next accuracy upgrade.</p>
          </section>

          <section className="analysis-card path-ranking">
            <div className="section-heading"><h2>Path ranking</h2><span>Score</span></div>
            {[analysis.recommended, ...analysis.alternatives].map((path, index) => (
              <div className="rank-row" key={path.id}>
                <span className="rank-number">{index + 1}</span>
                <span>{path.label}</span>
                <strong>{path.score.toFixed(1)}</strong>
              </div>
            ))}
          </section>

          <section className={`analysis-card post-play-card ${isComplete ? 'is-complete' : ''}`}>
            <div className="section-heading"><h2>End-of-play review</h2><span>{isComplete ? 'Ready' : `${Math.round(time / maxTime * 100)}% watched`}</span></div>
            {isComplete ? (
              <>
                <div className="review-verdict">{opportunityDifference <= 2 ? 'Efficient result' : 'Decision worth reviewing'}</div>
                <div className="review-grid">
                  <div><span>Actual result</span><strong>{play.actualYards > 0 ? '+' : ''}{play.actualYards} yd</strong></div>
                  <div><span>Modeled opportunity</span><strong>{decisionAnalysis.recommended.expectedYards.toFixed(1)} yd</strong></div>
                </div>
                <p>{opportunityDifference <= 2
                  ? `The runner captured most of the modeled opportunity on this ${play.title.toLowerCase()} rep.`
                  : `${decisionAnalysis.recommended.label} offered roughly ${opportunityDifference.toFixed(1)} more yards at the primary decision point. Review the runner's shoulders and the force defender at 1.20 seconds.`}</p>
              </>
            ) : (
              <>
                <div className="review-progress"><span style={{ width: `${time / maxTime * 100}%` }} /></div>
                <p>Finish the rep to compare the result with the best estimated decision window.</p>
                <button className="secondary-button" onClick={() => { setPlaying(false); setTime(maxTime) }}>Jump to final review</button>
              </>
            )}
          </section>

          {isComplete && (
            <section className="analysis-card organization-card">
              <div className="section-heading"><h2>Organization snapshot</h2><span>{organization.scope}</span></div>
              <div className="organization-title">{organization.title}</div>
              <h3>{organization.headline}</h3>
              <p>{organization.summary}</p>
              <div className="lane-mix" aria-label="Recommended lane distribution">
                {organization.laneMix.map((lane) => (
                  <div className="lane-mix-row" key={lane.label}>
                    <span>{lane.label}</span>
                    <div><i style={{ width: `${lane.percentage}%` }} /></div>
                    <strong>{lane.percentage}%</strong>
                  </div>
                ))}
              </div>
              <div className="coaching-point"><span>Coaching question</span>{organization.coachingPoint}</div>
              <footer>{organization.isVerified ? `Based on verified imported film · ${organization.averageConfidence}% average model confidence` : 'Simulation sample only — this is not presented as an actual NFL team tendency.'}</footer>
            </section>
          )}

          <div className="rights-note"><strong>{play.sourceType === 'simulation' ? 'Simulated demo' : 'Rights-cleared source'}</strong><span>{teamName(teamId)} has {catalog.filter((item) => item.team === teamId).length} available plays. Public NFL film must be licensed before import.</span></div>
        </aside>
      </main>
    </div>
  )
}

export default App
