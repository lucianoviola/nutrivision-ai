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
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center p-6">
        <div 
          className="w-full max-w-md rounded-3xl p-8"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="text-center mb-8">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.2))',
              }}
            >
              🔒
            </div>
            <h1 className="text-title-1-lg font-bold text-white mb-2">Private Access</h1>
            <p className="text-body text-gray-400">
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
                className={`w-full px-4 py-4 rounded-xl text-body text-white placeholder-gray-500 transition-all duration-300 outline-none ${
                  error ? 'shake' : ''
                }`}
                style={{
                  background: error 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : 'rgba(255,255,255,0.08)',
                  border: error
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
                }}
                autoFocus
                onFocus={(e) => {
                  if (!error) {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    e.target.style.background = 'rgba(255,255,255,0.12)';
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'rgba(255,255,255,0.08)';
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
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
              }}
            >
              Access App
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            This app is password protected for private use
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;

