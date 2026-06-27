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
  it('discloses deadlift weekly volume reduced to ~60% of other lifts', () => {
    render(<LimitsPanel />)
    expect(
      screen.getByText((_, element) => {
        return (
          element?.tagName === 'LI' &&
          /데드리프트 주간 볼륨/.test(element.textContent) &&
          /~60%/.test(element.textContent)
        )
      })
    ).toBeInTheDocument()
  })
  it('discloses volume taper direction is consensus but exact numbers are heuristic', () => {
    render(<LimitsPanel />)
    expect(
      screen.getByText((_, element) => {
        return (
          element?.tagName === 'LI' &&
          /볼륨 테이퍼/.test(element.textContent) &&
          /피크주/.test(element.textContent) &&
          /근거 약함/.test(element.textContent)
        )
      })
    ).toBeInTheDocument()
  })
  it('discloses per-muscle volume ledger is derived reporting not measured physiology', () => {
    render(<LimitsPanel />)
    expect(
      screen.getByText((_, element) => {
        return (
          element?.tagName === 'LI' &&
          /근육별 볼륨 요약/.test(element.textContent) &&
          /15근육군/.test(element.textContent) &&
          /근거 약함/.test(element.textContent)
        )
      })
    ).toBeInTheDocument()
  })
  it('discloses peaking×ledger interaction: phase-scaled deficit-fill and count taper are heuristic', () => {
    render(<LimitsPanel />)
    expect(
      screen.getByText((_, element) => {
        return (
          element?.tagName === 'LI' &&
          /피킹.*플랜에서/.test(element.textContent) &&
          /피크.*차단/.test(element.textContent) &&
          /휴리스틱/.test(element.textContent)
        )
      })
    ).toBeInTheDocument()
  })
})
