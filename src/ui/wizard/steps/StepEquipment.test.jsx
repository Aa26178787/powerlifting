// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StepEquipment from './StepEquipment.jsx'
import { useProfileStore } from '../../store/profileStore.js'

beforeEach(() => {
  useProfileStore.getState().reset()
  localStorage.clear()
})

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

describe('StepEquipment volume override UI', () => {
  it('renders the volume advanced details section', () => {
    render(<StepEquipment />)
    expect(screen.getAllByText(/볼륨 직접 설정/).length).toBeGreaterThan(0)
  })

  it('renders auto-recommend and clear buttons', () => {
    render(<StepEquipment />)
    expect(screen.getByText('자동추천 채우기')).toBeInTheDocument()
    expect(screen.getByText('지우기(자동)')).toBeInTheDocument()
  })

  it('auto-recommend button fills setsPerSession and enables override', () => {
    render(<StepEquipment />)
    const btn = screen.getByText('자동추천 채우기')
    fireEvent.click(btn)
    const ov = useProfileStore.getState().profile.volumeOverride
    expect(ov.main.enabled).toBe(true)
    expect(ov.main.setsPerSession.squat).not.toBeNull()
    expect(ov.main.setsPerSession.bench).not.toBeNull()
    expect(ov.main.setsPerSession.deadlift).not.toBeNull()
    expect(ov.accessory.enabled).toBe(true)
    expect(ov.accessory.setsPerSession).not.toBeNull()
  })

  it('clear button resets all override values', () => {
    // Apply then clear
    useProfileStore.getState().applyVolumeRecommendation()
    render(<StepEquipment />)
    const btn = screen.getByText('지우기(자동)')
    fireEvent.click(btn)
    const ov = useProfileStore.getState().profile.volumeOverride
    expect(ov.main.enabled).toBe(false)
    expect(ov.main.setsPerSession).toEqual({ squat: null, bench: null, deadlift: null })
    expect(ov.accessory.enabled).toBe(false)
    expect(ov.accessory.setsPerSession).toBeNull()
  })

  it('per-session inputs appear when main.enabled is true', () => {
    useProfileStore.getState().setVolumeOverrideEnabled('main', true)
    render(<StepEquipment />)
    expect(screen.getByLabelText(/스쿼트 세션당/)).toBeInTheDocument()
    expect(screen.getByLabelText(/벤치 세션당/)).toBeInTheDocument()
    expect(screen.getByLabelText(/데드리프트 세션당/)).toBeInTheDocument()
  })

  it('freq=0 lift input is disabled', () => {
    useProfileStore.getState().setFrequency('deadlift', 0)
    useProfileStore.getState().setVolumeOverrideEnabled('main', true)
    render(<StepEquipment />)
    const dlInput = screen.getByLabelText(/데드리프트 세션당/)
    expect(dlInput).toBeDisabled()
  })

  it('freq>0 lift input is not disabled', () => {
    useProfileStore.getState().setVolumeOverrideEnabled('main', true)
    render(<StepEquipment />)
    const sqInput = screen.getByLabelText(/스쿼트 세션당/)
    expect(sqInput).not.toBeDisabled()
  })

  it('VolumeWarnings panel renders warnings when override produces them', () => {
    // accHigh warning fires when accessory.setsPerSession > 5
    useProfileStore.getState().setVolumeOverrideEnabled('accessory', true)
    useProfileStore.getState().setAccessorySetsPerSession(6)
    render(<StepEquipment />)
    // The warning list should appear with aria-label
    expect(screen.getByLabelText('볼륨 경고')).toBeInTheDocument()
    expect(screen.getByText(/권장 상한/)).toBeInTheDocument()
  })

  it('wizard Next is not disabled by volume controls (canNext check: component renders without errors)', () => {
    // canNext is determined by Wizard, not StepEquipment. Verify the component
    // does NOT render a disabled submit/next button itself.
    render(<StepEquipment />)
    const buttons = screen.getAllByRole('button')
    // Only the two volume buttons should be present; none should be labeled Next
    for (const btn of buttons) {
      expect(btn.closest('form')).toBeNull()  // no form submission buttons
    }
  })
})
