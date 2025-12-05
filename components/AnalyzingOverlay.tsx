import React, { useState, useEffect } from 'react';
import { FoodItem, MealLog, Macros, AIProvider } from '../types.ts';
import * as aiService from '../services/aiService.ts';
import NumericInput from './NumericInput.tsx';

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
  const [editableItems, setEditableItems] = useState<FoodItem[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const [mealNote, setMealNote] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);
  
  // Food search state
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
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
    
    let isCancelled = false;
    
    const analyze = async () => {
      setStatus('analyzing');
      setResult(null);
      setError(null);
      
      try {
        // Extract base64 from data URL, handle both formats
        let base64 = pendingAnalysis.imageData;
        if (base64.includes(',')) {
          base64 = base64.split(',')[1];
        }
        
        console.log('🔄 Background analysis started...', {
          hasData: !!base64,
          dataLength: base64?.length || 0,
          preview: base64?.substring(0, 50) + '...'
        });
        
        if (!base64 || base64.length < 100) {
          throw new Error(`Image data is invalid (length: ${base64?.length || 0})`);
        }
        
        const items = await aiService.analyzeFoodImage(base64, aiProvider);
        
        // Check if component was unmounted or analysis was cancelled
        if (isCancelled) {
          console.log('⚠️ Analysis cancelled, ignoring results');
          return;
        }
        
        if (!items || items.length === 0) {
          throw new Error('No food items detected');
        }
        
        console.log('✅ Background analysis complete:', items);
        setResult(items);
        setEditableItems([...items]); // Create editable copy
        setStatus('complete');
        setIsExpanded(true); // Auto-expand when complete
      } catch (e: any) {
        // Only set error if not cancelled
        if (!isCancelled) {
          console.error('❌ Background analysis error:', e);
          setError(e?.message || 'Failed to analyze');
          setStatus('error');
        }
      }
    };
    
    analyze();
    
    // Cleanup function to mark as cancelled
    return () => {
      isCancelled = true;
    };
  }, [pendingAnalysis, aiProvider]);

  if (!pendingAnalysis) return null;

  const calculateTotals = (): Macros => {
    if (editableItems.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return editableItems.reduce((acc, item) => ({
      calories: acc.calories + item.macros.calories,
      protein: acc.protein + item.macros.protein,
      carbs: acc.carbs + item.macros.carbs,
      fat: acc.fat + item.macros.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const updateItem = (index: number, updates: Partial<FoodItem>) => {
    const newItems = [...editableItems];
    newItems[index] = { ...newItems[index], ...updates };
    setEditableItems(newItems);
  };

  const updateItemMacro = (index: number, macro: keyof Macros, value: number) => {
    const newItems = [...editableItems];
    const item = newItems[index];
    const oldCalories = item.macros.calories;
    const newMacros = { ...item.macros, [macro]: Math.max(0, value) };
    
    // If calories changed, proportionally adjust macros (unless we're editing calories)
    if (macro === 'calories' && oldCalories > 0) {
      const ratio = newMacros.calories / oldCalories;
      newMacros.protein = newMacros.protein * ratio;
      newMacros.carbs = newMacros.carbs * ratio;
      newMacros.fat = newMacros.fat * ratio;
    }
    
    newItems[index] = { ...item, macros: newMacros };
    setEditableItems(newItems);
  };

  const deleteItem = (index: number) => {
    const newItems = editableItems.filter((_, i) => i !== index);
    setEditableItems(newItems);
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
    }
  };

  // Parse serving size into quantity and unit
  const parseServingSize = (servingSize: string): { quantity: number; unit: string } => {
    // Match patterns like "100g", "1 cup", "6 oz", "2.5 tbsp", etc.
    const match = servingSize.match(/^([\d.]+)\s*(.*)$/);
    if (match) {
      return {
        quantity: parseFloat(match[1]) || 1,
        unit: match[2].trim() || 'g'
      };
    }
    // Fallback: try to extract number
    const numMatch = servingSize.match(/([\d.]+)/);
    if (numMatch) {
      return {
        quantity: parseFloat(numMatch[1]) || 1,
        unit: servingSize.replace(numMatch[1], '').trim() || 'g'
      };
    }
    return { quantity: 1, unit: 'g' };
  };

  // Format serving size from quantity and unit
  const formatServingSize = (quantity: number, unit: string): string => {
    if (!unit) unit = 'g';
    return `${quantity}${unit.startsWith('cup') || unit.startsWith('piece') || unit.startsWith('slice') ? ' ' : ''}${unit}`;
  };

  const addNewItem = () => {
    const newItem: FoodItem = {
      name: '',
      servingSize: '1 serving',
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    };
    setEditableItems([...editableItems, newItem]);
    setEditingItemIndex(editableItems.length); // Edit the newly added item
    setSearchResults([]);
    setShowSearchResults(false);
  };
  
  // Search food database
  const handleSearchFood = async (query: string, itemIndex: number) => {
    updateItem(itemIndex, { name: query });
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await aiService.searchFoodDatabase(query, aiProvider);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };
  
  // Select food from search results
  const handleSelectFood = (food: FoodItem, itemIndex: number) => {
    updateItem(itemIndex, {
      name: food.name,
      servingSize: food.servingSize,
      macros: { ...food.macros }
    });
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const updateServingSize = (index: number, quantity: number, unit: string) => {
    const item = editableItems[index];
    const oldServing = parseServingSize(item.servingSize);
    const newServingSize = formatServingSize(quantity, unit);
    
    // If unit changed, we can't proportionally adjust (different densities)
    // If only quantity changed, adjust macros proportionally
    if (oldServing.unit === unit && oldServing.quantity > 0) {
      const ratio = quantity / oldServing.quantity;
      const newItems = [...editableItems];
      newItems[index] = {
        ...item,
        servingSize: newServingSize,
        macros: {
          calories: item.macros.calories * ratio,
          protein: item.macros.protein * ratio,
          carbs: item.macros.carbs * ratio,
          fat: item.macros.fat * ratio,
        }
      };
      setEditableItems(newItems);
    } else {
      // Unit changed - just update the serving size string, don't adjust macros
      updateItem(index, { servingSize: newServingSize });
    }
  };

  const handleCorrect = async () => {
    if (!correctionText.trim() || !pendingAnalysis) return;
    
    setIsCorrecting(true);
    setError(null);
    
    try {
      const base64 = pendingAnalysis.imageData.split(',')[1];
      const correctedItems = await aiService.correctFoodAnalysis(
        base64,
        editableItems,
        correctionText.trim(),
        aiProvider
      );
      
      if (!correctedItems || correctedItems.length === 0) {
        throw new Error('No food items detected after correction');
      }
      
      setEditableItems(correctedItems);
      setResult(correctedItems);
      setCorrectionText('');
      console.log('✅ Correction complete:', correctedItems);
    } catch (e: any) {
      console.error('❌ Correction error:', e);
      setError(e?.message || 'Failed to correct analysis');
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleSave = () => {
    if (editableItems.length === 0) return;
    
    const totals = calculateTotals();
    const log: MealLog = {
      id: pendingAnalysis.id,
      timestamp: pendingAnalysis.timestamp,
      imageUrl: pendingAnalysis.imageData,
      items: editableItems,
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
        setEditableItems([...items]); // Create editable copy
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
      <div className="fixed bottom-28 left-4 right-4 z-50 animate-fade-in">
        <div 
          className="flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl relative"
          style={{
            background: status === 'analyzing' 
              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(236, 72, 153, 0.95))'
              : status === 'error'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(6, 182, 212, 0.95))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: status === 'analyzing'
              ? '0 10px 40px rgba(139, 92, 246, 0.5)'
              : status === 'error'
              ? '0 10px 40px rgba(239, 68, 68, 0.4)'
              : '0 10px 40px rgba(16, 185, 129, 0.4)',
          }}
        >
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all active:scale-95 z-10"
            title="Dismiss"
          >
            <i className="fa-solid fa-times text-white text-sm"></i>
          </button>
          
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center space-x-3 flex-1"
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Analysis failed</p>
                <p className="text-xs text-white/80 truncate">
                  {error?.includes('API') || error?.includes('key') 
                    ? '⚠️ Check API key in Settings' 
                    : error?.includes('No food') 
                    ? '📷 No food detected - try again'
                    : error?.includes('timeout') || error?.includes('Timeout')
                    ? '⏱️ Request timed out'
                    : error?.includes('network') || error?.includes('fetch')
                    ? '📶 Check your connection'
                    : 'Tap to see details'}
                </p>
              </div>
              <div className="text-white/70">
                <i className="fa-solid fa-chevron-up"></i>
              </div>
            </>
          )}
          </button>
        </div>
      </div>
    );
  }

  // Expanded result card
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #1A1633 0%, #0D0B1C 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}
        >
          <div className="flex items-center space-x-2">
            {status === 'analyzing' && (
              <button 
                onClick={() => setIsExpanded(false)}
                className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
                title="Minimize"
              >
                <i className="fa-solid fa-minus text-base"></i>
              </button>
            )}
            <button 
              onClick={() => onDismiss()}
              className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
              title="Close"
            >
              <i className="fa-solid fa-times text-lg"></i>
            </button>
          </div>
          <h3 className="font-bold text-white flex-1 text-center">Review Meal</h3>
          <button 
            onClick={handleSave}
            disabled={status !== 'complete'}
            className="font-bold transition-colors active:scale-95"
            style={{
              background: status === 'complete' ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'none',
              WebkitBackgroundClip: status === 'complete' ? 'text' : 'none',
              WebkitTextFillColor: status === 'complete' ? 'transparent' : '#4B5563',
            }}
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
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))'
                  : status === 'error'
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9))'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(6, 182, 212, 0.9))',
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
            style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
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
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
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
              <p className="text-white font-medium mb-2">Analysis failed</p>
              
              {/* Contextual error message */}
              <div className="rounded-xl p-3 mb-4 mx-4 text-left" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error?.includes('API') || error?.includes('key') || error?.includes('KEY') ? (
                  <>
                    <p className="text-red-300 text-sm font-medium mb-1">🔑 API Key Issue</p>
                    <p className="text-gray-400 text-xs">Go to Settings and add your OpenAI or Gemini API key.</p>
                  </>
                ) : error?.includes('No food') ? (
                  <>
                    <p className="text-amber-300 text-sm font-medium mb-1">📷 No Food Detected</p>
                    <p className="text-gray-400 text-xs">Make sure food is clearly visible in the photo. Try taking a closer shot.</p>
                  </>
                ) : error?.includes('timeout') || error?.includes('Timeout') ? (
                  <>
                    <p className="text-amber-300 text-sm font-medium mb-1">⏱️ Request Timed Out</p>
                    <p className="text-gray-400 text-xs">The AI is taking too long. Try again or use a smaller image.</p>
                  </>
                ) : error?.includes('network') || error?.includes('fetch') || error?.includes('Failed to fetch') ? (
                  <>
                    <p className="text-amber-300 text-sm font-medium mb-1">📶 Connection Issue</p>
                    <p className="text-gray-400 text-xs">Check your internet connection and try again.</p>
                  </>
                ) : (
                  <>
                    <p className="text-red-300 text-sm font-medium mb-1">Something went wrong</p>
                    <p className="text-gray-400 text-xs break-words">{error || 'Unknown error occurred'}</p>
                  </>
                )}
              </div>
              
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                }}
              >
                <i className="fa-solid fa-refresh mr-2"></i>
                Try Again
              </button>
            </div>
          )}

          {status === 'complete' && editableItems.length > 0 && (
            <div className="space-y-3">
              {editableItems.map((item, index) => (
                <div 
                  key={index} 
                  className="rounded-xl p-4 transition-all"
                  style={{ 
                    background: editingItemIndex === index ? 'rgba(139, 92, 246, 0.15)' : 'rgba(26, 22, 51, 0.6)', 
                    border: editingItemIndex === index ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(139, 92, 246, 0.15)' 
                  }}
                >
                  {editingItemIndex === index ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleSearchFood(e.target.value, index)}
                            onFocus={() => item.name.length >= 2 && setShowSearchResults(true)}
                            className="w-full px-3 py-2 rounded-lg text-white font-bold bg-transparent border border-white/20 focus:border-purple-500 focus:outline-none"
                            placeholder="Search food..."
                            autoFocus={item.name === ''}
                          />
                          {isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                          
                          {/* Search Results Dropdown */}
                          {showSearchResults && searchResults.length > 0 && editingItemIndex === index && (
                            <div 
                              className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto"
                              style={{ 
                                background: 'rgba(26, 22, 51, 0.98)', 
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                              }}
                            >
                              {searchResults.map((food, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSelectFood(food, index)}
                                  className="w-full px-3 py-2 text-left hover:bg-purple-500/20 transition-colors border-b border-white/5 last:border-0"
                                >
                                  <p className="text-sm text-white font-medium truncate">{food.name}</p>
                                  <p className="text-xs text-white/50">
                                    {food.macros.calories} cal · {food.servingSize}
                                  </p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditingItemIndex(null);
                            setShowSearchResults(false);
                          }}
                          className="ml-2 px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-all active:scale-95"
                        >
                          <i className="fa-solid fa-check"></i>
                        </button>
                        <button
                          onClick={() => deleteItem(index)}
                          className="ml-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                      
                      {/* Quantity - the ONLY editable field */}
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Quantity</label>
                        <div className="flex space-x-2">
                          <NumericInput
                            value={parseServingSize(item.servingSize).quantity}
                            onChange={(qty) => {
                              const unit = parseServingSize(item.servingSize).unit;
                              updateServingSize(index, qty, unit);
                            }}
                            allowDecimals={true}
                            className="w-24 px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/20 focus:border-purple-500 focus:outline-none"
                            placeholder="1"
                          />
                          <select
                            value={parseServingSize(item.servingSize).unit}
                            onChange={(e) => {
                              const qty = parseServingSize(item.servingSize).quantity;
                              updateServingSize(index, qty, e.target.value);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/20 focus:border-purple-500 focus:outline-none"
                          >
                            <option value="g">grams</option>
                            <option value="kg">kilograms</option>
                            <option value="oz">ounces</option>
                            <option value="lb">pounds</option>
                            <option value="cup">cup</option>
                            <option value="cups">cups</option>
                            <option value="tbsp">tablespoon</option>
                            <option value="tsp">teaspoon</option>
                            <option value="ml">milliliters</option>
                            <option value="l">liters</option>
                            <option value="piece">piece</option>
                            <option value="pieces">pieces</option>
                            <option value="slice">slice</option>
                            <option value="slices">slices</option>
                            <option value="medium">medium</option>
                            <option value="large">large</option>
                            <option value="small">small</option>
                            <option value="serving">serving</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Macros - READ ONLY display */}
                      <div className="grid grid-cols-4 gap-2 pt-2 mt-2 border-t border-white/10">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase">Cals</p>
                          <p className="text-sm text-white font-bold">{Math.round(item.macros.calories)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-green-500 uppercase">Prot</p>
                          <p className="text-sm text-green-400 font-bold">{Math.round(item.macros.protein)}g</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-blue-500 uppercase">Carbs</p>
                          <p className="text-sm text-blue-400 font-bold">{Math.round(item.macros.carbs)}g</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-orange-500 uppercase">Fat</p>
                          <p className="text-sm text-orange-400 font-bold">{Math.round(item.macros.fat)}g</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.servingSize}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{Math.round(item.macros.calories)} kcal</span>
                          <button
                            onClick={() => setEditingItemIndex(index)}
                            className="px-2 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                          >
                            <i className="fa-solid fa-pencil text-xs"></i>
                          </button>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-lg font-bold"
                          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
                        >
                          P {Math.round(item.macros.protein)}g
                        </span>
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-lg font-bold"
                          style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#A855F7' }}
                        >
                          C {Math.round(item.macros.carbs)}g
                        </span>
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-lg font-bold"
                          style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#FB923C' }}
                        >
                          F {Math.round(item.macros.fat)}g
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              {/* Add Item Button */}
              <button
                onClick={addNewItem}
                className="w-full py-3 rounded-xl font-bold text-white/40 hover:text-white transition-all active:scale-95 border-2 border-dashed hover:border-purple-500/50"
                style={{ background: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
              >
                <i className="fa-solid fa-plus mr-2"></i>
                Add Food Item
              </button>
              
              {/* AI Correction Section */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 font-bold uppercase block mb-2 px-1">
                  <i className="fa-solid fa-wand-magic-sparkles mr-1 text-purple-400"></i>
                  Ask AI to Correct
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    placeholder="e.g., 'this is actually rice, not pasta' or 'add butter to the toast'"
                    className="flex-1 px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all"
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCorrect();
                      }
                    }}
                  />
                  <button
                    onClick={handleCorrect}
                    disabled={!correctionText.trim() || isCorrecting}
                    className="px-4 py-3 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: isCorrecting 
                        ? 'rgba(139, 92, 246, 0.5)' 
                        : 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                    }}
                  >
                    {isCorrecting ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                    )}
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-400 mt-2 px-1">{error}</p>
                )}
              </div>
              
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
              borderTop: '1px solid rgba(139, 92, 246, 0.15)',
              background: 'rgba(26, 22, 51, 0.6)',
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-2xl font-black text-white">{Math.round(totals.calories)} <span className="text-sm font-medium text-gray-500">kcal</span></p>
              </div>
              <div className="flex space-x-4">
                <div className="text-center">
                  <p className="text-xs text-white/40">Protein</p>
                  <p className="font-bold" style={{ color: '#10B981' }}>{Math.round(totals.protein)}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/40">Carbs</p>
                  <p className="font-bold" style={{ color: '#A855F7' }}>{Math.round(totals.carbs)}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/40">Fat</p>
                  <p className="font-bold" style={{ color: '#FB923C' }}>{Math.round(totals.fat)}g</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              className="w-full mt-4 py-3 text-white rounded-xl font-bold transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
              }}
            >
              ✓ Save to Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzingOverlay;

