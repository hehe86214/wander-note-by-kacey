
import React, { useRef, useEffect, useState } from 'react';
import { TripSettings, DayItinerary, Trip, Expense, Flight, Activity, PrepItem, ViewState } from '../types';
import DayDetail from './DayDetail';
import { generateTripPDF } from '../services/pdfService';
import { detectTripDetails } from '../services/geminiService';

interface Props {
  settings: TripSettings;
  days: DayItinerary[];
  selectedDayId: string | null;
  onSelectDay: (dayId: string) => void;
  onUpdateDay: (updatedDay: DayItinerary) => void;
  onMoveActivity: (activityId: string, sourceDayId: string, targetDayId: string, updatedActivity: Activity) => void;
  fullTripData: Trip;
  pendingActivity?: Partial<Activity> | null;
  onClearPendingActivity?: () => void;
  wishlistItems?: PrepItem[]; // Passed down
  onAddShoppingItem?: (item: PrepItem) => void; // Deprecated but kept for type safety if needed, replaced by onUpdatePrepItem
  onUpdatePrepItem?: (item: PrepItem) => void; // New prop for linking logic
  onEditBooking?: (id: string) => void;
  onSave?: () => void; 
  onGoHome?: () => void; 
  onUpdateSettings?: (settings: TripSettings) => void; // New to handle currency update
}

