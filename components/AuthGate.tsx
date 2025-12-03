import React, { useState, useEffect } from 'react';

const AUTH_STORAGE_KEY = 'nutrivision_auth';
// ⚠️ IMPORTANT: Change this password to something secure!
// Or set VITE_SITE_PASSWORD in Vercel environment variables (recommended)
// Default password: 'nutrivision2024' - CHANGE THIS!
const DEFAULT_PASSWORD = 'nutrivision2024';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authToken = localStorage.getItem(AUTH_STORAGE_KEY);
    const expectedPassword = import.meta.env.VITE_SITE_PASSWORD || DEFAULT_PASSWORD;
    
    if (authToken === expectedPassword) {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPassword = import.meta.env.VITE_SITE_PASSWORD || DEFAULT_PASSWORD;
    
    if (password === expectedPassword) {
      localStorage.setItem(AUTH_STORAGE_KEY, password);
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0D0B1C' }}>
        <div 
          className="w-12 h-12 rounded-full animate-spin"
          style={{
            border: '3px solid rgba(139, 92, 246, 0.2)',
            borderTopColor: '#8B5CF6',
          }}
        ></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center p-6"
        style={{ 
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
            #0D0B1C
          ` 
        }}
      >
        <div 
          className="w-full max-w-md rounded-3xl p-8"
          style={{
            background: 'rgba(26, 22, 51, 0.8)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(139, 92, 246, 0.1)',
          }}
        >
          <div className="text-center mb-8">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2))',
                boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
              }}
            >
              🔒
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Private Access</h1>
            <p className="text-base text-white/50">
              Enter password to access NutriVision AI
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Password"
                className={`w-full px-4 py-4 rounded-xl text-base text-white placeholder-white/30 transition-all duration-300 outline-none ${
                  error ? 'shake' : ''
                }`}
                style={{
                  background: error 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : 'rgba(139, 92, 246, 0.1)',
                  border: error
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid rgba(139, 92, 246, 0.2)',
                }}
                autoFocus
                onFocus={(e) => {
                  if (!error) {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.2)';
                    e.target.style.background = 'rgba(139, 92, 246, 0.15)';
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                  }
                }}
              />
              {error && (
                <p className="text-sm text-red-400 mt-2 ml-1">
                  Incorrect password. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl font-bold text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
              }}
            >
              Access App
            </button>
          </form>

          <p className="text-xs text-white/30 text-center mt-6">
            This app is password protected for private use
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;

