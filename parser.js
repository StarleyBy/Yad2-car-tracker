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

      // Clean Make and Model
      const make = item.title || item.title_1 || 'Unknown';
      // Version/Trim is often in title_2 or version
      const trim = item.title_2 || item.version || item.sub_title || '';

      let hand = '';
      if (item.hand !== undefined && item.hand !== null) {
        hand = item.hand;
      } else if (item.hand_number !== undefined && item.hand_number !== null) {
        hand = item.hand_number;
      }

      return {
        id: item.id.toString(),
        title: make,
        trim: trim,
        price: (item.price || '').toString().replace(/[^0-9]/g, ''),
        city: item.city || item.area || '',
        mileage: (item.kilometers || item.mileage || '').toString().replace(/[^0-9]/g, ''),
        year: (item.year || item.year_id || '').toString(),
        hand: hand.toString(),
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
    const titleEl = card.querySelector('[data-testid="item-title"]') || card.querySelector('span[class*="heading"]');
    const title = titleEl ? titleEl.innerText.trim() : '';
    
    // Trim/Version is usually the next significant text after title
    // or specifically in data-testid="item-subtitle"
    let trim = this.extractText(card, '[data-testid="item-subtitle"]') || 
               this.extractText(card, '.subtitle') || 
               this.extractText(card, '[class*="subtitle"]');

    const priceText = this.extractText(card, '[data-testid="item-price"]') || 
                      this.extractText(card, 'span[class*="price"]');
    
    const spans = Array.from(card.querySelectorAll('span, div'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && t.length < 80);

    // If trim wasn't found by selector, try to find it as the line that often follows title
    if (!trim && title) {
      const titleIndex = spans.indexOf(title);
      if (titleIndex !== -1 && spans[titleIndex + 1]) {
        const candidate = spans[titleIndex + 1];
        // Ensure it's not a year or price or mileage
        if (!/^\d{4}$/.test(candidate) && !candidate.includes('₪') && !candidate.includes('ק"м')) {
          trim = candidate;
        }
      }
    }

    let year = '';
    const yearMatch = spans.find(t => /(?:שנה|year)?\s*(20\d{2}|19\d{2})/i.test(t));
    if (yearMatch) {
      const match = yearMatch.match(/(20\d{2}|19\d{2})/);
      if (match) year = match[1];
    }
    
    let hand = '';
    const handPattern = /יד\s*(\d+)/;
    for (const text of spans) {
      const match = text.match(handPattern);
      if (match) {
        hand = match[1];
        break;
      }
    }

    if (!hand) {
      const smallNum = spans.find(t => /^\d{1,2}$/.test(t) && t !== year && t.length < 3);
      if (smallNum) hand = smallNum;
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
      trim: trim || '',
      price: this.parsePrice(priceText),
      city: '', // Will be filled from badges or JSON
      mileage,
      year,
      hand,
      engine: '', 
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
    const keywords = ['תאונה', 'פгиעה', 'שלדה', 'accident', 'repair', 'damage', 'קצה שלדה', 'ירידת ערך'];
    return keywords.some(word => text.toLowerCase().includes(word.toLowerCase()));
  }
};
