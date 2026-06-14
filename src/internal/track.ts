import type { TrackOptions } from '../types.js'

export function resolveTrackOptions(track: boolean | TrackOptions | undefined): TrackOptions | null {
  if (!track) return null
  if (track === true) return {}
  return track
}
