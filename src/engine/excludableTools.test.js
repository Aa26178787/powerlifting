import { describe, it, expect } from 'vitest'
import { TOOL_GROUPS, TOOL_GROUP_KEYS, excludeTags } from './excludableTools.js'
describe('excludableTools', () => {
  it('expands group keys to DB tags', () => {
    expect(excludeTags(['band'])).toContain('band')
    expect(excludeTags(['board'])).toEqual(expect.arrayContaining(['1 board', '2 boards']))
  })
  it('empty exclusion -> empty tags', () => { expect(excludeTags([])).toEqual([]) })
  it('keys list matches the map', () => { expect(TOOL_GROUP_KEYS).toEqual(Object.keys(TOOL_GROUPS)) })
})
