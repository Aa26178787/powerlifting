// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckinPanel from './CheckinPanel.jsx'

const minimalSession = {
  day: 1,
  exercises: [
    {
      lift: 'Back Squat (High Bar)',
      baseLift: 'squat',
      quality: 'strength',
      scheme: {
        type: 'straight',
        evidenceTier: 'rct',
        sets: [{ weight: 100, reps: 3, rpe: 8 }],
      },
      sets: 1,
    },
  ],
  accessories: [],
  notes: [],
}

describe('CheckinPanel', () => {
  it('calls onApply with readiness in [0,1] and adjusted.exercises array', async () => {
    const onApply = vi.fn()
    render(<CheckinPanel session={minimalSession} weekIndex={1} onApply={onApply} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '컨디션 반영' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    const arg = onApply.mock.calls[0][0]
    expect(typeof arg.readiness).toBe('number')
    expect(arg.readiness).toBeGreaterThanOrEqual(0)
    expect(arg.readiness).toBeLessThanOrEqual(1)
    expect(Array.isArray(arg.adjusted.exercises)).toBe(true)
  })

  it('does not render a readiness badge internally (badge lives in RoutineView)', async () => {
    const onApply = vi.fn()
    render(<CheckinPanel session={minimalSession} weekIndex={1} onApply={onApply} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '컨디션 반영' }))
    expect(document.querySelector('.readiness-badge')).toBeNull()
  })
})
