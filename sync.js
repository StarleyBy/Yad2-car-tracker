const API_URL = 'https://script.google.com/macros/s/AKfycbyLkbqre8lA9vrdBTeXuyiulwvPKwoO9GmldTE2NU5Yic-xoHyW1KTIN5Rvx1mfWmyr/exec';

async function syncCarsToSheets(cars) {
  try {
    const sortedCars = [...cars].sort((a, b) => (parseInt(a.price) || 0) - (parseInt(b.price) || 0));

    const payload = sortedCars.map(car => ({
      id: car.id,
      title: car.title,
      price: car.price,
      year: car.year,
      mileage: car.mileage,
      city: car.city,
      accident: car.accident ? 'YES' : 'NO',
      notes: car.notes || '',
      link: car.link,
      syncTime: new Date().toISOString()
    }));

    // To avoid CORS preflight (OPTIONS request), we must not use 'application/json' 
    // or custom headers. Using 'text/plain' or 'application/x-www-form-urlencoded' 
    // makes it a "Simple Request" which bypasses the preflight check.
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors', // This is crucial for Google Apps Script in extensions
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: JSON.stringify({ 
        action: 'sync_all', 
        cars: payload 
      })
    });
    
    // In 'no-cors' mode, the response is opaque, but the request still reaches the server.
    return { success: true }; 
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}