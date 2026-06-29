// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AccessoryPicker from './AccessoryPicker.jsx'
import { useProfileStore } from '../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('AccessoryPicker', () => {
  it('renders arm (biceps/triceps) category groups', () => {
    render(<AccessoryPicker />)
    expect(screen.getByText(/팔 — 이두/)).toBeTruthy()
    expect(screen.getByText(/팔 — 삼두/)).toBeTruthy()
    expect(screen.getByText(/가슴/)).toBeTruthy()
  })
  it('checking an accessory adds it to accessoryPicks; unchecking removes it', () => {
    render(<AccessoryPicker />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.length).toBeGreaterThan(0)
    fireEvent.click(boxes[0])
    expect(useProfileStore.getState().profile.accessoryPicks.length).toBe(1)
    fireEvent.click(boxes[0])
    expect(useProfileStore.getState().profile.accessoryPicks.length).toBe(0)
  })
})
