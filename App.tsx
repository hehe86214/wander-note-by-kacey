
import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, AppState, TripSettings, DayItinerary, Expense, Trip, ExpenseCategory, DiaryEntry, BaseReservation, PrepItem, AnyReservation, Activity, FlightReservation, StayReservation, CarReservation, TransportReservation, TicketReservation } from './types';
import Navigation from './components/Navigation';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Expenses from './components/Expenses';
import TripList from './components/TripList';
import Diary from './components/Diary';
import Bookings from './components/Bookings';
import Preparation from './components/Preparation';

// Default categories if none exist
const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'Food', label: '餐飲', color: 'border-accent-mustard text-accent-mustard' },
  { id: 'Transport', label: '交通', color: 'border-accent-indigo text-accent-indigo' },
  { id: 'Shopping', label: '購物', color: 'border-accent-sakura text-accent-sakura' },
  { id: 'Stay', label: '住宿', color: 'border-accent-wood text-accent-wood' },
  { id: 'Ticket', label: '娛樂', color: 'border-accent-matcha text-accent-matcha' },
  { id: 'Other', label: '其他', color: 'border-ink-400 text-ink-400' },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: ViewState.TRIP_LIST, 
    settings: null,
    itinerary: [],
    expenses: [],
    categories: [],
    diaryEntries: [],
    reservations: [],
    prepList: [],
    selectedDayId: null,
    savedTrips: []
  });

  // History Stack for "Back" functionality
  const [history, setHistory] = useState<ViewState[]>([]);
  const [editingTripSettings, setEditingTripSettings] = useState<TripSettings | null>(null);
  
  // Pending Activity state for transferring Wishlist -> Itinerary
  const [pendingActivity, setPendingActivity] = useState<Partial<Activity> | null>(null);
  
  // Pending Booking Edit ID (from Dashboard -> Bookings)
  const [targetBookingId, setTargetBookingId] = useState<string | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('nomadflow_trips');
    if (saved) {
        try {
            const trips: Trip[] = JSON.parse(saved);
            const initialView = trips.length > 0 ? ViewState.TRIP_LIST : ViewState.ONBOARDING;

            setState(prev => ({
                ...prev,
                savedTrips: trips,
                view: initialView
            }));
        } catch (e) {
            console.error("Failed to load trips", e);
            setState(prev => ({ ...prev, view: ViewState.ONBOARDING }));
        }
    } else {
        setState(prev => ({ ...prev, view: ViewState.ONBOARDING }));
    }
  }, []);

  // Compute the current active trip object
  const currentActiveTrip: Trip | null = useMemo(() => {
      if (!state.settings) return null;
      return {
          settings: state.settings,
          itinerary: state.itinerary,
          expenses: state.expenses,
          categories: state.categories.length > 0 ? state.categories : DEFAULT_CATEGORIES,
          diaryEntries: state.diaryEntries || [],
          reservations: state.reservations || [],
          prepList: state.prepList || []
      };
  }, [state.settings, state.itinerary, state.expenses, state.categories, state.diaryEntries, state.reservations, state.prepList]);

  // Compute the full list of trips
  const displayTrips = useMemo(() => {
      if (!currentActiveTrip) return state.savedTrips;
      const otherTrips = state.savedTrips.filter(t => t.settings.id !== currentActiveTrip.settings.id);
      return [currentActiveTrip, ...otherTrips];
  }, [state.savedTrips, currentActiveTrip]);

  // Save to LocalStorage
  const saveToLocalStorage = () => {
      if (!currentActiveTrip) return;
      const tripsToSave = displayTrips;
      localStorage.setItem('nomadflow_trips', JSON.stringify(tripsToSave));
  };

  // Auto-save effect
  useEffect(() => {
    const handler = setTimeout(() => {
        saveToLocalStorage();
    }, 1000); 
    return () => clearTimeout(handler);
  }, [displayTrips, currentActiveTrip]);

  // Ensure save on close/refresh
  useEffect(() => {
      const handleBeforeUnload = () => {
          saveToLocalStorage();
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [displayTrips, currentActiveTrip]);

  const generateDays = (start: string, end: string): DayItinerary[] => {
    const days: DayItinerary[] = [];
    const dt = new Date(start);
    const endDt = new Date(end);
    
    while (dt <= endDt) {
      days.push({ id: dt.toISOString().split('T')[0], activities: [] });
      dt.setDate(dt.getDate() + 1);
    }
    return days;
  };

  const handleTripSetup = (settings: TripSettings) => {
    const existingTripIndex = state.savedTrips.findIndex(t => t.settings.id === settings.id);
    let days = generateDays(settings.startDate, settings.endDate);
    let existingExpenses: Expense[] = [];
    let existingCategories: ExpenseCategory[] = DEFAULT_CATEGORIES;
    let existingDiary: DiaryEntry[] = [];
    let existingRes: AnyReservation[] = [];
    let existingPrep: PrepItem[] = [];

    if (existingTripIndex >= 0) {
        const oldTrip = state.savedTrips[existingTripIndex];
        existingExpenses = oldTrip.expenses;
        existingCategories = oldTrip.categories;
        existingDiary = oldTrip.diaryEntries || [];
        existingRes = oldTrip.reservations || [];
        existingPrep = oldTrip.prepList || [];
        
        days = days.map(newDay => {
            const oldDay = oldTrip.itinerary.find(d => d.id === newDay.id);
            return oldDay || newDay; 
        });
    }
    
    // Clear history when starting/loading a trip
    setHistory([]);
    
    setState(prev => ({
      ...prev,
      settings,
      itinerary: days,
      expenses: existingExpenses,
      categories: existingCategories,
      diaryEntries: existingDiary,
      reservations: existingRes,
      prepList: existingPrep,
      view: ViewState.DASHBOARD,
      selectedDayId: days.length > 0 ? days[0].id : null,
    }));
    
    setEditingTripSettings(null);
  };

  const handleSelectTrip = (trip: Trip) => {
      setHistory([]); // Reset history
      setState(prev => ({
          ...prev,
          settings: trip.settings,
          itinerary: trip.itinerary,
          expenses: trip.expenses,
          categories: (trip.categories && trip.categories.length > 0) ? trip.categories : DEFAULT_CATEGORIES,
          diaryEntries: trip.diaryEntries || [],
          reservations: trip.reservations || [],
          prepList: trip.prepList || [],
          view: ViewState.DASHBOARD,
          selectedDayId: trip.itinerary.length > 0 ? trip.itinerary[0].id : null
      }));
  };
  
  const handleDeleteTrip = (id: string) => {
      const newTrips = state.savedTrips.filter(t => t.settings.id !== id);
      const isResettingActive = state.settings?.id === id;
      setEditingTripSettings(null);
      setHistory([]);
      setState(prev => ({
          ...prev,
          savedTrips: newTrips,
          settings: isResettingActive ? null : prev.settings,
          view: newTrips.length === 0 ? ViewState.ONBOARDING : ViewState.TRIP_LIST
      }));
      localStorage.setItem('nomadflow_trips', JSON.stringify(newTrips));
  };

  const handleEditTrip = (trip: Trip, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTripSettings(trip.settings);
      setView(ViewState.ONBOARDING);
  };

  const setView = (view: ViewState) => {
    // If not going back to list or onboarding, push to history
    if (view !== ViewState.TRIP_LIST && view !== ViewState.ONBOARDING && state.view !== view) {
        setHistory(prev => [...prev, state.view]);
    }
    
    if (view === ViewState.TRIP_LIST) {
        setHistory([]); // Clear history on home
    }

    if (view === ViewState.TRIP_LIST && currentActiveTrip) {
        setState(prev => ({ ...prev, savedTrips: displayTrips, view }));
    } else {
        setState(prev => ({ ...prev, view }));
    }
  };

  const handleSelectDay = (dayId: string) => {
    setState(prev => ({ ...prev, selectedDayId: dayId }));
  };

  // State Updates
  const updateSettings = (newSettings: TripSettings) => {
      setState(prev => ({ ...prev, settings: newSettings }));
  };

  const updateDay = (updatedDay: DayItinerary) => setState(prev => ({ ...prev, itinerary: prev.itinerary.map(d => d.id === updatedDay.id ? updatedDay : d) }));
  
  const moveActivity = (activityId: string, sourceDayId: string, targetDayId: string, updatedActivity: Activity) => {
      setState(prev => {
          const newItinerary = [...prev.itinerary];
          const sourceIdx = newItinerary.findIndex(d => d.id === sourceDayId);
          if (sourceIdx === -1) return prev;
          
          const sourceDay = newItinerary[sourceIdx];
          const filteredActivities = sourceDay.activities.filter(a => a.id !== activityId);
          newItinerary[sourceIdx] = { ...sourceDay, activities: filteredActivities };

          let targetIdx = newItinerary.findIndex(d => d.id === targetDayId);
          if (targetIdx !== -1) {
              const targetDay = newItinerary[targetIdx];
              const newActivities = [...targetDay.activities, updatedActivity];
              newActivities.sort((a, b) => a.time.localeCompare(b.time));
              newItinerary[targetIdx] = { ...targetDay, activities: newActivities };
          } else {
              return prev; 
          }

          return { 
              ...prev, 
              itinerary: newItinerary,
              selectedDayId: targetDayId
          };
      });
  };

  const addExpense = (expense: Expense) => setState(prev => ({ ...prev, expenses: [...prev.expenses, expense] }));
  const updateExpense = (expense: Expense) => setState(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === expense.id ? expense : e) }));
  
  const deleteExpense = (id: string) => {
      setState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
  };

  const updateCategories = (categories: ExpenseCategory[]) => setState(prev => ({ ...prev, categories }));
  const addDiaryEntry = (entry: DiaryEntry) => setState(prev => ({ ...prev, diaryEntries: [...prev.diaryEntries, entry] }));
  const updateDiaryEntry = (entry: DiaryEntry) => setState(prev => ({ ...prev, diaryEntries: prev.diaryEntries.map(d => d.id === entry.id ? entry : d) }));
  
  const deleteDiaryEntry = (id: string) => {
      setState(prev => ({ ...prev, diaryEntries: prev.diaryEntries.filter(d => d.id !== id) }));
  };
  
  // Helper to sync reservation costs to expenses
  const syncExpenseFromReservation = (res: AnyReservation, currentExpenses: Expense[]): Expense[] => {
      let cost = 0;
      let title = '';
      let categoryId = 'Other';
      let date = '';
      let currency = 'TWD';

      if (res.type === 'FLIGHT') {
          const r = res as FlightReservation;
          cost = r.cost || 0;
          title = `機票:${r.title}`; // Removed space as requested
          categoryId = 'Transport';
          date = r.departureTime.split(' ')[0];
          currency = r.currency || 'TWD';
      } else if (res.type === 'STAY') {
          const r = res as StayReservation;
          cost = r.totalPrice || 0;
          title = `住宿: ${r.title}`;
          categoryId = 'Stay';
          date = r.checkInDate;
          currency = r.currency || 'TWD';
      } else if (res.type === 'CAR') {
          const r = res as CarReservation;
          cost = r.totalCost || 0;
          title = `租車: ${r.company}`;
          categoryId = 'Transport';
          date = r.pickupDate.split(' ')[0];
          currency = r.currency || 'TWD';
      } else if (res.type === 'TRANSPORT') {
          const r = res as TransportReservation;
          cost = r.cost || 0;
          title = `${r.transportType || '交通'}: ${r.departureStation} → ${r.arrivalStation}`;
          categoryId = 'Transport';
          date = r.departureTime.split(' ')[0];
          currency = r.currency || 'TWD';
      } else if (res.type === 'TICKET') {
          const r = res as TicketReservation;
          cost = r.cost || 0;
          title = `票券: ${r.title}`;
          categoryId = 'Ticket';
          date = r.date;
          currency = r.currency || 'TWD';
      }

      if (cost <= 0) return currentExpenses;

      // Find existing linked expense
      const existingIdx = currentExpenses.findIndex(e => e.linkedReservationId === res.id);
      
      // Calculate amounts (Simplified for sync, ideally we use the same logic as expenses)
      // If currency is HOME, amountHome = cost. If Foreign, amountHome = cost * rate.
      let amountHome = cost;
      let amountForeign = cost;
      const rate = state.settings?.exchangeRate || 1;

      if (currency === state.settings?.homeCurrency) {
          amountForeign = cost / rate;
      } else {
          amountHome = cost * rate;
      }

      const newExpense: Expense = {
          id: existingIdx >= 0 ? currentExpenses[existingIdx].id : `exp-${res.id}`,
          item: title,
          amountForeign: parseFloat(amountForeign.toFixed(2)),
          amountHome: parseFloat(amountHome.toFixed(2)),
          currency: currency,
          category: categoryId,
          isSplit: false, 
          date: date || new Date().toISOString(),
          linkedReservationId: res.id,
          paymentMethod: 'Credit Card' // Default
      };

      const newExpenses = [...currentExpenses];
      if (existingIdx >= 0) {
          newExpenses[existingIdx] = newExpense;
      } else {
          newExpenses.push(newExpense);
      }
      return newExpenses;
  };

  const addReservation = (res: AnyReservation) => {
      setState(prev => {
          const newExpenses = syncExpenseFromReservation(res, prev.expenses);
          return { 
              ...prev, 
              reservations: [...prev.reservations, res],
              expenses: newExpenses
          };
      });
  };

  const updateReservation = (res: AnyReservation) => {
      setState(prev => {
          const newExpenses = syncExpenseFromReservation(res, prev.expenses);
          return {
              ...prev,
              reservations: prev.reservations.map(r => r.id === res.id ? res : r),
              expenses: newExpenses
          };
      });
  };

  const deleteReservation = (id: string) => {
      setState(prev => ({ 
          ...prev, 
          reservations: prev.reservations.filter(r => r.id !== id),
          expenses: prev.expenses.filter(e => e.linkedReservationId !== id)
      }));
  };

  const updatePrepList = (items: PrepItem[]) => setState(prev => ({ ...prev, prepList: items }));

  // Specific handler to update a single prep item (used for linking shopping items)
  const handleUpdatePrepItem = (updatedItem: PrepItem) => {
      setState(prev => ({
          ...prev,
          prepList: prev.prepList.map(item => item.id === updatedItem.id ? updatedItem : item)
      }));
  };

  // Handler to move Wishlist Item to Itinerary
  const handleAddToItinerary = (item: PrepItem) => {
      setPendingActivity({
          title: item.text,
          location: item.text, 
          notes: item.notes 
      });
      setView(ViewState.DASHBOARD);
  };

  const handleEditBooking = (id: string) => {
      setTargetBookingId(id);
      setView(ViewState.BOOKINGS);
  };

  const clearPendingActivity = () => {
      setPendingActivity(null);
  };

  const renderContent = () => {
    switch (state.view) {
      case ViewState.TRIP_LIST:
        return (
            <TripList 
                trips={displayTrips}
                onSelectTrip={handleSelectTrip}
                onNewTrip={() => { setEditingTripSettings(null); setView(ViewState.ONBOARDING); }}
                onEditTrip={handleEditTrip}
            />
        );

      case ViewState.ONBOARDING:
        return (
            <Onboarding 
                onComplete={handleTripSetup} 
                onCancel={() => setView(ViewState.TRIP_LIST)} 
                initialSettings={editingTripSettings}
                onDelete={handleDeleteTrip} 
                allowCancel={state.savedTrips.length > 0} 
            />
        );
      
      case ViewState.DASHBOARD:
        if (!state.settings) return null;
        return (
          <Dashboard 
            settings={state.settings} 
            days={state.itinerary} 
            selectedDayId={state.selectedDayId}
            onSelectDay={handleSelectDay}
            onUpdateDay={updateDay}
            onMoveActivity={moveActivity}
            fullTripData={currentActiveTrip!}
            pendingActivity={pendingActivity}
            onClearPendingActivity={clearPendingActivity}
            wishlistItems={state.prepList}
            onUpdatePrepItem={handleUpdatePrepItem} // New prop for linking
            onEditBooking={handleEditBooking}
            onSave={saveToLocalStorage}
            onGoHome={() => setView(ViewState.TRIP_LIST)}
            onUpdateSettings={updateSettings}
          />
        );

      case ViewState.DIARY:
          if (!state.settings) return null;
          return (
              <Diary 
                entries={state.diaryEntries || []}
                itinerary={state.itinerary}
                onAddEntry={addDiaryEntry}
                onUpdateEntry={updateDiaryEntry}
                onDeleteEntry={deleteDiaryEntry}
              />
          );

      case ViewState.EXPENSES:
      case ViewState.ADD_EXPENSE:
        if (!state.settings) return null;
        return (
            <div className="pt-28 pb-32">
              <Expenses 
                  settings={state.settings} 
                  expenses={state.expenses}
                  categories={state.categories}
                  onAddExpense={addExpense}
                  onUpdateExpense={updateExpense}
                  onDeleteExpense={deleteExpense}
                  onUpdateCategories={updateCategories}
              />
            </div>
        );

      case ViewState.BOOKINGS:
        if (!state.settings) return null;
        return (
            <Bookings 
                reservations={state.reservations}
                onAdd={addReservation}
                onUpdate={updateReservation}
                onDelete={deleteReservation}
                settings={state.settings}
                initialEditingId={targetBookingId}
                onClearInitialEditingId={() => setTargetBookingId(null)}
            />
        );

      case ViewState.PREPARATION:
        if (!state.settings) return null;
        return (
            <Preparation 
                items={state.prepList}
                onUpdateItems={updatePrepList}
                onAddToItinerary={handleAddToItinerary}
            />
        );
    
      default:
        return <div className="pt-24">View not found</div>;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen relative shadow-2xl overflow-hidden font-sans text-slate-900 bg-white/30 backdrop-blur-sm">
      
      {state.view !== ViewState.ONBOARDING && state.view !== ViewState.TRIP_LIST && state.settings && (
        <Navigation currentView={state.view} setView={setView} />
      )}
      
      {renderContent()}
    </div>
  );
};

export default App;
