import React, { useState } from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { normalizeBlend, QUALITIES } from '../../../engine/quality.js'
import { qualityLabel, liftLabel, BACKOFF } from '../../i18n.js'
import OverloadPanel from '../../components/OverloadPanel.jsx'

export default function StepPeriodization() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setBackoffRpeDrop = useProfileStore((s) => s.setBackoffRpeDrop)
  const setBackoffPct = useProfileStore((s) => s.setBackoffPct)
  const [mesoRaw, setMesoRaw] = useState(String(p.mesoWeeks))

  const n = normalizeBlend(p.qualities)
  const dominant = QUALITIES.reduce((best, q) => (n[q] > n[best] ? q : best), QUALITIES[0])
  const peaking = p.competition.on && !!p.competition.date
  const focus = peaking ? 'strength' : dominant

  return (
    <div>
      <p>주기화는 목표 배분·일정에 맞춰 <strong>하이브리드(자동 설계)</strong>로 구성됩니다.
        정해진 틀(선형/비선형/블록) 중 하나를 고르는 대신, 세 가지를 상황에 맞게 섞습니다:</p>
      <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
        주기화 <em>모델</em> 선택(선형/비선형/블록)은 결과에 미치는 영향이 작습니다 —
        볼륨이 같으면 모델 간 차이는 거의 없습니다(메타분석). 실제 성과는
        <strong> 볼륨·강도·실패 근접도</strong>가 결정합니다.
      </p>
      <ul>
        <li>매주 강도를 점진적으로 올립니다 <em>(선형 파동)</em>.</li>
        <li>주중에는 세션마다 자질을 바꿔 자극합니다 <em>(비선형·DUP)</em>.</li>
        <li>사이클 후반으로 갈수록 핵심 자질 <strong>{qualityLabel(focus)}</strong>에 집중합니다 <em>(블록)</em>.</li>
        {peaking && <li>대회가 가까워질수록 근력 피킹으로 좁혀갑니다.</li>}
      </ul>

      <label>운동 주차
        <input
          type="number"
          min={3}
          max={24}
          value={mesoRaw}
          onChange={(e) => setMesoRaw(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(3, Math.min(24, Number(e.target.value) || 4))
            setMesoRaw(String(clamped))
            setField('mesoWeeks', clamped)
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={p.deloadEnabled}
          onChange={(e) => setField('deloadEnabled', e.target.checked)}
        />
        {' '}디로드 포함
      </label>

      <label>{BACKOFF.label}
        <select
          value={String(p.backoffRpeDrop ?? 0)}
          onChange={(e) => setBackoffRpeDrop(Number(e.target.value))}
        >
          {[0, 0.5, 1, 1.5, 2, 2.5].map((v) => (
            <option key={v} value={String(v)}>{BACKOFF.opts[v]}</option>
          ))}
        </select>
      </label>
      <p style={{ fontSize: '0.85em', color: '#888', margin: '2px 0 0' }}>{BACKOFF.hint}</p>

      <fieldset>
        <legend>백오프 무게 직접 지정 (탑 세트의 %)</legend>
        <p style={{ fontSize: '0.85em', color: '#888', margin: '0 0 4px' }}>
          자동은 목표 RPE로 무게를 정합니다. %를 고르면 해당 종목 백오프를 <strong>탑 세트의 그 비율</strong>로 고정합니다(주차 램프에 맞춰 함께 오름).
        </p>
        {['squat', 'bench', 'deadlift'].map((lift) => (
          <label key={lift}>{liftLabel(lift)}
            <select
              value={p.backoffPct?.[lift] == null ? '' : String(p.backoffPct[lift])}
              onChange={(e) => setBackoffPct(lift, e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">자동 (RPE)</option>
              {[0.65, 0.70, 0.75, 0.80, 0.85, 0.90].map((v) => (
                <option key={v} value={String(v)}>{Math.round(v * 100)}%</option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>

      <label>
        <input
          type="checkbox"
          checked={p.competition.on}
          onChange={(e) => setField('competition', { ...p.competition, on: e.target.checked })}
        />
        대회 모드
      </label>
      {p.competition.on && (
        <label>대회 날짜
          <input
            type="date"
            value={p.competition.date}
            onChange={(e) => setField('competition', { ...p.competition, date: e.target.value })}
          />
        </label>
      )}

      <OverloadPanel />
    </div>
  )
}
