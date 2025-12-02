import React, { useEffect, useState } from 'react';

interface CelebrationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

/**
 * Celebration overlay with confetti animation for goal achievements
 */
const Celebration: React.FC<CelebrationProps> = ({ 
  show, 
  message = "🎉 Goal Achieved!",
  onComplete 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Generate confetti particles
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: ['#8b5cf6', '#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#f59e0b'][Math.floor(Math.random() * 6)],
      }));
      setConfetti(particles);
      
      // Auto-hide after animation
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) {
          setTimeout(onComplete, 500);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show, onComplete]);

  if (!show && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Confetti particles */}
      {confetti.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-confetti pointer-events-none"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            boxShadow: `0 0 8px ${particle.color}`,
          }}
        />
      ))}
      
      {/* Celebration content */}
      <div 
        className="relative rounded-3xl p-8 text-center animate-spring-up"
        style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-3xl animate-breathe -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent)',
          }}
        />
        
        <div className="text-6xl mb-4 animate-spring-bounce">🎉</div>
        <h2 className="text-title-1-lg font-bold text-white mb-2">{message}</h2>
        <p className="text-body text-gray-300">Great job staying on track!</p>
        
        {/* Success checkmark */}
        <div className="mt-6 flex justify-center">
          <svg 
            className="w-16 h-16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" className="text-green-400" fill="rgba(34, 197, 94, 0.1)" />
            <path 
              d="M9 12l2 2 4-4" 
              className="text-green-400 animate-checkmark"
              strokeDasharray="20"
              strokeDashoffset="20"
              style={{
                animation: 'checkmark 0.6s ease-out forwards',
              }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Celebration;

