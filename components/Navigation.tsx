
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { ViewState } from '../types';

interface Props {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const Navigation: React.FC<Props> = ({ currentView, setView }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position whenever the view changes to prevent "jumping forward"
  // Using [currentView] dependency ensures this runs every time tab switches
  useLayoutEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const savedScroll = sessionStorage.getItem('nav_scroll_x');
      if (savedScroll) {
          container.scrollLeft = parseInt(savedScroll, 10);
      }
  }, [currentView]);

  // Attach scroll listener once to save position
  useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleScroll = () => {
          sessionStorage.setItem('nav_scroll_x', container.scrollLeft.toString());
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const NavItem = ({ view, label, icon }: { view: ViewState, label: string, icon?: React.ReactNode }) => {
    const isActive = currentView === view || 
                     (view === ViewState.EXPENSES && currentView === ViewState.ADD_EXPENSE) || 
                     (view === ViewState.DASHBOARD && currentView === ViewState.DAY_DETAIL);
    
    return (
      <button
        onClick={() => setView(view)}
        className={`px-4 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-2 shrink-0 ${
          isActive 
            ? 'bg-ink-900 text-white shadow-md transform scale-105' 
            : 'bg-transparent text-ink-400 hover:bg-white hover:text-ink-900'
        }`}
      >
        {isActive && icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed top-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto h-16 glass rounded-full px-2 pr-4 flex items-center shadow-float overflow-hidden max-w-[95vw]">
        
        {/* Scroll Container with Ref */}
        <div 
          ref={scrollContainerRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full px-2"
          style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
          }}
        >
          {/* Home Button */}
          <button
              onClick={() => setView(ViewState.TRIP_LIST)}
              className="px-4 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-2 shrink-0 bg-transparent text-ink-400 hover:bg-white hover:text-ink-900 border border-transparent hover:border-ink-100"
          >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>首頁</span>
          </button>

          <div className="h-4 w-px bg-ink-200 mx-1 shrink-0"></div>
          
          {/* 1. Plan - Map Icon */}
          <NavItem
              view={ViewState.DASHBOARD}
              label="Plan"
              icon={
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
              }
          />

          {/* 2. Bookings - Ticket Icon */}
          <NavItem
              view={ViewState.BOOKINGS}
              label="Bookings"
              icon={
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
              }
          />

          {/* 3. Wallet - Card Icon */}
          <NavItem
              view={ViewState.EXPENSES}
              label="Wallet"
              icon={
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              }
          />
          
          {/* 4. Log - Open Book Icon */}
          <NavItem
              view={ViewState.DIARY}
              label="Log"
              icon={
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              }
          />

          {/* 5. Prep - Checklist Icon */}
          <NavItem
              view={ViewState.PREPARATION}
              label="Prep"
              icon={
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              }
          />

        </div>
      </div>
    </div>
  );
};

export default Navigation;
