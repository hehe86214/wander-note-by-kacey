
import { Trip, Activity, FlightReservation, StayReservation, CarReservation, TicketReservation, TransportReservation, PrepItem } from '../types';

declare const html2pdf: any;

export const generateTripPDF = async (trip: Trip) => {
  if (typeof html2pdf === 'undefined') {
    alert('PDF generator is initializing, please try again in a moment.');
    return;
  }

  // Create a temporary container for the PDF content
  const element = document.createElement('div');
  element.style.width = '800px'; // Fixed width for A4 consistency
  element.style.color = '#2b2b2b';
  element.style.backgroundColor = '#ffffff';

  // --- HELPER FUNCTIONS ---
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatTime = (t: string) => t;
  const getDayLabel = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

  // --- STYLES ---
  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
      
      .pdf-container { font-family: 'Noto Sans TC', sans-serif; line-height: 1.6; color: #4a4a4a; }
      .font-serif { font-family: 'Noto Serif TC', serif; }
      .font-display { font-family: 'Cormorant Garamond', serif; }
      
      .page { position: relative; width: 100%; min-height: 1120px; padding: 50px; box-sizing: border-box; page-break-after: always; overflow: hidden; }
      .page-break { page-break-before: always; }
      
      /* COLORS */
      .text-indigo { color: #3E517A; }
      .text-matcha { color: #8A9A5B; }
      .text-coral { color: #E07A5F; }
      .bg-indigo { background-color: #3E517A; }
      .bg-matcha { background-color: #8A9A5B; }
      .bg-light { background-color: #f8f9fa; }
      
      /* COVER */
      .cover-page { display: flex; flex-direction: column; justify-content: center; text-align: center; border: 12px double #3E517A; height: 1060px; padding: 60px; }
      .cover-subtitle { font-size: 14px; letter-spacing: 4px; text-transform: uppercase; color: #8A9A5B; margin-bottom: 30px; font-weight: bold; }
      .cover-title { font-size: 56px; font-weight: 700; color: #2b2b2b; margin-bottom: 20px; line-height: 1.2; font-family: 'Noto Serif TC', serif; }
      .cover-dates { font-size: 18px; color: #757575; font-style: italic; margin-bottom: 60px; font-family: 'Cormorant Garamond', serif; }
      .cover-divider { width: 60px; height: 4px; background-color: #E07A5F; margin: 0 auto 60px; }
      .cover-destinations { font-size: 20px; letter-spacing: 2px; text-transform: uppercase; color: #3E517A; font-weight: 600; }
      .cover-footer { margin-top: auto; font-size: 12px; color: #bdbdbd; letter-spacing: 2px; }

      /* PAGE HEADER */
      .page-header { border-bottom: 2px solid #3E517A; padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
      .page-title { font-size: 28px; font-weight: 700; color: #3E517A; font-family: 'Noto Serif TC', serif; }
      .page-number { font-size: 12px; color: #9e9e9e; font-family: 'Cormorant Garamond', serif; }

      /* SECTIONS */
      .section-title { font-size: 16px; font-weight: 700; letter-spacing: 1px; color: #E07A5F; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
      .section-box { background: #fcfcfc; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 30px; }

      /* CHECKLIST */
      .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .check-item { display: flex; align-items: center; font-size: 12px; color: #555; }
      .check-box { width: 12px; height: 12px; border: 1px solid #ccc; margin-right: 8px; border-radius: 2px; }

      /* TIMELINE */
      .timeline { position: relative; padding-left: 30px; margin-top: 20px; }
      .timeline::before { content: ''; position: absolute; left: 6px; top: 10px; bottom: 0; width: 1px; background: #e0e0e0; }
      
      .timeline-item { position: relative; margin-bottom: 25px; page-break-inside: avoid; }
      .time-dot { position: absolute; left: -29px; top: 6px; width: 11px; height: 11px; border-radius: 50%; background: #fff; border: 2px solid #3E517A; z-index: 1; }
      .time-label { font-size: 14px; font-weight: 700; color: #3E517A; font-family: 'Cormorant Garamond', serif; margin-bottom: 4px; }
      
      .card { background: #fff; border-left: 3px solid #eee; padding: 10px 15px; border-radius: 0 4px 4px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
      .card-flight { border-left-color: #3E517A; background: #f4f6f9; }
      .card-stay { border-left-color: #E07A5F; }
      .card-activity { border-left-color: #8A9A5B; }
      
      .card-title { font-size: 15px; font-weight: 600; color: #2b2b2b; margin-bottom: 4px; font-family: 'Noto Serif TC', serif; }
      .card-meta { font-size: 11px; color: #757575; display: flex; align-items: center; gap: 10px; }
      .card-note { font-size: 11px; color: #9e9e9e; font-style: italic; margin-top: 6px; border-top: 1px dashed #eee; padding-top: 6px; }

      /* EXPENSE TABLE */
      .expense-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .expense-table th { text-align: left; padding: 8px; border-bottom: 2px solid #3E517A; color: #3E517A; font-weight: 700; }
      .expense-table td { padding: 8px; border-bottom: 1px solid #eee; color: #555; }
      .total-row td { border-top: 2px solid #3E517A; font-weight: 700; font-size: 14px; color: #3E517A; padding-top: 15px; }
    </style>
  `;

  // --- 1. COVER PAGE ---
  const coverHtml = `
    <div class="page">
      <div class="cover-page">
        <div class="cover-subtitle">Travel Booklet</div>
        <div class="cover-title">${trip.settings.name}</div>
        <div class="cover-divider"></div>
        <div class="cover-dates">
           ${formatDate(trip.settings.startDate)} &mdash; ${formatDate(trip.settings.endDate)}
        </div>
        <div class="cover-destinations">
           ${trip.settings.destinations.join(' • ')}
        </div>
        
        <div style="margin-top: 80px; opacity: 0.8;">
            <!-- Simple decorative geometric pattern -->
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="#3E517A" stroke-width="1">
                <circle cx="50" cy="50" r="40" stroke-dasharray="4 4" />
                <path d="M50 10 L50 90 M10 50 L90 50" stroke="#E07A5F" stroke-width="0.5" />
                <rect x="35" y="35" width="30" height="30" stroke="#8A9A5B" transform="rotate(45 50 50)" />
            </svg>
        </div>

        <div class="cover-footer">WANDER NOTE</div>
      </div>
    </div>
  `;

  // --- 2. OVERVIEW PAGE (Checklist & Key Info) ---
  const packingList = trip.prepList.filter(i => i.category === 'PACKING');
  
  let overviewHtml = `
    <div class="page">
      <div class="page-header">
        <div class="page-title">Trip Overview</div>
        <div class="page-number">01</div>
      </div>

      <div class="section-title">✈️ Key Details</div>
      <div class="section-box">
         <table style="width: 100%; font-size: 13px;">
            <tr>
                <td style="color:#999; width: 100px;">Duration</td>
                <td>${Math.ceil((new Date(trip.settings.endDate).getTime() - new Date(trip.settings.startDate).getTime())/(1000*60*60*24)) + 1} Days</td>
            </tr>
            <tr>
                <td style="color:#999;">Travelers</td>
                <td>${trip.settings.travelerCount || 1} Person(s)</td>
            </tr>
            <tr>
                <td style="color:#999;">Budget</td>
                <td>1 ${trip.settings.targetCurrency} ≈ ${trip.settings.exchangeRate} TWD</td>
            </tr>
         </table>
      </div>

      <div class="section-title">🧳 Packing Checklist</div>
      <div class="section-box">
         <div class="checklist-grid">
            ${packingList.length > 0 
              ? packingList.map(item => `
                  <div class="check-item">
                    <div class="check-box" style="${item.isChecked ? 'background:#8A9A5B; border-color:#8A9A5B;' : ''}"></div>
                    <span style="${item.isChecked ? 'text-decoration: line-through; color: #ccc;' : ''}">${item.text}</span>
                  </div>`).join('')
              : '<div style="font-size:12px; color:#999; font-style:italic;">No packing items added.</div>'
            }
         </div>
      </div>
      
      <div style="text-align: center; margin-top: 50px; opacity: 0.3;">
         <div style="font-size: 10px; letter-spacing: 2px;">NOTES</div>
         <div style="border-bottom: 1px solid #ccc; height: 30px;"></div>
         <div style="border-bottom: 1px solid #ccc; height: 30px;"></div>
         <div style="border-bottom: 1px solid #ccc; height: 30px;"></div>
         <div style="border-bottom: 1px solid #ccc; height: 30px;"></div>
      </div>
    </div>
  `;

  // --- 3. ITINERARY PAGES ---
  let itineraryHtml = '';
  
  trip.itinerary.forEach((day, index) => {
    // Generate Timeline Content
    let timelineContent = '';
    
    // Sort items chronologically (Flights + Activities)
    const dayDate = day.id;
    type TimelineItem = { type: string, time: string, title: string, subtitle?: string, note?: string, icon?: string };
    const items: TimelineItem[] = [];

    // Add Activities
    day.activities.forEach(act => {
        items.push({
            type: 'activity',
            time: act.time,
            title: act.title,
            subtitle: act.location,
            note: act.notes,
            icon: act.type === 'FLIGHT' ? '✈️' : '📍'
        });
    });

    // Add Reservations (Flights, Trains, etc that match date)
    trip.reservations.forEach(res => {
        if (res.type === 'FLIGHT') {
            const r = res as FlightReservation;
            if (r.departureTime.startsWith(dayDate)) {
                items.push({
                    type: 'flight',
                    time: r.departureTime.split(' ')[1],
                    title: `Flight: ${r.airline} ${r.flightNumber}`,
                    subtitle: `${r.departureCode || r.departureCity} ➝ ${r.arrivalCode || r.arrivalCity}`,
                    icon: '🛫'
                });
            }
        } else if (res.type === 'STAY') {
            const s = res as StayReservation;
            if (s.checkInDate === dayDate) {
                items.push({ type: 'stay', time: s.checkInTime || '15:00', title: `Check-in: ${s.title}`, subtitle: s.address, icon: '🏨' });
            }
        }
    });

    // Sort items by time
    items.sort((a, b) => a.time.localeCompare(b.time));

    if (items.length === 0) {
        timelineContent = `<div style="text-align:center; padding:40px; color:#ccc; font-style:italic;">Free Day / No Schedule</div>`;
    } else {
        timelineContent = items.map(item => `
            <div class="timeline-item">
                <div class="time-dot" style="border-color: ${item.type === 'flight' ? '#3E517A' : (item.type === 'stay' ? '#E07A5F' : '#8A9A5B')}"></div>
                <div class="time-label">${item.time}</div>
                <div class="card ${item.type === 'flight' ? 'card-flight' : (item.type === 'stay' ? 'card-stay' : 'card-activity')}">
                    <div class="card-title">${item.icon || ''} ${item.title}</div>
                    ${item.subtitle ? `<div class="card-meta"><span>${item.subtitle}</span></div>` : ''}
                    ${item.note ? `<div class="card-note">${item.note}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    itineraryHtml += `
      <div class="page">
        <div class="page-header">
          <div class="page-title">Day ${index + 1}</div>
          <div class="page-number">${formatDate(day.id)} • ${getDayLabel(day.id)}</div>
        </div>
        
        <div class="timeline">
            ${timelineContent}
        </div>
      </div>
    `;
  });

  // --- 4. EXPENSE PAGE ---
  const totalExpense = trip.expenses.reduce((sum, e) => sum + e.amountHome, 0);
  
  let expensesHtml = `
    <div class="page">
      <div class="page-header">
        <div class="page-title">Expenses</div>
        <div class="page-number">Final Summary</div>
      </div>

      <div class="section-box" style="text-align:center; padding: 30px;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #999;">Total Expenditure</div>
          <div style="font-size: 42px; font-weight: 700; color: #3E517A; font-family: 'Noto Serif TC', serif; margin-top: 10px;">
             $ ${Math.round(totalExpense).toLocaleString()} <span style="font-size: 16px;">TWD</span>
          </div>
      </div>

      <div class="section-title">🧾 Details</div>
      <table class="expense-table">
          <thead>
              <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Cat.</th>
                  <th style="text-align:right;">Amount</th>
              </tr>
          </thead>
          <tbody>
             ${trip.expenses.map(exp => `
                <tr>
                    <td>${new Date(exp.date).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}</td>
                    <td>${exp.item}</td>
                    <td>${exp.category}</td>
                    <td style="text-align:right;">${Math.round(exp.amountHome).toLocaleString()}</td>
                </tr>
             `).join('')}
             <tr class="total-row">
                <td colspan="3">TOTAL</td>
                <td style="text-align:right;">${Math.round(totalExpense).toLocaleString()}</td>
             </tr>
          </tbody>
      </table>
    </div>
  `;

  // --- ASSEMBLE HTML ---
  element.innerHTML = `
    ${styles}
    <div class="pdf-container">
        ${coverHtml}
        ${overviewHtml}
        ${itineraryHtml}
        ${expensesHtml}
    </div>
  `;

  // Options for html2pdf
  const opt = {
    margin: 0,
    filename: `WanderNote_${trip.settings.name.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
    jsPDF: { unit: 'px', format: [800, 1132], orientation: 'portrait' } // Custom A4-ish ratio based on pixel width
  };

  // Generate
  await html2pdf().set(opt).from(element).save();
};
