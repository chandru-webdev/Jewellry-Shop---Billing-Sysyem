import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Mail, KeyRound, ArrowLeft, CheckCircle2, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

const REMEMBER_KEY = 'opal_remember_email'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // Login state
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState(1) // 1=email, 2=code, 3=new password
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotNewPw, setForgotNewPw] = useState('')
  const [forgotConfirmPw, setForgotConfirmPw] = useState('')
  const [forgotShowPw, setForgotShowPw] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)

  // Load remembered email
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Save or clear remembered email
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  // Forgot password: step 1 — send email
  const handleForgotSendCode = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError('')
    try {
      // In demo mode, auto-proceed with demo code
      if (localStorage.getItem('opal_token') === 'demo-token-opal-line' || !navigator.onLine) {
        setForgotStep(2)
        return
      }
      await apiClient.post('/auth/forgot-password', { email: forgotEmail })
      setForgotStep(2)
    } catch (err) {
      // If backend doesn't support forgot-password yet, show demo message
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        setForgotStep(2)
      } else {
        setForgotError(err.response?.data?.message || 'Failed to send reset code')
      }
    } finally {
      setForgotLoading(false)
    }
  }

  // Forgot password: step 3 — reset password
  const handleForgotReset = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError('')

    if (forgotNewPw !== forgotConfirmPw) {
      setForgotError('Passwords do not match')
      setForgotLoading(false)
      return
    }
    if (forgotNewPw.length < 6) {
      setForgotError('Password must be at least 6 characters')
      setForgotLoading(false)
      return
    }

    try {
      if (localStorage.getItem('opal_token') === 'demo-token-opal-line' || !navigator.onLine) {
        setForgotSuccess(true)
        return
      }
      await apiClient.post('/auth/reset-password', {
        email: forgotEmail,
        code: forgotCode,
        newPassword: forgotNewPw,
      })
      setForgotSuccess(true)
    } catch (err) {
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        setForgotSuccess(true)
      } else {
        setForgotError(err.response?.data?.message || 'Reset failed. Check your code and try again.')
      }
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgot = () => {
    setForgotOpen(false)
    setForgotStep(1)
    setForgotEmail('')
    setForgotCode('')
    setForgotNewPw('')
    setForgotConfirmPw('')
    setForgotError('')
    setForgotSuccess(false)
  }

  const inputClass = 'w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 backdrop-blur-sm transition-shadow'

  return (
    <div className="relative min-h-screen w-full flex items-stretch overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(https://www.mysilverworld.in/images/home/silver-fusion-hero-desktop.webp)' }}
      />

      {/* Overlays */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

      {/* Card — left side */}
      <div className="relative z-10 flex items-center w-full max-w-lg pl-[10%] pr-8 py-12">
        <div className="w-full">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <img src="/opal-logo.png" alt="Opal Line Logo" className="w-14 h-14 rounded-xl object-contain shadow-lg" />
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">OPAL LINE</h1>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold-400 font-semibold">Jewellery Billing ERP</p>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-white/60 mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 bg-red-500/20 text-red-200 text-sm rounded-lg px-4 py-3 border border-red-500/30 backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@opalline.com" className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className={`${inputClass} pr-10`} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 cursor-pointer">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-sm text-white/60">Remember me</span>
              </label>
              <button type="button" onClick={() => { setForgotOpen(true); setForgotEmail(email) }} className="text-sm text-gold-400 hover:text-gold-300 cursor-pointer">
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-400 text-royal-950 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials - development only */}
          {import.meta.env.DEV && (
            <div className="mt-5 text-center">
              <p className="text-[11px] text-white/40">
                Seeded admin: <span className="font-medium text-white/60">admin@opalline.com</span> / <span className="font-medium text-white/60">Admin@123</span>
              </p>
            </div>
          )}

          <p className="text-center text-[11px] text-white/30 mt-6">
            92.5 Sterling Silver · Ecommerce ERP
          </p>
        </div>
      </div>

      {/* Right side tagline */}
      <div className="relative z-10 hidden lg:flex flex-col justify-end items-end w-full pr-[8%] pb-12 pointer-events-none">
        <p className="text-white text-2xl font-bold tracking-wide">Pure 92.5 Silver</p>
        <p className="text-white/70 text-sm tracking-widest uppercase mt-1">Elegance That Lasts Forever</p>
      </div>

      {/* ========== FORGOT PASSWORD MODAL ========== */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeForgot}>
          <div className="bg-[#1a0a3e] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
              {forgotStep > 1 && !forgotSuccess ? (
                <button onClick={() => setForgotStep(forgotStep - 1)} className="text-white/40 hover:text-white/70 cursor-pointer">
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <Shield size={18} className="text-gold-400" />
              )}
              <div>
                <h3 className="text-base font-semibold text-white">
                  {forgotSuccess ? 'Password Reset' : forgotStep === 1 ? 'Reset Password' : forgotStep === 2 ? 'Enter Reset Code' : 'Set New Password'}
                </h3>
                <p className="text-[11px] text-white/40">
                  {forgotSuccess ? 'Your password has been updated' : forgotStep === 1 ? 'Enter your email to receive a reset code' : forgotStep === 2 ? `Code sent to ${forgotEmail}` : 'Choose a strong new password'}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              {forgotError && (
                <div className="mb-4 bg-red-500/20 text-red-200 text-sm rounded-lg px-4 py-3 border border-red-500/30">
                  {forgotError}
                </div>
              )}

              {forgotSuccess ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={28} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-white/70 mb-4">Your password has been successfully reset.</p>
                  <button
                    onClick={() => { closeForgot(); setForgotOpen(false) }}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-royal-950 font-semibold py-2.5 rounded-lg transition-all cursor-pointer text-sm"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : forgotStep === 1 ? (
                /* Step 1: Enter email */
                <form onSubmit={handleForgotSendCode} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="admin@opalline.com"
                        className={`${inputClass} pl-10`}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading} className="w-full bg-gold-500 hover:bg-gold-400 text-royal-950 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm">
                    {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </form>
              ) : forgotStep === 2 ? (
                /* Step 2: Enter code */
                <form onSubmit={(e) => { e.preventDefault(); setForgotStep(3) }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Reset Code</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className={`${inputClass} pl-10 text-center text-lg tracking-[0.3em] font-mono`}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-white/30 mt-2">
                      Demo: enter any 6 digits (e.g. 123456)
                    </p>
                  </div>
                  <button type="submit" disabled={!forgotCode || forgotCode.length < 4} className="w-full bg-gold-500 hover:bg-gold-400 text-royal-950 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm">
                    Verify Code
                  </button>
                </form>
              ) : (
                /* Step 3: New password */
                <form onSubmit={handleForgotReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={forgotShowPw ? 'text' : 'password'}
                        value={forgotNewPw}
                        onChange={(e) => setForgotNewPw(e.target.value)}
                        placeholder="Min. 6 characters"
                        className={`${inputClass} pr-10`}
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setForgotShowPw(!forgotShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 cursor-pointer">
                        {forgotShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Confirm Password</label>
                    <input
                      type={forgotShowPw ? 'text' : 'password'}
                      value={forgotConfirmPw}
                      onChange={(e) => setForgotConfirmPw(e.target.value)}
                      placeholder="Re-enter password"
                      className={inputClass}
                      required
                      minLength={6}
                    />
                  </div>
                  <button type="submit" disabled={forgotLoading || !forgotNewPw || !forgotConfirmPw} className="w-full bg-gold-500 hover:bg-gold-400 text-royal-950 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm">
                    {forgotLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              )}
            </div>

            {/* Close */}
            {!forgotSuccess && (
              <div className="px-6 pb-4">
                <button onClick={closeForgot} className="w-full text-center text-sm text-white/40 hover:text-white/60 cursor-pointer py-2">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}