import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Try admin@opalline.in / admin123')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPw) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
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

          {/* Login / Sign Up Tabs */}
          <div className="flex bg-white/10 rounded-lg p-1 mb-6 backdrop-blur-sm border border-white/10">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-gold-500 text-royal-950 shadow-lg shadow-gold-500/25'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              <LogIn size={15} /> Login
            </button>
            <button
              onClick={() => { setMode('signup'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-gold-500 text-royal-950 shadow-lg shadow-gold-500/25'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              <UserPlus size={15} /> Sign Up
            </button>
          </div>

          {/* Heading */}
          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-sm text-white/60 mb-6">Sign in to your account</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Create account</h2>
              <p className="text-sm text-white/60 mb-6">Register a new team member</p>
            </>
          )}

          {error && (
            <div className="mb-4 bg-red-500/20 text-red-200 text-sm rounded-lg px-4 py-3 border border-red-500/30 backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@opalline.in" className={inputClass} required />
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
              <button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-400 text-royal-950 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Gupta" className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rajesh@opalline.in" className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className={`${inputClass} pr-10`} required />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 cursor-pointer">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Confirm password</label>
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Re-enter password" className={inputClass} required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-400 text-royal-950 font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-sm shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40">
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <p className="text-[11px] text-white/40">
              Demo: <span className="font-medium text-white/60">admin@opalline.in</span> / <span className="font-medium text-white/60">admin123</span>
            </p>
          </div>

          <p className="text-center text-[11px] text-white/30 mt-6">
            92.5 Sterling Silver · Ecommerce ERP
          </p>
        </div>
      </div>
    </div>
  )
}
