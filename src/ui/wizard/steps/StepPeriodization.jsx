import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { normalizeBlend, QUALITIES } from '../../../engine/quality.js'
import { qualityLabel } from '../../i18n.js'

export default function StepPeriodization() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)

  const n = normalizeBlend(p.qualities)
  const dominant = QUALITIES.reduce((best, q) => (n[q] > n[best] ? q : best), QUALITIES[0])
  const peaking = p.competition.on && !!p.competition.date
  const focus = peaking ? 'strength' : dominant

  return (
    <div>
      <p>주기화는 목표 배분·일정에 맞춰 <strong>하이브리드(자동 설계)</strong>로 구성됩니다.
        정해진 틀(선형/비선형/블록) 중 하나를 고르는 대신, 세 가지를 상황에 맞게 섞습니다:</p>
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
          max={8}
          value={p.mesoWeeks}
          onChange={(e) => setField('mesoWeeks', Math.max(3, Math.min(8, Number(e.target.value) || 4)))}
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
    </div>
  )
}
