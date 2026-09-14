# RunSight data acquisition

RunSight does not scrape NFL+, YouTube, broadcast streams, or unofficial clip sites. Public NFL footage must be covered by a license that permits streaming, editing, analytical overlays, and reconstructed derivative visuals.

## Launch target

The planned public catalog is 10 curated rushing plays for each of 32 teams. Select a balanced set rather than ten highlights:

- Two inside runs
- Two outside runs
- Two gap-scheme runs
- One short-yardage run
- One explosive run
- One stopped or negative run
- One debatable running-back decision

Use at least three games per team when the license allows it.

## Required source package

Each imported play lives at `public/data/plays/<play-id>/` and contains:

- `manifest.json`: play metadata and the rights record
- `video.mp4`: licensed High End Zone clip
- `frames.json`: corrected player coordinates over time
- Optional `calibration.json`: image-to-field correspondence points

The source video and any full-resolution working copies are ignored by Git by default. Use private object storage with signed delivery URLs in production.

## Tracking coordinate format

`frames.json` is an array of frames. Field coordinates use yards, with `x` increasing toward the offense's end zone and `y` ranging from 0 to 53.3 across the field.

```json
[
  {
    "time": 0.0,
    "players": [
      {
        "id": "rb",
        "jersey": "33",
        "side": "offense",
        "role": "RB",
        "x": 31.5,
        "y": 26.65,
        "vx": 3.2,
        "vy": 0.0
      }
    ]
  }
]
```

Include all 22 players whenever visible. Use a consistent identity throughout the play. When a player is fully occluded, interpolate only short gaps and mark longer gaps for human correction.

## Quality gate

Before a play is published:

1. Confirm the license reference and permitted uses.
2. Verify the line of scrimmage and field calibration.
3. Review every player track around the line of scrimmage.
4. Confirm the ball carrier and handoff timestamp.
5. Check jersey/team assignments and identity swaps.
6. Confirm actual yards and play metadata.
7. Have a football reviewer label the run concept and intended point of attack.
8. Run `npm run catalog`. Only rights-cleared manifests are included.

## Development stages

1. Validate the interface and baseline path model with the 320 generated demo plays.
2. Process 20 rights-cleared plays as an accuracy pilot.
3. Expand to four teams with 10 plays each.
4. Complete the 320-play public launch catalog.

NFL tracking competition datasets can help validate spatial models, but a dataset that contains only a handoff snapshot cannot drive the synchronized post-handoff viewer. Full frame-by-frame coordinates or corrected video tracking are required.
