// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LimitsPanel from './LimitsPanel.jsx'

describe('LimitsPanel disclosures', () => {
  it('discloses sex/bodyweight are diagnostic-only', () => {
    render(<LimitsPanel />)
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'LI' && /성별·체중은/.test(element.textContent) && /상대강도 진단/.test(element.textContent)
    })).toBeInTheDocument()
  })
  it('discloses age recovery taper', () => {
    render(<LimitsPanel />)
    expect(screen.getByText(/나이가 많을수록 볼륨/)).toBeInTheDocument()
  })
  it('discloses concurrent backoff training', () => {
    render(<LimitsPanel />)
    expect(screen.getByText(/근력\+근비대가 비슷한 비율/)).toBeInTheDocument()
  })
  it('discloses accessory machine preference', () => {
    render(<LimitsPanel />)
    expect(screen.getByText(/머신과 프리웨이트는 효과/)).toBeInTheDocument()
  })
  it('discloses variation priority', () => {
    render(<LimitsPanel />)
    expect(screen.getByText(/변형 운동은 표준 변형/)).toBeInTheDocument()
  })
  it('discloses frequency distribution heuristic', () => {
    render(<LimitsPanel />)
    expect(screen.getByText(/종목별 빈도는 요일에 균등 간격/)).toBeInTheDocument()
  })
  it('discloses that RPE judgment accuracy is lower for novices', () => {
    render(<LimitsPanel />)
    expect(screen.getByText(/RPE 판단 정확도는/)).toBeInTheDocument()
    expect(screen.getByText(/입문자일수록 낮습니다/)).toBeInTheDocument()
  })
})
