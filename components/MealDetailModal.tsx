import React, { useState, useEffect, useRef } from 'react';
import { MealLog, FoodItem, Macros, AIProvider, Micronutrients, RECOMMENDED_DAILY_VALUES } from '../types.ts';
import * as aiService from '../services/aiService.ts';
import NumericInput from './NumericInput.tsx';

interface MealDetailModalProps {
  meal: MealLog | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUpdate?: (updatedMeal: MealLog) => void;
  aiProvider?: AIProvider;
}

const MealDetailModal: React.FC<MealDetailModalProps> = ({ meal, onClose, onDelete, onUpdate, aiProvider = 'openai' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMicros, setShowMicros] = useState(false);
  const [editableItems, setEditableItems] = useState<FoodItem[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [mealNote, setMealNote] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Food search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Swipe to close state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (meal) {
      setIsVisible(true);
      setEditableItems([...meal.items]);
      setMealNote(meal.note || '');
      setIsEditing(false);
      setEditingItemIndex(null);
      setDragY(0);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [meal]);
  
  // Swipe to close handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow swipe from the handle area or when scrolled to top
    const target = e.target as HTMLElement;
    const isHandle = target.closest('[data-handle]');
    const scrollContainer = modalRef.current?.querySelector('[data-scroll-content]');
    const isScrolledToTop = !scrollContainer || scrollContainer.scrollTop === 0;
    
    if (isHandle || isScrolledToTop) {
      dragStartY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY.current;
    
    // Only allow dragging down
    if (diff > 0) {
      setDragY(diff);
    }
  };
  
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If dragged more than 100px, close the modal
    if (dragY > 100) {
      handleClose();
    } else {
      // Snap back
      setDragY(0);
    }
  };

  // Parse serving size into quantity and unit
  const parseServingSize = (servingSize: string): { quantity: number; unit: string } => {
    const match = servingSize.match(/^([\d.]+)\s*(.*)$/);
    if (match) {
      return {
        quantity: parseFloat(match[1]) || 1,
        unit: match[2].trim() || 'g'
      };
    }
    const numMatch = servingSize.match(/([\d.]+)/);
    if (numMatch) {
      return {
        quantity: parseFloat(numMatch[1]) || 1,
        unit: servingSize.replace(numMatch[1], '').trim() || 'g'
      };
    }
    return { quantity: 1, unit: 'g' };
  };

  const formatServingSize = (quantity: number, unit: string): string => {
    if (!unit) unit = 'g';
    return `${quantity}${unit.startsWith('cup') || unit.startsWith('piece') || unit.startsWith('slice') ? ' ' : ''}${unit}`;
  };

  const calculateTotals = (): Macros => {
    if (editableItems.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return editableItems.reduce((acc, item) => ({
      calories: acc.calories + item.macros.calories,
      protein: acc.protein + item.macros.protein,
      carbs: acc.carbs + item.macros.carbs,
      fat: acc.fat + item.macros.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Calculate total micronutrients for the meal
  const calculateTotalMicros = (): Micronutrients => {
    const items = isEditing ? editableItems : (meal?.items || []);
    const totals: Micronutrients = {};
    
    items.forEach(item => {
      if (item.micros) {
        Object.keys(item.micros).forEach(key => {
          const k = key as keyof Micronutrients;
          const value = item.micros?.[k];
          if (value !== undefined) {
            totals[k] = (totals[k] || 0) + value;
          }
        });
      }
    });
    
    return totals;
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
    
    if (macro === 'calories' && oldCalories > 0) {
      const ratio = newMacros.calories / oldCalories;
      newMacros.protein = newMacros.protein * ratio;
      newMacros.carbs = newMacros.carbs * ratio;
      newMacros.fat = newMacros.fat * ratio;
    }
    
    newItems[index] = { ...item, macros: newMacros };
    setEditableItems(newItems);
  };

  const updateServingSize = (index: number, quantity: number, unit: string) => {
    const item = editableItems[index];
    const oldServing = parseServingSize(item.servingSize);
    const newServingSize = formatServingSize(quantity, unit);
    
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
      updateItem(index, { servingSize: newServingSize });
    }
  };

  const deleteItem = (index: number) => {
    const newItems = editableItems.filter((_, i) => i !== index);
    setEditableItems(newItems);
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
    }
  };

  const addNewItem = () => {
    const newItem: FoodItem = {
      name: '',
      servingSize: '1 serving',
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    };
    setEditableItems([...editableItems, newItem]);
    setEditingItemIndex(editableItems.length);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };
  
  // Search food database
  const handleSearchFood = async (query: string, itemIndex: number) => {
    setSearchQuery(query);
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
    setSearchQuery('');
  };

  const handleCorrect = async () => {
    if (!correctionText.trim() || !meal?.imageUrl) return;
    
    setIsCorrecting(true);
    setError(null);
    
    try {
      const base64 = meal.imageUrl.split(',')[1];
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
    if (!meal || editableItems.length === 0 || !onUpdate) return;
    
    const totals = calculateTotals();
    const updatedMeal: MealLog = {
      ...meal,
      items: editableItems,
      totalMacros: totals,
      note: mealNote.trim() || undefined,
    };
    
    onUpdate(updatedMeal);
    setIsEditing(false);
  };

  if (!meal) return null;

  const getMealEmoji = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      default: return '🍪';
    }
  };

  const getMealLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return 'Breakfast';
      case 'lunch': return 'Lunch';
      case 'dinner': return 'Dinner';
      default: return 'Snack';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(meal.id);
      handleClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-end justify-center transition-all duration-300 ${
        isVisible ? 'bg-black/70 backdrop-blur-md' : 'bg-transparent'
      }`}
      onClick={handleClose}
      style={{
        opacity: isVisible ? Math.max(0, 1 - dragY / 300) : 0,
      }}
    >
      <div 
        ref={modalRef}
        className={`w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col ${
          isDragging ? '' : 'transition-all duration-300'
        } ${
          isVisible && dragY === 0 ? 'translate-y-0 opacity-100' : !isVisible ? 'translate-y-full opacity-0' : ''
        }`}
        style={{
          background: 'linear-gradient(180deg, #1a1a1f 0%, #0a0a0f 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar - drag indicator */}
        <div 
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          data-handle="true"
        >
          <div 
            className={`w-10 h-1 rounded-full transition-all ${isDragging ? 'w-14 bg-white/40' : ''}`}
            style={{ background: isDragging ? undefined : 'rgba(255,255,255,0.2)' }}
          />
        </div>

        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        >
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors active:scale-95 p-2 -ml-2"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
          <div className="text-center">
            <h3 className="font-bold text-white">{getMealLabel(meal.type)}</h3>
            <p className="text-xs text-gray-500">{formatDate(meal.timestamp)} • {formatTime(meal.timestamp)}</p>
          </div>
          <button 
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
            className="text-purple-400 hover:text-purple-300 transition-colors active:scale-95 px-2"
          >
            {isEditing ? (
              <i className="fa-solid fa-check text-lg"></i>
            ) : (
              <i className="fa-solid fa-pencil text-lg"></i>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5" data-scroll-content="true">
          {/* Image */}
          {meal.imageUrl && (
            <div className="relative mb-5">
              <div 
                className="w-full aspect-video rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <img 
                  src={meal.imageUrl} 
                  alt="Meal" 
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Meal type badge */}
              <div 
                className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-sm font-bold flex items-center space-x-1.5"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <span>{getMealEmoji(meal.type)}</span>
                <span className="text-white">{getMealLabel(meal.type)}</span>
              </div>
            </div>
          )}

          {/* Total calories */}
          <div 
            className="rounded-2xl p-4 mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1))',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Calories</p>
                <p className="text-3xl font-black text-white mt-1">
                  {Math.round(isEditing ? calculateTotals().calories : meal.totalMacros.calories)}
                  <span className="text-lg font-medium text-gray-400 ml-1">kcal</span>
                </p>
              </div>
              <div className="flex space-x-4">
                <div className="text-center">
                  <p className="text-green-400 text-lg font-bold">{Math.round(isEditing ? calculateTotals().protein : meal.totalMacros.protein)}g</p>
                  <p className="text-xs text-gray-500 uppercase">Protein</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-400 text-lg font-bold">{Math.round(isEditing ? calculateTotals().carbs : meal.totalMacros.carbs)}g</p>
                  <p className="text-xs text-gray-500 uppercase">Carbs</p>
                </div>
                <div className="text-center">
                  <p className="text-orange-400 text-lg font-bold">{Math.round(isEditing ? calculateTotals().fat : meal.totalMacros.fat)}g</p>
                  <p className="text-xs text-gray-500 uppercase">Fat</p>
                </div>
              </div>
            </div>
          </div>

          {/* Micronutrients Section */}
          {(() => {
            const micros = calculateTotalMicros();
            const hasMicros = Object.keys(micros).length > 0;
            
            if (!hasMicros) return null;
            
            const microGroups = [
              {
                title: 'Fiber & Sugar',
                icon: '🌾',
                items: [
                  { key: 'fiber', label: 'Fiber', unit: 'g', color: '#10B981' },
                  { key: 'sugar', label: 'Sugar', unit: 'g', color: '#F472B6', isLimit: true },
                ],
              },
              {
                title: 'Vitamins',
                icon: '💊',
                items: [
                  { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', color: '#F59E0B' },
                  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', color: '#FBBF24' },
                  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', color: '#FCD34D' },
                  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg', color: '#A3E635' },
                  { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', color: '#4ADE80' },
                  { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg', color: '#34D399' },
                  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg', color: '#2DD4BF' },
                  { key: 'folate', label: 'Folate', unit: 'mcg', color: '#22D3EE' },
                ],
              },
              {
                title: 'Minerals',
                icon: '⚗️',
                items: [
                  { key: 'calcium', label: 'Calcium', unit: 'mg', color: '#E2E8F0' },
                  { key: 'iron', label: 'Iron', unit: 'mg', color: '#EF4444' },
                  { key: 'magnesium', label: 'Magnesium', unit: 'mg', color: '#8B5CF6' },
                  { key: 'potassium', label: 'Potassium', unit: 'mg', color: '#F97316' },
                  { key: 'sodium', label: 'Sodium', unit: 'mg', color: '#94A3B8', isLimit: true },
                  { key: 'zinc', label: 'Zinc', unit: 'mg', color: '#64748B' },
                ],
              },
              {
                title: 'Fats Breakdown',
                icon: '🫒',
                items: [
                  { key: 'saturatedFat', label: 'Saturated', unit: 'g', color: '#F87171', isLimit: true },
                  { key: 'transFat', label: 'Trans Fat', unit: 'g', color: '#EF4444', isLimit: true },
                  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', color: '#FB923C', isLimit: true },
                  { key: 'omega3', label: 'Omega-3', unit: 'g', color: '#22D3EE' },
                  { key: 'omega6', label: 'Omega-6', unit: 'g', color: '#38BDF8' },
                ],
              },
            ];
            
            return (
              <div className="mb-4">
                <button
                  onClick={() => setShowMicros(!showMicros)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.99]"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                >
                  <span className="flex items-center text-sm font-bold text-white/80">
                    <span className="mr-2">🔬</span>
                    Micronutrients
                    <span className="ml-2 text-xs text-white/40 font-normal">
                      ({Object.keys(micros).length} nutrients)
                    </span>
                  </span>
                  <svg 
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    className={`transition-transform ${showMicros ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                
                {showMicros && (
                  <div className="mt-3 space-y-4 animate-fade-in">
                    {microGroups.map(group => {
                      const groupItems = group.items.filter(item => micros[item.key as keyof Micronutrients] !== undefined);
                      if (groupItems.length === 0) return null;
                      
                      return (
                        <div key={group.title}>
                          <p className="text-xs text-white/40 font-medium mb-2 flex items-center">
                            <span className="mr-1.5">{group.icon}</span>
                            {group.title}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {groupItems.map(item => {
                              const value = micros[item.key as keyof Micronutrients] || 0;
                              const dv = RECOMMENDED_DAILY_VALUES[item.key as keyof Micronutrients];
                              const percent = dv ? Math.round((value / dv) * 100) : 0;
                              const isOver = item.isLimit && percent > 100;
                              
                              return (
                                <div
                                  key={item.key}
                                  className="p-3 rounded-lg"
                                  style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs text-white/60">{item.label}</span>
                                    <span 
                                      className="text-xs font-bold"
                                      style={{ color: isOver ? '#EF4444' : item.color }}
                                    >
                                      {percent}%
                                    </span>
                                  </div>
                                  <div className="flex items-baseline space-x-1">
                                    <span className="text-sm font-bold text-white">
                                      {value < 1 ? value.toFixed(1) : Math.round(value)}
                                    </span>
                                    <span className="text-xs text-white/40">{item.unit}</span>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all"
                                      style={{ 
                                        width: `${Math.min(percent, 100)}%`,
                                        background: isOver ? '#EF4444' : item.color,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Food items */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Food Items ({isEditing ? editableItems.length : meal.items.length})
              </h4>
              {isEditing && (
                <button
                  onClick={addNewItem}
                  className="text-xs text-purple-400 hover:text-purple-300 font-bold transition-colors active:scale-95"
                >
                  <i className="fa-solid fa-plus mr-1"></i>Add Item
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(isEditing ? editableItems : meal.items).map((item, index) => (
                <div 
                  key={index}
                  className="rounded-xl p-4 transition-all"
                  style={{ 
                    background: editingItemIndex === index ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)', 
                    border: editingItemIndex === index ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.08)' 
                  }}
                >
                  {isEditing && editingItemIndex === index ? (
                    // Edit mode - only serving size editable, search for new items
                    <div className="space-y-3">
                      {/* Food name - searchable for new items (name is empty) */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 relative">
                          {item.name === '' ? (
                            // New item - show search input
                            <>
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchFood(e.target.value, index)}
                                className="w-full px-3 py-2 rounded-lg text-white font-bold bg-transparent border border-white/20 focus:border-purple-500 focus:outline-none"
                                placeholder="Search food..."
                                autoFocus
                              />
                              {isSearching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                              
                              {/* Search Results Dropdown */}
                              {showSearchResults && searchResults.length > 0 && (
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
                            </>
                          ) : (
                            // Existing item - show name as text (not editable)
                            <p className="text-white font-bold">{item.name}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditingItemIndex(null);
                            setShowSearchResults(false);
                            setSearchQuery('');
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
                      
                      {/* Only show quantity controls if item has a name */}
                      {item.name !== '' && (
                        <>
                          {/* Quantity - the only editable field */}
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
                          
                          {/* Macros display - READ ONLY */}
                          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 uppercase">Cals</p>
                              <p className="text-sm text-white font-medium">{Math.round(item.macros.calories)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-green-500 uppercase">Prot</p>
                              <p className="text-sm text-green-400 font-medium">{Math.round(item.macros.protein)}g</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-blue-500 uppercase">Carbs</p>
                              <p className="text-sm text-blue-400 font-medium">{Math.round(item.macros.carbs)}g</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-orange-500 uppercase">Fat</p>
                              <p className="text-sm text-orange-400 font-medium">{Math.round(item.macros.fat)}g</p>
                            </div>
                          </div>
                        </>
                      )}
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
                          <span className="font-bold text-white ml-4">{Math.round(item.macros.calories)} kcal</span>
                          {isEditing && (
                            <button
                              onClick={() => setEditingItemIndex(index)}
                              className="px-2 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            >
                              <i className="fa-solid fa-pencil text-xs"></i>
                            </button>
                          )}
                        </div>
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
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Correction Section - only in edit mode */}
          {isEditing && meal.imageUrl && (
            <div className="mb-4">
              <label className="text-xs text-gray-400 font-bold uppercase block mb-2 px-1">
                <i className="fa-solid fa-wand-magic-sparkles mr-1 text-purple-400"></i>
                Ask AI to Correct
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder="e.g., 'add butter' or 'this is rice not pasta'"
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
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
          )}

          {/* Notes */}
          <div className="mb-4">
            <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 px-1">
              <i className="fa-solid fa-note-sticky mr-1 text-purple-400"></i>
              Notes
            </h4>
            {isEditing ? (
              <textarea
                value={mealNote}
                onChange={(e) => setMealNote(e.target.value)}
                placeholder="Add any notes about this meal..."
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
            ) : meal.note ? (
              <div 
                className="rounded-xl p-4"
                style={{ 
                  background: 'rgba(139, 92, 246, 0.1)', 
                  border: '1px solid rgba(139, 92, 246, 0.2)' 
                }}
              >
                <p className="text-gray-300 text-sm italic">{meal.note}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No notes</p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div 
          className="p-5 flex space-x-3"
          style={{ 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          {onDelete && (
            <>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-3 rounded-xl font-bold text-red-400 transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <i className="fa-solid fa-trash mr-2"></i>
                  Delete
                </button>
              ) : (
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <i className="fa-solid fa-check mr-2"></i>
                  Confirm Delete
                </button>
              )}
            </>
          )}
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealDetailModal;

