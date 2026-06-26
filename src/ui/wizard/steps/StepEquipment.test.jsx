// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StepEquipment from './StepEquipment.jsx'

describe('StepEquipment accessory preference', () => {
  it('renders the accessory preference control', () => {
    render(<StepEquipment />)
    expect(screen.getByText(/보조운동 선호/)).toBeInTheDocument()
  })
})

describe('StepEquipment frequency controls', () => {
  it('renders per-lift frequency controls', () => {
    render(<StepEquipment />)
    expect(screen.getByText(/스쿼트 주 빈도/)).toBeInTheDocument()
    expect(screen.getByText(/벤치 주 빈도/)).toBeInTheDocument()
    expect(screen.getByText(/데드리프트 주 빈도/)).toBeInTheDocument()
  })
})
