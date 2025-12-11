
import React, { useState, useRef } from 'react';
import { PrepItem, PrepCategory } from '../types';
import { compressImage } from '../services/imageService';

interface Props {
  items: PrepItem[];
  onUpdateItems: (items: PrepItem[]) => void;
  onAddToItinerary?: (item: PrepItem) => void;
}

const CATEGORIES: { id: PrepCategory; label: string; icon: React.ReactNode; color: string, activeTextColor: string, borderColor: string }[] = [
    { 
      id: 'TODO', 
      label: '待辦事項', 
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, 
      color: 'bg-accent-indigo',
      activeTextColor: 'text-white',
      borderColor: 'border-accent-indigo'
    },
    { 
      id: 'PACKING', 
      label: '行李清單', 
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>, 
      color: 'bg-accent-wood',
      activeTextColor: 'text-white',
      borderColor: 'border-accent-wood'
    },
    { 
      id: 'WISHLIST', 
      label: '想去的地點', // Renamed from 願望清單
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, 
      color: 'bg-accent-sakura',
      activeTextColor: 'text-ink-900',
      borderColor: 'border-accent-sakura'
    },
    { 
      id: 'SHOPPING', 
      label: '購物清單', 
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, 
      color: 'bg-accent-matcha',
      activeTextColor: 'text-white',
      borderColor: 'border-accent-matcha'
    },
];

