(async function() {
  console.log('Yad2 Tracker: Scraper active');

  async function collectCars() {
    let cars = [];

    // 1. JSON
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
      try {
        const jsonData = JSON.parse(nextDataScript.textContent);
        const extracted = Yad2Parser.getNestedData(jsonData);
        if (extracted && extracted.length > 0) {
          cars = extracted;
        }
      } catch (e) {
        console.error('Yad2 Tracker: JSON error', e);
      }
    }

    // 2. DOM
    if (cars.length === 0) {
      const cards = Array.from(document.querySelectorAll('[data-testid*="feed-item"], [class*="feedItem"], [class*="FeedItem"], [class*="item_item"], .feed_item'))
        .filter(el => el.offsetHeight > 40);

      cars = cards.map(card => Yad2Parser.parseCarCard(card))
        .filter(car => car.price && car.price !== '0');
    }

    if (cars.length === 0) {
      console.warn('Yad2 Tracker: No cars found');
      return;
    }

    const existingCars = await loadCars();
    const carMap = new Map(existingCars.map(c => [c.id, c]));

    cars.forEach(car => {
      // Ensure we don't save broken entries
      if (!car.title || car.title === 'Unknown Car') return;

      if (carMap.has(car.id)) {
        const existing = carMap.get(car.id);
        carMap.set(car.id, { ...car, notes: existing.notes });
      } else {
        carMap.set(car.id, car);
      }
    });

    await saveCars(Array.from(carMap.values()));
    console.log('Yad2 Tracker: Finished. Found:', cars.length);
  }

  await collectCars();
})();
