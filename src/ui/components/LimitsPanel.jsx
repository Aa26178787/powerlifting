import React from 'react'

export default function LimitsPanel() {
  return (
    <details className="limits-panel">
      <summary>Evidence &amp; limits (read me)</summary>
      <ul>
        <li>Volume/frequency/intensity defaults come from meta-analyses (Pelland/Zourdos 2025, Schoenfeld). Training-age scaling is population-averaged — a heuristic, not individualized truth.</li>
        <li>The RPE→%1RM table (Tuchscherer/RTS) is real-world data but <strong>not peer-reviewed</strong>.</li>
        <li>Program skeletons are field-validated templates; research tunes their knobs. Periodization-model superiority for strength is weakly evidenced.</li>
        <li>Competition peaking is minimally handled in this version.</li>
      </ul>
    </details>
  )
}