const Preparation: React.FC<Props> = ({ items, onUpdateItems, onAddToItinerary }) => {
  const [activeTab, setActiveTab] = useState<PrepCategory>('TODO');
  
  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<{text: string, notes: string, image?: string}>({text: '', notes: ''});
  
  // Viewers
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(i => i.category === activeTab);

  const handleToggle = (id: string) => {
      onUpdateItems(items.map(i => i.id === id ? { ...i, isChecked: !i.isChecked } : i));
  };

  const handleOpenAdd = () => {
      setEditingId(null);
      setDraftItem({text: '', notes: ''});
      setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: PrepItem) => {
      setEditingId(item.id);
      setDraftItem({text: item.text, notes: item.notes || '', image: item.image});
      setIsEditorOpen(true);
  };

  const handleDelete = () => {
      if (editingId) {
          onUpdateItems(items.filter(i => i.id !== editingId));
          setIsEditorOpen(false);
      }
  };

  const handleSave = () => {
      if (!draftItem.text.trim()) return;

      if (editingId) {
          onUpdateItems(items.map(i => i.id === editingId ? { ...i, text: draftItem.text, notes: draftItem.notes, image: draftItem.image } : i));
      } else {
          const newItem: PrepItem = {
              id: Date.now().toString(),
              category: activeTab,
              text: draftItem.text,
              notes: draftItem.notes,
              isChecked: false,
              image: draftItem.image
          };
          onUpdateItems([...items, newItem]);
      }
      setIsEditorOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          const compressed = await compressImage(rawBase64);
          setDraftItem(prev => ({ ...prev, image: compressed }));
        };
        reader.readAsDataURL(file);
      }
  };

  const activeCategoryStyle = CATEGORIES.find(c => c.id === activeTab);

  return (
    <div className="min-h-screen bg-transparent pt-28 pb-40 px-4">
        
        {/* Header Tabs - Updated to touch-pan-x for proper horizontal scrolling */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-6 px-1 touch-pan-x">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => { setActiveTab(cat.id); setIsEditorOpen(false); }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all shrink-0 shadow-sm active:scale-95 ${
                        activeTab === cat.id 
                        ? `${cat.color} ${cat.activeTextColor} ${cat.borderColor} shadow-md scale-105` 
                        : 'bg-white text-ink-400 border-ink-100 hover:border-ink-300 hover:text-ink-900'
                    }`}
                >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-xs font-bold tracking-wider uppercase">{cat.label}</span>
                </button>
            ))}
        </div>

        {/* Add Button */}
        {!isEditorOpen && (
             <div className="flex justify-end mb-4">
                <button 
                    onClick={handleOpenAdd}
                    className="flex items-center gap-2 bg-ink-900 text-white px-5 py-3 rounded-full shadow-float hover:scale-105 active:scale-95 transition-all text-xs font-bold uppercase tracking-widest"
                >
                    <span>＋ 新增{activeCategoryStyle?.label}</span>
                </button>
             </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
            {filteredItems.map(item => (
                <div key={item.id} className="bg-white/80 backdrop-blur rounded-xl p-4 border border-ink-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="flex items-start gap-4">
                        <button 
                            onClick={() => handleToggle(item.id)}
                            className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.isChecked ? 'bg-ink-300 border-ink-300 text-white' : 'border-ink-200 text-transparent hover:border-ink-400'}`}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        </button>
                        
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenEdit(item)}>
                            <div className="flex justify-between items-start">
                                <span className={`font-serif text-lg leading-snug break-words ${item.isChecked ? 'text-ink-300 line-through' : 'text-ink-900'}`}>{item.text}</span>
                                {item.image && (
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); setZoomedImage(item.image!); }}
                                        className="w-12 h-12 rounded border border-ink-100 overflow-hidden shrink-0 ml-2"
                                    >
                                        <img src={item.image} className="w-full h-full object-cover" alt="thumb" />
                                    </div>
                                )}
                            </div>
                            {item.notes && <p className="text-sm text-ink-500 mt-1">{item.notes}</p>}
                            
                            {/* Special Actions for specific categories */}
                            {activeTab === 'WISHLIST' && onAddToItinerary && (
                                <div className="mt-3 pt-2 border-t border-ink-50">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onAddToItinerary(item); }}
                                        className="text-[10px] font-bold uppercase tracking-widest text-accent-indigo hover:underline flex items-center gap-1"
                                    >
                                        <span>＋ Add to Itinerary</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            {filteredItems.length === 0 && (
                <div className="text-center py-20 opacity-30 font-serif italic text-ink-400">
                    No items in {activeCategoryStyle?.label}.
                </div>
            )}
        </div>

        {/* Editor Modal */}
        {isEditorOpen && (
             <div className="fixed inset-0 z-[60] bg-white/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                 <div className="w-full max-w-sm bg-white border border-ink-100 p-8 shadow-float relative rounded-2xl animate-slide-up">
                     <button onClick={() => setIsEditorOpen(false)} className="absolute top-4 right-4 text-ink-400 hover:text-ink-900">✕</button>
                     <h3 className="text-xl font-serif font-bold mb-6 text-ink-900 tracking-wide">{editingId ? 'Edit Item' : 'Add New Item'}</h3>
                     
                     <div className="space-y-4">
                         <div>
                             <label className="text-[10px] uppercase tracking-[0.2em] text-ink-400 block mb-2">Content</label>
                             <input 
                                autoFocus
                                className="w-full bg-ink-50 border border-ink-200 rounded p-3 outline-none font-serif text-ink-900 placeholder-ink-300 focus:border-ink-900 transition-colors"
                                placeholder={activeTab === 'WISHLIST' ? "Place Name" : "Item Name"}
                                value={draftItem.text}
                                onChange={e => setDraftItem({...draftItem, text: e.target.value})}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                             />
                         </div>
                         <div>
                             <label className="text-[10px] uppercase tracking-[0.2em] text-ink-400 block mb-2">Notes</label>
                             <textarea 
                                className="w-full bg-ink-50 border border-ink-200 rounded p-3 outline-none font-sans text-sm text-ink-900 placeholder-ink-300 focus:border-ink-900 transition-colors h-20 resize-none"
                                placeholder="Details..."
                                value={draftItem.notes}
                                onChange={e => setDraftItem({...draftItem, notes: e.target.value})}
                             />
                         </div>
                         
                         {(activeTab === 'WISHLIST' || activeTab === 'SHOPPING') && (
                             <div>
                                 <div className="flex justify-between items-center mb-2">
                                     <label className="text-[10px] uppercase tracking-[0.2em] text-ink-400">Photo</label>
                                     <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest hover:underline">
                                         {draftItem.image ? 'Change' : 'Add Photo'}
                                     </button>
                                     <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                                 </div>
                                 {draftItem.image && (
                                     <div className="relative w-20 h-20 group">
                                         <img src={draftItem.image} className="w-full h-full object-cover rounded border border-ink-200" alt="preview" />
                                         <button onClick={() => setDraftItem({...draftItem, image: undefined})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm">✕</button>
                                     </div>
                                 )}
                             </div>
                         )}

                         <div className="flex gap-3 pt-4 border-t border-ink-50">
                             {editingId && (
                                 <button onClick={handleDelete} className="flex-1 py-3 border border-red-200 text-red-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-red-50 transition-colors">
                                     Delete
                                 </button>
                             )}
                             <button onClick={handleSave} disabled={!draftItem.text} className="flex-[2] bg-ink-900 text-white py-3 font-bold text-xs uppercase tracking-widest rounded shadow-md hover:bg-ink-700 disabled:opacity-50 transition-all">
                                 Save
                             </button>
                         </div>
                     </div>
                 </div>
             </div>
        )}

        {/* Zoom Modal */}
        {zoomedImage && (
            <div className="fixed inset-0 z-[1002] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
                <img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain" alt="Full" />
                <button className="absolute bottom-10 text-white bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">Close</button>
            </div>
        )}

    </div>
  );
};

export default Preparation;
