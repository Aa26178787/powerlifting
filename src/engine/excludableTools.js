export const TOOL_GROUPS = {
  band: ['band', 'bands', 'cables/band'],
  chain: ['chains'],
  board: ['1 board', '2 boards', '3 boards', '4–5 boards'],
  box: ['box'],
  deficit: ['deficit'],
  pin: ['pins', 'rack pins', 'rack uprights'],
  specialtyBar: ['swiss bar', 'cambered bar', 'duffalo bar', 'ssb', 'safety squat bar'],
  sled: ['sled'],
}
export const TOOL_GROUP_KEYS = Object.keys(TOOL_GROUPS)
export function excludeTags(excluded = []) {
  const out = []
  for (const k of excluded) for (const t of (TOOL_GROUPS[k] ?? [])) out.push(t)
  return out
}
