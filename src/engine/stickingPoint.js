/**
 * 2D sticking-point taxonomy: position × cause.
 *
 * Exports the CAUSE_VOCAB, POSITION_CAUSES table, and two helpers:
 *   causeOf(ex)                  → string[] (cause tokens for an exercise)
 *   stickTier(ex, position, cause) → 'none'|'position'|'full'|'causeMiss'
 *
 * All functions are pure/deterministic — no IO, no Date.now, no Math.random.
 *
 * Evidence notes:
 *   - position→failure zone: consensus (Madsen & McLaughlin 1984 squat;
 *     van den Tillaar & Ettema 2010 bench; triceps = bench lockout; dead knee-pass).
 *   - cause→limiting muscle (CAUSE_VOCAB, POSITION_CAUSES cell contents): consensus.
 *   - POSITION_CAUSES cell *boundaries* (squat/deadlift midrange cause splits):
 *     heuristic ("근거 약함") — not RCT-verified.
 *   - POSITION_CAUSES intentionally expands the briefing's examples (treated as
 *     partial subsets, not exhaustive): adding quads to squat-midrange,
 *     hip/triceps to bench-midrange, hip to deadlift-bottom.
 *     This yields 4 overrides vs 24 with the narrow table, and is biomechanically
 *     correct (ref spec §1.1 honest disclosure).
 */

import { canonicalToken } from './muscleVolume.js'

// ── Vocabulary ────────────────────────────────────────────────────────────────

/** 7-token cause vocabulary (limiting-muscle dimension). */
export const CAUSE_VOCAB = ['quads', 'hip', 'back', 'chest', 'shoulder', 'triceps', 'lats']

// ── Per-lift × position valid-cause table ─────────────────────────────────────

/**
 * Single source of truth for valid causes per lift+position.
 * Used by: dependent UI drop-down, stickTier matching, integrity tests.
 *
 * Heuristic note: cell boundaries (especially squat-midrange and
 * deadlift-bottom cause sets) are coaching consensus, not RCT.
 */
export const POSITION_CAUSES = {
  squat: {
    bottom:   ['quads', 'hip'],
    midrange: ['quads', 'hip', 'back'],
    lockout:  ['hip', 'back'],
  },
  bench: {
    bottom:   ['chest', 'shoulder'],
    midrange: ['chest', 'shoulder', 'triceps'],
    lockout:  ['triceps'],
  },
  deadlift: {
    bottom:   ['quads', 'hip', 'back', 'lats'],
    midrange: ['hip', 'back', 'lats'],
    lockout:  ['hip', 'back'],
  },
}

// ── Canonical → cause mapping ──────────────────────────────────────────────────

/**
 * Maps each of the 15 canonical muscle groups to a CAUSE_VOCAB token.
 * biceps / forearms / core → absent (those muscles never carry stickingPoint ≠ none).
 */
export const CANON_TO_CAUSE = {
  quads:      'quads',
  glutes:     'hip',
  hamstrings: 'hip',
  adductors:  'hip',
  erectors:   'back',
  upperBack:  'back',
  lats:       'lats',
  chest:      'chest',
  frontDelts: 'shoulder',
  sideDelts:  'shoulder',
  rearDelts:  'shoulder',
  triceps:    'triceps',
  // biceps, forearms, core → not a limiting cause (all stickingPoint='none')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the cause array for an exercise.
 *
 * Priority:
 *   1. Explicit ex.cause (string → [string]; array → same array).
 *   2. Derived from canonicalToken(primaryMuscle first token) via CANON_TO_CAUSE.
 *   3. [] if stickingPoint is absent / 'none', or if the token is unmapped.
 */
export function causeOf(ex) {
  if (ex.cause) return Array.isArray(ex.cause) ? ex.cause : [ex.cause]
  if (!ex.stickingPoint || ex.stickingPoint === 'none') return []
  const firstTok = (ex.primaryMuscle ?? '').split('/')[0].trim()
  const canon = canonicalToken(firstTok)
  const c = canon && CANON_TO_CAUSE[canon]
  return c ? [c] : []
}

/**
 * Returns the match tier between an exercise and a user's (position, cause) selection.
 *
 * Tiers (descending priority):
 *   'full'      — position matches AND cause matches.
 *   'position'  — position matches; cause not specified or exercise has no causes.
 *   'causeMiss' — position matches; cause specified but doesn't match.
 *   'none'      — position doesn't match (or position is absent/'none').
 *
 * Backward-compatible: when cause is undefined (existing callers), only
 * 'position' / 'none' are returned — identical to the legacy +0.5 / 0 split.
 */
export function stickTier(ex, position, cause) {
  if (!position || position === 'none' || ex.stickingPoint !== position) return 'none'
  const causes = causeOf(ex)
  if (!cause || causes.length === 0) return 'position'
  return causes.includes(cause) ? 'full' : 'causeMiss'
}
