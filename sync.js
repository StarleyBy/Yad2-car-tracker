async function syncCarsToSheets(cars) {
  try {
    const sortedCars = [...cars].sort((a, b) => (parseInt(a.price) || 0) - (parseInt(b.price) || 0));

    const payload = sortedCars.map(car => ({
      id: car.id,
      title: car.title,
      price: car.price,
      year: car.year,
      hand: car.hand || '',
      engine: car.engine || '',
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
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: JSON.stringify({ 
        action: 'sync_all', 
        cars: payload 
      })
    });
    
    return { success: true }; 
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}
