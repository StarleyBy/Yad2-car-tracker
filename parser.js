const Yad2Parser = {
  extractText(element, selector) {
    try {
      const el = element.querySelector(selector);
      return el ? el.innerText.trim() : '';
    } catch (e) {
      return '';
    }
  },

  parsePrice(text) {
    if (!text) return '';
    // Handle cases like "50,000 ₪" or "₪ 50,000"
    return text.replace(/[^0-9]/g, '');
  },

  detectAccident(text) {
    if (!text) return false;
    const keywords = ['תאונה', 'פגיעה', 'שלדה', 'accident', 'repair', 'damage', 'קצה שלדה', 'ירידת ערך'];
    const lower = text.toLowerCase();
    return keywords.some(word => lower.includes(word.toLowerCase()));
  },

  parseCarCard(card) {
    // Yad2 search results use specific data-testids or classes
    // Title is usually in [data-testid="item-title"]
    let title = this.extractText(card, '[data-testid="item-title"]') || 
                this.extractText(card, '.title') || 
                this.extractText(card, 'span[class*="heading"]');

    // Price is usually in [data-testid="item-price"]
    let priceText = this.extractText(card, '[data-testid="item-price"]') || 
                    this.extractText(card, '.price') || 
                    this.extractText(card, 'span[class*="price"]');

    // City / Subtitle
    let city = this.extractText(card, '[data-testid="item-subtitle"]') || 
               this.extractText(card, '.subtitle') || 
               '';

    // Year and Mileage are often in "badges" or specific spans
    // They look like: <span>2022</span> or <span>15,000 км</span>
    const details = Array.from(card.querySelectorAll('span, div'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && t.length < 30);

    let year = details.find(t => /^(19|20)\d{2}$/.test(t)) || '';
    
    let mileage = '';
    const mileageMatch = details.find(t => t.includes('ק"м') || t.toLowerCase().includes('km'));
    if (mileageMatch) {
      mileage = mileageMatch.replace(/[^0-9]/g, '');
    }

    // Link extraction
    const linkEl = card.querySelector('a[href*="/item/"]') || card.querySelector('a');
    const link = linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : 'https://www.yad2.co.il' + linkEl.getAttribute('href')) : '';
    
    // If we still don't have a title, let's try to reconstruct it from elements
    if (!title && details.length > 0) {
      title = details[0]; // Often the first element is the model
    }

    const fullText = card.innerText || '';
    const id = link || `${title}_${priceText}_${year}`;

    return {
      id,
      title: title || 'Unknown Car',
      price: this.parsePrice(priceText),
      city,
      mileage,
      year,
      link,
      accident: this.detectAccident(fullText),
      notes: '',
      updatedAt: new Date().toISOString()
    };
  }
};
