// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RpeLogger from './RpeLogger.jsx'

describe('RpeLogger', () => {
  const exercise = { lift: 'squat', reps: 5, rpeTarget: 8, weight: 100 }

  it('suggests a heavier next weight when the set was easier than target', async () => {
    render(<RpeLogger exercise={exercise} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/실제 RPE/), '7')
    // target 8, actual 7 -> +4% -> 104 -> round 2.5 -> 105
    expect(screen.getByText(/추천 중량:\s*105/)).toBeInTheDocument()
  })

  it('suggests a lighter next weight when the set was harder than target', async () => {
    render(<RpeLogger exercise={exercise} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/실제 RPE/), '9')
    expect(screen.getByText(/추천 중량:\s*95/)).toBeInTheDocument()
  })
})
