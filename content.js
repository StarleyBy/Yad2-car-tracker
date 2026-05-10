(async function() {
  console.log('Yad2 Tracker: Scraper active');

  // Helper to ensure storage functions are available
  const getStorage = () => {
    return {
      load: async () => {
        const result = await chrome.storage.local.get('cars');
        return result.cars || [];
      },
      save: async (cars) => {
        return chrome.storage.local.set({ cars });
      }
    };
  };

  async function collectCars() {
    let cars = [];
    const storage = getStorage();

    // 1. JSON Manifest (Best source)
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
      try {
        const jsonData = JSON.parse(nextDataScript.textContent);
        const extracted = Yad2Parser.getNestedData(jsonData);
        if (extracted && extracted.length > 0) {
          cars = extracted;
          console.log(`Yad2 Tracker: JSON parsed, found ${cars.length} entries`);
        }
      } catch (e) {
        console.error('Yad2 Tracker: JSON error', e);
      }
    }

    // 2. DOM (Fallback or Individual Page)
    if (cars.length === 0) {
      if (window.location.href.includes('/item/')) {
        console.log('Yad2 Tracker: Parsing individual item page...');
        const car = Yad2Parser.parseDetailPage();
        if (car) cars = [car];
      } else {
        console.log('Yad2 Tracker: Parsing list page DOM...');
        const cards = Array.from(document.querySelectorAll('[data-testid*="feed-item"], [class*="feedItem"], [class*="FeedItem"], .feed_item'))
          .filter(el => el.offsetHeight > 40);

        cars = cards.map(card => Yad2Parser.parseCarCard(card))
          .filter(car => car.price && car.price !== '0');
      }
    }

    if (cars.length === 0) {
      console.warn('Yad2 Tracker: No data found');
      return;
    }

    const existingCars = await storage.load();
    const carMap = new Map(existingCars.map(c => [c.id, c]));

    cars.forEach(car => {
      if (!car.title || car.title === 'Unknown Car') return;

      if (carMap.has(car.id)) {
        const existing = carMap.get(car.id);
        // Deep merge: keep old values if new ones are empty (lazy loading protection)
        carMap.set(car.id, {
          ...car,
          trim: car.trim || existing.trim,
          mileage: car.mileage || existing.mileage,
          engine: car.engine || existing.engine,
          city: car.city || existing.city,
          hand: car.hand || existing.hand,
          notes: existing.notes
        });
      } else {
        carMap.set(car.id, car);
      }
    });

    await storage.save(Array.from(carMap.values()));
    console.log('Yad2 Tracker: Storage updated');
  }

  await collectCars();
})();
