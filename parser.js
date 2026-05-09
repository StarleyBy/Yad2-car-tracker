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
    return text.replace(/[^0-9]/g, '');
  },

  detectAccident(text) {
    if (!text) return false;
    const keywords = ['תאונה', 'פגיעה', 'שלדה', 'accident', 'repair', 'damage', 'קצה שלדה'];
    const lower = text.toLowerCase();
    return keywords.some(word => lower.includes(word.toLowerCase()));
  },

  parseMileage(text) {
    if (!text) return '';
    const patterns = [/([0-9,]+)\s*ק["״]?מ/, /([0-9,]+)\s*km/i];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].replace(/,/g, '');
    }
    return '';
  },

  parseYear(text) {
    if (!text) return '';
    const match = text.match(/20[0-9]{2}/);
    return match ? match[0] : '';
  },

  parseCarCard(card) {
    const fullText = card.innerText || '';
    
    // Modern Yad2 selectors (might need adjustment as they change)
    const title = this.extractText(card, '[data-testid="item-title"]') || 
                  this.extractText(card, '.title') || 
                  fullText.split('\n')[0];

    const priceText = this.extractText(card, '[data-testid="item-price"]') || 
                      this.extractText(card, '.price') || 
                      (fullText.match(/[0-9,]+\s*₪/) || [''])[0];

    const city = this.extractText(card, '[data-testid="item-subtitle"]') || 
                 this.extractText(card, '.subtitle') || '';

    const linkEl = card.querySelector('a[href*="/item/"]') || card.querySelector('a');
    const link = linkEl ? linkEl.href : '';
    const id = link || `${title}_${priceText}`;

    return {
      id,
      title,
      price: this.parsePrice(priceText),
      city,
      mileage: this.parseMileage(fullText),
      year: this.parseYear(fullText),
      link,
      accident: this.detectAccident(fullText),
      notes: '',
      updatedAt: new Date().toISOString()
    };
  }
};
