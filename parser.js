const Yad2Parser = {
  // Attempt to extract structured data from Next.js data blob
  getNestedData(obj) {
    try {
      // Common paths in Next.js/Yad2 data structures
      // This is a heuristic and might need adjustment
      const searchResult = obj?.props?.pageProps?.initialState?.feed?.feed_items || 
                           obj?.props?.pageProps?.initialData?.feed?.feed_items ||
                           obj?.props?.pageProps?.feedData?.items;
      
      if (searchResult && Array.isArray(searchResult)) {
        return searchResult.map(item => this.parseJsonItem(item)).filter(Boolean);
      }
    } catch (e) {
      console.error('Yad2 Tracker: Error extracting from JSON', e);
    }
    return null;
  },

  parseJsonItem(item) {
    try {
      // Yad2 JSON items often have fields like: 
      // title, price, year, mileage, city, link_url, etc.
      // We map them to our standard car object
      
      // Filter out ads
      if (item.type === 'ad' || !item.id) return null;

      return {
        id: item.id.toString(),
        title: item.title || item.title_1 || 'Unknown',
        price: (item.price || '').toString().replace(/[^0-9]/g, ''),
        city: item.city || item.area || '',
        mileage: (item.kilometers || item.mileage || '').toString().replace(/[^0-9]/g, ''),
        year: (item.year || '').toString(),
        link: item.link || `https://www.yad2.co.il/item/${item.id}`,
        accident: false, // Usually not in the feed JSON, would need detail page
        notes: '',
        updatedAt: new Date().toISOString()
      };
    } catch (e) {
      return null;
    }
  },

  // Fallback DOM parser (the improved one from previous step)
  parseCarCard(card) {
    let title = this.extractText(card, '[data-testid="item-title"]') || 
                this.extractText(card, 'span[class*="heading"]');
    let priceText = this.extractText(card, '[data-testid="item-price"]') || 
                    this.extractText(card, 'span[class*="price"]');
    let city = this.extractText(card, '[data-testid="item-subtitle"]') || '';

    const details = Array.from(card.querySelectorAll('span, div'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && t.length < 30);

    let year = details.find(t => /^(19|20)\d{2}$/.test(t)) || '';
    let mileage = '';
    const mileageMatch = details.find(t => t.includes('ק"м') || t.toLowerCase().includes('km'));
    if (mileageMatch) mileage = mileageMatch.replace(/[^0-9]/g, '');

    const linkEl = card.querySelector('a[href*="/item/"]') || card.querySelector('a');
    const link = linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : 'https://www.yad2.co.il' + linkEl.getAttribute('href')) : '';
    
    const fullText = card.innerText || '';
    return {
      id: link || `${title}_${priceText}_${year}`,
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
  },

  extractText(element, selector) {
    try {
      const el = element.querySelector(selector);
      return el ? el.innerText.trim() : '';
    } catch (e) { return ''; }
  },

  parsePrice(text) {
    return text ? text.replace(/[^0-9]/g, '') : '';
  },

  detectAccident(text) {
    if (!text) return false;
    const keywords = ['תאונה', 'פגיעה', 'שלדה', 'accident', 'repair', 'damage', 'קצה שלדה'];
    return keywords.some(word => text.toLowerCase().includes(word.toLowerCase()));
  }
};
