import React, { useState, useEffect } from 'react';
import { MealLog, UserSettings } from '../types';
import { generateInsights, Insight } from '../services/insightsService';

interface InsightsCardProps {
  logs: MealLog[];
  settings: UserSettings;
}

const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
  purple: {
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    text: '#A855F7',
  },
  pink: {
    bg: 'rgba(236, 72, 153, 0.1)',
    border: 'rgba(236, 72, 153, 0.3)',
    text: '#EC4899',
  },
  green: {
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    text: '#10B981',
  },
  orange: {
    bg: 'rgba(249, 115, 22, 0.1)',
    border: 'rgba(249, 115, 22, 0.3)',
    text: '#F97316',
  },
  blue: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    text: '#3B82F6',
  },
  red: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#EF4444',
  },
};

const InsightItem: React.FC<{ insight: Insight; index: number }> = ({ insight, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const colors = colorStyles[insight.color] || colorStyles.purple;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100 + 200);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`relative rounded-2xl p-4 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="flex items-start space-x-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
        >
          {insight.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm">{insight.title}</h4>
            {insight.metric && (
              <span 
                className="text-xs font-bold px-2 py-0.5 rounded-md"
                style={{ background: colors.bg, color: colors.text }}
              >
                {insight.metric}
              </span>
            )}
          </div>
          <p className="text-white/50 text-xs mt-1 leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
      
      {/* Type badge */}
      <div 
        className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{ background: colors.bg, color: colors.text }}
      >
        {insight.type}
      </div>
    </div>
  );
};

const InsightsCard: React.FC<InsightsCardProps> = ({ logs, settings }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const insights = generateInsights(logs, settings);

  if (insights.length === 0) return null;

  const displayInsights = isExpanded ? insights : insights.slice(0, 2);

  return (
    <div className="px-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                stroke="url(#insightGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="insightGradient" x1="3" y1="3" x2="21" y2="21">
                  <stop stopColor="#8B5CF6"/>
                  <stop offset="1" stopColor="#EC4899"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">AI Insights</h3>
        </div>
        
        {insights.length > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-purple-400 font-medium hover:text-purple-300 transition-colors"
          >
            {isExpanded ? 'Show less' : `+${insights.length - 2} more`}
          </button>
        )}
      </div>

      {/* Insights list */}
      <div className="space-y-3">
        {displayInsights.map((insight, index) => (
          <InsightItem key={insight.id} insight={insight} index={index} />
        ))}
      </div>
    </div>
  );
};

export default InsightsCard;
