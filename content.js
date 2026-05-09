(async function() {
  console.log('Yad2 Tracker: Advanced Scraper started');

  async function collectCars() {
    let cars = [];

    // 1. Try JSON Manifest
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
      try {
        const jsonData = JSON.parse(nextDataScript.textContent);
        
        // DEBUG: Help find the right path if it fails
        console.log('Yad2 Tracker: Found __NEXT_DATA__. PageProps keys:', Object.keys(jsonData?.props?.pageProps || {}));
        
        const extracted = Yad2Parser.getNestedData(jsonData);
        if (extracted && extracted.length > 0) {
          cars = extracted;
          console.log(`Yad2 Tracker: Extracted ${cars.length} cars from JSON`);
        }
      } catch (e) {
        console.error('Yad2 Tracker: Failed to parse JSON manifest', e);
      }
    }

    // 2. DOM Fallback
    if (cars.length === 0) {
      console.log('Yad2 Tracker: Falling back to DOM scraping...');
      
      // Use more robust selector for CSS modules and data-testids
      const cards = Array.from(document.querySelectorAll('[data-testid*="feed-item"], [class*="feedItem"], [class*="FeedItem"], [class*="item_item"]'))
        .filter(el => el.offsetHeight > 50);

      cars = cards.map(card => Yad2Parser.parseCarCard(card))
        .filter(car => car.price && car.price !== '0');
        
      console.log(`Yad2 Tracker: Scraped ${cars.length} cars from DOM`);
    }

    if (cars.length === 0) {
      console.warn('Yad2 Tracker: No cars found on this page');
      return;
    }

    // 3. Save unique
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

    await saveCars(Array.from(carMap.values()));
    console.log('Yad2 Tracker: Sync complete');
  }

  await collectCars();
})();
