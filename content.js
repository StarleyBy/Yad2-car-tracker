(async function() {
  console.log('Yad2 Tracker: Data-First Scraper started');

  async function collectCars() {
    let cars = [];

    // 1. Try to find the JSON data manifest (__NEXT_DATA__)
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
      try {
        const jsonData = JSON.parse(nextDataScript.textContent);
        console.log('Yad2 Tracker: Found __NEXT_DATA__');
        const extracted = Yad2Parser.getNestedData(jsonData);
        if (extracted && extracted.length > 0) {
          cars = extracted;
          console.log(`Yad2 Tracker: Extracted ${cars.length} cars from JSON`);
        }
      } catch (e) {
        console.error('Yad2 Tracker: Failed to parse __NEXT_DATA__', e);
      }
    }

    // 2. Fallback to DOM if JSON fails or returns nothing
    if (cars.length === 0) {
      console.log('Yad2 Tracker: Falling back to DOM scraping...');
      const cards = Array.from(document.querySelectorAll('[data-testid*="feed-item"], .feed_item, .feed-item, [class*="FeedItem"]'))
        .filter(el => el.offsetHeight > 50);

      cars = cards.map(card => Yad2Parser.parseCarCard(card))
        .filter(car => car.price && car.price !== '0');
    }

    if (cars.length === 0) {
      console.warn('Yad2 Tracker: No cars found');
      return;
    }

    // 3. Merge with existing data
    const existingCars = await loadCars();
    const carMap = new Map(existingCars.map(c => [c.id, c]));

    cars.forEach(car => {
      if (carMap.has(car.id)) {
        const existing = carMap.get(car.id);
        carMap.set(car.id, { ...car, notes: existing.notes });
      } else {
        carMap.set(car.id, car);
      }
    });

    const finalCars = Array.from(carMap.values());
    await saveCars(finalCars);
    console.log(`Yad2 Tracker: Successfully saved ${finalCars.length} cars total`);
  }

  await collectCars();
})();