const Dashboard: React.FC<Props> = ({ 
    settings, days, selectedDayId, onSelectDay, onUpdateDay, onMoveActivity, 
    fullTripData, pendingActivity, onClearPendingActivity,
    wishlistItems, onAddShoppingItem, onUpdatePrepItem, onEditBooking,
    onSave, onGoHome, onUpdateSettings
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Currency Logic
  const [isDetecting, setIsDetecting] = useState(false);
  const [showCurrencyEdit, setShowCurrencyEdit] = useState(false);
  // FIX: Provide default value 0 if exchangeRate is undefined before toString
  const [tempRate, setTempRate] = useState((settings.exchangeRate ?? 0).toString());
  const [tempCurrency, setTempCurrency] = useState(settings.targetCurrency);

  const selectedDay = days.find(d => d.id === selectedDayId);

  // Auto-select first day if none selected
  useEffect(() => {
    if (!selectedDayId && days.length > 0) {
        onSelectDay(days[0].id);
    }
  }, [days, selectedDayId, onSelectDay]);

  // Initial Auto Detect if Currency is missing (Fresh from Onboarding)
  useEffect(() => {
      const initDetect = async () => {
          if ((!settings.targetCurrency || settings.exchangeRate === 0) && onUpdateSettings) {
              setIsDetecting(true);
              const result = await detectTripDetails(settings.destinations);
              setIsDetecting(false);
              if (result) {
                  onUpdateSettings({
                      ...settings,
                      targetCurrency: result.currency,
                      exchangeRate: result.rate
                  });
              }
          }
      };
      initDetect();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: `${(d.getMonth() + 1)}/${d.getDate()}`,
    };
  };

  const handleManualSave = () => {
      if (onSave) {
          setIsSaving(true);
          onSave();
          setTimeout(() => setIsSaving(false), 1500); // Visual feedback time
      }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
        await generateTripPDF(fullTripData);
    } catch (e) {
        console.error(e);
        alert('Failed to generate PDF');
    }
    setDownloadingPdf(false);
  };

  const handleCurrencyUpdate = () => {
      if (onUpdateSettings) {
          onUpdateSettings({
              ...settings,
              targetCurrency: tempCurrency,
              exchangeRate: parseFloat(tempRate) || 0
          });
          setShowCurrencyEdit(false);
      }
  };

  const handleAutoDetectCurrency = async () => {
      setIsDetecting(true);
      const result = await detectTripDetails(settings.destinations);
      setIsDetecting(false);
      if (result) {
          setTempCurrency(result.currency);
          setTempRate(result.rate.toString());
          if (onUpdateSettings) {
              onUpdateSettings({
                  ...settings,
                  targetCurrency: result.currency,
                  exchangeRate: result.rate
              });
          }
      } else {
          alert('無法偵測匯率，請手動輸入。');
      }
  };

  return (
    <div className="min-h-screen bg-transparent pt-28"> {/* Increased padding-top to avoid overlap */}
      
      {/* Top Action Bar (Fixed, Z-index 40 to be BELOW Navigation which is Z-50) */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-ink-50 shadow-sm h-28 flex items-start pt-6 px-6 pointer-events-none">
          <div className="w-full flex justify-between items-start pointer-events-auto">
              {/* Home Button REMOVED as requested to prevent blocking. Main Navigation handles Home. */}
              <div className="w-10"></div> 

              {/* Save Button (Right) */}
              <div className="flex items-center gap-3">
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={downloadingPdf}
                    className="text-ink-400 hover:text-ink-900 transition-colors p-1"
                    title="Download PDF"
                  >
                    {downloadingPdf ? (
                        <div className="w-4 h-4 border-2 border-ink-900 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    )}
                  </button>
                  <button 
                    onClick={handleManualSave}
                    className={`flex items-center gap-1 transition-colors px-4 py-1.5 rounded-full border active:scale-95 ${isSaving ? 'bg-accent-matcha/10 text-accent-matcha border-accent-matcha' : 'text-ink-500 border-ink-200 hover:text-ink-900 hover:border-ink-900'}`}
                  >
                    {isSaving ? (
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{isSaving ? 'Saved' : '儲存'}</span>
                  </button>
              </div>
          </div>
      </div>

      {/* Trip Header Info (Scrolls with content) */}
      <div className="px-6 pb-6 pt-2 bg-white/40 backdrop-blur-sm border-b border-white/50 relative z-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-serif text-ink-900 tracking-wide">{settings.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-ink-400 font-bold uppercase tracking-widest">
                <span>{days.length} Days</span>
                {settings.travelerCount && <span>• {settings.travelerCount} Travelers</span>}
                
                {/* Moved Currency Settings Here */}
                <div className="flex items-center gap-2 bg-white/60 px-2 py-1 rounded-md border border-ink-100">
                    {showCurrencyEdit ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <input 
                                className="w-10 text-center text-xs border-b border-ink-200 outline-none uppercase font-bold bg-transparent" 
                                value={tempCurrency} 
                                onChange={(e) => setTempCurrency(e.target.value.toUpperCase())}
                                placeholder="CUR"
                            />
                            <span className="text-xs text-ink-300">≈</span>
                            <input 
                                className="w-12 text-center text-xs border-b border-ink-200 outline-none bg-transparent" 
                                type="number"
                                value={tempRate} 
                                onChange={(e) => setTempRate(e.target.value)}
                                placeholder="Rate"
                            />
                            <button onClick={handleCurrencyUpdate} className="text-green-600 hover:bg-green-50 p-1 rounded-full"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></button>
                            <button onClick={() => { setShowCurrencyEdit(false); setTempCurrency(settings.targetCurrency); setTempRate((settings.exchangeRate ?? 0).toString()); }} className="text-red-400 hover:bg-red-50 p-1 rounded-full"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                    ) : (
                        <div 
                            onClick={() => { setShowCurrencyEdit(true); setTempCurrency(settings.targetCurrency); setTempRate((settings.exchangeRate ?? 0).toString()); }}
                            className="flex items-center gap-2 cursor-pointer group"
                            title="Click to Edit Rate"
                        >
                            {isDetecting ? (
                                <span className="text-ink-400 animate-pulse">Detecting...</span>
                            ) : (
                                <>
                                    <span className="text-ink-500">
                                        1 {settings.targetCurrency || '???'} ≈ {settings.exchangeRate || '?'} TWD
                                    </span>
                                    <svg className="w-3 h-3 text-ink-300 group-hover:text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                </>
                            )}
                        </div>
                    )}
                    {!showCurrencyEdit && !isDetecting && (
                        <button onClick={handleAutoDetectCurrency} className="text-ink-300 hover:text-accent-indigo p-1" title="Auto Detect Rate">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                        </button>
                    )}
                </div>
            </div>
          </div>
      </div>

      {/* Day Tabs (Sticky below the new header area) */}
      <div className="sticky top-28 z-30 bg-[#F9F9F7]/95 backdrop-blur-md border-b border-ink-100 py-3 pl-4 overflow-x-auto no-scrollbar flex items-center gap-3" ref={scrollRef}>
         {days.map((day, idx) => {
             const info = formatDate(day.id);
             const isActive = selectedDayId === day.id;
             return (
                 <button
                    key={day.id}
                    onClick={() => onSelectDay(day.id)}
                    className={`flex flex-col items-center justify-center min-w-[4.5rem] py-2 rounded-lg transition-all border active:scale-95 ${
                        isActive 
                        ? 'bg-ink-900 border-ink-900 text-white shadow-md scale-105' 
                        : 'bg-white border-ink-100 text-ink-400 hover:border-ink-300'
                    }`}
                 >
                     <span className={`text-[10px] font-bold tracking-widest uppercase ${isActive ? 'text-white/70' : 'text-ink-300'}`}>DAY {idx + 1}</span>
                     <span className="font-serif text-sm mt-0.5">{info.date}</span>
                 </button>
             )
         })}
         <div className="w-4 shrink-0"></div> {/* Right padding */}
      </div>

      {/* Main Content Area */}
      {selectedDay && (
        <DayDetail 
            day={selectedDay} 
            onBack={() => {}} 
            onUpdateDay={onUpdateDay}
            onMoveActivity={onMoveActivity}
            reservations={fullTripData.reservations || []}
            pendingActivity={pendingActivity}
            onClearPendingActivity={onClearPendingActivity}
            wishlistItems={wishlistItems}
            onAddShoppingItem={onAddShoppingItem}
            onUpdatePrepItem={onUpdatePrepItem}
            onEditBooking={onEditBooking}
            allDays={days}
        />
      )}
    </div>
  );
};

export default Dashboard;
