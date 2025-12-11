import React, { useState, useEffect } from 'react';

interface CalendarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate?: string;
  minDate?: string;
  title?: string;
  color?: 'indigo' | 'matcha';
}

type ViewMode = 'day' | 'month' | 'year';

const Calendar: React.FC<CalendarProps> = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedDate, 
  minDate, 
  title,
  color = 'indigo'
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');

  // Initialize viewDate
  useEffect(() => {
    if (isOpen) {
        if (selectedDate) {
            setViewDate(new Date(selectedDate));
        } else if (minDate) {
            setViewDate(new Date(minDate));
        } else {
            setViewDate(new Date());
        }
        setViewMode('day'); // Reset to day view when opening
    }
  }, [isOpen, selectedDate, minDate]);

  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  // Day View Logic
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  // Handlers
  const handleDateClick = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (minDate && dateStr < minDate) return;
    onSelect(dateStr);
    onClose();
  };

  const handlePrev = () => {
    if (viewMode === 'day') setViewDate(new Date(year, month - 1, 1));
    if (viewMode === 'year') setViewDate(new Date(year - 12, month, 1)); 
  };
  
  const handleNext = () => {
    if (viewMode === 'day') setViewDate(new Date(year, month + 1, 1));
    if (viewMode === 'year') setViewDate(new Date(year + 12, month, 1));
  };

  const selectMonth = (m: number) => {
      setViewDate(new Date(year, m, 1));
      setViewMode('day');
  };

  const selectYear = (y: number) => {
      setViewDate(new Date(y, month, 1));
      setViewMode('month'); // Usually picking year then month is natural
  };

  // Styling
  const accentColor = color === 'matcha' ? 'text-accent-matcha' : 'text-accent-indigo';
  const bgColor = color === 'matcha' ? 'bg-accent-matcha' : 'bg-accent-indigo';

  // Years generation for year view
  const years = [];
  const startYear = year - 6; // Center somewhat
  for (let i = 0; i < 12; i++) {
      years.push(startYear + i);
  }

  const MONTH_NAMES = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const isDisabled = (date: Date) => {
     if (!minDate) return false;
     const y = date.getFullYear();
     const m = (date.getMonth() + 1).toString().padStart(2, '0');
     const d = date.getDate().toString().padStart(2, '0');
     return `${y}-${m}-${d}` < minDate;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
      <div 
        className="absolute inset-0 bg-ink-900/20 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative w-[90%] max-w-[340px] bg-[#F9F9F7] rounded-2xl shadow-2xl p-6 pointer-events-auto animate-fade-in border border-white/50">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-ink-100">
             {viewMode !== 'month' && (
                <button onClick={handlePrev} className="p-2 hover:bg-black/5 rounded-full text-ink-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
             )}
             {viewMode === 'month' && <div className="w-9"></div>} {/* Spacer */}

             <div className="flex flex-col items-center">
                <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${accentColor} mb-1`}>{title || '選擇日期'}</span>
                <div className="flex items-baseline gap-2">
                    <button 
                        onClick={() => setViewMode('year')}
                        className={`text-xl font-serif font-medium hover:text-ink-600 transition-colors ${viewMode === 'year' ? 'text-ink-900 underline decoration-2 underline-offset-4 decoration-accent-mustard' : 'text-ink-900'}`}
                    >
                        {year}
                    </button>
                    <span className="text-xl font-serif text-ink-900">年</span>
                    <button 
                        onClick={() => setViewMode('month')} 
                        className={`text-xl font-serif font-medium hover:text-ink-600 transition-colors ${viewMode === 'month' ? 'text-ink-900 underline decoration-2 underline-offset-4 decoration-accent-mustard' : 'text-ink-900'}`}
                    >
                        {MONTH_NAMES[month]}
                    </button>
                </div>
             </div>

             {viewMode !== 'month' && (
                <button onClick={handleNext} className="p-2 hover:bg-black/5 rounded-full text-ink-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
             )}
              {viewMode === 'month' && <div className="w-9"></div>}
        </div>

        {/* Views */}
        <div className="min-h-[280px]">
            {viewMode === 'day' && (
                <>
                    <div className="grid grid-cols-7 mb-2">
                        {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                            <div key={i} className={`text-center text-sm font-serif font-bold py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-accent-indigo' : 'text-ink-400'}`}>
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((date, idx) => {
                            if (!date) return <div key={`empty-${idx}`}></div>;
                            const isSel = selectedDate && new Date(selectedDate).toDateString() === date.toDateString();
                            const dis = isDisabled(date);
                            const today = new Date().toDateString() === date.toDateString();
                            const dayOfWeek = date.getDay();
                            
                            let txtColor = 'text-ink-900';
                            if (!dis && !isSel) {
                                if (dayOfWeek === 0) txtColor = 'text-red-500';
                                else if (dayOfWeek === 6) txtColor = 'text-accent-indigo';
                            }
                            if (dis) txtColor = 'text-ink-200';
                            if (isSel) txtColor = 'text-white';

                            return (
                                <button
                                    key={idx}
                                    disabled={dis}
                                    onClick={() => handleDateClick(date)}
                                    className={`relative h-10 w-full flex items-center justify-center text-base font-serif transition-all rounded-full ${txtColor} ${dis ? 'cursor-not-allowed' : 'hover:bg-black/5'} ${isSel ? `${bgColor} shadow-md` : ''}`}
                                >
                                    {date.getDate()}
                                    {!isSel && !dis && today && <div className="absolute inset-1 border border-accent-wood rounded-full opacity-50"></div>}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {viewMode === 'month' && (
                <div className="grid grid-cols-3 gap-4 py-4">
                    {MONTH_NAMES.map((m, i) => (
                        <button
                            key={m}
                            onClick={() => selectMonth(i)}
                            className={`py-4 rounded-lg text-base font-serif border border-transparent hover:border-ink-200 transition-all ${i === month ? `${bgColor} text-white shadow-md` : 'text-ink-900 bg-white'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            )}

            {viewMode === 'year' && (
                <div className="grid grid-cols-3 gap-4 py-4">
                    {years.map(y => (
                        <button
                            key={y}
                            onClick={() => selectYear(y)}
                            className={`py-4 rounded-lg text-base font-serif border border-transparent hover:border-ink-200 transition-all ${y === year ? `${bgColor} text-white shadow-md` : 'text-ink-900 bg-white'}`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default Calendar;