
import React, { useState, useMemo } from 'react';
import { Trip } from '../types';

interface Props {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onNewTrip: () => void;
  onEditTrip: (trip: Trip, e: React.MouseEvent) => void;
}

const TripList: React.FC<Props> = ({ trips, onSelectTrip, onNewTrip, onEditTrip }) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); 

  const sortedTrips = useMemo(() => {
      return [...trips].sort((a, b) => {
          const timeA = new Date(a.settings.startDate).getTime();
          const timeB = new Date(b.settings.startDate).getTime();
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
  }, [trips, sortOrder]);

  const toggleSort = () => {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getCountdown = (startDate: string, endDate: string) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const start = new Date(startDate);
      start.setHours(0,0,0,0);
      const end = new Date(endDate);
      end.setHours(23,59,59,999);

      if (today > end) {
          return { text: "Trip Ended", style: "text-ink-400 bg-ink-100" };
      } else if (today >= start && today <= end) {
          const diff = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return { text: `Day ${diff} of Journey`, style: "text-white bg-accent-teal animate-pulse" };
      } else {
          const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { text: `${diff} Days to Go`, style: "text-white bg-accent-coral" };
      }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] flex justify-center pt-24 pb-10 px-4 overflow-y-auto relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.2' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`
           }}>
      </div>

      {/* The Light Notebook */}
      <div className="w-full max-w-md bg-[#FDFBF7] shadow-2xl relative min-h-[85vh] rounded-2xl overflow-hidden flex flex-col transform rotate-[0.5deg] border-t-8 border-accent-indigo">
        
        {/* Content Area */}
        <div className="flex-1 px-6 py-12 relative z-10">
            
            {/* Header Stamp */}
            <div className="flex flex-col items-center mb-6 pl-4">
                <div className="border-b-2 border-double border-accent-coral/60 px-6 py-2">
                    <h1 className="text-2xl font-serif font-bold text-ink-900 tracking-[0.2em] uppercase text-center">My Journeys</h1>
                </div>
            </div>

            {/* Sort Toggle */}
            <div className="flex justify-end pr-2 mb-4 pl-4">
                <button 
                    onClick={toggleSort}
                    className="text-[10px] font-bold uppercase tracking-widest text-ink-400 hover:text-ink-900 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-full border border-ink-100"
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
                    <span>{sortOrder === 'asc' ? 'Date: Near → Far' : 'Date: Far → Near'}</span>
                </button>
            </div>

            {/* List */}
            <div className="space-y-8 pl-2">
                
                {/* Create New Trip */}
                <button 
                    onClick={onNewTrip}
                    className="relative w-full bg-white/50 border-2 border-dashed border-accent-teal/30 p-6 rounded-sm flex flex-col items-center justify-center gap-2 text-accent-teal hover:border-accent-teal hover:bg-accent-teal/5 transition-all group mx-2 min-h-[140px]"
                >
                    <div className="w-12 h-12 rounded-full bg-white border border-accent-teal/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm text-accent-teal">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <span className="text-xs font-bold tracking-[0.2em] uppercase">Start New Journey</span>
                </button>

                {/* Saved Trips */}
                {sortedTrips.map((trip, idx) => {
                    const start = new Date(trip.settings.startDate);
                    const tapeColor = idx % 3 === 0 ? 'bg-accent-teal/80' : idx % 3 === 1 ? 'bg-accent-coral/80' : 'bg-accent-ocean/80';
                    const rotate = idx % 2 === 0 ? 'rotate-[-1deg]' : 'rotate-[1deg]';
                    const countdown = getCountdown(trip.settings.startDate, trip.settings.endDate);
                    const travelerCount = trip.settings.travelerCount || 1;
                    
                    return (
                        <div 
                            key={trip.settings.id}
                            onClick={() => onSelectTrip(trip)}
                            className={`relative bg-white shadow-float p-6 pt-8 rounded-sm cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg group ${rotate} mx-2`}
                        >
                            {/* Colorful Tape */}
                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 ${tapeColor} opacity-90 shadow-sm transform -rotate-1 skew-x-1`} 
                                 style={{
                                    maskImage: 'url("data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDBoMjAwdjUwaC0yMDB6IiBmaWxsPSJibGFjayIvPjxwYXRoIGQ9Ik0wIDAgTDUgNSBMTAgMCBMMTUgNSBMMjAgMCBMMjUgNSBMMzAgMCBMMzUgNSBMNDAgMCBMNDUgNSBMNTAgMCBMNTUgNSBMNjAgMCBMNjUgNSBMNzAgMCBMNzUgNSBMODAgMCBMODUgNSBMOTAgMCBMOTUgNSBMMTAwIDAgTDEwNSA1IEwxMTAgMCBMMTE1IDUgTDEyMCAwIEwxMjUgNSBMMTMwIDAgTDEzNSA1IEwxNDAgMCBMMTQ1IDUgTDE1MCAwIEwxNTUgNSBMMTYwIDAgTDE2NSA1IEwxNzAgMCBMMTc1IDUgTDE4MCAwIEwxODUgNSBMMTkwIDAgTDE5NSA1IEwyMDAgMCIgZmlsbD0id2hGl0ZSIvPjwvc3ZnPg==")',
                                    WebkitMaskImage: 'url("data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDBoMjAwdjUwaC0yMDB6IiBmaWxsPSJibGFjayIvPjxwYXRoIGQ9Ik0wIDAgTDUgNSBMTAgMCBMMTUgNSBMMjAgMCBMMjUgNSBMMzAgMCBMMzUgNSBMNDAgMCBMNDUgNSBMNTAgMCBMNTUgNSBMNjAgMCBMNjUgNSBMNzAgMCBMNzUgNSBMODAgMCBMODUgNSBMOTAgMCBMOTUgNSBMMTAwIDAgTDEwNSA1IEwxMTAgMCBMMTE1IDUgTDEyMCAwIEwxMjUgNSBMMTMwIDAgTDEzNSA1IEwxNDAgMCBMMTQ1IDUgTDE1MCAwIEwxNTUgNSBMMTYwIDAgTDE2NSA1IEwxNzAgMCBMMTc1IDUgTDE4MCAwIEwxODUgNSBMMTkwIDAgTDE5NSA1IEwyMDAgMCIgZmlsbD0id2hGl0ZSIvPjwvc3ZnPg==")',
                                    maskSize: 'contain',
                                    WebkitMaskSize: 'contain'
                                 }}
                            ></div>

                            <div className="flex flex-col gap-3">
                                {/* Countdown Badge */}
                                <div className="flex justify-center mb-1">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${countdown.style}`}>
                                        {countdown.text}
                                    </span>
                                </div>

                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-serif text-2xl font-bold text-ink-900 leading-tight mb-2">{trip.settings.name}</h3>
                                        <div className="flex flex-wrap gap-2 text-[10px] text-ink-500 font-sans tracking-widest uppercase items-center">
                                            <span className="bg-ink-50 px-2 py-1 rounded border border-ink-100">{start.toLocaleDateString()}</span>
                                            <span className="bg-ink-50 px-2 py-1 rounded border border-ink-100">{trip.settings.destinations[0]}</span>
                                            {/* Traveler Count Badge */}
                                            <span className="bg-ink-50 px-2 py-1 rounded border border-ink-100 flex items-center gap-1">
                                                <svg className="w-3 h-3 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                                {travelerCount} 人
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 z-30 relative">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditTrip(trip, e);
                                            }}
                                            className="w-10 h-10 flex items-center justify-center text-ink-300 hover:text-ink-900 hover:bg-ink-50 rounded-full transition-colors border border-transparent hover:border-ink-200"
                                            title="Edit Settings"
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TripList;
