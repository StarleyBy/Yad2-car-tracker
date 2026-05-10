(async function() {
  console.log('Yad2 Tracker: Scraper active');

  async function collectCars() {
    let cars = [];

    // 1. Try to get everything from JSON first (it has hidden details)
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
      try {
        const jsonData = JSON.parse(nextDataScript.textContent);
        const extracted = Yad2Parser.getNestedData(jsonData);
        if (extracted && extracted.length > 0) {
          cars = extracted;
          console.log(`Yad2 Tracker: Successfully found ${cars.length} cars with full details in JSON`);
        }
      } catch (e) {
        console.error('Yad2 Tracker: JSON parse error', e);
      }
    }

    // 2. If JSON failed, use DOM for what is visible
    if (cars.length === 0) {
      console.log('Yad2 Tracker: JSON empty, using visible DOM info...');
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
      if (!car.title || car.title === 'Unknown Car') return;

      if (carMap.has(car.id)) {
        const existing = carMap.get(car.id);
        // MERGE: Keep old info if new is missing (important for lazy loading)
        carMap.set(car.id, {
          ...car,
          trim: car.trim || existing.trim,
          mileage: car.mileage || existing.mileage,
          engine: car.engine || existing.engine,
          notes: existing.notes
        });
      } else {
        carMap.set(car.id, car);
      }
    });

    await saveCars(Array.from(carMap.values()));
    console.log('Yad2 Tracker: Updated. Total cars:', carMap.size);
  }

  await collectCars();
})();
