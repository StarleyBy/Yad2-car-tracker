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
          console.log(`Yad2 Tracker: Found ${cars.length} cars in JSON`);
        }
      } catch (e) {
        console.error('Yad2 Tracker: JSON parse error', e);
      }
    }

    // 2. DOM Fallback
    if (cars.length === 0) {
      console.log('Yad2 Tracker: Checking DOM...');
      // Very broad selection to ensure we don't miss anything
      const cards = Array.from(document.querySelectorAll('[data-testid*="feed-item"], [class*="feedItem"], [class*="FeedItem"], [class*="item_item"], .feed_item'))
        .filter(el => el.offsetHeight > 40);

      console.log(`Yad2 Tracker: Found ${cards.length} potential DOM cards`);

      cars = cards.map(card => {
        const car = Yad2Parser.parseCarCard(card);
        if (!car.price || car.price === '0') {
           // Maybe price is in a child element we didn't see?
           const innerPrice = card.innerText.match(/[\d,]+\s*₪/);
           if (innerPrice) car.price = innerPrice[0].replace(/[^0-9]/g, '');
        }
        return car;
      }).filter(car => (car.price && car.price !== '0') || car.title !== 'Unknown Car');
      
      console.log(`Yad2 Tracker: Scraped ${cars.length} valid cars from DOM`);
    }

    if (cars.length === 0) {
      console.warn('Yad2 Tracker: Zero cars detected. Check selectors.');
      return;
    }

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
    console.log('Yad2 Tracker: Update finished');
  }

  await collectCars();
})();
