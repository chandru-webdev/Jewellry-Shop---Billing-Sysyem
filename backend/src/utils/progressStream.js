// =============================================================
// Pipe a syncProgress job to a Server-Sent Events response.
//
// Works for both job shapes (per-product and bulk). Behaviour:
//   1. Replays the current snapshot immediately on subscribe.
//   2. Streams every change live.
//   3. Ends the response once the job reaches a final state
//      (success | failed), with the final snapshot as the last frame.
//   4. Keeps idle-but-running connections alive with a ping and has a
//      watchdog so a stuck client never holds the socket forever.
// =============================================================

const syncProgress = require('../services/syncProgress.service')

const PING_MS = 15000
const WATCHDOG_MS = 15 * 60 * 1000 // matches the running-job TTL in the store

function pipeProgressStream(req, res, jobKey) {
  res.status(200)
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  let ended = false
  const send = (payload) => {
    if (!ended) res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }
  const end = () => {
    if (ended) return
    ended = true
    clearInterval(ping)
    clearTimeout(watchdog)
    res.end()
  }

  // Timers are created BEFORE subscribing so a synchronous replay that hits a
  // final state can safely tear them down inside end().
  const ping = setInterval(() => res.write(': ping\n\n'), PING_MS)
  const watchdog = setTimeout(end, WATCHDOG_MS)

  const snapshot = syncProgress.getSnapshot(jobKey)
  if (!snapshot) {
    send({ status: 'none' })
    return end()
  }

  const unsubscribe = syncProgress.subscribe(jobKey, (payload) => {
    send(payload)
    if (payload.status === 'success' || payload.status === 'failed') end()
  })
  req.on('close', () => {
    clearInterval(ping)
    clearTimeout(watchdog)
    unsubscribe()
  })
}

module.exports = pipeProgressStream