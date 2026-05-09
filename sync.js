const API_URL = 'https://script.google.com/macros/s/AKfycbyLkbqre8lA9vrdBTeXuyiulwvPKwoO9GmldTE2NU5Yic-xoHyW1KTIN5Rvx1mfWmyr/exec';

async function syncCarsToSheets(cars) {
  try {
    // Sort cars by price or date to maintain some order in the sheet
    const sortedCars = [...cars].sort((a, b) => (parseInt(a.price) || 0) - (parseInt(b.price) || 0));

    // Map to a clean structure to ensure consistency
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({ 
        action: 'sync_all', // Tell the script to replace or update intelligently
        cars: payload 
      })
    });
    
    return { success: true }; 
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}