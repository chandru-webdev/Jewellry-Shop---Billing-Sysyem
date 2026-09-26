import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { settingsApi } from '../api/settings'
import { useAuth } from '../context/AuthContext'
import Button from './ui/Button'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']
const WARN_BEFORE_MS = 30_000

// Signs the user out after a configurable idle period (Settings > Security).
// sessionTimeoutMinutes = 0 (default) disables the behaviour entirely.
export default function SessionTimeout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [idleMs, setIdleMs] = useState(0)
  const [warnDeadline, setWarnDeadline] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const idleTimer = useRef(null)
  const warnTimer = useRef(null)

  // Load the configured timeout from Settings.
  useEffect(() => {
    let mounted = true
    settingsApi.getAll()
      .then((res) => {
        const minutes = Number(res.data.data?.sessionTimeoutMinutes) || 0
        if (!mounted) return
        setIdleMs(minutes > 0 ? minutes * 60_000 : 0)
        setNow(Date.now())
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  const arm = () => {
    clearTimeout(idleTimer.current)
    clearTimeout(warnTimer.current)
    idleTimer.current = setTimeout(() => {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
      setWarnDeadline(Date.now() + WARN_BEFORE_MS)
      setNow(Date.now())
      warnTimer.current = setTimeout(() => { logout(); navigate('/login') }, WARN_BEFORE_MS)
    }, idleMs)
  }

  const staySignedIn = () => {
    setWarnDeadline(null)
    arm()
  }

  // Listen for activity; any activity resets the idle window (and dismisses the warning).
  useEffect(() => {
    if (idleMs <= 0) return
    const onActivity = () => {
      clearTimeout(idleTimer.current)
      clearTimeout(warnTimer.current)
      setWarnDeadline(null)
      arm()
    }
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }))
    arm()
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity))
      clearTimeout(idleTimer.current)
      clearTimeout(warnTimer.current)
    }
  }, [idleMs, logout, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tick once per second only while the warning is on screen, to drive the countdown.
  useEffect(() => {
    if (warnDeadline === null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [warnDeadline])

  if (idleMs <= 0 || warnDeadline === null) return null

  const left = Math.max(0, Math.ceil((warnDeadline - now) / 1000))
  const fmt = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-royal-50 dark:bg-white/10 flex items-center justify-center mb-4">
          <Clock size={22} className="text-royal-600 dark:text-royal-300" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Session expiring soon</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          You've been inactive. You'll be signed out in <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(left)}</span>.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={staySignedIn}>Stay signed in</Button>
          <Button variant="outline" onClick={() => { logout(); navigate('/login') }}>Sign out now</Button>
        </div>
      </div>
    </div>
  )
}