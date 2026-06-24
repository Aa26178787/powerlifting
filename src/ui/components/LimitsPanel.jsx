import React from 'react'

export default function LimitsPanel() {
  return (
    <details className="limits-panel">
      <summary>근거 및 한계 (꼭 읽기)</summary>
      <ul>
        <li>볼륨·빈도·강도 기본값은 메타분석(Pelland/Zourdos 2025, Schoenfeld)에서 가져왔습니다. 연차에 따른 조정은 인구 평균 기반의 휴리스틱이며 개인 맞춤 진실이 아닙니다.</li>
        <li>RPE→%1RM 표(Tuchscherer/RTS)는 실제 데이터지만 <strong>동료 심사를 거치지 않았습니다</strong>.</li>
        <li>프로그램 골격은 현장 검증된 템플릿이고, 연구가 그 세부 값을 조정합니다. 근력에서 주기화 모델의 우위는 근거가 약합니다.</li>
        <li>대회 피킹은 이번 버전에서 최소한으로만 처리됩니다.</li>
      </ul>
    </details>
  )
}
