
import React, { useState, useRef, useMemo } from 'react';
import { DiaryEntry, DiaryPhoto, DayItinerary } from '../types';
import { compressImage } from '../services/imageService';
import Calendar from './Calendar';

interface Props {
  entries: DiaryEntry[];
  itinerary: DayItinerary[];
  onAddEntry: (entry: DiaryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (entry: DiaryEntry) => void;
}

const Diary: React.FC<Props> = ({ entries, itinerary, onAddEntry, onDeleteEntry, onUpdateEntry }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editor State
  const [date, setDate] = useState('');
  
  // Custom Time State (24h format)
  const [timeHour, setTimeHour] = useState('09');
  const [timeMinute, setTimeMinute] = useState('00');

  const [linkedActivityId, setLinkedActivityId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<DiaryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<DiaryPhoto | null>(null); 
  
  // Calendar State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));

  // Use string comparison for dates to avoid timezone issues with `new Date()`
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a,b) => b.date.localeCompare(a.date));
  }, [entries]);

  // Flatten itinerary activities for the dropdown
  const availableActivities = useMemo(() => {
      return itinerary.flatMap(day => day.activities.map(act => ({
          id: act.id,
          title: act.title,
          dayDate: day.id,
          time: act.time
      })));
  }, [itinerary]);

  const parseTime = (t: string) => {
      if (!t) return { h: '09', m: '00' };
      const [hStr, mStr] = t.split(':');
      return { 
          h: hStr?.padStart(2, '0') || '09', 
          m: mStr?.padStart(2, '0') || '00' 
      };
  };

  const getLocalCurrentDate = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const getLocalCurrentTime = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Safe parsing of "YYYY-MM-DD" to avoid timezone shifts
  const getDisplayDateComponents = (dateStr: string) => {
      if (!dateStr) return { day: '--', month: '---' };
      const [y, m, d] = dateStr.split('-').map(Number);
      // Create date at local noon or safely construct
      const dateObj = new Date(y, m - 1, d);
      return {
          day: d,
          month: dateObj.toLocaleDateString('en-US', { month: 'short' }),
          full: dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      };
  };

  const handleOpenEditor = (entry?: DiaryEntry) => {
    if (entry) {
        setEditingId(entry.id);
        setDate(entry.date);
        
        const { h, m } = parseTime(entry.time || '');
        setTimeHour(h);
        setTimeMinute(m);

        setLinkedActivityId(entry.linkedActivityId || '');
        setTitle(entry.title);
        setContent(entry.content);
        setPhotos(entry.photos || []);
    } else {
        setEditingId(null);
        setDate(getLocalCurrentDate()); 
        
        const { h, m } = parseTime(getLocalCurrentTime());
        setTimeHour(h);
        setTimeMinute(m);

        setLinkedActivityId('');
        setTitle('');
        setContent('');
        setPhotos([]);
    }
    setIsEditorOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = async () => {
              const rawBase64 = reader.result as string;
              // Use shared compressImage
              const webp = await compressImage(rawBase64);
              
              const newPhoto: DiaryPhoto = {
                  id: Date.now().toString(),
                  url: webp,
                  caption: ''
              };
              setPhotos([...photos, newPhoto]);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSave = () => {
      if (!title.trim() && !content.trim()) return;

      const finalTime = `${timeHour.padStart(2,'0')}:${timeMinute.padStart(2,'0')}`;

      const entry: DiaryEntry = {
          id: editingId || Date.now().toString(),
          date,
          time: finalTime,
          linkedActivityId,
          title: title || '無題',
          content,
          photos
      };

      if (editingId) {
          onUpdateEntry(entry);
      } else {
          onAddEntry(entry);
      }
      setIsEditorOpen(false);
  };

  const handleDeleteEntry = (id: string) => {
      onDeleteEntry(id);
  };
  
  const handleDeletePhoto = (photoId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setPhotos(photos.filter(p => p.id !== photoId));
  };

  // For editor display
  const displayDateComponents = getDisplayDateComponents(date || getLocalCurrentDate());
  const displayDateStr = `${displayDateComponents.month} / ${displayDateComponents.day.toString().padStart(2, '0')}`;
  const displayYearStr = date ? date.split('-')[0] : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-transparent pt-28 pb-40 px-4">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
            <h1 className="font-serif text-3xl text-ink-900 tracking-wide mb-2">Travel Journal</h1>
            <p className="text-xs font-sans text-ink-400 uppercase tracking-widest">Capture your moments</p>
        </div>

        {/* Blog Style Layout */}
        <div className="max-w-xl mx-auto space-y-8">
            {sortedEntries.map((entry) => {
                const dateComp = getDisplayDateComponents(entry.date);
                const firstPhoto = entry.photos && entry.photos.length > 0 ? entry.photos[0] : null;

                return (
                <div key={entry.id} className="animate-fade-in-up">
                    <div 
                        onClick={() => handleOpenEditor(entry)}
                        className="bg-white rounded-2xl shadow-float overflow-hidden cursor-pointer group"
                    >
                         {/* Header: Date & Title */}
                         <div className="p-6 pb-2">
                             <div className="flex justify-between items-start mb-3">
                                 <div className="flex items-center gap-3">
                                     {/* Avatar/Author placeholder */}
                                     <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center text-[10px] text-ink-400 font-bold border border-ink-50">ME</div>
                                     <div className="flex flex-col">
                                         <span className="text-[10px] font-bold uppercase tracking-widest text-ink-900">My Travel Log</span>
                                         <span className="text-[10px] text-ink-400">{dateComp.full}</span>
                                     </div>
                                 </div>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }}
                                    className="text-ink-200 hover:text-red-400 p-2"
                                 >
                                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                 </button>
                             </div>
                         </div>

                         {/* Main Photo (Instagram Style) */}
                         {firstPhoto && (
                             <div className="w-full aspect-[4/3] bg-ink-50 relative overflow-hidden">
                                 <img src={firstPhoto.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Main" />
                                 {entry.photos.length > 1 && (
                                     <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-[10px] backdrop-blur-sm">
                                         + {entry.photos.length - 1}
                                     </div>
                                 )}
                             </div>
                         )}

                         {/* Content */}
                         <div className="p-6 pt-4">
                             <h3 className="font-serif text-2xl font-bold text-ink-900 mb-2 leading-tight">{entry.title}</h3>
                             <p className="text-ink-600 font-serif text-sm leading-relaxed line-clamp-3 mb-4 whitespace-pre-line">
                                 {entry.content}
                             </p>
                             <div className="flex justify-between items-center pt-2 border-t border-ink-50">
                                 <div className="text-[10px] text-ink-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                     <span>{entry.time}</span>
                                     {entry.linkedActivityId && <span>• At Activity</span>}
                                 </div>
                                 <span className="text-[10px] text-accent-indigo font-bold uppercase tracking-widest group-hover:underline">Read More</span>
                             </div>
                         </div>
                    </div>
                </div>
            )})}
            
            {sortedEntries.length === 0 && (
                <div className="text-center py-20 opacity-40">
                    <p className="font-serif italic text-ink-400 text-lg">Start capturing memories...</p>
                </div>
            )}
        </div>

        {/* FAB */}
        <button 
            onClick={() => handleOpenEditor()}
            className="fixed bottom-24 right-6 w-16 h-16 bg-ink-900 text-white rounded-full shadow-float flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30"
        >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>

        {/* Editor Modal */}
        {isEditorOpen && (
            <div className="fixed inset-0 z-[60] bg-[#F9F9F7] flex flex-col animate-slide-up">
                {/* Editor Header */}
                <div className="flex items-center justify-between p-4 bg-white border-b border-ink-100">
                    <button onClick={() => setIsEditorOpen(false)} className="text-ink-400 hover:text-ink-900 p-2 active:scale-95">
                        <span className="text-xs font-bold uppercase tracking-widest">Cancel</span>
                    </button>
                    <span className="font-serif font-bold text-ink-900">
                        {editingId ? 'Edit Post' : 'New Post'}
                    </span>
                    <button onClick={handleSave} className="text-ink-900 font-bold bg-accent-matcha/20 px-4 py-2 rounded hover:bg-accent-matcha/40 active:scale-95 transition-colors">
                        <span className="text-xs uppercase tracking-widest text-ink-900">Publish</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
                    
                     <div className="flex flex-col gap-6 mb-8">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div onClick={() => setIsCalendarOpen(true)} className="flex-1 bg-white border border-ink-200 px-5 py-3 rounded-xl shadow-sm flex flex-col cursor-pointer hover:border-ink-900 transition-all group">
                                <span className="text-[10px] text-accent-indigo uppercase tracking-widest mb-1 group-hover:text-ink-900">Date</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-serif font-bold text-ink-900 leading-none">{displayDateStr}</span>
                                    <span className="text-xs text-ink-400 font-sans">{displayYearStr}</span>
                                </div>
                            </div>
                            <div className="flex-1 sm:max-w-xs bg-white border border-ink-200 px-4 py-3 rounded-xl shadow-sm flex flex-col hover:border-ink-900 transition-all">
                                <span className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">Time (24h)</span>
                                <div className="flex items-baseline gap-1">
                                    <select value={timeHour} onChange={(e) => setTimeHour(e.target.value)} className="bg-transparent font-serif text-xl outline-none text-ink-900 p-0 cursor-pointer appearance-none text-center min-w-[2ch]">
                                        {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <span className="text-ink-300">:</span>
                                    <select value={timeMinute} onChange={(e) => setTimeMinute(e.target.value)} className="bg-transparent font-serif text-xl outline-none text-ink-900 p-0 cursor-pointer appearance-none text-center min-w-[2ch]">
                                        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                             <label className="block text-[10px] text-ink-400 uppercase tracking-widest mb-2">Location / Activity</label>
                             <select value={linkedActivityId} onChange={(e) => setLinkedActivityId(e.target.value)} className="w-full bg-white border border-ink-200 rounded-xl px-4 py-3 font-serif text-ink-900 outline-none appearance-none hover:border-ink-900 transition-all">
                                 <option value="">-- General / No Location --</option>
                                 {availableActivities.map(act => (
                                     <option key={act.id} value={act.id}>{act.dayDate} | {act.time} {act.title}</option>
                                 ))}
                             </select>
                        </div>
                    </div>

                    <input type="text" placeholder="Title..." value={title} onChange={e => setTitle(e.target.value)} className="w-full text-3xl font-serif font-bold text-ink-900 placeholder-ink-200 bg-transparent outline-none mb-6" />

                    <div className="relative mb-8">
                        <textarea placeholder="Write your story..." value={content} onChange={e => setContent(e.target.value)} className="w-full h-64 bg-white/50 border border-ink-100 rounded-lg p-4 font-serif text-lg leading-relaxed text-ink-800 placeholder-ink-200 outline-none resize-none shadow-inner focus:bg-white transition-colors" />
                    </div>

                    <div className="mb-20">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Gallery</span>
                            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest flex items-center gap-1 hover:underline">＋ Add Photos</button>
                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {photos.map((photo, idx) => (
                                <div key={photo.id} className="relative group aspect-square">
                                    <div onClick={() => setSelectedPhoto(photo)} className="w-full h-full rounded-xl overflow-hidden cursor-zoom-in relative">
                                        <img src={photo.url} className="w-full h-full object-cover" alt="thumb" />
                                    </div>
                                    <button onClick={(e) => handleDeletePhoto(photo.id, e)} className="absolute top-2 right-2 bg-black/50 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-red-500 transition-colors z-20">
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Fullscreen Image Viewer */}
        {selectedPhoto && (
            <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedPhoto(null)}>
                <img src={selectedPhoto.url} className="max-w-full max-h-[85vh] object-contain shadow-2xl" alt="full" />
                <button onClick={() => setSelectedPhoto(null)} className="absolute bottom-10 bg-white/20 hover:bg-white/40 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md">✕</button>
            </div>
        )}
        
        <Calendar isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onSelect={(newDate) => setDate(newDate)} selectedDate={date} title="日記日期 Date" color="indigo" />
    </div>
  );
};

export default Diary;
