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
})
