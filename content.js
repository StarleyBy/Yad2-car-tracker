(async function() {
  console.log('Yad2 Tracker: Scraper started');

  async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function autoScroll(steps = 5) {
    for (let i = 0; i < steps; i++) {
      window.scrollBy(0, window.innerHeight);
      await wait(800);
    }
  }

  async function collectCars() {
    console.log('Yad2 Tracker: Collecting cards...');
    
    // Try to find car containers. Yad2 uses different classes, 
    // but often they are within a feed or have specific data-testids
    let cards = Array.from(document.querySelectorAll('[data-testid="feed_item"], .feed_item, .feed-item'));
    
    if (cards.length === 0) {
      // Fallback: search for elements that look like price tags and go up
      cards = Array.from(document.querySelectorAll('div'))
        .filter(el => el.innerText && el.innerText.includes('₪') && el.innerText.length < 500)
        .map(el => el.closest('.feed_item') || el.closest('div[class*="item"]'))
        .filter((el, index, self) => el && self.indexOf(el) === index);
    }

    console.log(`Yad2 Tracker: Found ${cards.length} potential cards`);

    const existingCars = await loadCars();
    const newCars = [...existingCars];

    cards.forEach(card => {
      try {
        const car = Yad2Parser.parseCarCard(card);
        if (car.title && car.price) {
          const index = newCars.findIndex(c => c.id === car.id);
          if (index === -1) {
            newCars.push(car);
          } else {
            // Update existing entry but keep notes
            const notes = newCars[index].notes;
            newCars[index] = { ...car, notes };
          }
        }
      } catch (e) {
        console.error('Yad2 Tracker: Parse error', e);
      }
    });

    await saveCars(newCars);
    console.log(`Yad2 Tracker: Total cars in storage: ${newCars.length}`);
  }

  // Run initial collection
  await collectCars();
  
  // Optional: auto-scroll once to trigger lazy loading and collect more
  // await autoScroll(3);
  // await collectCars();

})();
