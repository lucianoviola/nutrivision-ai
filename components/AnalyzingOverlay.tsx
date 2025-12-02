import React, { useState, useEffect } from 'react';
import { FoodItem, MealLog, Macros, AIProvider } from '../types.ts';
import * as aiService from '../services/aiService.ts';

interface PendingAnalysis {
  id: string;
  imageData: string;
  timestamp: number;
}

interface AnalyzingOverlayProps {
  pendingAnalysis: PendingAnalysis | null;
  aiProvider: AIProvider;
  onComplete: (log: MealLog) => void;
  onDismiss: () => void;
}

type AnalysisStatus = 'analyzing' | 'complete' | 'error';

const AnalyzingOverlay: React.FC<AnalyzingOverlayProps> = ({
  pendingAnalysis,
  aiProvider,
  onComplete,
  onDismiss,
}) => {
  const [status, setStatus] = useState<AnalysisStatus>('analyzing');
  const [result, setResult] = useState<FoodItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const [mealNote, setMealNote] = useState('');
  
  // Set default meal type based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setMealType('breakfast');
    else if (hour >= 11 && hour < 16) setMealType('lunch');
    else if (hour >= 16 && hour < 22) setMealType('dinner');
    else setMealType('snack');
  }, []);

  // Run analysis when pendingAnalysis changes
  useEffect(() => {
    if (!pendingAnalysis) return;
    
    const analyze = async () => {
      setStatus('analyzing');
      setResult(null);
      setError(null);
      
      try {
        const base64 = pendingAnalysis.imageData.split(',')[1];
        console.log('🔄 Background analysis started...');
        const items = await aiService.analyzeFoodImage(base64, aiProvider);
        
        if (!items || items.length === 0) {
          throw new Error('No food items detected');
        }
        
        console.log('✅ Background analysis complete:', items);
        setResult(items);
        setStatus('complete');
        setIsExpanded(true); // Auto-expand when complete
      } catch (e: any) {
        console.error('❌ Background analysis error:', e);
        setError(e?.message || 'Failed to analyze');
        setStatus('error');
      }
    };
    
    analyze();
  }, [pendingAnalysis, aiProvider]);

  if (!pendingAnalysis) return null;

  const calculateTotals = (): Macros => {
    if (!result) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return result.reduce((acc, item) => ({
      calories: acc.calories + item.macros.calories,
      protein: acc.protein + item.macros.protein,
      carbs: acc.carbs + item.macros.carbs,
      fat: acc.fat + item.macros.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const handleSave = () => {
    if (!result) return;
    
    const totals = calculateTotals();
    const log: MealLog = {
      id: pendingAnalysis.id,
      timestamp: pendingAnalysis.timestamp,
      imageUrl: pendingAnalysis.imageData,
      items: result,
      totalMacros: totals,
      type: mealType,
      note: mealNote.trim() || undefined,
    };
    
    onComplete(log);
  };

  const handleRetry = () => {
    if (!pendingAnalysis) return;
    
    const analyze = async () => {
      setStatus('analyzing');
      setResult(null);
      setError(null);
      
      try {
        const base64 = pendingAnalysis.imageData.split(',')[1];
        const items = await aiService.analyzeFoodImage(base64, aiProvider);
        
        if (!items || items.length === 0) {
          throw new Error('No food items detected');
        }
        
        setResult(items);
        setStatus('complete');
      } catch (e: any) {
        setError(e?.message || 'Failed to analyze');
        setStatus('error');
      }
    };
    
    analyze();
  };

  const totals = calculateTotals();

  // Minimized floating indicator
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-28 left-4 right-4 z-50 animate-fade-in"
      >
        <div 
          className="flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl"
          style={{
            background: status === 'analyzing' 
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95))'
              : status === 'error'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))'
              : 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: status === 'analyzing'
              ? '0 10px 40px rgba(99, 102, 241, 0.4)'
              : status === 'error'
              ? '0 10px 40px rgba(239, 68, 68, 0.4)'
              : '0 10px 40px rgba(34, 197, 94, 0.4)',
          }}
        >
          {status === 'analyzing' && (
            <>
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/30">
                <img src={pendingAnalysis.imageData} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="text-sm font-bold text-white">Analyzing your meal...</span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">AI is identifying foods</p>
              </div>
              <div className="text-white/50">
                <i className="fa-solid fa-chevron-up"></i>
              </div>
            </>
          )}
          
          {status === 'complete' && (
            <>
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/40">
                <img src={pendingAnalysis.imageData} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white flex items-center">
                  <i className="fa-solid fa-check-circle mr-1.5"></i>
                  Ready to save!
                </p>
                <p className="text-xs text-white/80">{Math.round(totals.calories)} kcal • Tap to review</p>
              </div>
              <div className="text-white/70">
                <i className="fa-solid fa-chevron-up"></i>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-exclamation-triangle text-white text-xl"></i>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Analysis failed</p>
                <p className="text-xs text-white/80">Tap to retry</p>
              </div>
              <div className="text-white/70">
                <i className="fa-solid fa-chevron-up"></i>
              </div>
            </>
          )}
        </div>
      </button>
    );
  }

  // Expanded result card
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #1a1a1f 0%, #0a0a0f 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        >
          <button 
            onClick={onDismiss}
            className="text-gray-400 hover:text-white transition-colors active:scale-95"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
          <h3 className="font-bold text-white">Review Meal</h3>
          <button 
            onClick={handleSave}
            disabled={status !== 'complete'}
            className={`font-bold transition-colors active:scale-95 ${
              status === 'complete' 
                ? 'text-purple-400 hover:text-purple-300' 
                : 'text-gray-600'
            }`}
          >
            Save
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Image preview */}
          <div className="relative mb-4">
            <div 
              className="w-full h-48 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <img 
                src={pendingAnalysis.imageData} 
                alt="Meal" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Status badge */}
            <div 
              className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5"
              style={{
                background: status === 'analyzing' 
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9))'
                  : status === 'error'
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9))'
                  : 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(16, 185, 129, 0.9))',
                backdropFilter: 'blur(10px)',
              }}
            >
              {status === 'analyzing' && (
                <>
                  <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="text-white">Analyzing...</span>
                </>
              )}
              {status === 'complete' && (
                <>
                  <i className="fa-solid fa-check text-white"></i>
                  <span className="text-white">Ready</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <i className="fa-solid fa-exclamation-triangle text-white"></i>
                  <span className="text-white">Error</span>
                </>
              )}
            </div>
          </div>

          {/* Meal type selector */}
          <div 
            className="rounded-xl p-1.5 flex mb-4"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => (
              <button 
                key={t}
                onClick={() => setMealType(t)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all active:scale-95 ${
                  mealType === t 
                    ? 'text-white' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                style={mealType === t ? {
                  background: 'rgba(255,255,255,0.1)',
                } : {}}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Results */}
          {status === 'analyzing' && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div 
                  key={i} 
                  className="rounded-xl p-4 animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div className="h-4 rounded w-2/3 mb-2" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
                  <div className="h-3 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.08)' }}></div>
                </div>
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239, 68, 68, 0.15)' }}
              >
                <i className="fa-solid fa-exclamation-circle text-red-400 text-2xl"></i>
              </div>
              <p className="text-white font-medium mb-1">Analysis failed</p>
              <p className="text-gray-400 text-sm mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                }}
              >
                <i className="fa-solid fa-refresh mr-2"></i>
                Try Again
              </button>
            </div>
          )}

          {status === 'complete' && result && (
            <div className="space-y-3">
              {result.map((item, index) => (
                <div 
                  key={index} 
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.servingSize}</p>
                    </div>
                    <span className="font-bold text-white">{Math.round(item.macros.calories)} kcal</span>
                  </div>
                  <div className="flex space-x-2">
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-lg font-bold text-green-400"
                      style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                    >
                      P {Math.round(item.macros.protein)}g
                    </span>
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-lg font-bold text-blue-400"
                      style={{ background: 'rgba(59, 130, 246, 0.15)' }}
                    >
                      C {Math.round(item.macros.carbs)}g
                    </span>
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-lg font-bold text-orange-400"
                      style={{ background: 'rgba(249, 115, 22, 0.15)' }}
                    >
                      F {Math.round(item.macros.fat)}g
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Notes Section */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 font-bold uppercase block mb-2 px-1">
                  <i className="fa-solid fa-note-sticky mr-1 text-purple-400"></i>
                  Notes
                </label>
                <textarea
                  value={mealNote}
                  onChange={(e) => setMealNote(e.target.value)}
                  placeholder="How did this meal make you feel? Any observations?"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none resize-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer with totals */}
        {status === 'complete' && (
          <div 
            className="p-4"
            style={{ 
              borderTop: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-2xl font-black text-white">{Math.round(totals.calories)} <span className="text-sm font-medium text-gray-500">kcal</span></p>
              </div>
              <div className="flex space-x-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Protein</p>
                  <p className="font-bold text-green-400">{Math.round(totals.protein)}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Carbs</p>
                  <p className="font-bold text-blue-400">{Math.round(totals.carbs)}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Fat</p>
                  <p className="font-bold text-orange-400">{Math.round(totals.fat)}g</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              className="w-full mt-4 py-3 text-white rounded-xl font-bold transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
              }}
            >
              <i className="fa-solid fa-check mr-2"></i>
              Save to Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzingOverlay;

