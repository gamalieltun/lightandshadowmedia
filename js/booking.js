// ===== CONFIG =====
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyL2JdpdpN_Al-zi1uzvXogEeHMINjwUhfRO7S7_AnjWy-CANtY1IVHH6i3j4bDYfa8/exec';
const EVENTS_SOURCE = 'data/live-events.json';

// ===== HELPERS =====
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// ===== MAIN =====
document.addEventListener('DOMContentLoaded', () => {
  const eventId = getQueryParam('eventId');

  const titleEl = document.getElementById('eventTitle');
  const metaEl = document.getElementById('eventMeta');

  const eventIdInput = document.getElementById('eventId');
  const eventDateInput = document.getElementById('eventDate');
  const eventVenueInput = document.getElementById('eventVenue');
  const eventTitleHidden = document.getElementById('eventTitleHidden');

  const seatGrid = document.getElementById('seatGrid');
  const selectedSeatsLabel = document.getElementById('selectedSeatsLabel');
  const selectedSeatsInput = document.getElementById('selectedSeats');
  const bookingForm = document.getElementById('bookingForm');
  const bookingStatus = document.getElementById('bookingStatus');
  const submitBtn = document.getElementById('submitBooking');

  let selectedSeats = new Set();
  let bookedSeats = new Set(); // Track already booked seats
  let currentEvent = null;

  // If no eventId in URL -> stop
  if (!eventId) {
    titleEl.textContent = 'Event not found';
    metaEl.textContent = 'Missing event ID.';
    if (seatGrid) {
      seatGrid.innerHTML = '<p style="color:#a0a0a8;">No event selected.</p>';
    }
    return;
  }

  // ===== Load event details from JSON =====
  fetch(EVENTS_SOURCE)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load JSON (${res.status})`);
      return res.json();
    })
    .then(data => {
      console.log('Loaded events from', EVENTS_SOURCE, data);
      const events = data.events || [];
      currentEvent = events.find(e => e.id === eventId);

      if (!currentEvent) {
        titleEl.textContent = 'Event not found';
        metaEl.textContent = 'Please go back and choose an event again.';
        return;
      }

      // Fill header
      titleEl.textContent = currentEvent.title;
      metaEl.textContent = `${currentEvent.venue || ''} • ${formatDateLabel(currentEvent.date)}`;

      // Hidden fields for Google Sheets
      eventIdInput.value = currentEvent.id;
      eventDateInput.value = currentEvent.date || '';
      eventVenueInput.value = currentEvent.venue || '';
      eventTitleHidden.value = currentEvent.title || '';

      // Load booked seats, then build seat map
      loadBookedSeats();
    })
    .catch(err => {
      console.error('Failed to load events JSON from', EVENTS_SOURCE, err);
      titleEl.textContent = 'Error loading event';
      metaEl.textContent = 'Please try again later.';
    });

  // ===== Load booked seats from Google Sheets =====
  function loadBookedSeats() {
    const url = `${GOOGLE_SCRIPT_URL}?eventId=${encodeURIComponent(eventId)}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        console.log('Booked seats:', data);
        
        if (data.bookedSeats && Array.isArray(data.bookedSeats)) {
          bookedSeats = new Set(data.bookedSeats);
        }
        
        // Now build the seat map with booked seats marked
        buildSeatMap();
      })
      .catch(err => {
        console.error('Failed to load booked seats:', err);
        // Still build seat map even if loading fails
        buildSeatMap();
      });
  }

  // ===== Seat map =====
  function buildSeatMap() {
    if (!seatGrid) return;

    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seatsPerRow = 10;

    seatGrid.innerHTML = '';

    rows.forEach(rowLetter => {
      const rowEl = document.createElement('div');
      rowEl.className = 'seat-row';

      const label = document.createElement('div');
      label.className = 'seat-row-label';
      label.textContent = rowLetter;
      rowEl.appendChild(label);

      for (let i = 1; i <= seatsPerRow; i++) {
        const seatCode = `${rowLetter}${i}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seat';
        btn.dataset.seat = seatCode;
        btn.textContent = i;

        // Mark as booked if in bookedSeats set
        if (bookedSeats.has(seatCode)) {
          btn.classList.add('booked');
          btn.disabled = true;
          btn.title = 'Already booked';
        }

        rowEl.appendChild(btn);
      }

      seatGrid.appendChild(rowEl);
    });

    // Click handler for seat selection
    seatGrid.addEventListener('click', (e) => {
      const seat = e.target.closest('.seat');
      if (!seat || seat.classList.contains('booked') || seat.disabled) return;

      const seatCode = seat.dataset.seat;

      if (selectedSeats.has(seatCode)) {
        selectedSeats.delete(seatCode);
        seat.classList.remove('selected');
      } else {
        selectedSeats.add(seatCode);
        seat.classList.add('selected');
      }

      const list = Array.from(selectedSeats);
      selectedSeatsInput.value = list.join(', ');
      selectedSeatsLabel.textContent = list.length ? list.join(', ') : 'None';
    });
  }

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
  
    const name = bookingForm.name.value.trim();
    const email = bookingForm.email.value.trim();
    const phone = bookingForm.phone.value.trim();
    const seats = selectedSeatsInput.value.trim();
  
    if (!seats) {
      bookingStatus.textContent = 'Please select at least one seat.';
      bookingStatus.style.color = '#ff6b6b';
      return;
    }
  
    if (!name || !email || !phone) {
      bookingStatus.textContent = 'Please fill in all details.';
      bookingStatus.style.color = '#ff6b6b';
      return;
    }
  
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    bookingStatus.textContent = '';
    bookingStatus.style.color = '#a0a0a8';
  
    const payload = {
      eventId: eventIdInput.value,
      eventTitle: eventTitleHidden.value,
      eventDate: eventDateInput.value,
      venue: eventVenueInput.value,
      seats,
      name,
      email,
      phone
    };
    //booked seat not available to book anymore
async function fetchBookedSeats(eventId) {
    try {
      const response = await fetch(`${SCRIPT_URL}?eventId=${eventId}`);
      const data = await response.json();
      
      if (data.bookedSeats && Array.isArray(data.bookedSeats)) {
        // Mark these seats as booked in your UI
        data.bookedSeats.forEach(seatId => {
          bookedSeats.add(seatId);
          const seatElement = document.querySelector(`[data-seat="${seatId}"]`);
          if (seatElement) {
            seatElement.classList.add('booked');
            seatElement.classList.remove('available');
          }
        });
      }
    } catch (error) {
      console.error('Error fetching booked seats:', error);
    }
  }
  
  // Call this when the page loads
  document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');
    
    if (eventId) {
      // Fetch already booked seats before rendering
      await fetchBookedSeats(eventId);
    }
    
    // Then render your seat map
    renderSeats();
  });
  
    // ---- SEND VIA FORMDATA ----
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
  
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    })
      .then(() => {
        bookingStatus.textContent = 'Booking submitted! We will contact you with details.';
        bookingStatus.style.color = '#c9a227';
  
        // Clear form
        bookingForm.reset();
        
        // Add newly booked seats to the bookedSeats set
        seats.split(',').forEach(seat => {
          bookedSeats.add(seat.trim());
        });
        
        // Clear selected seats
        selectedSeats.clear();
        selectedSeatsLabel.textContent = 'None';
        selectedSeatsInput.value = '';
        
        // Rebuild seat map to show newly booked seats
        buildSeatMap();
      })
      .catch(err => {
        console.error('Booking error:', err);
        bookingStatus.textContent = 'Network error. Please try again.';
        bookingStatus.style.color = '#ff6b6b';
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Booking';
      });
  });
});