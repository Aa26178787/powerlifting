// The engine works entirely in kg. This module converts at the display/input
// boundary so the user can see and enter weights in kg or lbs.
export const LB_PER_KG = 2.2046226218

// kg (engine) → the chosen display unit. `round` true = plate-friendly
// prescription rounding (kg→2.5, lbs→5); false = 1-decimal for input fields
// (so typing isn't snapped).
export function toDisplay(kg, units, round = true) {
  if (kg == null || !Number.isFinite(kg)) return kg
  if (units === 'lbs') {
    const lb = kg * LB_PER_KG
    return round ? Math.round(lb / 5) * 5 : Math.round(lb * 10) / 10
  }
  return round ? Math.round(kg / 2.5) * 2.5 : Math.round(kg * 10) / 10
}

// A display value in the chosen unit → kg for the engine/store.
export function fromInput(value, units) {
  if (value === '' || value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return units === 'lbs' ? n / LB_PER_KG : n
}

export function unitLabel(units) {
  return units === 'lbs' ? 'lbs' : 'kg'
}
