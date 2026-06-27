import React, { useState } from 'react'
import { applyReadiness } from '../../engine/applyReadiness.js'
import { regionLabel } from '../i18n.js'

const REGIONS = [
  'lowerBack', 'knee', 'shoulder', 'elbow', 'wrist',
  'hip', 'hamstring', 'pec', 'bicepsTendon', 'ankle',
]

export default function CheckinPanel({ session, weekIndex, onApply }) {
  const [sleepHours, setSleepHours] = useState(7)
  const [stress, setStress] = useState(2)
  const [systemicFatigue, setSystemicFatigue] = useState(2)
  const [regionStatus, setRegionStatus] = useState({})

  function handleApply() {
    const checkin = { sleepHours, stress, systemicFatigue, regionStatus }
    const result = applyReadiness(session, checkin)
    onApply({
      adjusted: result.session,
      readiness: result.readiness,
      weekIndex,
      day: session.day,
    })
  }

  return (
    <div className="checkin-panel">
      <div>
        <label>
          수면시간
          <input
            type="number"
            value={sleepHours}
            min={0}
            max={24}
            step={0.5}
            onChange={(e) => setSleepHours(Number(e.target.value))}
          />
        </label>
      </div>

      <div>
        <label>
          스트레스
          <select value={stress} onChange={(e) => setStress(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label>
          전신 피로
          <select value={systemicFatigue} onChange={(e) => setSystemicFatigue(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="checkin-regions">
        {REGIONS.map((region) => (
          <label key={region}>
            {regionLabel(region)}
            <select
              value={regionStatus[region] ?? 0}
              onChange={(e) =>
                setRegionStatus({ ...regionStatus, [region]: Number(e.target.value) })
              }
            >
              {[0, 1, 2, 3].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <button className="btn checkin-apply" onClick={handleApply}>컨디션 반영</button>
    </div>
  )
}
