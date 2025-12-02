import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FoodItem, MealLog, Macros } from '../types';
import { analyzeFoodImage, searchFoodDatabase, getNutritionalInfoFromBarcode } from '../services/geminiService';

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

interface CameraCaptureProps {
  onSave: (log: MealLog) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onSave, onCancel }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodItem[] | null>(null);
  const [searchResults, setSearchResults] = useState<FoodItem[] | null>(null);
  const [mode, setMode] = useState<'camera' | 'search' | 'barcode'>('camera');
  const [searchQuery, setSearchQuery] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);

  // Set default meal type based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setMealType('breakfast');
    else if (hour >= 11 && hour < 16) setMealType('lunch');
    else if (hour >= 16 && hour < 22) setMealType('dinner');
    else setMealType('snack');
  }, []);

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
    return () => stopCamera();
  }, [mode, image, result]);

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
        setImage(dataUrl);
        // Automatically start analysis
        handleAnalysis(dataUrl);
      }
    }
  }, []);

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
          const item = await getNutritionalInfoFromBarcode(barcode);
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
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
            const dataUrl = ev.target.result as string;
            setImage(dataUrl);
            handleAnalysis(dataUrl);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAnalysis = async (dataUrl: string) => {
    setAnalyzing(true);
    try {
        const base64 = dataUrl.split(',')[1];
        const items = await analyzeFoodImage(base64);
        setResult(items);
    } catch (e) {
        alert("Failed to analyze image. Please try again.");
        setResult([{
             name: "Unknown Food",
             servingSize: "1 serving",
             macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
        }]);
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setAnalyzing(true);
    setSearchResults(null);
    try {
        const items = await searchFoodDatabase(searchQuery);
        setSearchResults(items);
    } catch (e) {
        alert("Search failed.");
    } finally {
        setAnalyzing(false);
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
      const newLog: MealLog = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUrl: image || undefined,
          items: result,
          totalMacros: calculateTotal(),
          type: mealType
      };
      onSave(newLog);
  };

  // Render Result / Edit View
  if (result) {
      const total = calculateTotal();
      return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
            <div className="pt-12 pb-4 px-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
                <button onClick={() => { setResult(null); setImage(null); }} className="text-gray-500 font-medium px-2">Cancel</button>
                <h2 className="font-bold text-lg">Edit Meal</h2>
                <button onClick={handleSaveLog} className="text-ios-blue font-bold px-2">Save</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-ios-bg pb-[calc(140px+env(safe-area-inset-bottom))]">
                 <div className="bg-white rounded-xl p-1.5 flex mb-4 shadow-sm ring-1 ring-gray-100">
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setMealType(t)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${mealType === t ? 'bg-ios-blue text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {result.map((item, index) => (
                        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                             <div className="flex justify-between items-start mb-4">
                                <input 
                                    type="text" 
                                    value={item.name} 
                                    onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                                    className="font-bold text-gray-900 text-lg border-b border-transparent focus:border-gray-200 outline-none w-full mr-2 bg-transparent"
                                    placeholder="Item Name"
                                />
                                <button onClick={() => handleRemoveItem(index)} className="text-gray-300 hover:text-red-500 p-2 -mr-2 -mt-2">
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block text-center">Cals</label>
                                    <input type="number" value={Math.round(item.macros.calories)} onChange={(e) => handleUpdateItem(index, 'calories', e.target.value)} className="w-full bg-gray-50 rounded-lg py-2 text-center font-bold text-gray-900 text-sm outline-none focus:ring-2 focus:ring-ios-blue/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block text-center">Prot</label>
                                    <input type="number" value={Math.round(item.macros.protein)} onChange={(e) => handleUpdateItem(index, 'protein', e.target.value)} className="w-full bg-green-50 rounded-lg py-2 text-center font-bold text-green-700 text-sm outline-none focus:ring-2 focus:ring-green-500/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block text-center">Carbs</label>
                                    <input type="number" value={Math.round(item.macros.carbs)} onChange={(e) => handleUpdateItem(index, 'carbs', e.target.value)} className="w-full bg-blue-50 rounded-lg py-2 text-center font-bold text-blue-700 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block text-center">Fat</label>
                                    <input type="number" value={Math.round(item.macros.fat)} onChange={(e) => handleUpdateItem(index, 'fat', e.target.value)} className="w-full bg-red-50 rounded-lg py-2 text-center font-bold text-red-700 text-sm outline-none focus:ring-2 focus:ring-red-500/20" />
                                </div>
                            </div>
                            <input 
                                type="text" 
                                value={item.servingSize} 
                                onChange={(e) => handleUpdateItem(index, 'servingSize', e.target.value)}
                                className="text-xs text-gray-500 bg-transparent outline-none w-full border-b border-transparent focus:border-gray-200"
                                placeholder="Serving Size"
                            />
                        </div>
                    ))}
                    <button onClick={handleAddItem} className="w-full py-4 text-ios-blue font-bold text-sm bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                        + Add Item
                    </button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-lg z-20">
                <div className="flex justify-between items-center max-w-md mx-auto">
                    <div>
                        <span className="text-xs text-gray-400 font-bold uppercase block">Total</span>
                        <span className="text-2xl font-black text-gray-900">{Math.round(total.calories)} <span className="text-sm font-medium text-gray-500">kcal</span></span>
                    </div>
                    <div className="flex space-x-4">
                        <div className="text-center">
                            <span className="text-[10px] text-gray-400 font-bold block">Prot</span>
                            <span className="font-bold text-gray-900 text-sm">{Math.round(total.protein)}g</span>
                        </div>
                         <div className="text-center">
                            <span className="text-[10px] text-gray-400 font-bold block">Carb</span>
                            <span className="font-bold text-gray-900 text-sm">{Math.round(total.carbs)}g</span>
                        </div>
                         <div className="text-center">
                            <span className="text-[10px] text-gray-400 font-bold block">Fat</span>
                            <span className="font-bold text-gray-900 text-sm">{Math.round(total.fat)}g</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // Render Capture / Search View
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
       {/* Top Bar */}
       <div className="absolute top-0 left-0 w-full p-4 pt-[calc(10px+env(safe-area-inset-top))] flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
            <button onClick={onCancel} className="text-white w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <i className="fa-solid fa-times"></i>
            </button>
            <div className="flex space-x-1 bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
                <button onClick={() => setMode('camera')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'camera' ? 'bg-white text-black' : 'text-white'}`}>Camera</button>
                <button onClick={() => setMode('barcode')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'barcode' ? 'bg-white text-black' : 'text-white'}`}>Scan</button>
                <button onClick={() => setMode('search')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'search' ? 'bg-white text-black' : 'text-white'}`}>Search</button>
            </div>
            <div className="w-10"></div>
       </div>

       {analyzing && (
           <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md">
               <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mb-4"></div>
               <p className="text-white font-medium">Processing...</p>
           </div>
       )}

       <div className="flex-1 relative bg-black overflow-hidden">
           {/* Camera */}
           <div className={`absolute inset-0 ${mode === 'camera' ? 'visible' : 'invisible'}`}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="absolute bottom-0 left-0 w-full pb-[calc(40px+env(safe-area-inset-bottom))] pt-32 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col items-center justify-center space-y-8">
                     <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-[6px] border-gray-300/50 shadow-lg active:scale-95 transition-transform"></button>
                     <label className="flex items-center space-x-2 text-white/80 text-sm font-medium bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-colors">
                         <i className="fa-solid fa-image"></i>
                         <span>Upload Photo</span>
                         <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                     </label>
                </div>
           </div>

           {/* Barcode */}
           <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black ${mode === 'barcode' ? 'visible' : 'invisible'}`}>
               <div id="barcode-reader" className="w-full max-w-sm rounded-xl overflow-hidden border border-white/20 shadow-2xl relative z-10"></div>
               <p className="mt-8 text-white/60 text-sm font-medium">Point camera at a barcode</p>
           </div>

           {/* Search */}
           <div className={`absolute inset-0 bg-gray-900 ${mode === 'search' ? 'visible' : 'invisible'} flex flex-col pt-32 px-4`}>
                <div className="flex space-x-2 mb-6">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search food (e.g. Avocado Toast)"
                        className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-ios-blue placeholder-gray-500"
                    />
                    <button onClick={handleSearch} className="bg-ios-blue text-white px-6 rounded-xl font-bold active:bg-blue-600 transition-colors">Search</button>
                </div>
                <div className="flex-1 overflow-y-auto pb-10">
                    {searchResults && (
                        <div className="space-y-2">
                             {searchResults.length === 0 ? (
                                 <div className="text-center mt-10 text-gray-500">No results found.</div>
                             ) : (
                                 searchResults.map((item, idx) => (
                                     <button key={idx} onClick={() => selectSearchResult(item)} className="w-full bg-gray-800 p-4 rounded-xl flex justify-between items-center text-left hover:bg-gray-700 transition-colors group">
                                         <div>
                                             <p className="text-white font-bold group-hover:text-ios-blue transition-colors">{item.name}</p>
                                             <p className="text-gray-400 text-xs mt-0.5">{item.servingSize} • {Math.round(item.macros.calories)} kcal</p>
                                         </div>
                                         <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center group-hover:bg-ios-blue group-hover:text-white transition-colors">
                                            <i className="fa-solid fa-plus text-sm"></i>
                                         </div>
                                     </button>
                                 ))
                             )}
                        </div>
                    )}
                </div>
           </div>
       </div>
    </div>
  );
};

export default CameraCapture;