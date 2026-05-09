(function() {

  function extractText(element, selector) {
    try {
      const el = element.querySelector(selector);

      if (!el) return '';

      return el.innerText.trim();
    } catch (e) {
      return '';
    }
  }

  function parsePrice(text) {

    if (!text) return '';

    return text.replace(/[^0-9]/g, '');
  }

  function detectAccident(text) {

    if (!text) return false;

    const keywords = [
      'תאונה',
      'פגיעה',
      'שלדה',
      'accident',
      'repair',
      'damage'
    ];

    const lower = text.toLowerCase();

    return keywords.some(word =>
      lower.includes(word.toLowerCase())
    );
  }

  function parseMileage(text) {

    if (!text) return '';

    const patterns = [
      /([0-9,]+)\s*ק["״]?מ/,
      /([0-9,]+)\s*km/i
    ];

    for (const pattern of patterns) {

      const match = text.match(pattern);

      if (match) {
        return match[1].replace(/,/g, '');
      }
    }

    return '';
  }

  function parseYear(text) {

    if (!text) return '';

    const match = text.match(/20[0-9]{2}/);

    return match ? match[0] : '';
  }

  function parseCarCard(card) {

    const fullText = card.innerText || '';

    const titleCandidates = fullText
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    const title =
      titleCandidates.find(t =>
        t.includes('Peugeot') ||
        t.includes('פיג') ||
        t.includes('3008')
      ) || titleCandidates[0] || '';

    const priceText =
      extractText(card, '[class*=price]') ||
      titleCandidates.find(t => t.includes('₪')) ||
      '';

    const city =
      extractText(card, '[class*=city]') ||
      '';

    const mileage = parseMileage(fullText);

    const year = parseYear(fullText);

    const linkEl = card.querySelector('a[href*="/item/"]');

    const link = linkEl
      ? linkEl.href
      : '';

    return {
      id: link || title,
      title,
      price: parsePrice(priceText),
      city,
      mileage,
      year,
      link,
      accident: detectAccident(fullText),
      notes: '',
      updatedAt: new Date().toISOString()
    };
  }

  async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function autoScroll() {

    for (let i = 0; i < 10; i++) {

      window.scrollTo(
        0,
        document.body.scrollHeight
      );

      await wait(1200);
    }
  }

  async function collectCars() {

    await autoScroll();

    const cards = Array
      .from(document.querySelectorAll('div'))
      .filter(el =>
        el.innerText &&
        (
          el.innerText.includes('₪') ||
          el.innerText.includes('ק"מ')
        )
      );

    console.log('Found cards:', cards.length);

    const cars = [];

    cards.forEach(card => {

      try {

        const car = parseCarCard(card);

        if (
          car.title &&
          car.price
        ) {
          cars.push(car);
        }

      } catch (e) {

        console.log(
          'Parse error',
          e
        );
      }
    });

    console.log('Cars saved:', cars.length);

    chrome.storage.local.set({ cars });
  }

  if (
    window.location.href.includes(
      'my-favorites'
    )
  ) {
    collectCars();
  }

})();