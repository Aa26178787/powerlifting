// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OverloadBanner from './OverloadBanner.jsx'

const overload = {
  lifts: ['squat'],
  targetPct: 5,
  overreachWeeks: 3,
  risk: { tier: 'moderate', reasons: ['경험 부족', '볼륨 과다'] },
  ev: { upside: '단기 e1RM +3–5% 가능', downside: '정체·부상·번아웃', note: '결과 보장 없음' },
  cooldownWeeks: 6,
}

describe('OverloadBanner', () => {
  it('renders null when overload is absent', () => {
    const { container } = render(<OverloadBanner overload={null} checkinLog={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders heading when overload present', () => {
    render(<OverloadBanner overload={overload} checkinLog={[]} />)
    expect(screen.getByText(/오버로딩 = 도박수/)).toBeInTheDocument()
  })

  it('renders risk tier', () => {
    render(<OverloadBanner overload={overload} checkinLog={[]} />)
    expect(screen.getByText(/moderate/)).toBeInTheDocument()
  })

  it('renders risk reasons', () => {
    render(<OverloadBanner overload={overload} checkinLog={[]} />)
    expect(screen.getByText(/경험 부족/)).toBeInTheDocument()
    expect(screen.getByText(/볼륨 과다/)).toBeInTheDocument()
  })

  it('renders EV upside and downside', () => {
    render(<OverloadBanner overload={overload} checkinLog={[]} />)
    expect(screen.getByText(/단기 e1RM/)).toBeInTheDocument()
    expect(screen.getByText(/정체·부상/)).toBeInTheDocument()
  })

  it('renders EV note', () => {
    render(<OverloadBanner overload={overload} checkinLog={[]} />)
    expect(screen.getByText(/결과 보장 없음/)).toBeInTheDocument()
  })

  it('renders cooldown note', () => {
    render(<OverloadBanner overload={overload} checkinLog={[]} />)
    expect(screen.getByText(/6주 정상 훈련 권장/)).toBeInTheDocument()
  })

  it('renders intentional MRV exceedance note', () => {
    render(<OverloadBanner overload={overload} checkinLog={[]} />)
    expect(screen.getByText(/의도적으로 MRV를 초과/)).toBeInTheDocument()
    expect(screen.getByText(/볼륨 경고는 정상/)).toBeInTheDocument()
  })

  it('shows abort note when checkinLog triggers detectOverreaching (declining readiness ≥3 entries)', () => {
    // strict monotonic decline + all <0.5 → Rule 1 of detectOverreaching
    const log = [
      { lift: 'squat', week: 1, day: 1, readiness: 0.48 },
      { lift: 'squat', week: 1, day: 2, readiness: 0.38 },
      { lift: 'squat', week: 1, day: 3, readiness: 0.28 },
    ]
    render(<OverloadBanner overload={overload} checkinLog={log} />)
    expect(screen.getByText(/abort 권고/)).toBeInTheDocument()
  })

  it('does not show abort note when checkinLog is empty', () => {
    render(<OverloadBanner overload={overload} checkinLog={[]} />)
    expect(screen.queryByText(/abort 권고/)).not.toBeInTheDocument()
  })

  it('does not show abort note when checkinLog is healthy', () => {
    const log = [
      { lift: 'squat', week: 1, day: 1, readiness: 0.8 },
      { lift: 'squat', week: 1, day: 2, readiness: 0.75 },
      { lift: 'squat', week: 1, day: 3, readiness: 0.85 },
    ]
    render(<OverloadBanner overload={overload} checkinLog={log} />)
    expect(screen.queryByText(/abort 권고/)).not.toBeInTheDocument()
  })
})
