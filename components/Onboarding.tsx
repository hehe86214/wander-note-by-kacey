
import React, { useState, useEffect, useRef } from 'react';
import { TripSettings } from '../types';
import Calendar from './Calendar';

interface Props {
  onComplete: (settings: TripSettings) => void;
  onCancel: () => void; // Allow going back to list
  onDelete?: (id: string) => void;
  initialSettings?: TripSettings | null;
  allowCancel?: boolean; // New prop for Wizard mode
}

const Onboarding: React.FC<Props> = ({ onComplete, onCancel, onDelete, initialSettings, allowCancel = true }) => {
  const [name, setName] = useState('');
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // New Fields
  const [travelerCount, setTravelerCount] = useState<number>(1);
  const [companions, setCompanions] = useState<string[]>([]);
  const [newCompanion, setNewCompanion] = useState('');

  // Calendar State
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeDateInput, setActiveDateInput] = useState<'start' | 'end' | null>(null);

  const companionInputRef = useRef<HTMLInputElement>(null);

  // Initialize if editing
  useEffect(() => {
      if (initialSettings) {
          setName(initialSettings.name);
          setDestinations(initialSettings.destinations);
          setStartDate(initialSettings.startDate);
          setEndDate(initialSettings.endDate);
          setTravelerCount(initialSettings.travelerCount || 1);
          setCompanions(initialSettings.companions || []);
      } else {
          // Reset
          setName('');
          setDestinations(['']);
          setStartDate('');
          setEndDate('');
          setTravelerCount(1);
          setCompanions([]);
      }
  }, [initialSettings]);

  const addDestination = () => setDestinations([...destinations, '']);
  const updateDestination = (idx: number, val: string) => {
    const newDest = [...destinations];
    newDest[idx] = val;
    setDestinations(newDest);
  };

  const handleAddCompanion = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Fix: Check for IME composition to prevent triggering while typing Chinese
      if (e.nativeEvent.isComposing) return;

      if (e.key === 'Enter') {
          e.preventDefault();
          if (newCompanion.trim()) {
              setCompanions(prev => [...prev, newCompanion.trim()]);
              setNewCompanion('');
          }
      }
  };

  const handleAddCompanionClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (newCompanion.trim()) {
          setCompanions(prev => [...prev, newCompanion.trim()]);
          setNewCompanion('');
          // Focus back for rapid entry
          companionInputRef.current?.focus();
      }
  };

  const handleRemoveCompanion = (index: number) => {
      setCompanions(companions.filter((_, i) => i !== index));
  };

  const handleStart = async () => {
    if (!name || !startDate || !endDate) return;

    if (new Date(startDate) > new Date(endDate)) {
        alert("回程日期不能早於出發日期，請重新選擇。");
        return;
    }
    
    // Default currency values - Dashboard will handle detection/updating
    const finalCurrency = initialSettings?.targetCurrency || '';
    const finalRate = initialSettings?.exchangeRate || 0;

    const settings: TripSettings = {
      id: initialSettings ? initialSettings.id : Date.now().toString(), // Keep ID if editing
      name,
      destinations: destinations.filter(d => d.trim() !== ''),
      startDate,
      endDate,
      homeCurrency: 'TWD',
      targetCurrency: finalCurrency,
      exchangeRate: finalRate,
      travelerCount,
      companions
    };

    onComplete(settings);
  };

  const handleDelete = () => {
      if (initialSettings && onDelete) {
          // IMMEDIATE DELETE: No confirm() dialog here.
          onDelete(initialSettings.id);
      }
  };

  // Helper to format date for display (e.g. "2024 / 10 / 08")
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return { year: 'YYYY', date: '選擇日期' };
    const d = new Date(dateStr);
    return {
      year: d.getFullYear(),
      date: `${(d.getMonth() + 1).toString().padStart(2, '0')} / ${d.getDate().toString().padStart(2, '0')}`
    };
  };

  const startDisplay = formatDateDisplay(startDate);
  const endDisplay = formatDateDisplay(endDate);

  const openCalendar = (type: 'start' | 'end') => {
    setActiveDateInput(type);
    setCalendarOpen(true);
  };

  const handleDateSelect = (date: string) => {
    if (activeDateInput === 'start') {
        setStartDate(date);
        // If end date is before new start date, clear end date
        if (endDate && date > endDate) {
            setEndDate('');
        }
    } else {
        setEndDate(date);
    }
  };

  const isInvalidDateRange = startDate && endDate && new Date(startDate) > new Date(endDate);

  return (
    <div className="min-h-screen bg-white/40 backdrop-blur-sm flex flex-col p-8 animate-fade-in relative overflow-hidden">
      
      {/* Back Button - Only show if cancellation is allowed (not wizard mode) */}
      {allowCancel && (
        <button onClick={onCancel} className="absolute top-6 left-6 z-20 text-ink-400 hover:text-ink-900">
           <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      )}

      <div className="mt-16 mb-12 z-10 relative flex flex-col items-center text-center">
        <div className="w-full flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-8 bg-ink-200"></div>
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-ink-400">
                {initialSettings ? 'EDIT JOURNEY' : (!allowCancel ? 'WELCOME' : 'START JOURNEY')}
            </span>
            <div className="h-px w-8 bg-ink-200"></div>
        </div>
        <h1 className="text-5xl font-serif text-ink-900 tracking-[0.05em] font-light leading-tight">
          Wander Note
        </h1>
        {/* Dot removed here */}
      </div>

      <div className="flex-1 overflow-y-auto pb-32 no-scrollbar z-10 space-y-12">
        
        {/* Input Group: Name */}
        <div className="group">
            <label className="block text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-3">旅程名稱 TRIP NAME</label>
            <input
                type="text"
                className="w-full bg-transparent border-b border-ink-200 py-3 px-1 text-2xl text-ink-900 font-serif placeholder-ink-300 focus:border-ink-900 focus:bg-white/30 outline-none transition-all tracking-wide"
                placeholder="例如：京都賞楓"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
        </div>

        {/* Input Group: Travelers & Companions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <label className="block text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-3">旅行人數 TRAVELERS</label>
                <div className="flex items-center gap-4">
                    <button onClick={() => setTravelerCount(Math.max(1, travelerCount - 1))} className="w-8 h-8 rounded-full border border-ink-300 flex items-center justify-center hover:bg-ink-900 hover:text-white transition-colors">-</button>
                    <span className="text-2xl font-serif text-ink-900 w-8 text-center">{travelerCount}</span>
                    <button onClick={() => setTravelerCount(travelerCount + 1)} className="w-8 h-8 rounded-full border border-ink-300 flex items-center justify-center hover:bg-ink-900 hover:text-white transition-colors">+</button>
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-3">同伴名稱 COMPANIONS</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {companions.map((c, i) => (
                        <span key={i} className="bg-ink-100 px-2 py-1 rounded text-xs text-ink-600 flex items-center gap-1">
                            {c}
                            <button onClick={() => handleRemoveCompanion(i)} className="hover:text-red-500">×</button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        ref={companionInputRef}
                        type="text"
                        className="w-full bg-transparent border-b border-ink-200 py-2 text-sm text-ink-900 outline-none placeholder-ink-300"
                        placeholder="輸入姓名..."
                        value={newCompanion}
                        onChange={(e) => setNewCompanion(e.target.value)}
                        onKeyDown={handleAddCompanion}
                    />
                    <button 
                        onClick={handleAddCompanionClick} 
                        className="w-8 h-8 flex items-center justify-center border border-ink-200 rounded-full hover:bg-ink-900 hover:text-white transition-colors"
                    >
                        ＋
                    </button>
                </div>
            </div>
        </div>

        {/* Input Group: Dates (Custom Card UI) */}
        <div>
            <label className="block text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-4">日期範圍 DURATION</label>
            
            <div className="flex items-stretch gap-4">
                {/* Start Date Card */}
                <div 
                    onClick={() => openCalendar('start')}
                    className="flex-1 relative bg-white/60 border border-ink-100 p-5 transition-all hover:border-ink-900 hover:bg-white hover:shadow-paper group active:scale-95 cursor-pointer"
                >
                    <span className="block text-[10px] text-accent-indigo uppercase tracking-widest mb-3">出發 DEPART</span>
                    <div className="flex flex-col">
                        <span className={`text-2xl font-serif leading-none mb-1 tracking-wide ${startDisplay.date === '選擇日期' ? 'text-ink-300' : 'text-ink-900'}`}>{startDisplay.date}</span>
                        <span className="text-xs text-ink-400 font-sans tracking-wide mt-1">{startDisplay.year}</span>
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center text-ink-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>

                {/* End Date Card */}
                <div 
                    onClick={() => openCalendar('end')}
                    className="flex-1 relative bg-white/60 border border-ink-100 p-5 transition-all hover:border-ink-900 hover:bg-white hover:shadow-paper group active:scale-95 cursor-pointer"
                >
                    <span className="block text-[10px] text-accent-matcha uppercase tracking-widest mb-3">回程 RETURN</span>
                    <div className="flex flex-col">
                        <span className={`text-2xl font-serif leading-none mb-1 tracking-wide ${endDisplay.date === '選擇日期' ? 'text-ink-300' : 'text-ink-900'}`}>{endDisplay.date}</span>
                        <span className="text-xs text-ink-400 font-sans tracking-wide mt-1">{endDisplay.year}</span>
                    </div>
                </div>
            </div>

            {isInvalidDateRange && (
                <p className="text-accent-sakura text-xs mt-3 italic text-center border border-accent-sakura/30 bg-accent-sakura/10 py-2">
                    ※ 回程日期必須在出發日期之後
                </p>
            )}
        </div>

        {/* Input Group: Destinations */}
        <div>
            <label className="block text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-3">目的地 DESTINATION</label>
            {destinations.map((dest, idx) => (
                <div key={idx} className="mb-4 flex items-center gap-3 border-b border-ink-200 pb-1">
                    <span className="text-ink-300 text-[10px] font-serif italic pt-1">0{idx+1}</span>
                    <input
                        type="text"
                        className="w-full bg-transparent py-2 px-1 text-xl text-ink-900 placeholder-ink-300 outline-none transition-all font-serif tracking-wide"
                        placeholder="輸入國家或城市"
                        value={dest}
                        onChange={(e) => updateDestination(idx, e.target.value)}
                    />
                </div>
            ))}
            <button onClick={addDestination} className="w-full py-4 border border-dashed border-ink-300 text-ink-400 text-[10px] font-bold tracking-widest hover:bg-white hover:border-ink-900 hover:text-ink-900 transition-all mt-4 uppercase">
                ＋ Add Location
            </button>
        </div>

      </div>

      <div className="z-10 absolute bottom-6 left-8 right-8 flex flex-col gap-3">
        <button
            onClick={handleStart}
            disabled={loading || !name || isInvalidDateRange}
            className="w-full bg-ink-900 text-paper py-5 font-bold text-xs tracking-[0.25em] hover:bg-ink-700 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shadow-float uppercase"
        >
            {loading ? 'Processing...' : (initialSettings ? 'Update Journey' : 'Start Planning')}
        </button>
        
        {initialSettings && onDelete && (
            <button
                onClick={handleDelete}
                className="w-full bg-transparent border border-red-200 text-red-400 py-4 font-bold text-xs tracking-[0.25em] hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all uppercase rounded-sm"
            >
                刪除整個行程 Delete Trip
            </button>
        )}
      </div>

      {/* Calendar Modal */}
      <Calendar
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelect={handleDateSelect}
        selectedDate={activeDateInput === 'start' ? startDate : endDate}
        minDate={activeDateInput === 'end' ? startDate : undefined}
        title={activeDateInput === 'start' ? '出發日期' : '回程日期'}
        color={activeDateInput === 'start' ? 'indigo' : 'matcha'}
      />
    </div>
  );
};

export default Onboarding;
