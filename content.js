(async function() {
  console.log('Yad2 Tracker: Scraper active');

  const storage = {
    load: async () => {
      const result = await chrome.storage.local.get('cars');
      return result.cars || [];
    },
    save: async (cars) => {
      return chrome.storage.local.set({ cars });
    }
  };

  async function collectCars() {
    let jsonCars = [];
    let domCars = [];

    // 1. Get from JSON (Hidden/Full details)
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
      try {
        const jsonData = JSON.parse(nextDataScript.textContent);
        jsonCars = Yad2Parser.getNestedData(jsonData);
        console.log(`Yad2 Tracker: Found ${jsonCars.length} cars in JSON`);
      } catch (e) { console.error('JSON parse error', e); }
    }

    // 2. Get from DOM (Everything else)
    console.log('Yad2 Tracker: Scanning DOM...');
    const cards = Array.from(document.querySelectorAll('[data-testid*="feed-item"], [class*="feedItem"], [class*="FeedItem"], [class*="item_item"], .feed_item'))
      .filter(el => el.offsetHeight > 40);

    domCars = cards.map(card => Yad2Parser.parseCarCard(card))
      .filter(car => car.price && car.price !== '0');
    
    console.log(`Yad2 Tracker: Found ${domCars.length} cars in DOM`);

    // 3. COMBINE BOTH SOURCES
    const carMap = new Map();
    
    // Add DOM cars first
    domCars.forEach(c => carMap.set(c.id, c));
    
    // Merge JSON cars (usually have better data)
    jsonCars.forEach(c => {
      if (carMap.has(c.id)) {
        const existing = carMap.get(c.id);
        carMap.set(c.id, {
          ...existing,
          ...c,
          trim: c.trim || existing.trim,
          engine: c.engine || existing.engine,
          city: c.city || existing.city,
          mileage: c.mileage || existing.mileage
        });
      } else {
        carMap.set(c.id, c);
      }
    });

    if (carMap.size === 0) {
      console.warn('Yad2 Tracker: No cars detected');
      return;
    }

    // 4. Merge with GLOBAL STORAGE
    const existingTotal = await storage.load();
    const globalMap = new Map(existingTotal.map(c => [c.id, c]));

    carMap.forEach((car, id) => {
      if (globalMap.has(id)) {
        const globalExisting = globalMap.get(id);
        globalMap.set(id, {
          ...car,
          notes: globalExisting.notes // Keep user notes
        });
      } else {
        globalMap.set(id, car);
      }
    });

    await storage.save(Array.from(globalMap.values()));
    console.log(`Yad2 Tracker: Saved ${globalMap.size} unique cars total`);
  }

  await collectCars();
})();
