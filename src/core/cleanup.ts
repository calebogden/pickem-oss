type Handler = () => void
const handlers = new Set<Handler>()
let installed = false

function fireAll() {
  for (const h of [...handlers]) {
    try {
      h()
    } catch {
      /* never throw during teardown */
    }
  }
}

function install() {
  if (installed) return
  installed = true
  process.on('exit', fireAll)
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(sig, () => {
      fireAll()
      process.exit(sig === 'SIGINT' ? 130 : 1)
    })
  }
}

/** Register a terminal-restore handler that runs on any process exit path. */
export function onExit(fn: Handler): () => void {
  install()
  handlers.add(fn)
  return () => handlers.delete(fn)
}
