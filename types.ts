
export enum ViewState {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  DAY_DETAIL = 'DAY_DETAIL',
  EXPENSES = 'EXPENSES',
  ADD_EXPENSE = 'ADD_EXPENSE',
  TRIP_LIST = 'TRIP_LIST',
  DIARY = 'DIARY',
  BOOKINGS = 'BOOKINGS',
  PREPARATION = 'PREPARATION'
}

export interface TripSettings {
  id: string; 
  name: string;
  destinations: string[];
  startDate: string; 
  endDate: string; 
  homeCurrency: string; 
  targetCurrency: string; 
  exchangeRate: number;
  travelerCount?: number; // New
  companions?: string[]; // New
}

export enum TransportType {
  WALK = 'WALK',
  TRAIN = 'TRAIN',
  BUS = 'BUS',
  TAXI = 'TAXI',
  FLIGHT = 'FLIGHT',
  BOAT = 'BOAT'
}

// Unified Reservation Types
export type ReservationType = 'FLIGHT' | 'TRANSPORT' | 'STAY' | 'CAR' | 'TICKET';

export interface BaseReservation {
    id: string;
    type: ReservationType;
    title: string; 
    notes?: string;
    files?: string[]; // Base64
}

export interface FlightReservation extends BaseReservation {
    type: 'FLIGHT';
    airline: string;
    flightNumber: string;
    departureTime: string; // YYYY-MM-DD HH:mm
    departureCity: string;
    departureCode?: string; // New: Airport Code (TPE)
    departureTerminal?: string; 
    arrivalTime: string; // YYYY-MM-DD HH:mm
    arrivalCity: string;
    arrivalCode?: string; // New: Airport Code (NRT)
    arrivalTerminal?: string; 
    duration?: string;
    baggageWeight?: string; 
    cost?: number;
    passengers?: number;
    adults?: number; // New: Detailed breakdown
    children?: number; // New: Detailed breakdown
    currency?: string;
    isCrossDay?: boolean;
    
    // New Return Leg info for Round Trip (Single Entry)
    returnLeg?: {
        airline: string;
        flightNumber: string;
        departureTime: string;
        departureCity: string;
        departureCode?: string;
        departureTerminal?: string;
        arrivalTime: string;
        arrivalCity: string;
        arrivalCode?: string;
        arrivalTerminal?: string;
        duration?: string;
    };
}

export interface TransportReservation extends BaseReservation {
    type: 'TRANSPORT';
    transportType: string; // e.g. Shinkansen, Subway, Bus
    departureStation: string;
    arrivalStation: string;
    departureTime: string; // YYYY-MM-DD HH:mm
    arrivalTime: string; // YYYY-MM-DD HH:mm
    carNumber?: string;
    seatNumber?: string;
    cost: number;
    currency?: string;
}

export interface StayReservation extends BaseReservation {
    type: 'STAY';
    bookingId?: string;
    address: string;
    checkInDate: string; // YYYY-MM-DD
    checkInTime?: string; // HH:mm
    checkOutDate: string; // YYYY-MM-DD
    checkOutTime?: string; // HH:mm
    totalPrice: number;
    currency?: string;
    nights: number;
    guests: number;
}

export interface CarReservation extends BaseReservation {
    type: 'CAR';
    company: string;
    bookingId?: string;
    pickupLocation: string;
    pickupDate: string; // YYYY-MM-DD HH:mm
    dropoffLocation: string;
    dropoffDate: string; // YYYY-MM-DD HH:mm
    durationDays: number;
    passengers: number;
    totalCost: number;
    currency?: string;
    // Voucher is stored in base files[]
}

export interface TicketReservation extends BaseReservation {
    type: 'TICKET';
    date: string;
    time?: string;
    location?: string;
    bookingId?: string;
    cost?: number; // Added
    currency?: string; // Added
}

export type AnyReservation = FlightReservation | TransportReservation | StayReservation | CarReservation | TicketReservation;

// Detailed Flight Interface for Itinerary (DayDetail)
export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  ticketNumber?: string;
  class?: string;
  seat?: string;
  departure: {
      city: string;
      code: string;
      date: string;
      time: string;
      terminal?: string;
      gate?: string;
  };
  arrival: {
      city: string;
      code: string;
      time: string;
      terminal?: string;
  };
  status?: {
      checkedIn: boolean;
      boarding: boolean;
  };
}

export interface Activity {
  id: string;
  type: 'ACTIVITY' | 'FLIGHT'; 
  time: string; 
  title: string;
  location: string;
  notes?: string;
  transportToNext?: TransportType;
  transportDuration?: string;
  stayDuration?: string; // New: HH:mm format
  geo?: { lat: number; lng: number };
  flightDetails?: Flight; 
}

export interface DayItinerary {
  id: string; 
  activities: Activity[];
}

export interface ExpenseCategory {
  id: string;
  label: string;
  color: string; 
  icon?: string; 
}

export interface SplitMember {
  name: string;
  amount: number;
}

export interface Expense {
  id: string;
  item: string;
  amountForeign: number;
  amountHome: number;
  currency: string;
  category: string;
  paymentMethod?: string;
  isSplit: boolean;
  splitDetails?: string; 
  splitMembers?: SplitMember[]; 
  date: string;
  image?: string; 
  linkedReservationId?: string; // To track auto-added expenses
}

// Diary Types
export interface DiaryPhoto {
  id: string;
  url: string; 
  caption?: string;
}

export interface DiaryEntry {
  id: string;
  date: string; 
  time?: string; 
  linkedActivityId?: string; 
  title: string;
  content: string;
  photos: DiaryPhoto[];
  mood?: 'happy' | 'excited' | 'tired' | 'chill' | 'sad';
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
}

// Preparation Types
export type PrepCategory = 'TODO' | 'PACKING' | 'WISHLIST' | 'SHOPPING';

export interface PrepItem {
    id: string;
    text: string;
    isChecked: boolean;
    category: PrepCategory;
    notes?: string;
    image?: string; // Base64 for photos in Shopping/Wishlist
    linkedActivityId?: string; // New: Connect shopping item to specific activity
}

// Complete Trip Object
export interface Trip {
  settings: TripSettings;
  itinerary: DayItinerary[];
  expenses: Expense[];
  categories: ExpenseCategory[]; 
  diaryEntries: DiaryEntry[];
  reservations: AnyReservation[]; 
  prepList: PrepItem[]; 
}

export interface AppState {
  view: ViewState;
  settings: TripSettings | null;
  itinerary: DayItinerary[];
  expenses: Expense[];
  categories: ExpenseCategory[];
  diaryEntries: DiaryEntry[];
  reservations: AnyReservation[]; 
  prepList: PrepItem[]; 
  selectedDayId: string | null;
  savedTrips: Trip[]; 
}
