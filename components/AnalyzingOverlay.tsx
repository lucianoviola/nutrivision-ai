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
        onClick={() => status === 'complete' && setIsExpanded(true)}
        className="fixed bottom-24 right-4 z-40 animate-fade-in"
      >
        <div className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-lg border ${
          status === 'analyzing' 
            ? 'bg-white border-gray-200' 
            : status === 'error'
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          {status === 'analyzing' && (
            <>
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                <img src={pendingAnalysis.imageData} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Analyzing...</span>
              </div>
            </>
          )}
          
          {status === 'complete' && (
            <>
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-green-500">
                <img src={pendingAnalysis.imageData} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-700">Ready to save!</p>
                <p className="text-xs text-green-600">{Math.round(totals.calories)} kcal • Tap to review</p>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-exclamation-triangle text-red-500"></i>
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">Analysis failed</p>
                <p className="text-xs text-red-600">Tap to retry</p>
              </div>
            </>
          )}
        </div>
      </button>
    );
  }

  // Expanded result card
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button 
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
          <h3 className="font-bold text-gray-900">Review Meal</h3>
          <button 
            onClick={handleSave}
            disabled={status !== 'complete'}
            className={`font-bold transition-colors ${
              status === 'complete' 
                ? 'text-blue-500 hover:text-blue-600' 
                : 'text-gray-300'
            }`}
          >
            Save
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Image preview */}
          <div className="relative mb-4">
            <div className="w-full h-48 rounded-2xl overflow-hidden bg-gray-100">
              <img 
                src={pendingAnalysis.imageData} 
                alt="Meal" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Status badge */}
            <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 ${
              status === 'analyzing' 
                ? 'bg-white/90 text-gray-700' 
                : status === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-white'
            }`}>
              {status === 'analyzing' && (
                <>
                  <div className="animate-spin w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  <span>Analyzing...</span>
                </>
              )}
              {status === 'complete' && (
                <>
                  <i className="fa-solid fa-check"></i>
                  <span>Ready</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <i className="fa-solid fa-exclamation-triangle"></i>
                  <span>Error</span>
                </>
              )}
            </div>
          </div>

          {/* Meal type selector */}
          <div className="bg-gray-50 rounded-xl p-1.5 flex mb-4">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => (
              <button 
                key={t}
                onClick={() => setMealType(t)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                  mealType === t 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Results */}
          {status === 'analyzing' && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-exclamation-circle text-red-500 text-2xl"></i>
              </div>
              <p className="text-gray-700 font-medium mb-1">Analysis failed</p>
              <p className="text-gray-400 text-sm mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                <i className="fa-solid fa-refresh mr-2"></i>
                Try Again
              </button>
            </div>
          )}

          {status === 'complete' && result && (
            <div className="space-y-3">
              {result.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.servingSize}</p>
                    </div>
                    <span className="font-bold text-gray-900">{Math.round(item.macros.calories)} kcal</span>
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-lg font-bold">
                      P {Math.round(item.macros.protein)}g
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg font-bold">
                      C {Math.round(item.macros.carbs)}g
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg font-bold">
                      F {Math.round(item.macros.fat)}g
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Notes Section */}
              <div className="mt-4">
                <label className="text-xs text-gray-500 font-bold uppercase block mb-2">
                  <i className="fa-solid fa-note-sticky mr-1"></i>
                  Notes
                </label>
                <textarea
                  value={mealNote}
                  onChange={(e) => setMealNote(e.target.value)}
                  placeholder="How did this meal make you feel? Any observations?"
                  className="w-full px-4 py-3 rounded-xl text-gray-900 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none placeholder-gray-400 transition-all"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer with totals */}
        {status === 'complete' && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 font-medium">Total</p>
                <p className="text-2xl font-black text-gray-900">{Math.round(totals.calories)} <span className="text-sm font-medium text-gray-400">kcal</span></p>
              </div>
              <div className="flex space-x-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Protein</p>
                  <p className="font-bold text-green-600">{Math.round(totals.protein)}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Carbs</p>
                  <p className="font-bold text-blue-600">{Math.round(totals.carbs)}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Fat</p>
                  <p className="font-bold text-orange-600">{Math.round(totals.fat)}g</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              className="w-full mt-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
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

