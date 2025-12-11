
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ReservationType, FlightReservation, TransportReservation, StayReservation, CarReservation, TicketReservation, AnyReservation, TripSettings } from '../types';
import { searchFlightDetails } from '../services/geminiService';
import { compressImage } from '../services/imageService';
import Calendar from './Calendar';

interface Props {
  reservations: AnyReservation[];
  onAdd: (res: AnyReservation) => void;
  onUpdate: (res: AnyReservation) => void;
  onDelete: (id: string) => void;
  settings?: TripSettings; 
  initialEditingId?: string | null;
  onClearInitialEditingId?: () => void;
}

// Internal Aesthetic Time Picker Component - 24 Hour Version
const TimePicker = ({ 
    value, 
    onChange,
    disabled = false
}: { 
    value: string; // HH:mm (24h)
    onChange: (val: string) => void;
    disabled?: boolean;
}) => {
    // Default to 10:00 if empty or invalid to avoid 00:00 default
    const safeValue = (!value || value === '00:00') ? '10:00' : value;
    const [h, m = 0] = safeValue.split(':').map(Number);
    
    // 24 Hour Format: 00-23
    const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));

    const handleChange = (newH: number, newM: number) => {
        onChange(`${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
    };

    return (
        <div className={`flex items-baseline gap-1 border-b border-ink-200 pb-1 min-w-0 ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
            <div className="relative">
                <select 
                    value={h.toString().padStart(2, '0')} 
                    onChange={(e) => handleChange(parseInt(e.target.value), m)}
                    disabled={disabled}
                    className="bg-transparent font-serif text-sm font-bold outline-none text-ink-900 p-0 cursor-pointer appearance-none text-center min-w-[2ch]"
                >
                    {hours.map(hStr => <option key={hStr} value={hStr}>{hStr}</option>)}
                </select>
            </div>
            <span className="text-ink-300 text-xs">:</span>
            <div className="relative">
                <select 
                    value={(m || 0).toString().padStart(2, '0')} 
                    onChange={(e) => handleChange(h, parseInt(e.target.value))}
                    disabled={disabled}
                    className="bg-transparent font-serif text-sm font-bold outline-none text-ink-900 p-0 cursor-pointer appearance-none text-center min-w-[2ch]"
                >
                    {minutes.map(mStr => <option key={mStr} value={mStr}>{mStr}</option>)}
                </select>
            </div>
        </div>
    );
};

