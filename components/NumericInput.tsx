import React, { useState, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  allowDecimals?: boolean;
}

/**
 * A numeric input that handles the "0 inserted" bug properly.
 * Uses text input with numeric keyboard for better UX.
 */
const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
  step,
  min,
  allowDecimals = true,
}) => {
  const [inputValue, setInputValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync with external value changes when not focused
  useEffect(() => {
    if (!isFocused) {
      // Format the value for display
      if (allowDecimals) {
        setInputValue(String(Math.round(value * 10) / 10));
      } else {
        setInputValue(String(Math.round(value)));
      }
    }
  }, [value, isFocused, allowDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Pattern for allowed characters
    const pattern = allowDecimals ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    
    // Allow empty string or valid numeric pattern
    if (newValue === '' || pattern.test(newValue)) {
      setInputValue(newValue);
      
      // Only update parent if we have a valid number
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // On blur, ensure we have a valid value
    const numValue = parseFloat(inputValue);
    if (inputValue === '' || isNaN(numValue)) {
      // Reset to last valid value
      setInputValue(allowDecimals 
        ? String(Math.round(value * 10) / 10)
        : String(Math.round(value))
      );
    } else {
      // Format the number properly
      setInputValue(allowDecimals
        ? String(Math.round(numValue * 10) / 10)
        : String(Math.round(numValue))
      );
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  );
};

export default NumericInput;

