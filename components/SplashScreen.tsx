import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete, 
  minDuration = 1500 
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 3, 100));
    }, minDuration / 40);

    // Start exit animation
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, minDuration - 300);

    // Complete after exit animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, minDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [minDuration, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: '#0D0B1C',
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(236, 72, 153, 0.2) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 60%)
            `,
          }}
        />
        
        {/* Animated particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 2 === 0 ? '#8B5CF6' : '#EC4899',
              boxShadow: `0 0 20px ${i % 2 === 0 ? '#8B5CF6' : '#EC4899'}`,
              left: `${20 + i * 12}%`,
              top: `${30 + (i % 3) * 20}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Logo and branding */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated logo */}
        <div 
          className="relative w-24 h-24 mb-8"
          style={{
            animation: 'logoEnter 0.8s ease-out forwards',
          }}
        >
          {/* Outer glow ring */}
          <div 
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(236, 72, 153, 0.3))',
              filter: 'blur(20px)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          
          {/* Main icon container */}
          <div 
            className="absolute inset-2 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              boxShadow: '0 10px 40px rgba(139, 92, 246, 0.5)',
            }}
          >
            {/* Food/nutrition icon */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="16" stroke="white" strokeWidth="2.5" opacity="0.9"/>
              <path d="M24 12v24M12 24h24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              <circle cx="24" cy="24" r="8" fill="white" opacity="0.9"/>
              <circle cx="24" cy="24" r="4" fill="rgba(139, 92, 246, 0.8)"/>
            </svg>
          </div>
        </div>

        {/* App name */}
        <h1 
          className="text-3xl font-black text-white mb-2"
          style={{
            animation: 'fadeInUp 0.6s ease-out 0.3s forwards',
            opacity: 0,
          }}
        >
          NutriVision
        </h1>
        
        <p 
          className="text-white/50 text-sm font-medium mb-12"
          style={{
            animation: 'fadeInUp 0.6s ease-out 0.5s forwards',
            opacity: 0,
          }}
        >
          AI-Powered Nutrition Tracking
        </p>

        {/* Progress bar */}
        <div 
          className="w-48 h-1 rounded-full overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.1)',
            animation: 'fadeInUp 0.6s ease-out 0.7s forwards',
            opacity: 0,
          }}
        >
          <div 
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes logoEnter {
          from {
            transform: scale(0.5) rotate(-10deg);
            opacity: 0;
          }
          to {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes fadeInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;