// Internal Currency Amount Input
const CurrencyAmountInput = ({
    amount,
    currency,
    settings,
    onChangeAmount,
    onChangeCurrency
}: {
    amount: string | number | undefined,
    currency: string,
    settings?: TripSettings,
    onChangeAmount: (val: string) => void,
    onChangeCurrency: (val: string) => void
}) => {
    const safeValue = amount === undefined || amount === null ? '' : amount.toString();

    return (
        <div className="flex items-center border-b border-ink-200 py-2 w-full">
            <select 
                value={currency || settings?.targetCurrency || 'USD'}
                onChange={(e) => onChangeCurrency(e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-wide text-ink-500 mr-2 outline-none cursor-pointer shrink-0"
            >
                <option value={settings?.targetCurrency}>{settings?.targetCurrency}</option>
                <option value={settings?.homeCurrency}>{settings?.homeCurrency}</option>
                <option value="USD">USD</option>
            </select>
            <input 
                type="number"
                inputMode="decimal"
                className="flex-1 min-w-0 bg-transparent text-sm text-ink-900 placeholder-ink-200 outline-none text-right font-serif" 
                value={safeValue} 
                onChange={(e) => onChangeAmount(e.target.value)} 
                placeholder="0" 
            />
        </div>
    );
};

// Internal Detailed Passenger Selector
const PassengerSelector = ({
    adults,
    children,
    onChange
}: {
    adults: number;
    children: number;
    onChange: (adults: number, children: number) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggle = () => setIsOpen(!isOpen);

    const handleIncrement = (type: 'adult' | 'child') => {
        if (type === 'adult') onChange(adults + 1, children);
        if (type === 'child') onChange(adults, children + 1);
    };

    const handleDecrement = (type: 'adult' | 'child') => {
        if (type === 'adult' && adults > 1) onChange(adults - 1, children);
        if (type === 'child' && children > 0) onChange(adults, children - 1);
    };

    const total = adults + children;

    return (
        <div className="relative">
            <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">人數 Passengers</label>
            <div 
                onClick={toggle}
                className="w-full bg-transparent border-b border-ink-200 py-2 cursor-pointer flex items-center justify-between group"
            >
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-serif font-bold text-ink-900">{total} <span className="text-xs font-sans font-normal text-ink-500">Traveler{total > 1 ? 's' : ''}</span></span>
                    <span className="text-[10px] text-ink-400">({adults} Adult, {children} Child)</span>
                </div>
                <svg className={`w-3 h-3 text-ink-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 bg-white border border-ink-100 rounded-xl shadow-float z-20 p-4 mt-2 animate-fade-in">
                    {/* Adults Row */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <span className="block text-sm font-bold text-ink-900">大人 Adults</span>
                            <span className="text-[10px] text-ink-400">Age 12+</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={(e) => { e.preventDefault(); handleDecrement('adult'); }} className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${adults <= 1 ? 'border-ink-100 text-ink-200 cursor-not-allowed' : 'border-ink-300 text-ink-500 hover:border-ink-900 hover:text-ink-900'}`}>-</button>
                            <span className="text-lg font-serif w-6 text-center">{adults}</span>
                            <button onClick={(e) => { e.preventDefault(); handleIncrement('adult'); }} className="w-8 h-8 rounded-full border border-ink-300 text-ink-500 flex items-center justify-center hover:border-ink-900 hover:text-ink-900 transition-colors">+</button>
                        </div>
                    </div>

                    {/* Children Row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="block text-sm font-bold text-ink-900">小孩 Children</span>
                            <span className="text-[10px] text-ink-400">Age 2-11</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={(e) => { e.preventDefault(); handleDecrement('child'); }} className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${children <= 0 ? 'border-ink-100 text-ink-200 cursor-not-allowed' : 'border-ink-300 text-ink-500 hover:border-ink-900 hover:text-ink-900'}`}>-</button>
                            <span className="text-lg font-serif w-6 text-center">{children}</span>
                            <button onClick={(e) => { e.preventDefault(); handleIncrement('child'); }} className="w-8 h-8 rounded-full border border-ink-300 text-ink-500 flex items-center justify-center hover:border-ink-900 hover:text-ink-900 transition-colors">+</button>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-ink-50 flex justify-end">
                        <button onClick={(e) => { e.preventDefault(); setIsOpen(false); }} className="text-[10px] font-bold uppercase tracking-widest text-accent-indigo hover:text-ink-900">Done</button>
                    </div>
                </div>
            )}
            
            {/* Click outside overlay */}
            {isOpen && <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>}
        </div>
    );
};

// Extracted Component to prevent re-render focus loss
const FlightInputSection = ({ 
    prefix = '', 
    title,
    form,
    setForm,
    searchingFlight,
    onSearch,
    onOpenCalendar
}: { 
    prefix?: string, 
    title: string,
    form: any,
    setForm: React.Dispatch<React.SetStateAction<any>>,
    searchingFlight: boolean,
    onSearch: (isReturn: boolean) => void,
    onOpenCalendar: (field: string) => void
}) => {
    // ... (No changes to FlightInputSection)
    const isReturn = prefix === 'return_';
    const airline = form[`${prefix}airline`] || '';
    const flightNum = form[`${prefix}flightNumber`] || '';
    const date = form[`${prefix}departureDate`] || '';
    const canSearch = airline && flightNum && date;
    const depCity = form[`${prefix}departureCity`] || '';
    const depCode = form[`${prefix}departureCode`] || '';
    const depTerm = form[`${prefix}departureTerminal`] || '';
    const arrCity = form[`${prefix}arrivalCity`] || '';
    const arrCode = form[`${prefix}arrivalCode`] || '';
    const arrTerm = form[`${prefix}arrivalTerminal`] || '';
    const durationStr = form[`${prefix}duration`] || '';
    
    const parseDuration = (str: string) => {
        const hMatch = str.match(/(\d+)h/);
        const mMatch = str.match(/(\d+)m/);
        return { h: hMatch ? hMatch[1] : '', m: mMatch ? mMatch[1] : '' };
    };
    const { h: durH, m: durM } = parseDuration(durationStr);

    const updateDuration = (h: string, m: string) => {
        let res = '';
        if (h) res += `${h}h `;
        if (m) res += `${m}m`;
        setForm((prev: any) => ({...prev, [`${prefix}duration`]: res.trim()}));
    };

    return (
      <div className="space-y-4 border border-ink-100 rounded-xl p-5 bg-white/60 backdrop-blur-sm shadow-sm">
          <h4 className="text-xs font-bold uppercase text-ink-400 tracking-widest mb-4 flex items-center justify-between border-b border-ink-100 pb-2">
              <span>{title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${isReturn ? 'bg-accent-matcha/20 text-accent-matcha' : 'bg-accent-indigo/20 text-accent-indigo'}`}>
                  {isReturn ? '回程' : '去程'}
              </span>
          </h4>
          <div className="grid grid-cols-3 gap-4 items-end mb-4">
              <div>
                  <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">Airline</label>
                  <input className="w-full bg-transparent border-b border-ink-200 py-1 outline-none font-serif text-lg text-ink-900 placeholder-ink-200 uppercase min-w-0" value={airline} onChange={e=>setForm((prev: any) => ({...prev, [`${prefix}airline`]: e.target.value.toUpperCase()}))} placeholder="JX" />
              </div>
              <div>
                  <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">Flight No.</label>
                  <input className="w-full bg-transparent border-b border-ink-200 py-1 outline-none font-mono text-lg text-ink-900 placeholder-ink-200 min-w-0" value={flightNum} onChange={e=>setForm((prev: any) => ({...prev, [`${prefix}flightNumber`]: e.target.value}))} placeholder="800" />
              </div>
              <div>
                  <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">Date</label>
                  <div onClick={() => onOpenCalendar(`${prefix}departureDate`)} className="cursor-pointer border-b border-ink-200 py-1 text-sm font-serif font-bold text-ink-900 hover:bg-ink-50 truncate h-[30px] flex items-center">{date || 'Select Date'}</div>
              </div>
          </div>
          <button onClick={() => onSearch(isReturn)} disabled={searchingFlight || !canSearch} className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all mb-4 ${canSearch ? 'bg-ink-900 text-white shadow-md active:scale-95' : 'bg-ink-100 text-ink-400 cursor-not-allowed'}`}>{searchingFlight ? 'Searching...' : '搜尋航班 Search'}</button>
          {(depCity !== 'Origin' || searchingFlight || depCode) && (
              <div className="bg-white rounded-2xl border border-ink-100 shadow-float overflow-hidden relative mt-4">
                  <div className="h-1.5 w-full bg-gradient-to-r from-accent-indigo via-[#a5b4fc] to-accent-teal"></div>
                  <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col w-[40%]">
                              <span className="text-[9px] font-bold text-ink-400 uppercase tracking-[0.2em] mb-1">Departure</span>
                              <input value={depCode} onChange={(e) => setForm((prev: any) => ({...prev, [`${prefix}departureCode`]: e.target.value.toUpperCase()}))} className="block w-full text-4xl font-serif font-black text-ink-900 leading-none bg-transparent outline-none placeholder-ink-100 min-w-0 tracking-tight" placeholder="DEP" />
                              <input value={depCity} onChange={(e) => setForm((prev: any) => ({...prev, [`${prefix}departureCity`]: e.target.value}))} className="w-full text-xs font-medium text-ink-500 bg-transparent outline-none placeholder-ink-200 mt-1 truncate" placeholder="City Name" />
                              <div className="mt-5 space-y-2">
                                  <div className="w-full flex justify-start"><TimePicker value={form[`${prefix}departureTimePart`] || '00:00'} onChange={(val) => setForm((prev: any) => ({...prev, [`${prefix}departureTimePart`]: val}))} disabled={false} /></div>
                                  <div className="flex items-center gap-2">
                                      <div className="bg-ink-50 text-[9px] font-bold text-ink-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Term</div>
                                      <input className="w-10 bg-transparent border-b border-ink-200 text-xs font-bold text-ink-900 text-center outline-none focus:border-ink-900 transition-colors" value={depTerm} onChange={(e) => setForm((prev: any) => ({...prev, [`${prefix}departureTerminal`]: e.target.value}))} placeholder="-" />
                                  </div>
                              </div>
                          </div>
                          <div className="flex flex-col items-center justify-center w-[20%] pt-6">
                              <div className="flex items-end gap-0.5 mb-1">
                                  <input type="number" value={durH} onChange={(e) => updateDuration(e.target.value, durM)} className="w-10 text-center bg-transparent border-b border-ink-200 text-[10px] font-bold outline-none p-0 appearance-none" placeholder="0" />
                                  <span className="text-[8px] text-ink-400">h</span>
                                  <input type="number" value={durM} onChange={(e) => updateDuration(durH, e.target.value)} className="w-10 text-center bg-transparent border-b border-ink-200 text-[10px] font-bold outline-none p-0 ml-1 appearance-none" placeholder="0" />
                                  <span className="text-[8px] text-ink-400">m</span>
                              </div>
                              <div className="w-full relative flex items-center justify-center h-6">
                                  <div className="absolute w-full h-px bg-ink-100"></div>
                                  <div className="bg-white px-1 relative z-10 text-ink-300"><svg className="w-5 h-5 transform rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L12 22"/><path d="M12 2L16 6"/><path d="M12 2L8 6"/></svg></div>
                              </div>
                          </div>
                          <div className="flex flex-col w-[40%] items-end text-right">
                              <span className="text-[9px] font-bold text-ink-400 uppercase tracking-[0.2em] mb-1">Arrival</span>
                              <input value={arrCode} onChange={(e) => setForm((prev: any) => ({...prev, [`${prefix}arrivalCode`]: e.target.value.toUpperCase()}))} className="block w-full text-4xl font-serif font-black text-ink-900 leading-none bg-transparent outline-none placeholder-ink-100 text-right min-w-0 tracking-tight" placeholder="ARR" />
                              <input value={arrCity} onChange={(e) => setForm((prev: any) => ({...prev, [`${prefix}arrivalCity`]: e.target.value}))} className="w-full text-xs font-medium text-ink-500 bg-transparent outline-none placeholder-ink-200 mt-1 truncate text-right" placeholder="City Name" />
                              <div className="mt-5 space-y-2 w-full flex flex-col items-end">
                                  <div className="flex justify-end w-full"><TimePicker value={form[`${prefix}arrivalTimePart`] || '00:00'} onChange={(val) => setForm((prev: any) => ({...prev, [`${prefix}arrivalTimePart`]: val}))} disabled={false} /></div>
                                  <div className="flex items-center gap-2 justify-end">
                                      <input className="w-10 bg-transparent border-b border-ink-200 text-xs font-bold text-ink-900 text-center outline-none focus:border-ink-900 transition-colors" value={arrTerm} onChange={(e) => setForm((prev: any) => ({...prev, [`${prefix}arrivalTerminal`]: e.target.value}))} placeholder="-" />
                                      <div className="bg-ink-50 text-[9px] font-bold text-ink-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Term</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="mt-6 pt-3 border-t border-dashed border-ink-100 flex justify-center">
                          <button onClick={() => onOpenCalendar(`${prefix}arrivalDate`)} className="group flex items-center gap-2 bg-ink-50 hover:bg-ink-100 px-4 py-1.5 rounded-full transition-all active:scale-95">
                              <span className="text-[9px] font-bold text-ink-400 uppercase tracking-widest group-hover:text-ink-500">Arrival Date</span>
                              <span className="text-xs font-serif font-bold text-ink-800">{form[`${prefix}arrivalDate`] || date}</span>
                              <svg className="w-3 h-3 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    );
};

const Bookings: React.FC<Props> = ({ reservations, onAdd, onUpdate, onDelete, settings, initialEditingId, onClearInitialEditingId }) => {
  // ... (No changes to state, openEdit logic until handleSave for STAY)
  const [activeTab, setActiveTab] = useState<ReservationType>('FLIGHT'); 
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchingFlight, setSearchingFlight] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const [form, setForm] = useState<any>({});
  
  const [transportTypes, setTransportTypes] = useState<string[]>(['新幹線', '地下鐵', '特急', '巴士']);
  const [managingTransportTypes, setManagingTransportTypes] = useState(false);
  const [newTransportType, setNewTransportType] = useState('');

  const [flightType, setFlightType] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ONE_WAY');
  const [singleFlightDirection, setSingleFlightDirection] = useState<'OUTBOUND' | 'RETURN'>('OUTBOUND');

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = reservations.filter(r => r.type === activeTab);

  const TABS: { id: ReservationType; label: string; icon: React.ReactNode, color: string }[] = [
      { id: 'FLIGHT', label: '班機', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>, color: 'bg-accent-indigo' },
      { id: 'TRANSPORT', label: '地鐵', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 19l-2 3h12l-2-3"/><path d="M2 17V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"/><path d="M12 15V5"/><line x1="2" x2="22" y1="11" y2="11"/></svg>, color: 'bg-accent-teal' },
      { id: 'STAY', label: '住宿', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6v0"/><path d="M9 21v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5"/></svg>, color: 'bg-accent-coral' },
      { id: 'CAR', label: '租車', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>, color: 'bg-accent-teal' },
      { id: 'TICKET', label: '票券', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>, color: 'bg-accent-matcha' }
  ];

  const openEdit = (res: AnyReservation) => {
      setEditingId(res.id);
      setIsAdding(true);
      setActiveTab(res.type);
      setForm(res); 
      
      if (res.type === 'FLIGHT') {
          const f = res as FlightReservation;
          const [dDate, dTime] = f.departureTime.split(' ');
          const [aDate, aTime] = f.arrivalTime.split(' ');
          
          const defaultAdults = f.adults !== undefined ? f.adults : 1;
          const defaultChildren = f.children !== undefined ? f.children : 0;

          if (f.returnLeg) {
              setFlightType('ROUND_TRIP');
              const [rdDate, rdTime] = f.returnLeg.departureTime.split(' ');
              const [raDate, raTime] = f.returnLeg.arrivalTime.split(' ');
              
              setForm((prev: any) => ({
                  ...prev,
                  departureDate: dDate, departureTimePart: dTime,
                  arrivalDate: aDate, arrivalTimePart: aTime,
                  departureCity: f.departureCity,
                  departureCode: f.departureCode || f.departureCity.substring(0,3).toUpperCase(),
                  arrivalCity: f.arrivalCity,
                  arrivalCode: f.arrivalCode || f.arrivalCity.substring(0,3).toUpperCase(),
                  adults: defaultAdults, children: defaultChildren,
                  return_airline: f.returnLeg?.airline,
                  return_flightNumber: f.returnLeg?.flightNumber,
                  return_departureDate: rdDate, return_departureTimePart: rdTime,
                  return_arrivalDate: raDate, return_arrivalTimePart: raTime,
                  return_departureCity: f.returnLeg?.departureCity,
                  return_departureCode: f.returnLeg?.departureCode,
                  return_departureTerminal: f.returnLeg?.departureTerminal,
                  return_arrivalCity: f.returnLeg?.arrivalCity,
                  return_arrivalCode: f.returnLeg?.arrivalCode,
                  return_arrivalTerminal: f.returnLeg?.arrivalTerminal,
                  return_duration: f.returnLeg?.duration
              }));
          } else {
              const isReturn = res.id.includes('_return');
              setFlightType('ONE_WAY');
              setSingleFlightDirection(isReturn ? 'RETURN' : 'OUTBOUND');
              setForm((prev: any) => ({
                  ...res, 
                  departureDate: dDate, departureTimePart: dTime,
                  arrivalDate: aDate, arrivalTimePart: aTime,
                  departureCity: f.departureCity,
                  departureCode: f.departureCode || f.departureCity.substring(0,3).toUpperCase(),
                  arrivalCity: f.arrivalCity,
                  arrivalCode: f.arrivalCode || f.arrivalCity.substring(0,3).toUpperCase(),
                  adults: defaultAdults, children: defaultChildren
              }));
          }
      } else if (res.type === 'CAR') {
          const c = res as CarReservation;
          const [pDate, pTime] = c.pickupDate.split(' ');
          const [dDate, dTime] = c.dropoffDate.split(' ');
          setForm((prev: any) => ({ ...prev, pickupDate: pDate, pickupTimePart: pTime, dropoffDate: dDate, dropoffTimePart: dTime }));
      } else if (res.type === 'TRANSPORT') {
          const t = res as TransportReservation;
          const [dDate, dTime] = t.departureTime.split(' ');
          const [aDate, aTime] = t.arrivalTime.split(' ');
          setForm((prev: any) => ({ ...prev, departureDate: dDate, departureTimePart: dTime, arrivalDate: aDate, arrivalTimePart: aTime }));
      }
  };

  useEffect(() => {
      if (initialEditingId) {
          const target = reservations.find(r => r.id === initialEditingId);
          if (target) {
              setActiveTab(target.type);
              openEdit(target);
          }
          if (onClearInitialEditingId) onClearInitialEditingId();
      }
  }, [initialEditingId, reservations]);

  useEffect(() => {
    if (activeTab === 'STAY' && form.checkInDate && form.checkOutDate) {
        const d1 = new Date(form.checkInDate);
        const d2 = new Date(form.checkOutDate);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setForm((prev: any) => ({...prev, nights: diffDays}));
        }
    }
  }, [form.checkInDate, form.checkOutDate, activeTab]);

  const handleOpenAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setForm({});
    setFlightType('ONE_WAY');
    setSingleFlightDirection('OUTBOUND');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = async () => {
              const rawBase64 = reader.result as string;
              const compressedBase64 = await compressImage(rawBase64);
              setForm((prev: any) => ({ ...prev, files: [...(prev.files || []), compressedBase64] }));
          };
          reader.readAsDataURL(file);
      }
  };

  const removeFile = (index: number) => {
      setForm((prev: any) => ({ ...prev, files: prev.files.filter((_: any, i: number) => i !== index) }));
  };

  const handleAddTransportType = () => {
      if (!newTransportType.trim()) return;
      setTransportTypes([...transportTypes, newTransportType]);
      setNewTransportType('');
  };

  const handleDeleteTransportType = (type: string) => {
      setTransportTypes(transportTypes.filter(t => t !== type));
      if (form.transportType === type) {
          setForm((prev: any) => ({...prev, transportType: transportTypes[0]}));
      }
  };

  const handleSave = () => {
      const base = {
          id: editingId || Date.now().toString(),
          type: activeTab,
          // Fallback title logic if specific logic not hit
          title: form.title || form.airline || form.address || form.company || 'Booking',
          notes: form.notes,
          files: form.files || []
      };

      let reservation: AnyReservation | null = null;
      let returnReservation: AnyReservation | null = null; 

      if (activeTab === 'FLIGHT') {
          const mainTitle = `${form.airline || ''} ${form.flightNumber || ''}`.trim() || 'Flight';
          const finalAdults = form.adults !== undefined ? Number(form.adults) : 1;
          const finalChildren = form.children !== undefined ? Number(form.children) : 0;
          const totalPassengers = finalAdults + finalChildren;

          const makeFlight = (prefix = '', forceIdSuffix = '', overrideCost?: number): FlightReservation => {
              const fTitle = prefix ? `${form[`${prefix}airline`] || ''} ${form[`${prefix}flightNumber`] || ''}`.trim() || 'Return Flight' : mainTitle;
              let finalId = base.id;
              if (!editingId && forceIdSuffix) finalId += forceIdSuffix;

              return {
                ...base as FlightReservation,
                title: fTitle,
                id: finalId,
                airline: form[`${prefix}airline`],
                flightNumber: form[`${prefix}flightNumber`],
                departureTime: `${form[`${prefix}departureDate`]} ${form[`${prefix}departureTimePart`] || '00:00'}`,
                departureCity: form[`${prefix}departureCity`] || 'City',
                departureCode: form[`${prefix}departureCode`] || form[`${prefix}departureCity`]?.substring(0,3).toUpperCase() || 'DEP',
                departureTerminal: form[`${prefix}departureTerminal`],
                arrivalTime: `${form[`${prefix}arrivalDate`]} ${form[`${prefix}arrivalTimePart`] || '00:00'}`,
                arrivalCity: form[`${prefix}arrivalCity`] || 'City',
                arrivalCode: form[`${prefix}arrivalCode`] || form[`${prefix}arrivalCity`]?.substring(0,3).toUpperCase() || 'ARR',
                arrivalTerminal: form[`${prefix}arrivalTerminal`],
                duration: form[`${prefix}duration`],
                cost: overrideCost !== undefined ? overrideCost : Number(form.cost),
                passengers: totalPassengers,
                adults: finalAdults,
                children: finalChildren,
                currency: form.currency || settings?.targetCurrency 
              };
          };

          if (flightType === 'ROUND_TRIP') {
              const getLoc = (prefix: string) => (form[`${prefix}City`] || form[`${prefix}Code`] || '').trim();
              const outDep = getLoc('departure');
              const outArr = getLoc('arrival');
              const retDep = getLoc('return_departure');
              const retArr = getLoc('return_arrival');

              let fullTitle = '';
              if (outDep && outArr) {
                  const n = (s: string) => s.toLowerCase().replace(/\s/g, '');
                  const isStandard = (n(outArr) === n(retDep)) && (n(outDep) === n(retArr));
                  if (isStandard) fullTitle = `${outDep} → ${outArr}`;
                  else fullTitle = `${outDep} → ${outArr}：${retDep} → ${retArr}`;
              }
              if (!fullTitle) {
                  const outStr = `${form.airline || ''} ${form.flightNumber || ''}`.trim();
                  const retStr = `${form.return_airline || ''} ${form.return_flightNumber || ''}`.trim();
                  fullTitle = `${outStr} ⇄ ${retStr}` || 'Round Trip Flight';
              }

              const outbound = makeFlight();
              reservation = {
                  ...outbound,
                  title: fullTitle,
                  returnLeg: {
                      airline: form.return_airline,
                      flightNumber: form.return_flightNumber,
                      departureTime: `${form.return_departureDate} ${form.return_departureTimePart || '00:00'}`,
                      departureCity: form.return_departureCity || 'City',
                      departureCode: form.return_departureCode || form.return_departureCity?.substring(0,3).toUpperCase() || 'DEP',
                      departureTerminal: form.return_departureTerminal,
                      arrivalTime: `${form.return_arrivalDate} ${form.return_arrivalTimePart || '00:00'}`,
                      arrivalCity: form.return_arrivalCity || 'City',
                      arrivalCode: form.return_arrivalCode || form.return_arrivalCity?.substring(0,3).toUpperCase() || 'ARR',
                      arrivalTerminal: form.return_arrivalTerminal,
                      duration: form.return_duration
                  }
              };
          } else {
              const depCity = (form.departureCity || form.departureCode || '').trim();
              const arrCity = (form.arrivalCity || form.arrivalCode || '').trim();
              let singleTitle = '';
              if (depCity && arrCity) singleTitle = `${depCity} → ${arrCity}`;
              else singleTitle = `${form.airline || ''} ${form.flightNumber || ''}`.trim() || 'Flight';

              if (singleFlightDirection === 'OUTBOUND') reservation = { ...makeFlight(), title: singleTitle };
              else reservation = { ...makeFlight('', '_return'), title: singleTitle }; 
          }

      } else if (activeTab === 'TRANSPORT') {
          const type = form.transportType || transportTypes[0] || 'Train';
          reservation = {
              ...base as TransportReservation,
              title: `${type}: ${form.departureStation} → ${form.arrivalStation}`,
              transportType: type,
              departureStation: form.departureStation,
              arrivalStation: form.arrivalStation,
              departureTime: `${form.departureDate} ${form.departureTimePart || '10:00'}`, 
              arrivalTime: `${form.departureDate} ${form.arrivalTimePart || '10:00'}`,
              carNumber: form.carNumber,
              seatNumber: form.seatNumber,
              cost: Number(form.cost),
              currency: form.currency || settings?.targetCurrency 
          };
      } else if (activeTab === 'STAY') {
          // Explicitly map title and address for STAY
          reservation = {
              ...base as StayReservation,
              title: form.title || form.address || 'Hotel', // Use title field if present
              address: form.address, // Explicit address field
              checkInDate: form.checkInDate,
              checkInTime: form.checkInTime,
              checkOutDate: form.checkOutDate,
              checkOutTime: form.checkOutTime,
              totalPrice: Number(form.totalPrice),
              currency: form.currency || settings?.targetCurrency,
              nights: Number(form.nights),
              guests: Number(form.guests)
          };
      } else if (activeTab === 'CAR') {
          reservation = {
              ...base as CarReservation,
              company: form.company,
              pickupLocation: form.pickupLocation,
              pickupDate: `${form.pickupDate} ${form.pickupTimePart || '10:00'}`,
              dropoffLocation: form.dropoffLocation,
              dropoffDate: `${form.dropoffDate} ${form.dropoffTimePart || '10:00'}`,
              totalCost: Number(form.totalCost),
              currency: form.currency || settings?.targetCurrency
          };
      } else {
           reservation = {
              ...base as TicketReservation,
              date: form.date,
              time: form.time || '10:00', 
              location: form.location,
              cost: Number(form.cost),
              currency: form.currency || settings?.targetCurrency
          };
      }

      if (editingId) {
          if (reservation) onUpdate(reservation);
      } else {
          if (reservation) onAdd(reservation);
          if (returnReservation) onAdd(returnReservation); 
      }
      setIsAdding(false);
      setEditingId(null);
      setForm({});
  };

  // ... (Search/Calendar/Duration helpers same as before)
  const handleSearchFlight = async (isReturn: boolean) => {
      const prefix = isReturn ? 'return_' : '';
      const airline = form[`${prefix}airline`];
      const flightNum = form[`${prefix}flightNumber`];
      const date = form[`${prefix}departureDate`];
      if (!airline || !flightNum || !date) return;
      setSearchingFlight(true);
      const result = await searchFlightDetails(airline, flightNum, date);
      setSearchingFlight(false);
      if (result && result.airline) {
          setForm((prev: any) => ({
              ...prev,
              [`${prefix}departureTimePart`]: result.departureTime || prev[`${prefix}departureTimePart`],
              [`${prefix}departureCity`]: result.departureCity || prev[`${prefix}departureCity`],
              [`${prefix}departureCode`]: result.departureCode || prev[`${prefix}departureCode`],
              [`${prefix}departureTerminal`]: result.departureTerminal || prev[`${prefix}departureTerminal`],
              [`${prefix}arrivalDate`]: result.arrivalDate || date, 
              [`${prefix}arrivalTimePart`]: result.arrivalTime || prev[`${prefix}arrivalTimePart`],
              [`${prefix}arrivalCity`]: result.arrivalCity || prev[`${prefix}arrivalCity`],
              [`${prefix}arrivalCode`]: result.arrivalCode || prev[`${prefix}arrivalCode`],
              [`${prefix}arrivalTerminal`]: result.arrivalTerminal || prev[`${prefix}arrivalTerminal`],
              [`${prefix}duration`]: result.duration || prev[`${prefix}duration`]
          }));
      } else {
          alert('Flight not found. Please fill details manually.');
      }
  };

  const openCalendar = (field: string) => { setActiveDateField(field); setIsCalendarOpen(true); };
  const handleDateSelect = (date: string) => { setForm((prev: any) => ({ ...prev, [activeDateField]: date })); };
  const getDuration = (start: string, end: string) => {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      if (isNaN(s) || isNaN(e)) return '';
      const diff = e - s;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-transparent pt-28 pb-24 px-4">
        {/* Header Tabs */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-6 px-1 touch-pan-x">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setIsAdding(false); }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all shrink-0 shadow-sm active:scale-95 ${activeTab === tab.id ? `${tab.color} text-white border-transparent shadow-md scale-105` : 'bg-white text-ink-400 border-ink-100 hover:border-ink-300 hover:text-ink-900'}`}
                >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="text-xs font-bold tracking-wider uppercase">{tab.label}</span>
                </button>
            ))}
        </div>

        {!isAdding && (
            <div className="mb-6 flex justify-end">
                <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-ink-900 text-white px-5 py-3 rounded-full shadow-float hover:scale-105 active:scale-95 transition-all text-xs font-bold uppercase tracking-widest">
                    <span>＋ 新增{TABS.find(t=>t.id===activeTab)?.label === '班機' ? '航班' : TABS.find(t=>t.id===activeTab)?.label}</span>
                </button>
            </div>
        )}

        {/* List View */}
        {!isAdding && (
            <div className="grid gap-4">
                {filtered.map(res => (
                    <div key={res.id} onClick={() => openEdit(res)} className="bg-white/80 backdrop-blur rounded-xl p-5 border border-ink-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group pr-10">
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${TABS.find(t=>t.id===res.type)?.color}`}></div>
                        <div className="pl-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-serif text-lg font-bold text-ink-900 mb-1">{res.title}</h3>
                                    {/* Flight Tags */}
                                    {res.type === 'FLIGHT' && (
                                        <>
                                            {(res as FlightReservation).returnLeg ? <span className="text-[10px] bg-accent-indigo/20 text-accent-indigo px-2 py-0.5 rounded font-bold uppercase tracking-wider">來回 Round Trip</span> : res.id.includes('_return') ? <span className="text-[10px] bg-accent-matcha/20 text-accent-matcha px-2 py-0.5 rounded font-bold uppercase tracking-wider">回程 Return</span> : <span className="text-[10px] bg-accent-indigo/20 text-accent-indigo px-2 py-0.5 rounded font-bold uppercase tracking-wider">去程 Outbound</span>}
                                        </>
                                    )}
                                </div>
                                {res.files && res.files.length > 0 && res.files[0].startsWith('data:image') && (
                                    <div onClick={(e) => { e.stopPropagation(); setZoomedImage(res.files![0]); }} className="w-10 h-10 rounded border border-ink-100 overflow-hidden cursor-zoom-in hover:opacity-80 transition-opacity">
                                        <img src={res.files[0]} className="w-full h-full object-cover" alt="thumb" />
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-ink-400 font-sans flex flex-col gap-1 mt-2">
                                {/* ... (Flight, Transport Logic - no changes) */}
                                {res.type === 'FLIGHT' && (res as FlightReservation).departureTime && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-3xl font-serif font-bold text-ink-900 leading-none">{(res as FlightReservation).departureTime.split(' ')[1]}</span>
                                                <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider mt-1">{(res as FlightReservation).departureCode || (res as FlightReservation).departureCity}</span>
                                            </div>
                                            <div className="flex flex-col items-center px-4 flex-1">
                                                <span className="text-[10px] text-ink-300 font-bold tracking-widest uppercase mb-1">{(res as FlightReservation).duration || ''}</span>
                                                <div className="w-full h-px bg-ink-200 relative flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-ink-300 bg-white px-0.5 absolute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-3xl font-serif font-bold text-ink-900 leading-none">{(res as FlightReservation).arrivalTime.split(' ')[1]}</span>
                                                <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider mt-1">{(res as FlightReservation).arrivalCode || (res as FlightReservation).arrivalCity}</span>
                                            </div>
                                        </div>
                                        {(res as FlightReservation).returnLeg && (
                                            <>
                                                <div className="w-full h-px bg-ink-100 border-t border-dashed border-ink-300 my-3"></div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-3xl font-serif font-bold text-ink-900 leading-none">{(res as FlightReservation).returnLeg?.departureTime.split(' ')[1]}</span>
                                                        <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider mt-1">{(res as FlightReservation).returnLeg?.departureCode || (res as FlightReservation).returnLeg?.departureCity}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center px-4 flex-1">
                                                        <span className="text-[10px] text-ink-300 font-bold tracking-widest uppercase mb-1">{(res as FlightReservation).returnLeg?.duration || ''}</span>
                                                        <div className="w-full h-px bg-ink-200 relative flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-ink-300 bg-white px-0.5 absolute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-3xl font-serif font-bold text-ink-900 leading-none">{(res as FlightReservation).returnLeg?.arrivalTime.split(' ')[1]}</span>
                                                        <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider mt-1">{(res as FlightReservation).returnLeg?.arrivalCode || (res as FlightReservation).returnLeg?.arrivalCity}</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                                {res.type === 'TRANSPORT' && (
                                    <div className="mt-3 bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm relative">
                                        <div className="bg-accent-teal/10 px-3 py-1.5 flex justify-between items-center border-b border-accent-teal/20">
                                            <span className="text-[10px] font-bold text-accent-teal uppercase tracking-widest flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 19l-2 3h12l-2-3"/><path d="M2 17V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"/><path d="M12 15V5"/><line x1="2" x2="22" y1="11" y2="11"/></svg>{(res as TransportReservation).transportType}</span>
                                            <span className="text-[10px] font-mono text-ink-400 tracking-wider">{(res as TransportReservation).departureTime.split(' ')[0]}</span>
                                        </div>
                                        <div className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col"><span className="text-2xl font-serif font-bold text-ink-900 leading-none">{(res as TransportReservation).departureTime.split(' ')[1]}</span><span className="text-[10px] text-ink-500 font-bold mt-1 max-w-[80px] truncate">{(res as TransportReservation).departureStation}</span></div>
                                                <div className="flex flex-col items-center px-2 flex-1"><span className="text-[10px] text-ink-400 font-bold tracking-wider mb-1 bg-ink-50 px-2 py-0.5 rounded-full border border-ink-100">{getDuration((res as TransportReservation).departureTime, (res as TransportReservation).arrivalTime)}</span><div className="w-full h-px bg-ink-200 relative flex items-center justify-center"><div className="w-1 h-1 bg-ink-300 rounded-full absolute left-0"></div><svg className="w-3 h-3 text-ink-300 absolute bg-white px-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg><div className="w-1 h-1 bg-ink-300 rounded-full absolute right-0"></div></div></div>
                                                <div className="flex flex-col items-end"><span className="text-2xl font-serif font-bold text-ink-900 leading-none">{(res as TransportReservation).arrivalTime.split(' ')[1]}</span><span className="text-[10px] text-ink-500 font-bold mt-1 max-w-[80px] truncate text-right">{(res as TransportReservation).arrivalStation}</span></div>
                                            </div>
                                            {((res as TransportReservation).carNumber || (res as TransportReservation).seatNumber) && <div className="mt-3 pt-2 border-t border-dashed border-ink-100 flex justify-between text-[10px] text-ink-400 font-mono tracking-wide">{(res as TransportReservation).carNumber && <span>Car: <strong className="text-ink-600">{(res as TransportReservation).carNumber}</strong></span>}{(res as TransportReservation).seatNumber && <span>Seat: <strong className="text-ink-600">{(res as TransportReservation).seatNumber}</strong></span>}</div>}
                                        </div>
                                    </div>
                                )}
                                {res.type === 'STAY' && (
                                    <div className="mt-3 bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-accent-coral/10 px-3 py-1.5 flex justify-between items-center border-b border-accent-coral/20">
                                            <span className="text-[10px] font-bold text-accent-coral uppercase tracking-widest">
                                                {(res as StayReservation).nights} Nights Stay
                                            </span>
                                        </div>
                                        <div className="p-3 grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[8px] uppercase tracking-widest text-ink-400 block mb-0.5">Check In</span>
                                                <span className="text-sm font-bold text-ink-900 block">{(res as StayReservation).checkInDate}</span>
                                                <span className="text-[10px] text-ink-500">{(res as StayReservation).checkInTime}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[8px] uppercase tracking-widest text-ink-400 block mb-0.5">Check Out</span>
                                                <span className="text-sm font-bold text-ink-900 block">{(res as StayReservation).checkOutDate}</span>
                                                <span className="text-[10px] text-ink-500">{(res as StayReservation).checkOutTime}</span>
                                            </div>
                                        </div>
                                        {(res as StayReservation).address && (
                                            <div className="px-3 pb-3 pt-0 text-[10px] text-ink-500 flex items-start gap-1">
                                                <span>📍</span> {(res as StayReservation).address}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {res.type === 'CAR' && (
                                    <div className="mt-3 bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-accent-teal/10 px-3 py-1.5 flex justify-between items-center border-b border-accent-teal/20">
                                            <span className="text-[10px] font-bold text-accent-teal uppercase tracking-widest">Rental</span>
                                            <span className="text-[10px] font-mono text-ink-400">{(res as CarReservation).company}</span>
                                        </div>
                                        <div className="p-3">
                                            <div className="flex justify-between items-center gap-4">
                                                <div className="flex-1">
                                                    <span className="text-[8px] uppercase tracking-widest text-ink-400 block mb-1">Pick Up</span>
                                                    <div className="text-xs font-bold text-ink-900">{(res as CarReservation).pickupDate}</div>
                                                    <div className="text-[9px] text-ink-500 truncate">{(res as CarReservation).pickupLocation}</div>
                                                </div>
                                                <div className="flex-1 text-right">
                                                    <span className="text-[8px] uppercase tracking-widest text-ink-400 block mb-1">Drop Off</span>
                                                    <div className="text-xs font-bold text-ink-900">{(res as CarReservation).dropoffDate}</div>
                                                    <div className="text-[9px] text-ink-500 truncate">{(res as CarReservation).dropoffLocation}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {res.type === 'TICKET' && (
                                    <div className="mt-3 bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm p-3 flex justify-between items-center">
                                        <div>
                                            <span className="text-[8px] uppercase tracking-widest text-ink-400 block mb-1">Date & Time</span>
                                            <div className="text-sm font-bold text-ink-900">{(res as TicketReservation).date}</div>
                                            <div className="text-xs text-ink-500">{(res as TicketReservation).time}</div>
                                        </div>
                                        {(res as TicketReservation).location && (
                                            <div className="text-right max-w-[50%]">
                                                <span className="text-[8px] uppercase tracking-widest text-ink-400 block mb-1">Location</span>
                                                <div className="text-xs text-ink-800 truncate">{(res as TicketReservation).location}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(res.id); }} className="absolute top-4 right-4 text-ink-200 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                ))}
                {filtered.length === 0 && <div className="text-center py-20 opacity-30 font-serif italic text-ink-400">No {activeTab} added yet.</div>}
            </div>
        )}

        {/* Add/Edit Modal */}
        {isAdding && (
            <div className="bg-white rounded-2xl shadow-float border border-ink-100 p-6 animate-slide-up pb-24 relative">
                <div className="flex justify-between items-center mb-6 border-b border-ink-50 pb-4">
                    <h2 className="font-serif text-xl font-bold text-ink-900">
                        {editingId ? 'Edit' : '新增預訂'} 
                    </h2>
                    <button onClick={() => setIsAdding(false)} className="text-xs font-bold uppercase text-ink-400 hover:text-ink-900 active:scale-95 transition-transform">Cancel</button>
                </div>

                <div className="space-y-6">
                    {/* FLIGHT FORM ... */}
                    {(activeTab === 'FLIGHT' || activeTab === 'TRANSPORT' || activeTab === 'CAR' || activeTab === 'TICKET') && (
                        // ... Logic for other types handled in standard blocks above (omitted for brevity as they are unchanged except wrapper)
                        // Re-rendering standard blocks to ensure they appear in full file:
                        <>
                            {activeTab === 'FLIGHT' && (
                                <>
                                    {!editingId && (
                                        <div className="space-y-3 mb-2">
                                            <div className="flex bg-ink-50 rounded-lg p-1 border border-ink-100">
                                                <button onClick={() => setFlightType('ONE_WAY')} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${flightType === 'ONE_WAY' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>單程 Single</button>
                                                <button onClick={() => setFlightType('ROUND_TRIP')} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${flightType === 'ROUND_TRIP' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>來回 Round Trip</button>
                                            </div>
                                            {flightType === 'ONE_WAY' && (
                                                <div className="flex gap-4 px-1">
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <div className={`w-4 h-4 rounded-full border border-ink-300 flex items-center justify-center ${singleFlightDirection === 'OUTBOUND' ? 'border-accent-indigo' : ''}`}>{singleFlightDirection === 'OUTBOUND' && <div className="w-2 h-2 rounded-full bg-accent-indigo"></div>}</div>
                                                        <input type="radio" checked={singleFlightDirection === 'OUTBOUND'} onChange={() => setSingleFlightDirection('OUTBOUND')} className="hidden" />
                                                        <span className={`text-xs font-bold uppercase tracking-wide ${singleFlightDirection === 'OUTBOUND' ? 'text-accent-indigo' : 'text-ink-400'}`}>去程 Outbound</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <div className={`w-4 h-4 rounded-full border border-ink-300 flex items-center justify-center ${singleFlightDirection === 'RETURN' ? 'border-accent-matcha' : ''}`}>{singleFlightDirection === 'RETURN' && <div className="w-2 h-2 rounded-full bg-accent-matcha"></div>}</div>
                                                        <input type="radio" checked={singleFlightDirection === 'RETURN'} onChange={() => setSingleFlightDirection('RETURN')} className="hidden" />
                                                        <span className={`text-xs font-bold uppercase tracking-wide ${singleFlightDirection === 'RETURN' ? 'text-accent-matcha' : 'text-ink-400'}`}>回程 Return</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {(flightType === 'ROUND_TRIP' || (flightType === 'ONE_WAY' && singleFlightDirection === 'OUTBOUND')) && <FlightInputSection title="OUTBOUND FLIGHT" form={form} setForm={setForm} searchingFlight={searchingFlight} onSearch={() => handleSearchFlight(false)} onOpenCalendar={openCalendar} />}
                                    {(flightType === 'ROUND_TRIP' || (flightType === 'ONE_WAY' && singleFlightDirection === 'RETURN')) && <FlightInputSection prefix={flightType === 'ROUND_TRIP' ? "return_" : ""} title="RETURN FLIGHT" form={form} setForm={setForm} searchingFlight={searchingFlight} onSearch={() => handleSearchFlight(flightType === 'ROUND_TRIP')} onOpenCalendar={openCalendar} />}
                                    <div><PassengerSelector adults={form.adults !== undefined ? form.adults : 1} children={form.children !== undefined ? form.children : 0} onChange={(a, c) => setForm((prev: any) => ({...prev, adults: a, children: c}))} /></div>
                                    <div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">費用 Cost</label><CurrencyAmountInput amount={form.cost} currency={form.currency} settings={settings} onChangeAmount={(v) => setForm((prev: any) => ({...prev, cost: v}))} onChangeCurrency={(v) => setForm((prev: any) => ({...prev, currency: v}))} /></div>
                                </>
                            )}
                            {activeTab === 'TRANSPORT' && (
                                <>
                                    <div className="mb-4">
                                        <div className="flex justify-between items-baseline mb-2"><label className="text-[10px] text-ink-400 uppercase tracking-widest">交通類型 Type</label><button onClick={() => setManagingTransportTypes(!managingTransportTypes)} className="text-[10px] font-bold text-accent-teal underline uppercase tracking-widest">{managingTransportTypes ? 'Done' : 'Edit Types'}</button></div>
                                        {managingTransportTypes ? (
                                            <div className="bg-ink-50 p-3 rounded-xl border border-ink-100 mb-2">
                                                <div className="flex flex-wrap gap-2 mb-3">{transportTypes.map(t => (<div key={t} className="flex items-center gap-1 bg-white border border-ink-200 px-3 py-1 rounded-full text-xs">{t}<button onClick={() => handleDeleteTransportType(t)} className="text-red-500 ml-1 hover:text-red-700">✕</button></div>))}</div>
                                                <div className="flex gap-2"><input value={newTransportType} onChange={e => setNewTransportType(e.target.value)} placeholder="Type (e.g. Ferry)" className="flex-1 bg-white border border-ink-200 rounded px-2 py-1 text-sm outline-none" /><button onClick={handleAddTransportType} className="bg-ink-900 text-white px-3 py-1 rounded text-xs font-bold uppercase">Add</button></div>
                                            </div>
                                        ) : (<div className="flex flex-wrap gap-2">{transportTypes.map(t => (<button key={t} onClick={() => setForm({...form, transportType: t})} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${form.transportType === t || (!form.transportType && t === transportTypes[0]) ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-500 border-ink-200 hover:border-ink-400'}`}>{t}</button>))}</div>)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">日期 Date</label><div onClick={() => openCalendar('departureDate')} className="cursor-pointer border-b border-ink-200 py-1 text-base font-serif text-ink-900">{form.departureDate || 'Select Date'}</div></div><div></div></div>
                                    <div className="grid grid-cols-2 gap-4 items-end"><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">出發站 Departure</label><input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none font-serif" value={form.departureStation || ''} onChange={e=>setForm({...form, departureStation: e.target.value})} placeholder="Station" /><div className="mt-2"><TimePicker value={form.departureTimePart} onChange={(v) => setForm({...form, departureTimePart: v})} /></div></div><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">抵達站 Arrival</label><input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none font-serif" value={form.arrivalStation || ''} onChange={e=>setForm({...form, arrivalStation: e.target.value})} placeholder="Station" /><div className="mt-2"><TimePicker value={form.arrivalTimePart} onChange={(v) => setForm({...form, arrivalTimePart: v})} /></div></div></div>
                                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">車廂 Car No.</label><input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none" value={form.carNumber || ''} onChange={e=>setForm({...form, carNumber: e.target.value})} placeholder="-" /></div><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">座位 Seat No.</label><input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none" value={form.seatNumber || ''} onChange={e=>setForm({...form, seatNumber: e.target.value})} placeholder="-" /></div></div>
                                    <div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">票價 Price</label><CurrencyAmountInput amount={form.cost} currency={form.currency} settings={settings} onChangeAmount={(v) => setForm((prev: any) => ({...prev, cost: v}))} onChangeCurrency={(v) => setForm((prev: any) => ({...prev, currency: v}))} /></div>
                                </>
                            )}
                            {activeTab === 'CAR' && (
                                <>
                                    <div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">租車公司 Company</label><input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none font-serif" value={form.company || ''} onChange={e=>setForm({...form, company: e.target.value})} placeholder="Company Name" /></div>
                                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">取車 Pick Up</label><div onClick={() => openCalendar('pickupDate')} className="cursor-pointer border-b border-ink-200 py-1 text-sm font-serif font-bold text-ink-900 hover:bg-ink-50 truncate">{form.pickupDate || 'Date'}</div><div className="mt-2"><TimePicker value={form.pickupTimePart} onChange={(v) => setForm({...form, pickupTimePart: v})} /></div><input className="w-full bg-transparent border-b border-ink-200 py-1 text-xs text-ink-500 outline-none mt-2" value={form.pickupLocation || ''} onChange={e=>setForm({...form, pickupLocation: e.target.value})} placeholder="Location" /></div><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">還車 Drop Off</label><div onClick={() => openCalendar('dropoffDate')} className="cursor-pointer border-b border-ink-200 py-1 text-sm font-serif font-bold text-ink-900 hover:bg-ink-50 truncate">{form.dropoffDate || 'Date'}</div><div className="mt-2"><TimePicker value={form.dropoffTimePart} onChange={(v) => setForm({...form, dropoffTimePart: v})} /></div><input className="w-full bg-transparent border-b border-ink-200 py-1 text-xs text-ink-500 outline-none mt-2" value={form.dropoffLocation || ''} onChange={e=>setForm({...form, dropoffLocation: e.target.value})} placeholder="Location" /></div></div>
                                    <div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">總費用 Cost</label><CurrencyAmountInput amount={form.totalCost} currency={form.currency} settings={settings} onChangeAmount={(v) => setForm((prev: any) => ({...prev, totalCost: v}))} onChangeCurrency={(v) => setForm((prev: any) => ({...prev, currency: v}))} /></div>
                                </>
                            )}
                            {activeTab === 'TICKET' && (
                                <>
                                     <div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">票券名稱 Ticket Name</label><input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none font-serif" value={form.title || ''} onChange={e=>setForm({...form, title: e.target.value})} placeholder="Event / Ticket" /></div>
                                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">日期 Date</label><div onClick={() => openCalendar('date')} className="cursor-pointer border-b border-ink-200 py-1 text-sm font-serif font-bold text-ink-900 hover:bg-ink-50 truncate">{form.date || 'Select Date'}</div></div><div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">時間 Time</label><TimePicker value={form.time} onChange={(v) => setForm({...form, time: v})} /></div></div>
                                    <div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">地點 Location</label><input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none" value={form.location || ''} onChange={e=>setForm({...form, location: e.target.value})} placeholder="Address" /></div>
                                    <div><label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">費用 Cost</label><CurrencyAmountInput amount={form.cost} currency={form.currency} settings={settings} onChangeAmount={(v) => setForm((prev: any) => ({...prev, cost: v}))} onChangeCurrency={(v) => setForm((prev: any) => ({...prev, currency: v}))} /></div>
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'STAY' && (
                        <>
                            <div>
                                <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">住宿名稱 Hotel Name</label>
                                <input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none font-serif" value={form.title || ''} onChange={e=>setForm({...form, title: e.target.value})} placeholder="Hotel Name" />
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">地址 Address</label>
                                <input className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none font-serif" value={form.address || ''} onChange={e=>setForm({...form, address: e.target.value})} placeholder="Full Address" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">Check In</label>
                                    <div onClick={() => openCalendar('checkInDate')} className="cursor-pointer border-b border-ink-200 py-1 text-sm font-serif font-bold text-ink-900 hover:bg-ink-50 truncate">{form.checkInDate || 'Date'}</div>
                                    <div className="mt-2"><TimePicker value={form.checkInTime} onChange={(v) => setForm({...form, checkInTime: v})} /></div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">Check Out</label>
                                    <div onClick={() => openCalendar('checkOutDate')} className="cursor-pointer border-b border-ink-200 py-1 text-sm font-serif font-bold text-ink-900 hover:bg-ink-50 truncate">{form.checkOutDate || 'Date'}</div>
                                    <div className="mt-2"><TimePicker value={form.checkOutTime} onChange={(v) => setForm({...form, checkOutTime: v})} /></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">入住天數 Nights</label>
                                    <input type="number" className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none" value={form.nights || ''} onChange={e=>setForm({...form, nights: e.target.value})} placeholder="-" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">人數 Guests</label>
                                    <input type="number" className="w-full bg-transparent border-b border-ink-200 py-1 text-sm text-ink-900 outline-none" value={form.guests || ''} onChange={e=>setForm({...form, guests: e.target.value})} placeholder="-" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-1">費用 Cost</label>
                                <CurrencyAmountInput 
                                    amount={form.totalPrice} 
                                    currency={form.currency} 
                                    settings={settings}
                                    onChangeAmount={(v) => setForm((prev: any) => ({...prev, totalPrice: v}))}
                                    onChangeCurrency={(v) => setForm((prev: any) => ({...prev, currency: v}))}
                                />
                            </div>
                        </>
                    )}

                    {/* Common Notes & Files */}
                    <div className="pt-4 border-t border-ink-50">
                        <label className="text-[10px] text-ink-400 uppercase tracking-widest block mb-2">Notes</label>
                        <textarea 
                            className="w-full bg-ink-50 border border-ink-200 rounded p-3 outline-none font-sans text-sm text-ink-900 placeholder-ink-300 focus:border-ink-900 transition-colors h-20 resize-none"
                            placeholder="Booking ID, details..."
                            value={form.notes || ''}
                            onChange={e => setForm({...form, notes: e.target.value})}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-[10px] text-ink-400 uppercase tracking-widest">Attachments</label>
                             <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest hover:underline">＋ Add File</button>
                             <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {form.files && form.files.map((file: string, idx: number) => (
                                <div key={idx} className="relative w-16 h-16 group">
                                    <img src={file} className="w-full h-full object-cover rounded border border-ink-200" alt="attachment" />
                                    <button onClick={() => removeFile(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-6">
                        {editingId && (
                            <button onClick={() => { onDelete(editingId); setIsAdding(false); setEditingId(null); }} className="flex-1 py-3 border border-red-200 text-red-500 font-bold text-xs uppercase tracking-widest rounded hover:bg-red-50 transition-colors">
                                Delete
                            </button>
                        )}
                        <button onClick={handleSave} className="flex-[2] bg-ink-900 text-white py-3 font-bold text-xs uppercase tracking-widest rounded shadow-md hover:bg-ink-700 transition-all">
                            {editingId ? 'Update' : 'Save'}
                        </button>
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
        
        <Calendar isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onSelect={handleDateSelect} selectedDate={form[activeDateField]} title="Select Date" color={activeTab === 'FLIGHT' ? 'indigo' : 'teal'} />

    </div>
  );
};

export default Bookings;
