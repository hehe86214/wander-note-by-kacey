
import React, { useState } from 'react';
import { Flight } from '../types';
import { parseFlightText } from '../services/geminiService';

interface Props {
  flights: Flight[];
  onAddFlight: (flight: Flight) => void;
  onDeleteFlight: (id: string) => void; 
}

const Flights: React.FC<Props> = ({ flights, onAddFlight, onDeleteFlight }) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleParse = async () => {
    if(!inputText) return;
    setLoading(true);
    // Uses the upgraded parseFlightText which now uses Google Search Grounding to find terminals
    const result = await parseFlightText(inputText);
    setLoading(false);
    
    if(result) {
        const newFlight: Flight = {
            id: Date.now().toString(),
            airline: result.airline || 'Airline',
            flightNumber: result.flightNumber || 'UNK',
            class: result.class || 'Economy',
            seat: result.seat || '-',
            departure: {
                city: result.departureCity || 'Origin',
                code: result.departureCode || 'ORG',
                date: result.departureDate || new Date().toISOString().split('T')[0],
                time: result.departureTime || '00:00',
                terminal: result.departureTerminal, 
                gate: result.departureGate
            },
            arrival: {
                city: result.arrivalCity || 'Dest',
                code: result.arrivalCode || 'DST',
                time: result.arrivalTime || '00:00',
                terminal: result.arrivalTerminal
            },
            status: { checkedIn: false, boarding: false }
        };
        onAddFlight(newFlight);
        setInputText('');
    } else {
        alert('Could not parse flight info');
    }
  };

  return (
    <div className="p-4">
        <div className="flex gap-2 mb-4">
            <input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste flight details (e.g. JX800...)"
                className="border border-gray-300 rounded p-2 flex-1"
            />
            <button 
                onClick={handleParse} 
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? 'Parsing...' : 'Add'}
            </button>
        </div>
        
        <div className="space-y-2">
            {flights.map(f => (
                <div key={f.id} className="border border-gray-200 rounded p-3 flex justify-between items-center">
                    <div>
                        <div className="font-bold">{f.airline} {f.flightNumber}</div>
                        <div className="text-sm text-gray-500">
                            {f.departure.code} -> {f.arrival.code}
                        </div>
                    </div>
                    <button 
                        onClick={() => onDeleteFlight(f.id)}
                        className="text-red-500 text-sm"
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    </div>
  );
};

export default Flights;
