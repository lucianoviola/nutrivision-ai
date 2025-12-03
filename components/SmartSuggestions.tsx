import React, { useState, useEffect } from 'react';
import { MealLog, UserSettings } from '../types';
import { generateSuggestions, MealSuggestion } from '../services/suggestionsService';

interface SmartSuggestionsProps {
  logs: MealLog[];
  settings: UserSettings;
  onAddMeal?: () => void;
}

const mealTypeEmoji: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
};

const macroColors: Record<string, string> = {
  protein: '#10B981',
  carbs: '#A855F7',
  fat: '#FB923C',
  calories: '#EC4899',
};

const SuggestionCard: React.FC<{ 
  suggestion: MealSuggestion; 
  index: number;
  onTap?: () => void;
}> = ({ suggestion, index, onTap }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 150 + 100);
    return () => clearTimeout(timer);
  }, [index]);

  // Cycle through food suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedFood(prev => (prev + 1) % suggestion.suggestions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [suggestion.suggestions.length]);

  return (
    <div
      className={`relative rounded-2xl p-4 transition-all duration-500 cursor-pointer group ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(26, 22, 51, 0.8), rgba(26, 22, 51, 0.6))',
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}
      onClick={onTap}
    >
      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05))',
        }}
      />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{mealTypeEmoji[suggestion.mealType]}</span>
            <div>
              <h4 className="font-bold text-white text-sm">{suggestion.title}</h4>
              <p className="text-white/40 text-xs">{suggestion.reason}</p>
            </div>
          </div>
          
          {suggestion.macroFocus && (
            <div 
              className="px-2 py-1 rounded-lg text-xs font-bold uppercase"
              style={{ 
                background: `${macroColors[suggestion.macroFocus]}15`,
                color: macroColors[suggestion.macroFocus],
              }}
            >
              {suggestion.macroFocus === 'calories' ? 'Light' : `High ${suggestion.macroFocus}`}
            </div>
          )}
        </div>

        {/* Suggestions carousel */}
        <div className="relative h-12 overflow-hidden mb-3">
          {suggestion.suggestions.map((food, i) => (
            <div
              key={i}
              className={`absolute inset-x-0 flex items-center space-x-2 transition-all duration-500 ${
                i === selectedFood 
                  ? 'opacity-100 translate-y-0' 
                  : i < selectedFood 
                    ? 'opacity-0 -translate-y-full' 
                    : 'opacity-0 translate-y-full'
              }`}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.1))',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" 
                    fill="rgba(139, 92, 246, 0.8)"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{food}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Target macros if available */}
        {suggestion.targetMacros && (
          <div className="flex items-center space-x-3 pt-2 border-t border-white/5">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-white/30">Target:</span>
            </div>
            <span className="text-xs font-bold" style={{ color: '#EC4899' }}>
              {suggestion.targetMacros.calories} cal
            </span>
            <span className="text-xs font-bold" style={{ color: '#10B981' }}>
              {suggestion.targetMacros.protein}g P
            </span>
            <span className="text-xs font-bold" style={{ color: '#A855F7' }}>
              {suggestion.targetMacros.carbs}g C
            </span>
            <span className="text-xs font-bold" style={{ color: '#FB923C' }}>
              {suggestion.targetMacros.fat}g F
            </span>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center space-x-1 mt-3">
          {suggestion.suggestions.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === selectedFood ? 'bg-purple-500 w-3' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ logs, settings, onAddMeal }) => {
  const suggestions = generateSuggestions(logs, settings);

  if (suggestions.length === 0) return null;

  return (
    <div className="px-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="url(#suggestionGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="suggestionGradient" x1="4" y1="3" x2="20" y2="21">
                  <stop stopColor="#10B981"/>
                  <stop offset="1" stopColor="#06B6D4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">Smart Suggestions</h3>
        </div>
        
        <span className="text-xs text-white/40">Based on today</span>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard 
            key={suggestion.id} 
            suggestion={suggestion} 
            index={index}
            onTap={onAddMeal}
          />
        ))}
      </div>
    </div>
  );
};

export default SmartSuggestions;
