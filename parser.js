const Yad2Parser = {
  getNestedData(obj) {
    try {
      const paths = [
        obj?.props?.pageProps?.initialState?.feed?.feed_items,
        obj?.props?.pageProps?.initialData?.feed?.feed_items,
        obj?.props?.pageProps?.feedData?.items,
        ...(obj?.props?.pageProps?.dehydratedState?.queries || [])
          .map(q => q?.state?.data?.data?.feed?.feed_items || q?.state?.data?.feed?.feed_items)
          .filter(Boolean)
      ];

      for (const items of paths) {
        if (items && Array.isArray(items) && items.length > 0) {
          return items.map(item => this.parseJsonItem(item)).filter(Boolean);
        }
      }
    } catch (e) {
      console.error('Yad2 Tracker: JSON Extraction Error', e);
    }
    return null;
  },

  parseJsonItem(item) {
    try {
      if (item.type === 'ad' || !item.id) return null;

      const title = item.title || 
                    (item.title_1 && item.title_2 ? `${item.title_1} ${item.title_2}` : item.title_1) || 
                    'Unknown';

      return {
        id: item.id.toString(),
        title: title,
        price: (item.price || '').toString().replace(/[^0-9]/g, ''),
        city: item.city || item.area || '',
        mileage: (item.kilometers || item.mileage || '').toString().replace(/[^0-9]/g, ''),
        year: (item.year || item.year_id || '').toString(),
        hand: (item.hand || item.hand_id || '').toString(),
        engine: item.engine_size || item.engine_volume || '',
        gearbox: item.gearbox || '',
        link: item.link || `https://www.yad2.co.il/item/${item.id}`,
        accident: false,
        notes: '',
        updatedAt: new Date().toISOString()
      };
    } catch (e) {
      return null;
    }
  },

  parseCarCard(card) {
    const title = this.extractText(card, '[data-testid="item-title"]') || 
                  this.extractText(card, 'span[class*="heading"]');
    const priceText = this.extractText(card, '[data-testid="item-price"]') || 
                      this.extractText(card, 'span[class*="price"]');
    
    const spans = Array.from(card.querySelectorAll('span, div'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && t.length < 60);

    // More flexible year search (handles "Year 2021" or just "2021")
    let year = '';
    const yearMatch = spans.find(t => /(?:שנה|year)?\s*(20\d{2}|19\d{2})/i.test(t));
    if (yearMatch) {
      const match = yearMatch.match(/(20\d{2}|19\d{2})/);
      if (match) year = match[1];
    }
    
    // Hand search (יד)
    let hand = '';
    const handMatch = spans.find(t => /(?:יד|hand)\s*(\d+)/i.test(t));
    if (handMatch) {
      const match = handMatch.match(/(\d+)/);
      if (match) hand = match[1];
    }

    let mileage = '';
    const mileageMatch = spans.find(t => t.includes('ק"מ') || /[\d,]+\s*km/i.test(t));
    if (mileageMatch) mileage = mileageMatch.replace(/[^0-9]/g, '');

    const linkEl = card.querySelector('a[href*="/item/"]') || card.querySelector('a');
    let link = '';
    if (linkEl) {
      const href = linkEl.getAttribute('href') || '';
      link = href.startsWith('http') ? href : 'https://www.yad2.co.il' + (href.startsWith('/') ? '' : '/') + href;
    }
    
    return {
      id: link || `${title}_${priceText}_${year}`,
      title: title || (spans.length > 0 ? spans[0] : 'Unknown Car'),
      price: this.parsePrice(priceText),
      city: this.extractText(card, '[data-testid="item-subtitle"]') || '',
      mileage,
      year,
      hand,
      engine: '', // Hard to get from feed DOM accurately
      gearbox: '',
      link,
      accident: this.detectAccident(card.innerText || ''),
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
    const keywords = ['תאונה', 'פגיעה', 'שלדה', 'accident', 'repair', 'damage', 'קצה שלדה', 'יриדת ערך'];
    return keywords.some(word => text.toLowerCase().includes(word.toLowerCase()));
  }
};
