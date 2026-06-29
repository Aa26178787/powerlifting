// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OverloadPanel from './OverloadPanel.jsx'
import { useProfileStore } from '../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('OverloadPanel', () => {
  it('renders the toggle, hidden by default', () => {
    render(<OverloadPanel />)
    expect(screen.getByLabelText(/오버로딩 모드/)).toBeTruthy()
    // inputs hidden when disabled
    expect(screen.queryByLabelText(/목표\s*%/)).toBeNull()
    expect(screen.queryByLabelText(/과부하 기간/)).toBeNull()
  })

  it('toggle reveals lift checkboxes, target%, overreach weeks, and preset select', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    expect(screen.getByLabelText(/스쿼트/)).toBeTruthy()
    expect(screen.getByLabelText(/벤치/)).toBeTruthy()
    expect(screen.getByLabelText(/데드리프트/)).toBeTruthy()
    expect(screen.getByLabelText(/목표\s*%/)).toBeTruthy()
    expect(screen.getByLabelText(/과부하 기간/)).toBeTruthy()
    expect(screen.getByLabelText(/프리셋/)).toBeTruthy()
  })

  it('toggle sets overload.enabled true in the store', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    expect(useProfileStore.getState().profile.overload.enabled).toBe(true)
  })

  it('target% allows free typing: clearing does not snap to 1, commits on blur, clamps out-of-range (regression)', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    const input = screen.getByLabelText(/목표\s*%/)
    // default is 4; clearing mid-edit must NOT force targetPct to 1
    fireEvent.change(input, { target: { value: '' } })
    expect(useProfileStore.getState().profile.overload.targetPct).not.toBe(1)
    // typing a value then blurring commits it (not stuck at 1, not jumping to 10)
    fireEvent.change(input, { target: { value: '7' } })
    fireEvent.blur(input)
    expect(useProfileStore.getState().profile.overload.targetPct).toBe(7)
    // out-of-range clamps on blur
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.blur(input)
    expect(useProfileStore.getState().profile.overload.targetPct).toBe(10)
  })

  it('selecting a preset fills lifts, targetPct, overreachWeeks in the store', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    const select = screen.getByLabelText(/프리셋/)
    fireEvent.change(select, { target: { value: 'smolovJr' } })
    const overload = useProfileStore.getState().profile.overload
    expect(overload.lifts).toContain('squat')
    expect(overload.targetPct).toBe(5)
    expect(overload.overreachWeeks).toBe(3)
    expect(overload.preset).toBe('smolovJr')
  })

  it('selecting magOrt preset sets deadlift lift', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    fireEvent.change(screen.getByLabelText(/프리셋/), { target: { value: 'magOrt' } })
    expect(useProfileStore.getState().profile.overload.lifts).toContain('deadlift')
  })

  it('shows a risk tier label after enabling overload', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    // risk tier should appear: low/moderate/high/extreme
    expect(screen.getAllByText(/위험도|low|moderate|high|extreme/i).length).toBeGreaterThan(0)
  })

  it('lift checkboxes write to overload.lifts in the store', async () => {
    render(<OverloadPanel />)
    const user = userEvent.setup()
    await user.click(screen.getByLabelText(/오버로딩 모드/))
    await user.click(screen.getByLabelText(/스쿼트/))
    expect(useProfileStore.getState().profile.overload.lifts).toContain('squat')
    await user.click(screen.getByLabelText(/벤치/))
    expect(useProfileStore.getState().profile.overload.lifts).toContain('bench')
  })

  it('target% input updates overload.targetPct in the store', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    const input = screen.getByLabelText(/목표\s*%/)
    fireEvent.change(input, { target: { value: '6' } })
    fireEvent.blur(input)
    expect(useProfileStore.getState().profile.overload.targetPct).toBe(6)
  })

  it('overreach weeks input updates overload.overreachWeeks in the store', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    const input = screen.getByLabelText(/과부하 기간/)
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.blur(input)
    expect(useProfileStore.getState().profile.overload.overreachWeeks).toBe(5)
  })

  it('shows EV upside text after enabling', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    expect(screen.getAllByText(/성공 시/).length).toBeGreaterThan(0)
  })

  it('preset dropdown offers a 커스텀 option; selecting it returns to manual (preset null)', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    const select = screen.getByLabelText(/프리셋/)
    expect(screen.getByText(/커스텀/)).toBeTruthy()
    // pick a preset, then back to 커스텀 → preset cleared
    fireEvent.change(select, { target: { value: 'smolovJr' } })
    expect(useProfileStore.getState().profile.overload.preset).toBe('smolovJr')
    fireEvent.change(select, { target: { value: '' } })
    expect(useProfileStore.getState().profile.overload.preset).toBeNull()
  })

  it('clamps targetPct: 0 → 1, 99 → 10', async () => {
    render(<OverloadPanel />)
    await userEvent.setup().click(screen.getByLabelText(/오버로딩 모드/))
    const input = screen.getByLabelText(/목표\s*%/)
    // below-range: 0 clamps to 1 (on blur)
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    expect(useProfileStore.getState().profile.overload.targetPct).toBe(1)
    // above-range: 99 clamps to 10 (on blur)
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.blur(input)
    expect(useProfileStore.getState().profile.overload.targetPct).toBe(10)
  })

  it('shows min-1-lift hint when enabled with no lifts; hint disappears after checking a lift', async () => {
    render(<OverloadPanel />)
    const user = userEvent.setup()
    await user.click(screen.getByLabelText(/오버로딩 모드/))
    // hint visible with no lifts selected
    expect(screen.getByText(/공략할 종목을 1개 이상 선택하세요/)).toBeTruthy()
    // check a lift → hint should disappear
    await user.click(screen.getByLabelText(/스쿼트/))
    expect(screen.queryByText(/공략할 종목을 1개 이상 선택하세요/)).toBeNull()
  })
})
