import React, { useState, useEffect } from 'react';

const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Show "Back online" briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 2000);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner && !isOffline) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-2 px-4 transition-all duration-300 ${
        showBanner ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      style={{
        background: isOffline 
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))'
          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(6, 182, 212, 0.95))',
        backdropFilter: 'blur(10px)',
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top))',
      }}
    >
      <div className="flex items-center space-x-2">
        {isOffline ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 1l22 22M9 9a6 6 0 018.5 8.5M4.9 4.9A10 10 0 002 12c0 2.8 1.1 5.3 2.9 7.1M12 2a10 10 0 017.1 2.9M16.2 7.8A6 6 0 0118 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-white text-sm font-medium">No internet connection</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.55A11 11 0 0119 12.55M8.5 16.5a5 5 0 017 0M12 20h.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-white text-sm font-medium">Back online</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;

