
import React, { useState, useEffect } from 'react';
import { UserSettings, MealLog } from '../types';
import { healthService } from '../services/healthService';

interface SettingsProps {
  settings: UserSettings;
  logs: MealLog[];
  onUpdateSettings: (s: UserSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, logs, onUpdateSettings }) => {
  const [showToast, setShowToast] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('nutrivision_api_key') || '';
    setApiKey(key);
    setIsNativeApp(healthService.isAvailable());
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('nutrivision_api_key', apiKey);
    alert("API Key saved. You can now use the AI features.");
    setShowKeyInput(false);
  };

  const handleExport = () => {
    // Generate CSV
    const headers = ['Date', 'Time', 'Type', 'Items', 'Calories', 'Protein', 'Carbs', 'Fat'];
    const rows = logs.map(log => {
      const date = new Date(log.timestamp);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        log.type,
        log.items.map(i => i.name).join('; '),
        log.totalMacros.calories,
        log.totalMacros.protein,
        log.totalMacros.carbs,
        log.totalMacros.fat
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "nutrivision_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAppleHealth = async () => {
    if (!isNativeApp) {
        alert("To sync with Apple Health, this app must be installed as a Native iOS App via Xcode/Capacitor. \n\nOn the web version, please use the 'Export CSV' or 'Copy to Clipboard' features.");
        return;
    }

    const newStatus = !settings.appleHealthConnected;
    if (newStatus) {
        const granted = await healthService.requestPermissions();
        if (granted) {
            onUpdateSettings({ ...settings, appleHealthConnected: true });
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } else {
            alert("Permission not granted via iOS.");
        }
    } else {
        onUpdateSettings({ ...settings, appleHealthConnected: false });
    }
  };

  return (
    <div className="flex-1 bg-ios-bg overflow-y-auto pb-32">
      <div className="pt-14 px-6 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile & Settings</h1>
        
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <span className="font-medium text-gray-900">Daily Calorie Goal</span>
                <input 
                    type="number" 
                    value={settings.dailyCalorieGoal}
                    onChange={(e) => onUpdateSettings({...settings, dailyCalorieGoal: Number(e.target.value)})}
                    className="text-right outline-none text-ios-blue font-bold w-24" 
                />
            </div>
             <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <span className="font-medium text-gray-900">Protein (g)</span>
                <input 
                    type="number" 
                    value={settings.dailyProteinGoal}
                    onChange={(e) => onUpdateSettings({...settings, dailyProteinGoal: Number(e.target.value)})}
                    className="text-right outline-none text-ios-green font-bold w-24" 
                />
            </div>
             <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <span className="font-medium text-gray-900">Carbs (g)</span>
                <input 
                    type="number" 
                    value={settings.dailyCarbGoal}
                    onChange={(e) => onUpdateSettings({...settings, dailyCarbGoal: Number(e.target.value)})}
                    className="text-right outline-none text-ios-blue font-bold w-24" 
                />
            </div>
             <div className="p-4 flex items-center justify-between">
                <span className="font-medium text-gray-900">Fat (g)</span>
                <input 
                    type="number" 
                    value={settings.dailyFatGoal}
                    onChange={(e) => onUpdateSettings({...settings, dailyFatGoal: Number(e.target.value)})}
                    className="text-right outline-none text-ios-red font-bold w-24" 
                />
            </div>
        </div>

        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2 ml-4">App Configuration</h3>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">Gemini API Key</span>
                    <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-ios-blue text-sm font-semibold">
                        {showKeyInput ? 'Hide' : 'Edit'}
                    </button>
                </div>
                {showKeyInput && (
                    <div className="flex flex-col space-y-2 mt-2">
                        <input 
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Paste AI Studio Key here"
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ios-blue/20"
                        />
                        <button onClick={handleSaveKey} className="bg-gray-900 text-white text-xs font-bold py-2 rounded-lg">
                            Save Key
                        </button>
                        <p className="text-[10px] text-gray-400">
                           Required for image analysis. Key is stored locally on your device.
                        </p>
                    </div>
                )}
                 {!showKeyInput && (
                    <div className="text-xs text-gray-400 truncate">
                        {apiKey ? '••••••••••••••••' : 'No key set'}
                    </div>
                 )}
            </div>
             <button onClick={handleAppleHealth} className="w-full p-4 flex items-center justify-between active:bg-gray-50 group">
                <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors ${isNativeApp ? 'bg-red-500' : 'bg-gray-300'}`}>
                        <i className="fa-solid fa-heart"></i>
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-900 block">Apple Health</span>
                        {!isNativeApp && <span className="text-[10px] text-gray-400">Native App Required</span>}
                    </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${settings.appleHealthConnected ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${settings.appleHealthConnected ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
            </button>
        </div>

        <h3 className="text-gray-500 text-xs font-bold uppercase mb-2 ml-4">Data Management</h3>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <button onClick={handleExport} className="w-full p-4 flex items-center justify-between text-ios-blue active:bg-gray-50 border-b border-gray-100">
                 <span className="font-medium">Export Data (CSV)</span>
                 <i className="fa-solid fa-file-export"></i>
            </button>
            <div className="p-4 text-xs text-gray-400 bg-gray-50">
                <p>Data is stored locally on this device. Removing the app or clearing browser data will delete your history.</p>
            </div>
        </div>
        
        <div className="text-center text-gray-300 text-xs mt-8 pb-8">
            NutriVision AI v1.0.0
        </div>
      </div>

      {showToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full shadow-xl backdrop-blur-md z-50 flex items-center space-x-2">
            <i className="fa-solid fa-circle-check text-green-400"></i>
            <span className="text-sm font-medium">Sync Enabled</span>
        </div>
      )}
    </div>
  );
};

export default Settings;
