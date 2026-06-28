import React from 'react'
import { detectOverreaching } from '../../engine/overreaching.js'

/**
 * OverloadBanner — presentational banner shown when plan.overload metadata is present.
 * Props:
 *   overload   — plan.overload object from generateOverload (null/undefined → renders nothing)
 *   checkinLog — readiness check-in log array from useProfileStore; passed to detectOverreaching
 *                for the abort circuit (non-blocking).
 */
export default function OverloadBanner({ overload, checkinLog }) {
  if (!overload) return null

  const abort = detectOverreaching(checkinLog ?? [])

  return (
    <div className="overload-banner" role="region" aria-label="오버로딩 경고">
      <h3 className="overload-heading">⚠ 오버로딩 = 도박수</h3>

      <div className="overload-risk">
        <span className="risk-tier">위험도: {overload.risk?.tier}</span>
        {overload.risk?.reasons?.length > 0 && (
          <ul className="risk-reasons">
            {overload.risk.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="overload-ev">
        <div className="ev-upside">상승 시나리오: {overload.ev?.upside}</div>
        <div className="ev-downside">하락 시나리오: {overload.ev?.downside}</div>
        {overload.ev?.note && <div className="ev-note">{overload.ev.note}</div>}
      </div>

      <div className="overload-cooldown">
        이후 약 {overload.cooldownWeeks}주 정상 훈련 권장
      </div>

      <div className="overload-mrv-note">
        선택 종목은 의도적으로 MRV를 초과합니다(오버리칭) — 볼륨 경고는 정상입니다.
      </div>

      {abort.flag && (
        <div className="overload-abort" role="alert">
          ⚠ abort 권고: {abort.reason}
        </div>
      )}
    </div>
  )
}
