import React, { useState } from 'react';
import { signIn, signUp } from '../services/supabaseService.ts';

interface SupabaseAuthProps {
  onSuccess: () => void;
}

// Set to true temporarily to create your account, then set back to false
const ALLOW_SIGN_UP = true; // ← TEMPORARY: Set back to false after creating your account!

const SupabaseAuth: React.FC<SupabaseAuthProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Block sign-up if not allowed
    if (isSignUp && !ALLOW_SIGN_UP) {
      setError('Sign up is disabled');
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      
      const { user, error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        setError(signUpError);
      } else if (user) {
        setSuccess('Check your email to confirm your account!');
      }
    } else {
      const { user, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        setError(signInError);
      } else if (user) {
        onSuccess();
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0D0B1C' }}>
      {/* Background gradients */}
      <div className="fixed inset-0 -z-10">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)
            `,
          }}
        />
      </div>
      
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
            }}
          >
            <span className="text-4xl">🍽️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NutriVision AI</h1>
          <p className="text-white/50">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>
        
        {/* Form */}
        <form 
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'rgba(26, 22, 51, 0.8)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              placeholder="you@example.com"
              required
            />
          </div>
          
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              placeholder="••••••••"
              required
            />
          </div>
          
          {/* Confirm Password (Sign Up only) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
                placeholder="••••••••"
                required
              />
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div 
              className="px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
              }}
            >
              {error}
            </div>
          )}
          
          {/* Success message */}
          {success && (
            <div 
              className="px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34D399',
              }}
            >
              {success}
            </div>
          )}
          
          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading...</span>
              </span>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>
        
        {/* Toggle sign up / sign in - only show if sign-up is allowed */}
        {ALLOW_SIGN_UP && (
          <p className="text-center mt-6 text-white/50">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="font-semibold hover:underline"
              style={{ color: '#A855F7' }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        )}
        
        {/* Data privacy note */}
        <p className="text-center mt-6 text-xs text-white/30">
          🔒 Your data is encrypted and stored securely
        </p>
      </div>
    </div>
  );
};

export default SupabaseAuth;

