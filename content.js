(async function() {
  console.log('Yad2 Tracker: Advanced Scraper started');

  async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function collectCars() {
    console.log('Yad2 Tracker: Collecting cards...');
    
    // Modern Yad2 uses "feed-item-wrapper" or "feed_item"
    let cards = Array.from(document.querySelectorAll('[data-testid*="feed-item"], .feed_item, .feed-item, [class*="FeedItem"]'));
    
    if (cards.length === 0) {
      // Very broad fallback
      cards = Array.from(document.querySelectorAll('div[class*="item"]'))
        .filter(el => el.innerText && el.innerText.includes('₪') && el.offsetHeight > 50);
    }

    console.log(`Yad2 Tracker: Found ${cards.length} potential cards`);

    const existingCars = await loadCars();
    const carMap = new Map(existingCars.map(c => [c.id, c]));

    cards.forEach(card => {
      try {
        const car = Yad2Parser.parseCarCard(card);
        // Requirement: Must have at least a price or a title that isn't 'Unknown'
        if ((car.price && car.price !== '0') || (car.title && car.title !== 'Unknown Car')) {
          if (carMap.has(car.id)) {
            const existing = carMap.get(car.id);
            carMap.set(car.id, { ...car, notes: existing.notes });
          } else {
            carMap.set(car.id, car);
          }
        }
      } catch (e) {
        console.error('Yad2 Tracker: Parse error', e);
      }
    });

    const finalCars = Array.from(carMap.values());
    await saveCars(finalCars);
    console.log(`Yad2 Tracker: Saved ${finalCars.length} cars total`);
  }

  await collectCars();
})();
