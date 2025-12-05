import React, { useState, useEffect } from 'react';
import { MealLog, UserSettings } from '../types';
import { generateSuggestions, MealSuggestion } from '../services/suggestionsService';

interface SmartSuggestionsProps {
  logs: MealLog[];
  settings: UserSettings;
  onAddMeal?: () => void;
}

// Context-aware emoji based on suggestion type
const getSuggestionEmoji = (suggestion: MealSuggestion): string => {
  // Check for specific keywords in the title
  const title = suggestion.title.toLowerCase();
  if (title.includes('protein')) return '💪';
  if (title.includes('energy')) return '⚡';
  if (title.includes('light')) return '🥗';
  if (title.includes('low-carb')) return '🥑';
  if (title.includes('balanced')) return '⚖️';
  
  // Fallback to meal type
  const mealEmojis: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎',
  };
  return mealEmojis[suggestion.mealType] || '🍽️';
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
        boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
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
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.15))',
              }}
            >
              {getSuggestionEmoji(suggestion)}
            </div>
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
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="rgba(168, 85, 247, 0.6)" strokeWidth="1.5"/>
                  <path d="M8 12h8M12 8v8" stroke="rgba(168, 85, 247, 0.8)" strokeWidth="1.5" strokeLinecap="round"/>
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

        {/* Progress dots - more visible */}
        <div className="flex justify-center space-x-1.5 mt-3">
          {suggestion.suggestions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === selectedFood 
                  ? 'w-4 bg-purple-400' 
                  : 'w-1.5 bg-white/30'
              }`}
              style={i === selectedFood ? { boxShadow: '0 0 6px rgba(168, 85, 247, 0.5)' } : {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ logs, settings, onAddMeal }) => {
  const [showAll, setShowAll] = useState(false);
  const suggestions = generateSuggestions(logs, settings);

  if (suggestions.length === 0) return null;

  // Show only first suggestion by default
  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 1);

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
        
        {suggestions.length > 1 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-purple-400 font-medium hover:text-purple-300 transition-colors"
          >
            {showAll ? 'Show less' : `+${suggestions.length - 1} more`}
          </button>
        )}
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        {visibleSuggestions.map((suggestion, index) => (
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
