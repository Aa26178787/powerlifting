import React from 'react'

export default function LimitsPanel() {
  return (
    <details className="limits-panel">
      <summary>근거와 한계 (꼭 읽어주세요)</summary>
      <ul>
        <li>볼륨·빈도·강도의 기본값은 메타분석 연구(Pelland·Zourdos 2025, Schoenfeld 등)를 따랐습니다. 다만 경력에 따른 조정은 다수 평균을 바탕으로 한 추정치일 뿐, 개인에게 딱 맞는 정답은 아닙니다.</li>
        <li>RPE→%1RM 환산표(Tuchscherer·RTS)는 실제 데이터에 기반하지만 <strong>정식 논문으로 검증된 자료는 아닙니다</strong>.</li>
        <li>프로그램의 큰 틀은 현장에서 검증된 템플릿이고, 연구 결과로 세부 수치를 조정합니다. 근력 향상에서 어떤 주기화 방식이 더 낫다는 근거는 아직 약합니다.</li>
        <li>대회 피킹(테이퍼)은 이번 버전에서는 최소한으로만 반영되어 있습니다.</li>
      </ul>
    </details>
  )
}
