import React, { useState, useEffect } from 'react';
import { MealLog } from '../types.ts';

interface MealDetailModalProps {
  meal: MealLog | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const MealDetailModal: React.FC<MealDetailModalProps> = ({ meal, onClose, onDelete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (meal) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [meal]);

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
    >
      <div 
        className={`w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col transition-all duration-300 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        style={{
          background: 'linear-gradient(180deg, #1a1a1f 0%, #0a0a0f 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div 
            className="w-10 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)' }}
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
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
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
                  {Math.round(meal.totalMacros.calories)}
                  <span className="text-lg font-medium text-gray-400 ml-1">kcal</span>
                </p>
              </div>
              <div className="flex space-x-4">
                <div className="text-center">
                  <p className="text-green-400 text-lg font-bold">{Math.round(meal.totalMacros.protein)}g</p>
                  <p className="text-xs text-gray-500 uppercase">Protein</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-400 text-lg font-bold">{Math.round(meal.totalMacros.carbs)}g</p>
                  <p className="text-xs text-gray-500 uppercase">Carbs</p>
                </div>
                <div className="text-center">
                  <p className="text-orange-400 text-lg font-bold">{Math.round(meal.totalMacros.fat)}g</p>
                  <p className="text-xs text-gray-500 uppercase">Fat</p>
                </div>
              </div>
            </div>
          </div>

          {/* Food items */}
          <div className="mb-4">
            <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 px-1">
              Food Items ({meal.items.length})
            </h4>
            <div className="space-y-2">
              {meal.items.map((item, index) => (
                <div 
                  key={index}
                  className="rounded-xl p-4"
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.08)' 
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.servingSize}</p>
                    </div>
                    <span className="font-bold text-white ml-4">{Math.round(item.macros.calories)} kcal</span>
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
            </div>
          </div>

          {/* Notes */}
          {meal.note && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 px-1">
                <i className="fa-solid fa-note-sticky mr-1 text-purple-400"></i>
                Notes
              </h4>
              <div 
                className="rounded-xl p-4"
                style={{ 
                  background: 'rgba(139, 92, 246, 0.1)', 
                  border: '1px solid rgba(139, 92, 246, 0.2)' 
                }}
              >
                <p className="text-gray-300 text-sm italic">{meal.note}</p>
              </div>
            </div>
          )}
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

