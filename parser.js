const Yad2Parser = {
  // Deep search for feed items in the Next.js data object
  getNestedData(obj) {
    try {
      // 1. Try common paths
      const paths = [
        obj?.props?.pageProps?.initialState?.feed?.feed_items,
        obj?.props?.pageProps?.initialData?.feed?.feed_items,
        obj?.props?.pageProps?.feedData?.items,
        // React Query / Dehydrated State (Common in modern Next.js)
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
      console.error('Yad2 Tracker: Error extracting from JSON', e);
    }
    return null;
  },

  parseJsonItem(item) {
    try {
      // Yad2 JSON items mapping
      if (item.type === 'ad' || !item.id) return null;

      // Title often comes as title_1 (Make) and title_2 (Model)
      const title = item.title || 
                    (item.title_1 && item.title_2 ? `${item.title_1} ${item.title_2}` : item.title_1) || 
                    'Unknown';

      return {
        id: item.id.toString(),
        title: title,
        price: (item.price || '').toString().replace(/[^0-9]/g, ''),
        city: item.city || item.area || '',
        mileage: (item.kilometers || item.mileage || '').toString().replace(/[^0-9]/g, ''),
        year: (item.year || '').toString(),
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
    let title = this.extractText(card, '[data-testid="item-title"]') || 
                this.extractText(card, 'span[class*="heading"]');
    let priceText = this.extractText(card, '[data-testid="item-price"]') || 
                    this.extractText(card, 'span[class*="price"]');
    
    // Improved details extraction
    const spans = Array.from(card.querySelectorAll('span, div'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && t.length < 50);

    let year = spans.find(t => /^(19|20)\d{2}$/.test(t)) || '';
    
    let mileage = '';
    // FIX: Using correct Hebrew characters for ק"מ (Mem instead of Cyrillic M)
    const mileageMatch = spans.find(t => t.includes('ק"מ') || /[\d,]+\s*km/i.test(t));
    if (mileageMatch) mileage = mileageMatch.replace(/[^0-9]/g, '');

    const linkEl = card.querySelector('a[href*="/item/"]') || card.querySelector('a');
    let link = '';
    if (linkEl) {
      const href = linkEl.getAttribute('href') || '';
      link = href.startsWith('http') ? href : 'https://www.yad2.co.il' + (href.startsWith('/') ? '' : '/') + href;
    }
    
    const fullText = card.innerText || '';
    return {
      id: link || `${title}_${priceText}_${year}`,
      title: title || (spans.length > 0 ? spans[0] : 'Unknown Car'),
      price: this.parsePrice(priceText),
      city: this.extractText(card, '[data-testid="item-subtitle"]') || '',
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
    const keywords = ['תаונה', 'פגיעה', 'שלדה', 'accident', 'repair', 'damage', 'קצה שלדה', 'ירידת ערך'];
    // Note: ensure keywords are also using correct Hebrew characters
    const fixedKeywords = keywords.map(k => k.replace('а', 'א')); // sanitize any potential copy-paste traps
    return fixedKeywords.some(word => text.toLowerCase().includes(word.toLowerCase()));
  }
};
