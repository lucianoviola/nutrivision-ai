import React, { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}

/**
 * Animated number counter that counts up from 0 to the target value
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  duration = 1000,
  decimals = 0,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();
    const difference = endValue - startValue;

    if (difference === 0) {
      setIsAnimating(false);
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (difference * eased);
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formattedValue = decimals > 0 
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue);

  return (
    <span className={className}>
      {formattedValue}
    </span>
  );
};

export default AnimatedNumber;

