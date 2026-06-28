import React from 'react'
import {
  e1rmBand,
  dailyLoads,
  trainingMonotony,
  trainingStrain,
  predictPeakDay,
  acwr,
} from '../../engine/analytics.js'
import { liftLabel } from '../i18n.js'

const MAIN_LIFTS = ['squat', 'bench', 'deadlift']

// InsightsPanel — advisory analytics from the performance log (S3 Task 2).
// Pure presentational: no store writes. Returns null when log is empty.
// All metrics are heuristics/근거 약함 — honest caveats shown in-panel.
export default function InsightsPanel({ log, e1rm }) {
  if (!log?.length) return null

  const loads = dailyLoads(log)
  const monotony = trainingMonotony(loads)
  const strain = trainingStrain(loads)
  const peakDay = predictPeakDay(loads)
  const acwrVal = acwr(loads)

  return (
    <section className="insights-panel">
      <h4>훈련 분석 (보조 지표)</h4>

      {/* e1RM band per main lift */}
      <div className="insights-e1rm">
        <h5>추정 1RM 범위</h5>
        <p className="insights-caption">일일 ±20% 변동 (개인차 있음)</p>
        <ul>
          {MAIN_LIFTS.map((lift) => {
            const base = e1rm?.[lift]
            if (base == null) return null
            const band = e1rmBand(base)
            if (!band) return null
            return (
              <li key={lift}>
                {liftLabel(lift)}: {band.low.toFixed(1)}–{band.high.toFixed(1)} ({band.point.toFixed(1)}) kg
              </li>
            )
          })}
        </ul>
      </div>

      {/* Monotony + strain */}
      {monotony != null && (
        <div className="insights-monotony">
          <h5>단조로움 · 스트레인</h5>
          <p>단조로움: {monotony.toFixed(2)} · 스트레인: {strain != null ? strain.toFixed(0) : '—'}</p>
          {monotony > 2 && (
            <p className="insights-warning">⚠️ 단조로움↑ — 부하 변동 권장</p>
          )}
        </div>
      )}

      {/* Peak day prediction */}
      {peakDay != null && (
        <div className="insights-peak">
          <h5>초과보상 예측</h5>
          <p>현재 부하 기준 약 {peakDay}일 테이퍼 시 기량 피크 예측</p>
          <p className="insights-caption">근거 약함 (Banister 모델, 파라미터 개인차 큼)</p>
        </div>
      )}

      {/* ACWR — shown only when non-null */}
      {acwrVal != null && (
        <div className="insights-acwr">
          <h5>ACWR</h5>
          <p className={acwrVal >= 1.5 ? 'insights-warning' : ''}>
            {acwrVal.toFixed(2)}
          </p>
          <p className="insights-caption">참고용 — 신뢰성 논란(하드 기준 아님)</p>
        </div>
      )}

      {/* Footer caveat */}
      <p className="insights-footer">오토레귤레이션·예측은 개인차가 크며 보조 지표입니다.</p>
    </section>
  )
}
