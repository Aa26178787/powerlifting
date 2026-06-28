// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InsightsPanel from './InsightsPanel.jsx'

const log = Array.from({ length: 28 }, (_, i) => ({ lift: 'squat', week: Math.floor(i / 3) + 1, day: (i % 3) + 1, weight: 150, reps: 3, rpe: 8 }))

describe('InsightsPanel', () => {
  it('renders e1RM band and peak prediction when log present', () => {
    render(<InsightsPanel log={log} e1rm={{ squat: 200, bench: 140, deadlift: 240 }} />)
    expect(screen.getByText(/일일.*변동|±20/)).toBeInTheDocument()
    expect(screen.getByText(/피크|테이퍼/)).toBeInTheDocument()
  })
  it('renders nothing when log empty', () => {
    const { container } = render(<InsightsPanel log={[]} e1rm={{ squat: 200 }} />)
    expect(container.textContent).toBe('')
  })
})
