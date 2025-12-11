
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TripSettings, Expense, ExpenseCategory, SplitMember } from '../types';
import { compressImage } from '../services/imageService';

interface Props {
  settings: TripSettings;
  expenses: Expense[];
  categories: ExpenseCategory[];
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateCategories: (categories: ExpenseCategory[]) => void;
}

const AVAILABLE_ICONS: Record<string, React.ReactNode> = {
  'food': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>,
  'transport': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h0"/><path d="M16 15h0"/></svg>,
  'shopping': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  'stay': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>,
  'ticket': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  'coffee': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  'drink': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.5-3.3.3.9.6 1.8.5 2.8z"/></svg>,
  'gift': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>,
  'medical': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="6" rx="2"/><path d="M3 10h18"/><path d="M12 10v12"/><path d="M8 14h8"/></svg>,
  'camera': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  'map': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  'other': <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
};

const Expenses: React.FC<Props> = ({ settings, expenses, categories, onAddExpense, onUpdateExpense, onDeleteExpense, onUpdateCategories }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash', 'Credit Card', 'Apple Pay']);
  const [managingMethods, setManagingMethods] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');

  // Initial setup for payment methods
  useEffect(() => {
      // Basic check for destinations to auto-add cards
      const destStr = settings.destinations.join(' ').toLowerCase();
      const newMethods = new Set([...paymentMethods]);
      if (destStr.includes('korea') || destStr.includes('seoul')) {
          newMethods.add('Wowpass');
          newMethods.add('T-Money');
      }
      if (destStr.includes('japan') || destStr.includes('tokyo') || destStr.includes('osaka')) {
          newMethods.add('Suica');
          newMethods.add('ICOCA');
          newMethods.add('Pasmo');
      }
      if (destStr.includes('china')) {
          newMethods.add('Alipay');
          newMethods.add('WeChat Pay');
      }
      if (destStr.includes('taiwan')) {
          newMethods.add('EasyCard');
      }
      setPaymentMethods(Array.from(newMethods));
  }, []);

  // Helper to get default members strictly from Settings
  const getLockedMembers = () => {
      // Always "Me" + Settings Companions. No adding new people here.
      const names = ['Me', ...(settings.companions || [])];
      return names.map(name => ({
          name, 
          amount: 0, 
          isManual: false,
          included: true // Default everyone is part of the bill
      }));
  };

  // Input State
  const [formData, setFormData] = useState<Partial<Expense>>({
    currency: settings.targetCurrency,
    category: categories[0]?.id || 'Food',
    isSplit: false,
    paymentMethod: 'Cash',
    splitDetails: 'Me' // Used for Payer initially
  });
  
  // Changed default to HOME to prevent users from accidentally entering Home amount in Foreign mode and getting multiplied
  const [inputCurrency, setInputCurrency] = useState<'FOREIGN' | 'HOME' | 'USD'>('HOME');
  const [inputValue, setInputValue] = useState<string>(''); 
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('other');
  
  // State for split members
  const [splitMembers, setSplitMembers] = useState<{name: string, amount: number, isManual: boolean, included: boolean}[]>(getLockedMembers());
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSpentHome = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amountHome, 0), [expenses]);
  
  const totalSpentForeign = useMemo(() => expenses.reduce((sum, exp) => {
      if (exp.currency === 'USD') return sum; 
      return sum + exp.amountForeign;
  }, 0), [expenses]);

  const getCurrentTotal = () => {
      if (inputCurrency === 'FOREIGN') return formData.amountForeign || 0;
      if (inputCurrency === 'HOME') return formData.amountHome || 0;
      return formData.amountForeign || 0; // USD
  };

  useEffect(() => {
      // Sync input value when changing currencies or loading data
      if (formData.amountForeign !== undefined && formData.amountHome !== undefined) {
          if (inputCurrency === 'FOREIGN') {
              setInputValue(formData.amountForeign.toString());
          } else if (inputCurrency === 'HOME') {
              setInputValue(Math.round(formData.amountHome).toString());
          } else if (inputCurrency === 'USD') {
              setInputValue(formData.amountForeign.toString()); // If USD mode, amountForeign holds USD val
          }
      } else {
          setInputValue('');
      }
  }, [inputCurrency, formData.amountForeign, formData.amountHome]);

  // Logic to distribute remaining amount among INCLUDED members
  const distributeRemaining = (members: typeof splitMembers, total: number) => {
      // Only consider members who are checked (included)
      const includedMembers = members.filter(m => m.included);
      
      const manualSum = includedMembers.reduce((sum, m) => m.isManual ? sum + m.amount : sum, 0);
      
      const remaining = Math.max(0, total - manualSum);
      const autoCount = includedMembers.filter(m => !m.isManual).length;

      const newMembers = members.map(m => {
          if (!m.included) {
              return { ...m, amount: 0, isManual: false }; // Reset excluded members
          }
          if (m.isManual) return m; // Keep manual value
          
          // Is Auto, and Included
          if (autoCount > 0) {
              const rawShare = remaining / autoCount;
              // Simple rounding to 2 decimals
              return { ...m, amount: Math.floor(rawShare * 100) / 100 };
          } else {
              return { ...m, amount: 0 };
          }
      });
      
      return newMembers;
  };

  const handleAmountChange = (valStr: string) => {
      setInputValue(valStr);
      const val = parseFloat(valStr);
      
      let newAmountForeign = 0;
      let newAmountHome = 0;
      let totalForSplit = 0;

      const rate = (settings.exchangeRate && settings.exchangeRate > 0) ? settings.exchangeRate : 1;

      if (isNaN(val)) {
          newAmountForeign = 0;
          newAmountHome = 0;
          totalForSplit = 0;
      } else {
          if (inputCurrency === 'FOREIGN') {
              newAmountForeign = val;
              newAmountHome = parseFloat((val * rate).toFixed(2));
              totalForSplit = val;
          } else if (inputCurrency === 'HOME') {
              newAmountHome = val;
              newAmountForeign = parseFloat((val / rate).toFixed(2));
              totalForSplit = val;
          } else if (inputCurrency === 'USD') {
              const usdToTwd = 32; 
              newAmountForeign = val; 
              newAmountHome = parseFloat((val * usdToTwd).toFixed(2));
              totalForSplit = val;
          }
      }

      setFormData(prev => ({
          ...prev,
          amountForeign: newAmountForeign,
          amountHome: newAmountHome,
          currency: inputCurrency === 'USD' ? 'USD' : (inputCurrency === 'FOREIGN' ? settings.targetCurrency : settings.homeCurrency)
      }));

      // Immediate Recalculate Splits
      setSplitMembers(prev => distributeRemaining(prev, totalForSplit));
  };

  const handleSplitMemberAmountChange = (index: number, value: string) => {
      const total = getCurrentTotal();
      setSplitMembers(prev => {
          const newArr = [...prev];
          const val = parseFloat(value);
          // If value is empty or NaN, treat as 0 but keep manual? Or remove manual if empty?
          // Let's assume if user types, it's manual.
          if (isNaN(val)) {
             newArr[index] = { ...newArr[index], amount: 0, isManual: true, included: true };
          } else {
             newArr[index] = { ...newArr[index], amount: val, isManual: true, included: true };
          }
          return distributeRemaining(newArr, total);
      });
  };

  const handleToggleMemberInclusion = (index: number) => {
      const total = getCurrentTotal();
      setSplitMembers(prev => {
          const newArr = [...prev];
          const wasIncluded = newArr[index].included;
          // Toggle. If re-enabling, reset manual to false (auto)
          newArr[index] = { ...newArr[index], included: !wasIncluded, isManual: false };
          return distributeRemaining(newArr, total);
      });
  };

  const currentSplitSum = useMemo(() => {
      return splitMembers.reduce((acc, m) => acc + (m.included ? m.amount : 0), 0);
  }, [splitMembers]);

  const splitMismatch = useMemo(() => {
      const total = getCurrentTotal();
      const diff = Math.abs(total - currentSplitSum);
      return diff > 0.1 ? (total - currentSplitSum) : 0;
  }, [currentSplitSum, formData.amountForeign, formData.amountHome, inputCurrency]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        // Compress Image
        const compressedBase64 = await compressImage(rawBase64);
        setFormData(prev => ({ ...prev, image: compressedBase64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveExpense = () => {
    if(!formData.item || (!formData.amountForeign && !formData.amountHome)) return;

    let finalSplitMembers: SplitMember[] = [];
    if (formData.isSplit) {
        // Only save included members with amount > 0 (or allow 0 if strictly included)
        finalSplitMembers = splitMembers
            .filter(m => m.included)
            .map(m => {
                return {
                    name: m.name,
                    amount: parseFloat(m.amount.toFixed(2))
                };
            });
    }

    const expenseObj: Expense = {
      id: editingId || Date.now().toString(),
      item: formData.item,
      amountForeign: formData.amountForeign || 0,
      amountHome: formData.amountHome || 0,
      currency: formData.currency || settings.targetCurrency, 
      category: formData.category || categories[0]?.id || 'Other',
      paymentMethod: formData.paymentMethod || 'Cash',
      isSplit: formData.isSplit || false,
      splitDetails: formData.splitDetails || 'Me', // Used as Payer
      splitMembers: formData.isSplit ? finalSplitMembers : [],
      date: formData.date || new Date().toISOString(),
      image: formData.image
    };

    if (editingId) {
        onUpdateExpense(expenseObj);
    } else {
        onAddExpense(expenseObj);
    }
    
    closeModal();
  };

  const handleDelete = () => {
      if (editingId) {
          onDeleteExpense(editingId);
          closeModal();
      }
  };

  const closeModal = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ currency: settings.targetCurrency, category: categories[0]?.id || 'Food', isSplit: false, paymentMethod: 'Cash', splitDetails: 'Me' });
    setInputValue('');
    setInputCurrency('HOME'); // Default to HOME to prevent errors
    
    // Reset to Locked Members from Settings
    setSplitMembers(getLockedMembers());
  };

  const handleAddCategory = () => {
      if (!newCatName.trim()) return;
      const newCat: ExpenseCategory = {
          id: Date.now().toString(),
          label: newCatName,
          color: 'border-ink-900 text-ink-900',
          icon: newCatIcon
      };
      onUpdateCategories([...categories, newCat]);
      setNewCatName('');
      setNewCatIcon('other');
  };

  const handleAddPaymentMethod = () => {
      if (!newMethodName.trim()) return;
      setPaymentMethods([...paymentMethods, newMethodName]);
      setNewMethodName('');
  };

  const handleDeletePaymentMethod = (method: string) => {
      setPaymentMethods(paymentMethods.filter(m => m !== method));
      if (formData.paymentMethod === method) {
          setFormData(prev => ({...prev, paymentMethod: paymentMethods[0]}));
      }
  };

  const handleDeleteCategory = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (categories.length <= 1) {
          alert('至少需要保留一個分類！');
          return;
      }
      const newCats = categories.filter(c => c.id !== id);
      onUpdateCategories(newCats);
      if (formData.category === id) {
          setFormData(prev => ({...prev, category: newCats[0].id}));
      }
  };

  const openAddView = () => {
      closeModal(); 
      setIsAdding(true);
  };

  const openEditView = (exp: Expense) => {
      setEditingId(exp.id);
      setFormData(exp);
      setInputCurrency(exp.currency === 'USD' ? 'USD' : (exp.currency === settings.homeCurrency ? 'HOME' : 'FOREIGN'));
      setInputValue(exp.currency === settings.homeCurrency ? Math.round(exp.amountHome ?? 0).toString() : (exp.amountForeign ?? 0).toString());
      
      // Merge saved split data with current Settings Members
      const lockedMembers = getLockedMembers();
      
      if (exp.isSplit && exp.splitMembers) {
          const merged = lockedMembers.map(lm => {
              const saved = exp.splitMembers?.find(sm => sm.name === lm.name);
              if (saved) {
                  // If saved, mark as manual to preserve exact value
                  return { ...lm, amount: saved.amount, included: true, isManual: true };
              } else {
                  // If not in saved but in locked, means excluded or 0
                  return { ...lm, amount: 0, included: false, isManual: false };
              }
          });
          setSplitMembers(merged);
      } else {
          setSplitMembers(lockedMembers);
      }

      setIsAdding(true);
  };

  const getCategoryIcon = (cat: ExpenseCategory | undefined) => {
      if (!cat) return AVAILABLE_ICONS['other'];
      if (cat.icon && AVAILABLE_ICONS[cat.icon]) return AVAILABLE_ICONS[cat.icon];
      switch(cat.id) {
          case 'Food': return AVAILABLE_ICONS['food'];
          case 'Transport': return AVAILABLE_ICONS['transport'];
          case 'Shopping': return AVAILABLE_ICONS['shopping'];
          case 'Stay': return AVAILABLE_ICONS['stay'];
          case 'Ticket': return AVAILABLE_ICONS['ticket'];
          default: return AVAILABLE_ICONS['other'];
      }
  };

  // --- ADD / EDIT OVERLAY ---
  if (isAdding) {
    return (
      <div className="fixed inset-0 bg-white z-[999] flex flex-col p-6 animate-slide-up overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
            <button onClick={closeModal} className="text-ink-900 hover:opacity-50 p-2 -ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            </button>
            <h2 className="text-xl font-serif text-ink-900 tracking-wide">{editingId ? '編輯消費' : '新增消費'}</h2>
            <div className="w-6"></div>
        </div>
        
        <div className="space-y-6 pb-32">
           {/* Amount Input */}
           <div>
               <label className="block text-[10px] uppercase tracking-[0.2em] text-ink-400 mb-2">金額 Amount</label>
               <div className="flex items-center justify-end mb-2">
                   <div className="bg-ink-50 rounded-full p-1 flex border border-ink-100">
                       <button onClick={() => setInputCurrency('FOREIGN')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${inputCurrency === 'FOREIGN' ? 'bg-ink-900 text-white shadow-sm' : 'text-ink-400 hover:text-ink-900'}`}>{settings.targetCurrency}</button>
                       <button onClick={() => setInputCurrency('HOME')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${inputCurrency === 'HOME' ? 'bg-ink-900 text-white shadow-sm' : 'text-ink-400 hover:text-ink-900'}`}>{settings.homeCurrency}</button>
                       <button onClick={() => setInputCurrency('USD')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${inputCurrency === 'USD' ? 'bg-ink-900 text-white shadow-sm' : 'text-ink-400 hover:text-ink-900'}`}>USD</button>
                   </div>
               </div>
               <div className="flex items-center gap-4 border-b border-ink-900 pb-2 overflow-hidden">
                    <span className="text-xl font-serif text-ink-400 shrink-0">
                        {inputCurrency === 'FOREIGN' ? settings.targetCurrency : (inputCurrency === 'USD' ? 'USD' : settings.homeCurrency)}
                    </span>
                    <input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0" 
                        autoFocus 
                        value={inputValue} 
                        onChange={e => handleAmountChange(e.target.value)} 
                        className="flex-1 min-w-0 text-5xl font-serif font-light text-ink-900 bg-transparent outline-none placeholder-ink-100 text-right overflow-x-auto" 
                    />
               </div>
               {formData.amountHome && inputCurrency !== 'HOME' && (
                   <p className="text-right text-sm text-ink-400 font-serif mt-2 tracking-wide">
                       ≈ {Math.round(formData.amountHome).toLocaleString()} {settings.homeCurrency}
                   </p>
               )}
           </div>

           {/* Item Name & Camera */}
           <div>
               <label className="block text-[10px] uppercase tracking-[0.2em] text-ink-400 mb-2">品項 Item</label>
               <div className="flex gap-3">
                   <div className="flex-1 border-b border-ink-200 pb-2">
                       <input type="text" placeholder="買了什麼？" value={formData.item || ''} onChange={e => setFormData({...formData, item: e.target.value})} className="w-full text-xl font-serif text-ink-900 bg-transparent outline-none placeholder-ink-200" />
                   </div>
                   <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-ink-200 rounded-lg text-ink-500 hover:bg-ink-900 hover:text-white transition-colors shrink-0 shadow-sm active:scale-95">
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                   </button>
               </div>
               {formData.image && (
                   <div className="mt-3 relative w-20 h-20 group cursor-zoom-in" onClick={() => setZoomedImage(formData.image!)}>
                       <img src={formData.image} alt="Receipt" className="w-full h-full object-cover rounded-lg border border-ink-100" />
                       <button onClick={(e) => { e.stopPropagation(); setFormData({...formData, image: undefined}); }} className="absolute -top-2 -right-2 w-5 h-5 bg-ink-900 text-white rounded-full flex items-center justify-center text-xs">✕</button>
                   </div>
               )}
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
           </div>
           
           {/* Payer Selection */}
           <div>
               <label className="text-[10px] uppercase tracking-[0.2em] text-ink-400 block mb-2">付款人 Payer</label>
               <select 
                   value={formData.splitDetails || 'Me'} 
                   onChange={(e) => setFormData({...formData, splitDetails: e.target.value})}
                   className="w-full bg-ink-50 border border-ink-200 rounded-lg py-3 px-4 text-sm font-bold text-ink-900 outline-none"
               >
                   {/* Payer options also locked to settings members */}
                   <option value="Me">Me (我)</option>
                   {settings.companions && settings.companions.map((c, idx) => (
                        <option key={idx} value={c}>{c}</option>
                   ))}
                   <option value="Other">Other</option>
               </select>
           </div>

           {/* Payment Method */}
           <div>
               <div className="flex justify-between items-baseline mb-3">
                   <label className="text-[10px] uppercase tracking-[0.2em] text-ink-400">支付方式 Payment</label>
                   <button onClick={() => setManagingMethods(!managingMethods)} className="text-[10px] font-bold text-accent-indigo underline uppercase tracking-widest">{managingMethods ? 'Done' : 'Edit'}</button>
               </div>
               {managingMethods ? (
                   <div className="bg-ink-50 p-4 rounded-xl border border-ink-100 mb-2">
                       <div className="flex flex-wrap gap-2 mb-4">
                           {paymentMethods.map(m => (
                               <div key={m} className="flex items-center gap-1 bg-white border border-ink-200 px-3 py-1 rounded-full text-xs">
                                   {m}
                                   <button onClick={() => handleDeletePaymentMethod(m)} className="text-red-500 ml-1">✕</button>
                               </div>
                           ))}
                       </div>
                       <div className="flex gap-2">
                           <input value={newMethodName} onChange={e => setNewMethodName(e.target.value)} placeholder="Add Method (e.g. Suica)" className="flex-1 bg-white border border-ink-200 rounded px-2 text-sm outline-none" />
                           <button onClick={handleAddPaymentMethod} className="bg-ink-900 text-white px-3 py-1 rounded text-xs font-bold uppercase">Add</button>
                       </div>
                   </div>
               ) : (
                   <div className="flex flex-wrap gap-2">
                       {paymentMethods.map(m => (
                           <button 
                               key={m} 
                               onClick={() => setFormData({...formData, paymentMethod: m})}
                               className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${formData.paymentMethod === m ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-500 border-ink-200 hover:border-ink-400'}`}
                           >
                               {m}
                           </button>
                       ))}
                   </div>
               )}
           </div>

           {/* Categories */}
           <div>
              <div className="flex justify-between items-baseline mb-3">
                 <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">分類 Category</span>
                 <button onClick={() => setManagingCategories(!managingCategories)} className="text-[10px] font-bold text-accent-indigo underline uppercase tracking-widest">{managingCategories ? 'Done' : 'Edit'}</button>
              </div>
              <div className="flex flex-wrap gap-4">
                  {categories.map(cat => (
                      <div key={cat.id} className="relative group">
                          <button onClick={() => setFormData({...formData, category: cat.id})} disabled={managingCategories} className={`flex flex-col items-center gap-2 transition-all ${formData.category === cat.id && !managingCategories ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100'} ${managingCategories ? 'opacity-100' : ''}`}>
                             <div className={`w-14 h-14 rounded-full border flex items-center justify-center transition-colors shadow-sm ${formData.category === cat.id && !managingCategories ? `bg-ink-900 text-white border-ink-900` : `bg-white text-ink-900 ${cat.color}`}`}>
                                {getCategoryIcon(cat)}
                             </div>
                             <span className="text-xs text-ink-500 font-serif tracking-wide">{cat.label}</span>
                          </button>
                          {managingCategories && <button onClick={(e) => handleDeleteCategory(cat.id, e)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-md animate-fade-in">✕</button>}
                      </div>
                  ))}
                  {managingCategories && (
                      <div className="w-full p-4 border border-dashed border-ink-200 rounded-xl bg-ink-50/50 mt-2 animate-fade-in">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400 block mb-3">Create New Category</span>
                          <div className="flex items-center gap-3 mb-4 overflow-x-auto no-scrollbar pb-2">
                                {Object.keys(AVAILABLE_ICONS).map(iconKey => (
                                    <button key={iconKey} onClick={() => setNewCatIcon(iconKey)} className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-all ${newCatIcon === iconKey ? 'bg-ink-900 text-white border-ink-900 scale-110' : 'bg-white text-ink-400 border-ink-200 hover:border-ink-400'}`}>
                                        {AVAILABLE_ICONS[iconKey]}
                                    </button>
                                ))}
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="flex-1 h-10 border-b border-ink-300 flex items-center">
                                <span className="mr-2 text-ink-500">{AVAILABLE_ICONS[newCatIcon]}</span>
                                <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category Name" className="w-full bg-transparent text-sm outline-none font-serif text-ink-900 placeholder-ink-300" onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                             </div>
                             <button onClick={handleAddCategory} disabled={!newCatName} className="px-4 py-2 bg-ink-900 text-white text-[10px] font-bold uppercase tracking-widest rounded disabled:opacity-50">Add</button>
                          </div>
                      </div>
                  )}
              </div>
           </div>

           {/* Split Section - ADVANCED AUTO/MANUAL */}
           <div className="pt-4 border-t border-ink-50">
                <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                        <input type="checkbox" id="split" checked={formData.isSplit || false} onChange={e => setFormData({...formData, isSplit: e.target.checked})} className="accent-ink-900 w-5 h-5" />
                        <label htmlFor="split" className="text-base font-serif text-ink-800 tracking-wide">分帳標記 (Split)</label>
                     </div>
                </div>

                {formData.isSplit && (
                    <div className="bg-ink-50/50 p-5 rounded-xl border border-ink-100 animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">選擇分帳成員</span>
                            <span className="text-[10px] text-ink-300 italic">{splitMembers.filter(m => m.included).length} selected</span>
                        </div>

                        <div className="space-y-4 mb-4">
                            {splitMembers.map((member, idx) => (
                                <div key={idx} className={`flex items-center gap-3 animate-fade-in ${!member.included ? 'opacity-50' : ''}`}>
                                    
                                    {/* Inclusion Checkbox */}
                                    <input 
                                        type="checkbox"
                                        checked={member.included}
                                        onChange={() => handleToggleMemberInclusion(idx)}
                                        className="w-5 h-5 accent-ink-900 shrink-0"
                                    />

                                    {/* Name Label */}
                                    <div className="flex-1 min-w-0">
                                        <span className={`block text-sm font-serif font-bold truncate ${member.included ? 'text-ink-900' : 'text-ink-400'}`}>
                                            {member.name}
                                        </span>
                                        {member.isManual && member.included && (
                                            <span className="text-[9px] text-accent-indigo uppercase font-bold tracking-wider">Manual Input</span>
                                        )}
                                    </div>

                                    {/* Amount Input */}
                                    <input 
                                        type="number"
                                        inputMode="decimal"
                                        value={member.amount}
                                        onChange={(e) => handleSplitMemberAmountChange(idx, e.target.value)}
                                        disabled={!member.included}
                                        className={`w-24 border rounded px-2 py-2 text-sm font-mono outline-none text-right transition-colors ${member.included ? (member.isManual ? 'bg-white border-accent-indigo text-ink-900' : 'bg-white border-ink-100 text-ink-900') : 'bg-transparent border-transparent text-ink-300'}`}
                                    />
                                    <span className={`text-[10px] w-8 text-right shrink-0 ${member.included ? 'text-ink-400' : 'text-ink-200'}`}>
                                        {inputCurrency === 'FOREIGN' ? settings.targetCurrency : (inputCurrency === 'USD' ? 'USD' : settings.homeCurrency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-3 border-t border-ink-100 flex flex-col gap-2">
                             <div className="flex justify-between items-center">
                                <div className="text-[9px] text-ink-300 italic">
                                    ※ 輸入金額鎖定數值，剩餘金額自動分配給其他選取成員
                                </div>
                                <div className="text-right text-[10px] text-ink-400 tracking-wider">
                                    Sum: {Number(currentSplitSum.toFixed(2))}
                                </div>
                             </div>
                             
                             {/* Validation Warning */}
                             {splitMismatch !== 0 && (
                                 <div className="bg-red-50 text-red-500 text-xs px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                                     <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                     <span>Amount Mismatch: {splitMismatch > 0 ? `+${splitMismatch.toFixed(2)}` : splitMismatch.toFixed(2)}</span>
                                 </div>
                             )}
                        </div>
                    </div>
                )}
           </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-ink-50 z-[1001] flex gap-3">
             {editingId && (
                 <button onClick={handleDelete} className="flex-1 py-4 bg-white border border-red-200 text-red-500 font-bold text-xs tracking-[0.25em] hover:bg-red-50 transition-colors uppercase rounded-sm flex items-center justify-center gap-2">
                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                     <span>刪除</span>
                 </button>
             )}
             <button onClick={saveExpense} disabled={!formData.amountForeign && !formData.amountHome || !formData.item} className={`py-4 bg-ink-900 text-white font-bold text-xs tracking-[0.25em] hover:bg-ink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-lg rounded-sm ${editingId ? 'flex-[2]' : 'w-full'}`}>
                 {editingId ? '更新消費紀錄' : '新增此筆消費'}
             </button>
        </div>

        {/* Zoomed Image Modal */}
        {zoomedImage && (
            <div className="fixed inset-0 z-[1002] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
                <img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain" alt="Full Receipt" />
                <button className="absolute bottom-10 text-white bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">Close</button>
            </div>
        )}
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-transparent flex flex-col pb-28">
       {/* Wallet Header */}
       <div className="bg-white/40 backdrop-blur-sm px-8 pt-16 pb-8 border-b border-white/50">
            <span className="text-[10px] font-bold tracking-[0.25em] text-accent-matcha uppercase block mb-3">總消費 Total Expenses</span>
            <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-serif font-light text-ink-900">{Math.round(totalSpentHome).toLocaleString()}</span>
                    <span className="text-sm text-ink-400 font-sans tracking-wide">TWD</span>
                </div>
                {/* Secondary Currency Total */}
                <div className="flex items-baseline gap-2 opacity-60">
                    <span className="text-lg font-serif font-light text-ink-900">≈ {Math.round(totalSpentForeign).toLocaleString()}</span>
                    <span className="text-xs text-ink-400 font-sans tracking-wide">{settings.targetCurrency}</span>
                </div>
            </div>
            <div className="mt-6 w-full h-px bg-ink-100 relative">
                <div className="absolute top-0 left-0 h-px bg-ink-900 transition-all duration-1000" style={{width: '30%'}}></div>
            </div>
       </div>

       <div className="flex-1 px-6 pt-10">
         <div className="flex justify-between items-center mb-8">
            <h3 className="font-serif text-xl text-ink-900 italic tracking-wide">帳目明細</h3>
            <button onClick={openAddView} className="text-[10px] font-bold uppercase tracking-[0.2em] border border-ink-200 px-5 py-3 hover:bg-ink-900 hover:text-white transition-colors bg-white/60 shadow-sm active:scale-95">＋ 新增</button>
         </div>

         <div className="space-y-4">
            {expenses.map(exp => {
                const cat = categories.find(c => c.id === exp.category) || categories[0];
                const isHome = exp.currency === settings.homeCurrency;

                // Priority: Display the currency that was input (Foreign if in foreign country, usually)
                // If isHome is true, then primary amount is amountHome, secondary is empty (or foreign if valid)
                // If isHome is false, then primary amount is amountForeign (Currency), secondary is amountHome (TWD)

                const primaryAmount = isHome ? exp.amountHome : exp.amountForeign;
                const primaryCurr = exp.currency;
                
                const secondaryAmount = isHome ? null : exp.amountHome;
                const secondaryCurr = isHome ? null : settings.homeCurrency;

                return (
                    <div key={exp.id} onClick={() => openEditView(exp)} className="py-4 border-b border-ink-50/50 group hover:bg-white/50 px-3 transition-colors rounded-lg cursor-pointer active:bg-white/70">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-5">
                                <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-ink-500 bg-white ${cat?.color || 'border-ink-200'}`}>
                                    {getCategoryIcon(cat)}
                                </div>
                                <div>
                                    <p className="font-serif text-ink-900 text-lg leading-none mb-1.5 tracking-wide">{exp.item}</p>
                                    <div className="flex gap-2 text-[10px] text-ink-400 uppercase tracking-widest">
                                        <span>{new Date(exp.date).toLocaleDateString()}</span>
                                        {/* Removed Payment Method Badge here */}
                                        {exp.splitDetails && exp.splitDetails !== 'Me' && <span className="bg-accent-indigo/10 text-accent-indigo px-1 rounded font-bold">Paid by {exp.splitDetails}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-serif text-ink-900 text-lg tracking-wide">
                                    -{Math.round(primaryAmount).toLocaleString()} 
                                    <span className="text-xs text-ink-300 ml-1 font-sans">{primaryCurr}</span>
                                </p>
                                {secondaryAmount !== null && (
                                    <p className="text-[10px] text-ink-400 tracking-wide">≈ {Math.round(secondaryAmount).toLocaleString()} {secondaryCurr}</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            {expenses.length === 0 && <div className="text-center py-20 text-ink-200"><span className="font-serif italic text-xl tracking-wide">尚無消費紀錄</span></div>}
         </div>
       </div>
    </div>
  );
};

export default Expenses;
