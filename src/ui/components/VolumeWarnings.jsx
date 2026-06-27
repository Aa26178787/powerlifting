import React from 'react'
import { evidenceLabel } from '../i18n.js'

const LEVEL_STYLE = {
  info:    { color: '#888' },
  warn:    { color: '#c85a00' },
  caution: { color: '#c00' },
}

// Non-blocking advisory panel for volumeWarnings(profile) results.
// Each item is colored by level and shows an evidence tier badge if present.
export default function VolumeWarnings({ list }) {
  if (!list?.length) return null
  return (
    <ul className="volume-warnings" aria-label="볼륨 경고">
      {list.map((w, i) => (
        <li key={i} style={LEVEL_STYLE[w.level] ?? {}}>
          {w.msg}
          {w.tier && (
            <span className="tier-badge" style={{ marginLeft: '0.4em', fontSize: '0.85em', opacity: 0.8 }}>
              [{evidenceLabel(w.tier)}]
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
