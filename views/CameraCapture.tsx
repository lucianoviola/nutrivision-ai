import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FoodItem, MealLog, Macros, AIProvider } from '../types.ts';
import * as aiService from '../services/aiService.ts';
import * as savedMealsService from '../services/savedMealsService.ts';
import * as favoritesService from '../services/favoritesService.ts';
import { hapticTap, hapticSuccess } from '../utils/haptics.ts';

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

interface CameraCaptureProps {
  onSave: (log: MealLog) => void;
  onImageCapture: (imageData: string) => void; // For background processing
  onCancel: () => void;
  aiProvider: AIProvider;
  savedMealToLoad?: savedMealsService.SavedMeal | null; // Optional saved meal to load
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onSave, onImageCapture, onCancel, aiProvider, savedMealToLoad }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodItem[] | null>(null);
  const [searchResults, setSearchResults] = useState<FoodItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'search' | 'barcode'>('camera');
  const [searchQuery, setSearchQuery] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const [showSaveMealDialog, setShowSaveMealDialog] = useState(false);
  const [savedMealName, setSavedMealName] = useState('');
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [mealNote, setMealNote] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('nutrivision_recent_searches');
    return saved ? JSON.parse(saved) : [];
  });
  const [favorites, setFavorites] = useState<favoritesService.FavoriteFood[]>(() => 
    favoritesService.getFavorites()
  );
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set default meal type based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setMealType('breakfast');
    else if (hour >= 11 && hour < 16) setMealType('lunch');
    else if (hour >= 16 && hour < 22) setMealType('dinner');
    else setMealType('snack');
  }, []);

  // Load saved meal if provided
  useEffect(() => {
    if (savedMealToLoad && !result) {
      setResult(savedMealToLoad.items.map(item => ({ ...item }))); // Deep copy
      savedMealsService.markMealUsed(savedMealToLoad.id);
    }
  }, [savedMealToLoad]);

  const startCamera = async () => {
    try {
      stopCamera(); // Ensure clean slate
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (mode === 'camera' && !image && !result) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      // Always cleanup camera on unmount or when dependencies change
      stopCamera();
    };
  }, [mode, image, result]);
  
  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopScanner();
      // Clear any pending timeouts
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        // Stop camera immediately after capturing
        stopCamera();
        // Send for background processing
        console.log('📸 Photo captured, sending for background analysis...');
        setImage(dataUrl);
        onImageCapture(dataUrl);
      }
    }
  }, [onImageCapture]);

  // --- BARCODE ---
  useEffect(() => {
    if (mode === 'barcode' && !result) {
        const timeoutId = setTimeout(() => {
            startScanner();
        }, 100);
        return () => {
            clearTimeout(timeoutId);
            stopScanner();
        };
    } else {
        stopScanner();
    }
  }, [mode, result]);

  const startScanner = () => {
      if (scannerRef.current) return;
      if (!window.Html5Qrcode) {
          console.warn("Html5Qrcode library not loaded");
          return;
      }

      try {
          const html5QrCode = new window.Html5Qrcode("barcode-reader");
          scannerRef.current = html5QrCode;
          
          const config = { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0 
          };
          
          html5QrCode.start(
              { facingMode: "environment" }, 
              config, 
              (decodedText: string) => {
                  handleBarcodeDetected(decodedText);
              },
              (errorMessage: any) => {
                  // ignore errors
              }
          ).catch((err: any) => {
              console.error("Error starting scanner", err);
          });
      } catch (e) {
          console.error("Scanner init error", e);
      }
  };

  const stopScanner = () => {
      if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
              scannerRef.current.clear();
              scannerRef.current = null;
          }).catch((err: any) => {
              console.warn("Failed to stop scanner", err);
              scannerRef.current = null;
          });
      }
  };

  const handleBarcodeDetected = async (barcode: string) => {
      stopScanner();
      setAnalyzing(true);
      try {
          const item = await aiService.getNutritionalInfoFromBarcode(barcode, aiProvider);
          if (item) {
              setResult([item]);
          } else {
              alert("Product not found. Please enter manually.");
              setResult([{
                  name: `Product ${barcode}`,
                  servingSize: "1 serving",
                  macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
              }]);
          }
      } catch (e) {
          console.error(e);
          setResult(null); // Return to scan/camera
      } finally {
          setAnalyzing(false);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('📤 Image upload started:', {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        fileType: file.type
      });
      
      // Stop camera immediately when file is selected
      stopCamera();
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
            const dataUrl = ev.target.result as string;
            console.log('✅ Image loaded, sending for background analysis...');
            // Set image state and send for background processing
            setImage(dataUrl);
            onImageCapture(dataUrl);
        }
      };
      reader.onerror = (error) => {
        console.error('❌ File read error:', error);
      };
      reader.readAsDataURL(file);
      
      // Reset file input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleAnalysis = async (dataUrl: string) => {
    console.log('🔍 Starting image analysis...', { provider: aiProvider });
    setAnalyzing(true);
    const startTime = Date.now();
    
    try {
        const base64 = dataUrl.split(',')[1];
        const base64Size = (base64.length * 3) / 4; // Approximate size in bytes
        console.log('📊 Image data prepared:', {
          base64Size: `${(base64Size / 1024).toFixed(2)} KB`,
          provider: aiProvider
        });
        
        console.log('🚀 Calling AI service...');
        const items = await aiService.analyzeFoodImage(base64, aiProvider);
        const duration = Date.now() - startTime;
        
        console.log('✅ Analysis complete:', {
          duration: `${(duration / 1000).toFixed(2)}s`,
          itemsFound: items?.length || 0,
          items: items
        });
        
        if (!items || items.length === 0) {
          throw new Error("No food items detected in image");
        }
        setResult(items);
    } catch (e: any) {
        const duration = Date.now() - startTime;
        console.error('❌ Analysis failed after', `${(duration / 1000).toFixed(2)}s:`, e);
        console.error("Image analysis error:", e);
        const errorMessage = e?.message || String(e) || "Unknown error";
        let userMessage = "Failed to analyze image. Please try again.";
        let shouldShowPlaceholder = true;
        
        // Provide more specific error messages
        if (errorMessage.includes("API_KEY_MISSING") || errorMessage.includes("OPENAI_API_KEY_MISSING")) {
          userMessage = `Please set your ${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key in Settings.`;
        } else if (errorMessage.includes("overloaded") || errorMessage.includes("503")) {
          userMessage = "The AI model is currently overloaded. Please try again in a few moments.";
        } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("Invalid API key")) {
          userMessage = "Invalid API key. Please check your API key in Settings.";
        } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
          userMessage = "Rate limit exceeded. Please try again in a moment.";
        } else if (errorMessage.includes("No food items detected")) {
          userMessage = "No food items detected in the image. Please try a different photo.";
        } else if (errorMessage.includes("503")) {
          userMessage = "Service temporarily unavailable. Please try again in a few moments.";
        }
        
        alert(userMessage);
        
        // Only show placeholder if it's not a critical error that requires user action
        if (shouldShowPlaceholder && !errorMessage.includes("API_KEY_MISSING") && !errorMessage.includes("Invalid API key")) {
        setResult([{
             name: "Unknown Food",
             servingSize: "1 serving",
             macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
        }]);
        } else {
          // For critical errors, reset to allow retry
          setResult(null);
          setImage(null);
        }
    } finally {
        setAnalyzing(false);
    }
  };

  // Debounced search - triggers as user types
  const debouncedSearch = useCallback((query: string) => {
    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (!query.trim() || query.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    
    // Debounce: wait 400ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      console.log(`🔍 Searching for: "${query}" using ${aiProvider}...`);
      const startTime = Date.now();
      
      try {
        abortControllerRef.current = new AbortController();
        const items = await aiService.searchFoodDatabase(query, aiProvider);
        const duration = Date.now() - startTime;
        console.log(`✅ Search completed in ${duration}ms, found ${items.length} items`);
        setSearchResults(items);
        setSearchError(null);
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.log('Search aborted (new search started)');
          return;
        }
        console.error('❌ Search error:', e);
        const errorMessage = e?.message || String(e);
        if (errorMessage.includes('API_KEY_MISSING') || errorMessage.includes('OPENAI_API_KEY_MISSING')) {
          setSearchError(`Please set your ${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key in Settings`);
        } else if (errorMessage.includes('timed out')) {
          setSearchError(errorMessage);
        } else if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
          setSearchError('AI is busy, please try again');
        } else if (errorMessage.includes('Failed to fetch')) {
          setSearchError('Network error. Check your connection.');
        } else {
          setSearchError('Search failed. Try again.');
        }
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, [aiProvider]);

  // Effect to trigger search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debouncedSearch]);

  // Save to recent searches
  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('nutrivision_recent_searches', JSON.stringify(updated));
  };

  // Toggle favorite
  const handleToggleFavorite = (food: FoodItem) => {
    hapticTap();
    const isFav = favoritesService.toggleFavorite(food);
    setFavorites(favoritesService.getFavorites());
    if (isFav) {
      hapticSuccess();
    }
  };

  // Add favorite to result
  const handleAddFavoriteToResult = (fav: favoritesService.FavoriteFood) => {
    hapticTap();
    favoritesService.incrementUseCount(fav.id);
    setResult(prev => prev ? [...prev, { ...fav }] : [{ ...fav }]);
    setFavorites(favoritesService.getFavorites());
  };

  // Manual search (when pressing Enter or button)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    // Save to recent searches
    saveRecentSearch(searchQuery);
    
    // Cancel debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setIsSearching(true);
    setSearchError(null);
    console.log(`🔍 Searching food database for: "${searchQuery}"`);
    const startTime = Date.now();
    
    try {
        const items = await aiService.searchFoodDatabase(searchQuery, aiProvider);
        const duration = Date.now() - startTime;
        console.log(`✅ Search completed in ${duration}ms, found ${items.length} items`);
        setSearchResults(items);
    } catch (e: any) {
        console.error('❌ Search error:', e);
        const errorMessage = e?.message || String(e);
        if (errorMessage.includes('API_KEY_MISSING') || errorMessage.includes('OPENAI_API_KEY_MISSING')) {
          // This should rarely happen now since we use free databases
          setSearchError('Database search failed. Please try again.');
        } else if (errorMessage.includes('timed out')) {
          setSearchError('Search timed out. Please try again.');
        } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
          setSearchError('Network error. Check your connection.');
        } else {
          setSearchError('Search failed. Please try again.');
        }
    } finally {
        setIsSearching(false);
    }
  };

  const selectSearchResult = (item: FoodItem) => {
      setResult([item]);
  };

  const handleUpdateItem = (index: number, field: keyof FoodItem | keyof Macros, value: string | number) => {
      if (!result) return;
      const newResult = [...result];
      const item = { ...newResult[index] };
      
      if (field === 'name' || field === 'servingSize') {
          (item as any)[field] = value;
      } else {
          item.macros = { ...item.macros, [field]: Number(value) };
      }
      newResult[index] = item;
      setResult(newResult);
  };

  const handleAddItem = () => {
    const newItem: FoodItem = {
        name: "New Item",
        servingSize: "1 serving",
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    };
    setResult(prev => prev ? [...prev, newItem] : [newItem]);
  };

  const handleRemoveItem = (index: number) => {
      if (!result) return;
      const newResult = result.filter((_, i) => i !== index);
      if (newResult.length === 0) {
          setResult(null); // Reset if all items removed
          setImage(null);
      } else {
          setResult(newResult);
      }
  };

  const calculateTotal = (): Macros => {
      if (!result) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
      return result.reduce((acc, item) => ({
          calories: acc.calories + item.macros.calories,
          protein: acc.protein + item.macros.protein,
          carbs: acc.carbs + item.macros.carbs,
          fat: acc.fat + item.macros.fat
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const handleSaveLog = () => {
      if (!result || result.length === 0) return;
      
      // Stop camera before saving
      stopCamera();
      
      const newLog: MealLog = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUrl: image || undefined,
          items: result,
          totalMacros: calculateTotal(),
          type: mealType,
          note: mealNote.trim() || undefined,
      };
      
      // Reset state before saving
      setResult(null);
      setImage(null);
      setMealNote('');
      
      onSave(newLog);
  };

  const handleSaveAsMeal = () => {
      if (!result || result.length === 0) return;
      const total = calculateTotal();
      const defaultName = result.map(item => item.name).join(' + ');
      setSavedMealName(defaultName);
      setShowSaveMealDialog(true);
  };

  const confirmSaveMeal = () => {
      if (!result || result.length === 0 || !savedMealName.trim()) return;
      const total = calculateTotal();
      savedMealsService.saveMeal({
          name: savedMealName.trim(),
          items: result,
          totalMacros: total,
      });
      setShowSaveMealDialog(false);
      setSavedMealName('');
      // Show toast or feedback
      alert('Meal saved! You can reuse it anytime.');
  };

  const handleLoadSavedMeal = (savedMeal: savedMealsService.SavedMeal) => {
      setResult(savedMeal.items.map(item => ({ ...item }))); // Deep copy
      savedMealsService.markMealUsed(savedMeal.id);
      setShowSavedMeals(false);
  };

  // Render Result / Edit View
  if (result) {
      const total = calculateTotal();
      return (
        <div 
          className="fixed inset-0 z-50 flex flex-col animate-slide-up"
          style={{
            background: 'rgba(10, 10, 15, 0.98)',
            backdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
            {/* Header */}
            <div 
              className="pt-12 pb-4 px-4 flex items-center justify-between z-10"
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
              }}
            >
                <button 
                  onClick={() => { setResult(null); setImage(null); }} 
                  className="text-gray-400 font-medium px-2 hover:text-white transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <h2 className="font-bold text-lg text-white">Edit Meal</h2>
                <button 
                  onClick={handleSaveLog} 
                  className="font-bold px-2 transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Save
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-[calc(180px+env(safe-area-inset-bottom))]">
                 {/* Meal Type Selector */}
                 <div 
                   className="rounded-xl p-1.5 flex mb-4"
                   style={{
                     background: 'rgba(255,255,255,0.08)',
                     border: '1px solid rgba(255,255,255,0.1)',
                   }}
                 >
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setMealType(t)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all active:scale-95 ${
                              mealType === t 
                                ? 'text-white shadow-sm' 
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                            style={mealType === t ? {
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            } : {}}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {result.map((item, index) => (
                        <div 
                          key={index} 
                          className="rounded-xl p-4"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(20px)',
                          }}
                        >
                             <div className="flex justify-between items-start mb-4">
                                <input 
                                    type="text" 
                                    value={item.name} 
                                    onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                                    className="font-bold text-white text-lg border-b border-transparent focus:border-purple-500/50 outline-none w-full mr-2 bg-transparent placeholder-gray-500 transition-colors"
                                    placeholder="Item Name"
                                />
                                <button 
                                  onClick={() => handleRemoveItem(index)} 
                                  className="text-gray-400 hover:text-red-400 p-2 -mr-2 -mt-2 transition-colors active:scale-95"
                                >
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block text-center">Cals</label>
                                    <input 
                                      type="number" 
                                      value={Math.round(item.macros.calories)} 
                                      onChange={(e) => handleUpdateItem(index, 'calories', e.target.value)} 
                                      className="w-full rounded-lg py-2 text-center font-bold text-white text-sm outline-none transition-all active:scale-95"
                                      style={{
                                        background: 'rgba(255,255,255,0.1)',
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.background = 'rgba(99, 102, 241, 0.2)';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.3)';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.1)';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block text-center">Prot</label>
                                    <input 
                                      type="number" 
                                      value={Math.round(item.macros.protein)} 
                                      onChange={(e) => handleUpdateItem(index, 'protein', e.target.value)} 
                                      className="w-full rounded-lg py-2 text-center font-bold text-emerald-300 text-sm outline-none transition-all active:scale-95"
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.background = 'rgba(16, 185, 129, 0.25)';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.3)';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.background = 'rgba(16, 185, 129, 0.15)';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block text-center">Carbs</label>
                                    <input 
                                      type="number" 
                                      value={Math.round(item.macros.carbs)} 
                                      onChange={(e) => handleUpdateItem(index, 'carbs', e.target.value)} 
                                      className="w-full rounded-lg py-2 text-center font-bold text-cyan-300 text-sm outline-none transition-all active:scale-95"
                                      style={{
                                        background: 'rgba(34, 211, 238, 0.15)',
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.background = 'rgba(34, 211, 238, 0.25)';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(34, 211, 238, 0.3)';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.background = 'rgba(34, 211, 238, 0.15)';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block text-center">Fat</label>
                                    <input 
                                      type="number" 
                                      value={Math.round(item.macros.fat)} 
                                      onChange={(e) => handleUpdateItem(index, 'fat', e.target.value)} 
                                      className="w-full rounded-lg py-2 text-center font-bold text-orange-300 text-sm outline-none transition-all active:scale-95"
                                      style={{
                                        background: 'rgba(251, 146, 60, 0.15)',
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.background = 'rgba(251, 146, 60, 0.25)';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(251, 146, 60, 0.3)';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.background = 'rgba(251, 146, 60, 0.15)';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                </div>
                            </div>
                            <input 
                                type="text" 
                                value={item.servingSize} 
                                onChange={(e) => handleUpdateItem(index, 'servingSize', e.target.value)}
                                className="text-xs text-gray-400 bg-transparent outline-none w-full border-b border-transparent focus:border-purple-500/50 placeholder-gray-600 transition-colors"
                                placeholder="Serving Size"
                            />
                        </div>
                    ))}
                    <div className="flex space-x-2">
                      <button 
                        onClick={handleAddItem} 
                        className="flex-1 py-4 font-bold text-sm rounded-xl transition-all active:scale-95"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(139, 92, 246, 1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        }}
                      >
                        + Add Item
                    </button>
                      <button 
                        onClick={handleSaveAsMeal} 
                        className="px-4 py-4 font-bold text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center"
                        style={{
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: 'rgba(139, 92, 246, 1)',
                        }}
                        title="Save this meal for later"
                      >
                          <i className="fa-solid fa-bookmark"></i>
                    </button>
                    </div>
                    
                    {/* Notes/Journal Section */}
                    <div className="mt-4">
                      <label className="text-xs text-gray-400 font-bold uppercase block mb-2 px-1">
                        <i className="fa-solid fa-note-sticky mr-1"></i>
                        Notes
                      </label>
                      <textarea
                        value={mealNote}
                        onChange={(e) => setMealNote(e.target.value)}
                        placeholder="How did this meal make you feel? Any observations?"
                        className="w-full px-4 py-3 rounded-xl text-white bg-transparent border border-white/20 focus:border-purple-500/50 outline-none resize-none placeholder-gray-600 transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          minHeight: '80px',
                        }}
                        rows={3}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                </div>
            </div>

            {/* Save Meal Dialog */}
            {showSaveMealDialog && (
              <div 
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                style={{
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(20px)',
                }}
                onClick={() => setShowSaveMealDialog(false)}
              >
                <div 
                  className="rounded-2xl p-6 max-w-sm w-full"
                  style={{
                    background: 'rgba(10, 10, 15, 0.98)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-white mb-4">Save Meal</h3>
                  <input
                    type="text"
                    value={savedMealName}
                    onChange={(e) => setSavedMealName(e.target.value)}
                    placeholder="Meal name (e.g., Breakfast Scramble)"
                    className="w-full px-4 py-3 rounded-xl text-white bg-transparent border border-white/20 focus:border-purple-500/50 outline-none mb-4"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmSaveMeal();
                      if (e.key === 'Escape') setShowSaveMealDialog(false);
                    }}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowSaveMealDialog(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmSaveMeal}
                      disabled={!savedMealName.trim()}
                      className="flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Total Bar */}
            <div 
              className="fixed bottom-0 left-0 w-full p-4 pb-[calc(20px+env(safe-area-inset-bottom))] z-20"
              style={{
                background: 'linear-gradient(to top, rgba(10, 10, 15, 0.98), rgba(10, 10, 15, 0.9))',
                backdropFilter: 'blur(24px) saturate(180%)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
                <div className="flex justify-between items-center max-w-md mx-auto">
                    <div>
                        <span className="text-xs text-gray-400 font-bold uppercase block">Total</span>
                        <span className="text-2xl font-black text-white">
                          {Math.round(total.calories)} <span className="text-sm font-medium text-gray-400">kcal</span>
                        </span>
                    </div>
                    <div className="flex space-x-4">
                        <div className="text-center">
                            <span className="text-[10px] text-gray-400 font-bold block">Prot</span>
                            <span className="font-bold text-emerald-300 text-sm">{Math.round(total.protein)}g</span>
                        </div>
                         <div className="text-center">
                            <span className="text-[10px] text-gray-400 font-bold block">Carb</span>
                            <span className="font-bold text-cyan-300 text-sm">{Math.round(total.carbs)}g</span>
                        </div>
                         <div className="text-center">
                            <span className="text-[10px] text-gray-400 font-bold block">Fat</span>
                            <span className="font-bold text-orange-300 text-sm">{Math.round(total.fat)}g</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // Render Capture / Search View
  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-slide-up">
       {/* Frosted glass background */}
       <div 
         className="absolute inset-0"
         style={{
           background: 'rgba(10, 10, 15, 0.95)',
           backdropFilter: 'blur(24px) saturate(180%)',
         }}
       />
       
       {/* Top Bar */}
       <div className="absolute top-0 left-0 w-full p-4 pt-[calc(10px+env(safe-area-inset-top))] flex justify-between items-center z-20">
            <button 
              onClick={() => {
                stopCamera();
                stopScanner();
                onCancel();
              }} 
              className="text-white w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
                <i className="fa-solid fa-times"></i>
            </button>
            <div 
              className="flex space-x-1 rounded-full p-1"
              style={{
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
                <button 
                  onClick={() => setMode('camera')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                    mode === 'camera' 
                      ? 'text-black' 
                      : 'text-white hover:text-gray-300'
                  }`}
                  style={mode === 'camera' ? {
                    background: 'linear-gradient(135deg, #ffffff, #f3f4f6)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  } : {}}
                >
                  Camera
                </button>
                <button 
                  onClick={() => setMode('barcode')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                    mode === 'barcode' 
                      ? 'text-black' 
                      : 'text-white hover:text-gray-300'
                  }`}
                  style={mode === 'barcode' ? {
                    background: 'linear-gradient(135deg, #ffffff, #f3f4f6)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  } : {}}
                >
                  Scan
                </button>
                <button 
                  onClick={() => setMode('search')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                    mode === 'search' 
                      ? 'text-black' 
                      : 'text-white hover:text-gray-300'
                  }`}
                  style={mode === 'search' ? {
                    background: 'linear-gradient(135deg, #ffffff, #f3f4f6)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  } : {}}
                >
                  Search
                </button>
            </div>
            <div className="w-10"></div>
       </div>

       {analyzing && (
           <div 
             className="absolute inset-0 z-50 flex flex-col items-center justify-center"
             style={{
               background: 'rgba(0,0,0,0.7)',
               backdropFilter: 'blur(20px)',
             }}
           >
               <div className="relative">
                 <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mb-4"></div>
                 <div className="absolute inset-0 animate-pulse rounded-full bg-white/10"></div>
               </div>
               <p className="text-white font-medium text-body">Processing...</p>
           </div>
       )}

       <div className="flex-1 relative overflow-hidden">
           {/* Camera */}
           <div className={`absolute inset-0 ${mode === 'camera' ? 'visible' : 'invisible'} overflow-hidden`}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                
                {/* Viewfinder overlay with animated corners */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-80 h-80">
                    {/* Corner brackets */}
                    {[
                      { top: 0, left: 0, borderRight: '2px solid', borderBottom: '2px solid' },
                      { top: 0, right: 0, borderLeft: '2px solid', borderBottom: '2px solid' },
                      { bottom: 0, left: 0, borderRight: '2px solid', borderTop: '2px solid' },
                      { bottom: 0, right: 0, borderLeft: '2px solid', borderTop: '2px solid' },
                    ].map((style, i) => (
                      <div
                        key={i}
                        className="absolute w-12 h-12"
                        style={{
                          ...style,
                          borderColor: 'rgba(139, 92, 246, 0.8)',
                          filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))',
                        }}
                      />
                    ))}
                    
                    {/* Animated scan line */}
                    <div 
                      className="absolute left-0 right-0 h-0.5 animate-breathe"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        boxShadow: '0 0 12px rgba(139, 92, 246, 0.8)',
                      }}
                    />
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 w-full pb-[calc(40px+env(safe-area-inset-bottom))] pt-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center justify-center space-y-8">
                     <button 
                       onClick={capturePhoto} 
                       className="w-20 h-20 rounded-full bg-white border-[6px] border-gray-300/50 shadow-2xl active:scale-95 transition-all duration-200 relative group"
                       style={{
                         boxShadow: '0 0 30px rgba(255,255,255,0.3)',
                       }}
                     >
                       <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100"></div>
                     </button>
                     <label className="flex items-center space-x-2 text-white/90 text-body font-medium px-4 py-2 rounded-full cursor-pointer hover:scale-105 transition-all duration-300"
                       style={{
                         background: 'rgba(0,0,0,0.4)',
                         backdropFilter: 'blur(20px)',
                         border: '1px solid rgba(255,255,255,0.1)',
                       }}
                     >
                         <i className="fa-solid fa-image"></i>
                         <span>Upload Photo</span>
                         <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                     </label>
                </div>
           </div>

           {/* Barcode */}
           <div className={`absolute inset-0 flex flex-col items-center justify-center ${mode === 'barcode' ? 'visible' : 'invisible'}`}
             style={{ background: '#0D0B1C' }}
           >
               {/* Scanner container */}
               <div className="relative">
                 {/* Animated corners */}
                 <div className="absolute -inset-4 pointer-events-none z-20">
                   {[
                     { top: 0, left: 0, borderRight: 'none', borderBottom: 'none' },
                     { top: 0, right: 0, borderLeft: 'none', borderBottom: 'none' },
                     { bottom: 0, left: 0, borderRight: 'none', borderTop: 'none' },
                     { bottom: 0, right: 0, borderLeft: 'none', borderTop: 'none' },
                   ].map((style, i) => (
                     <div
                       key={i}
                       className="absolute w-8 h-8"
                       style={{
                         ...style,
                         border: '3px solid #8B5CF6',
                         borderRadius: '4px',
                         filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))',
                       }}
                     />
                   ))}
                 </div>
                 
                 {/* Scan line animation */}
                 <div 
                   className="absolute left-0 right-0 h-0.5 z-20 pointer-events-none"
                   style={{
                     background: 'linear-gradient(90deg, transparent, #EC4899, transparent)',
                     boxShadow: '0 0 12px #EC4899',
                     animation: 'scanLine 2s ease-in-out infinite',
                   }}
                 />
                 
                 <div id="barcode-reader" className="w-80 h-80 rounded-xl overflow-hidden border border-purple-500/30 shadow-2xl relative z-10"
                   style={{ boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)' }}
                 ></div>
               </div>
               
               {/* Instructions */}
               <div className="mt-8 text-center">
                 <div className="flex items-center justify-center space-x-2 mb-2">
                   <div 
                     className="w-2 h-2 rounded-full animate-pulse"
                     style={{ background: '#8B5CF6', boxShadow: '0 0 8px #8B5CF6' }}
                   />
                   <p className="text-white/80 text-sm font-medium">Scanning for barcode...</p>
                 </div>
                 <p className="text-white/40 text-xs">Position barcode within the frame</p>
               </div>
               
               <style>{`
                 @keyframes scanLine {
                   0%, 100% { top: 10%; opacity: 0; }
                   50% { top: 90%; opacity: 1; }
                 }
               `}</style>
           </div>

           {/* Search */}
           <div className={`absolute inset-0 ${mode === 'search' ? 'visible' : 'invisible'} flex flex-col pt-28 px-4 overflow-hidden`}>
                {/* Action Buttons */}
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => setShowSavedMeals(true)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center space-x-2"
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: 'rgba(139, 92, 246, 1)',
                    }}
                  >
                    <i className="fa-solid fa-bookmark"></i>
                    <span>Saved Meals</span>
                  </button>
                  <button
                    onClick={() => {
                      // Create empty meal to start custom meal
                      setResult([{
                        name: "New Item",
                        servingSize: "1 serving",
                        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
                      }]);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center space-x-2"
                    style={{
                      background: 'rgba(34, 211, 238, 0.15)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      color: 'rgba(34, 211, 238, 1)',
                    }}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>Custom Meal</span>
                  </button>
                </div>
                
                {/* Search input */}
                <div className="relative mb-4">
                    <div className="flex space-x-2">
                        <div className="flex-1 relative">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search any food..."
                                className="w-full text-white text-body px-4 py-3.5 rounded-xl outline-none transition-all duration-300 placeholder-gray-500 pr-12"
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
                                autoFocus={mode === 'search'}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                              {isSearching && (
                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                              )}
                              {!isSearching && searchQuery && (
                                <button 
                                    onClick={() => { setSearchQuery(''); setSearchResults(null); setSearchError(null); }}
                                    className="text-gray-500 hover:text-white transition-colors duration-200 active:scale-95"
                                >
                                    <i className="fa-solid fa-times"></i>
                                </button>
                              )}
                              {/* Mic button (visual only) */}
                              {!isSearching && !searchQuery && (
                                <button 
                                  className="text-gray-500 hover:text-indigo-400 transition-colors duration-200 active:scale-95"
                                  title="Voice search (coming soon)"
                                >
                                  <i className="fa-solid fa-microphone"></i>
                                </button>
                              )}
                </div>
                        </div>
                    </div>
                    
                    {/* Helper text */}
                    <p className="text-gray-500 text-caption mt-2 px-1">
                        {isSearching ? 'Searching food database...' : 'Start typing to search (instant results)'}
                    </p>
                </div>
                
                {/* Error message */}
                {searchError && (
                    <div className="mb-4 px-4 py-3 rounded-xl flex items-center space-x-2" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <i className="fa-solid fa-exclamation-circle text-red-400"></i>
                        <span className="text-red-400 text-sm">{searchError}</span>
                    </div>
                )}
                
                {/* Results */}
                <div className="flex-1 overflow-y-auto pb-10 min-h-0">
                    {/* No query state - show favorites, recent searches and suggestions */}
                    {!searchQuery && !searchResults && (
                        <div>
                          {/* Favorites */}
                          {favorites.length > 0 && (
                            <div className="mb-6">
                              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2 flex items-center space-x-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="#FBBF24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                <span>Favorites</span>
                              </p>
                              <div className="space-y-2">
                                {favorites.slice(0, 4).map((fav) => (
                                  <button
                                    key={fav.id}
                                    onClick={() => handleAddFavoriteToResult(fav)}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
                                    style={{
                                      background: 'rgba(251, 191, 36, 0.08)',
                                      border: '1px solid rgba(251, 191, 36, 0.2)',
                                    }}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24">
                                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                      </div>
                                      <div className="text-left">
                                        <p className="text-white font-medium text-sm">{fav.name}</p>
                                        <p className="text-white/40 text-xs">{fav.servingSize}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-white font-bold text-sm">{Math.round(fav.macros.calories)}</p>
                                      <p className="text-white/40 text-xs">kcal</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Recent Searches */}
                          {recentSearches.length > 0 && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Recent</p>
                                <button 
                                  onClick={() => {
                                    setRecentSearches([]);
                                    localStorage.removeItem('nutrivision_recent_searches');
                                  }}
                                  className="text-xs text-white/30 hover:text-white/50"
                                >
                                  Clear
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {recentSearches.map((search, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setSearchQuery(search)}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all active:scale-95"
                                    style={{
                                      background: 'rgba(139, 92, 246, 0.1)',
                                      border: '1px solid rgba(139, 92, 246, 0.2)',
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="rgba(139, 92, 246, 0.6)" strokeWidth="2"/>
                                    </svg>
                                    <span className="text-sm text-white/70">{search}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Quick Suggestions */}
                          <div className="mb-6">
                            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Popular</p>
                            <div className="flex flex-wrap gap-2">
                              {['Chicken breast', 'Rice', 'Banana', 'Eggs', 'Salmon', 'Oatmeal', 'Avocado', 'Greek yogurt'].map((food) => (
                                <button
                                  key={food}
                                  onClick={() => setSearchQuery(food)}
                                  className="px-3 py-2 rounded-lg text-sm text-white/60 transition-all active:scale-95 hover:text-white"
                                  style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                  }}
                                >
                                  {food}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Info */}
                          {favorites.length === 0 && recentSearches.length === 0 && (
                            <div className="text-center mt-8">
                              <div 
                                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                                  style={{ background: 'rgba(139, 92, 246, 0.15)' }}
                              >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="11" cy="11" r="7" stroke="#8B5CF6" strokeWidth="2"/>
                                    <path d="M21 21l-4.35-4.35" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                              </div>
                              <p className="text-white/70 font-medium text-sm">Search for any food</p>
                              <p className="text-white/30 text-xs mt-1">From USDA & OpenFoodFacts databases</p>
                            </div>
                          )}
                        </div>
                    )}
                    
                    {/* Loading state (only show skeleton if query exists but no results yet) */}
                    {isSearching && searchQuery && !searchResults && (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div 
                                    key={i} 
                                    className="p-4 rounded-xl animate-pulse"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                    <div className="h-4 w-3/4 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
                                    <div className="h-3 w-1/2 rounded mt-2" style={{ background: 'rgba(255,255,255,0.05)' }}></div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Results list */}
                    {searchResults && (
                        <div className="space-y-2">
                             {searchResults.length === 0 ? (
                                 <div className="text-center mt-10">
                                     <div className="text-4xl mb-3">🤷</div>
                                     <p className="text-gray-400 text-body">No results found for "{searchQuery}"</p>
                                     <p className="text-gray-500 text-caption mt-1">Try a different search term</p>
                                 </div>
                             ) : (
                                 <>
                                     <p className="text-gray-500 text-caption mb-2 px-1">{searchResults.length} results</p>
                                     {searchResults.map((item, idx) => (
                                         <button 
                                             key={idx} 
                                             onClick={() => selectSearchResult(item)} 
                                             className="w-full p-4 rounded-xl flex justify-between items-center text-left transition-all duration-300 group active:scale-[0.98]"
                                             style={{ 
                                                 background: 'rgba(255,255,255,0.05)', 
                                                 border: '1px solid rgba(255,255,255,0.08)',
                                             }}
                                             onMouseEnter={(e) => {
                                               e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                               e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                               e.currentTarget.style.transform = 'translateX(4px)';
                                             }}
                                             onMouseLeave={(e) => {
                                               e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                               e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                               e.currentTarget.style.transform = 'translateX(0)';
                                             }}
                                         >
                                             <div className="flex-1 min-w-0 pr-3">
                                                 <p className="text-white text-body font-bold group-hover:text-indigo-400 transition-colors duration-300 truncate">{item.name}</p>
                                                 <p className="text-gray-500 text-caption mt-0.5">{item.servingSize}</p>
                                                 <div className="flex flex-wrap gap-2 mt-2">
                                                     <span className="text-caption px-2 py-0.5 rounded font-bold text-orange-400" style={{ background: 'rgba(251, 146, 60, 0.15)' }}>
                                                         {Math.round(item.macros.calories)} cal
                                                     </span>
                                                     <span className="text-caption px-2 py-0.5 rounded font-bold text-emerald-400" style={{ background: 'rgba(52, 211, 153, 0.15)' }}>
                                                         P {Math.round(item.macros.protein)}g
                                                     </span>
                                                     <span className="text-caption px-2 py-0.5 rounded font-bold text-cyan-400" style={{ background: 'rgba(34, 211, 238, 0.15)' }}>
                                                         C {Math.round(item.macros.carbs)}g
                                                     </span>
                                                     <span className="text-caption px-2 py-0.5 rounded font-bold text-orange-300" style={{ background: 'rgba(253, 186, 116, 0.15)' }}>
                                                         F {Math.round(item.macros.fat)}g
                                                     </span>
                                         </div>
                                         </div>
                                            <div className="flex items-center space-x-2 flex-shrink-0">
                                              {/* Favorite button */}
                                              <button
                                                onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  handleToggleFavorite(item); 
                                                }}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
                                                style={{ 
                                                  background: favoritesService.isFavorite(item.name) 
                                                    ? 'rgba(251, 191, 36, 0.2)' 
                                                    : 'rgba(255,255,255,0.05)',
                                                  border: favoritesService.isFavorite(item.name)
                                                    ? '1px solid rgba(251, 191, 36, 0.3)'
                                                    : '1px solid rgba(255,255,255,0.1)',
                                                }}
                                              >
                                                <svg 
                                                  width="16" 
                                                  height="16" 
                                                  viewBox="0 0 24 24" 
                                                  fill={favoritesService.isFavorite(item.name) ? '#FBBF24' : 'none'}
                                                  stroke={favoritesService.isFavorite(item.name) ? '#FBBF24' : 'rgba(255,255,255,0.4)'}
                                                  strokeWidth="2"
                                                >
                                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                </svg>
                                     </button>
                                              {/* Add button */}
                                              <div 
                                                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                                                  style={{ 
                                                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                                  }}
                                              >
                                                 <i className="fa-solid fa-plus text-white text-sm"></i>
                                              </div>
                                            </div>
                                    </button>
                                     ))}
                                 </>
                             )}
                        </div>
                    )}
                </div>
           </div>
       </div>

       {/* Saved Meals Dialog */}
       {showSavedMeals && (
         <div 
           className="fixed inset-0 z-[60] flex items-end justify-center"
           style={{
             background: 'rgba(0,0,0,0.7)',
             backdropFilter: 'blur(20px)',
           }}
           onClick={() => setShowSavedMeals(false)}
         >
           <div 
             className="w-full max-w-md rounded-t-3xl p-6 pb-[calc(40px+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto"
             style={{
               background: 'rgba(10, 10, 15, 0.98)',
               borderTop: '1px solid rgba(255,255,255,0.1)',
             }}
             onClick={(e) => e.stopPropagation()}
           >
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-white">My Saved Meals</h3>
               <button
                 onClick={() => setShowSavedMeals(false)}
                 className="text-gray-400 hover:text-white transition-colors active:scale-95"
               >
                 <i className="fa-solid fa-times"></i>
               </button>
             </div>
             
             {(() => {
               const savedMeals = savedMealsService.getSavedMeals();
               if (savedMeals.length === 0) {
                 return (
                   <div className="text-center py-12">
                     <div className="text-4xl mb-4">📝</div>
                     <p className="text-gray-400 text-body mb-2">No saved meals yet</p>
                     <p className="text-gray-500 text-caption">Create a meal and tap the bookmark icon to save it</p>
                   </div>
                 );
               }
               
               return (
                 <div className="space-y-3">
                   {savedMeals.map((meal) => (
                     <button
                       key={meal.id}
                       onClick={() => handleLoadSavedMeal(meal)}
                       className="w-full p-4 rounded-xl text-left transition-all active:scale-95"
                       style={{
                         background: 'rgba(255,255,255,0.06)',
                         border: '1px solid rgba(255,255,255,0.08)',
                       }}
                     >
                       <div className="flex items-start justify-between">
                         <div className="flex-1">
                           <div className="flex items-center space-x-2 mb-2">
                             {meal.emoji && <span className="text-xl">{meal.emoji}</span>}
                             <h4 className="font-bold text-white">{meal.name}</h4>
                           </div>
                           <div className="flex flex-wrap gap-2 mb-2">
                             {meal.items.slice(0, 3).map((item, idx) => (
                               <span 
                                 key={idx}
                                 className="text-xs px-2 py-1 rounded-full"
                                 style={{
                                   background: 'rgba(255,255,255,0.08)',
                                   color: 'rgba(255,255,255,0.7)',
                                 }}
                               >
                                 {item.name}
                               </span>
                             ))}
                             {meal.items.length > 3 && (
                               <span className="text-xs px-2 py-1 rounded-full text-gray-500">
                                 +{meal.items.length - 3} more
                               </span>
                             )}
                           </div>
                           <div className="flex items-center space-x-3 text-xs text-gray-400">
                             <span>{Math.round(meal.totalMacros.calories)} kcal</span>
                             <span>•</span>
                             <span>Used {meal.useCount || 0} times</span>
                           </div>
                         </div>
                         <div className="ml-4">
                           <i className="fa-solid fa-chevron-right text-gray-500"></i>
                         </div>
                       </div>
                     </button>
                   ))}
                 </div>
               );
             })()}
           </div>
         </div>
       )}
    </div>
  );
};

export default CameraCapture;