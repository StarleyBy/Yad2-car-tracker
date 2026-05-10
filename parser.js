if (!window.Yad2Parser) {
  window.Yad2Parser = {
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

        const make = item.title_1 || item.title || 'Unknown';
        let trim = item.title_2 || item.version || item.sub_title || '';
        
        if (trim === make || trim === item.title) {
          trim = item.version || item.sub_title || '';
          if (trim === make) trim = '';
        }

        let hand = '';
        if (item.hand !== undefined && item.hand !== null) hand = item.hand;
        else if (item.hand_number !== undefined && item.hand_number !== null) hand = item.hand_number;

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
      const title = this.extractText(card, '[data-testid="item-title"]') || 
                    this.extractText(card, 'span[class*="heading"]') ||
                    this.extractText(card, 'div[class*="title"]') ||
                    'Unknown Car';

      const priceText = this.extractText(card, '[data-testid="item-price"]') || 
                        this.extractText(card, 'span[class*="price"]') ||
                        this.extractText(card, 'div[class*="price"]');
      
      let trim = this.extractText(card, '[data-testid="item-subtitle"]') || 
                 this.extractText(card, '.subtitle') || 
                 this.extractText(card, '[class*="subtitle"]');

      const spans = Array.from(card.querySelectorAll('span, div'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 0 && t.length < 100);

      if (trim === title) trim = '';
      
      if (!trim && title !== 'Unknown Car') {
        const titleIndex = spans.indexOf(title);
        if (titleIndex !== -1) {
          for (let i = titleIndex + 1; i < titleIndex + 5 && i < spans.length; i++) {
            const c = spans[i];
            if (c && c !== title && c.length > 5 && !c.includes('₪') && !/^\d{4}$/.test(c)) {
              trim = c;
              break;
            }
          }
        }
      }

      let year = '';
      const yearMatch = spans.find(t => /(?:שנה|year)?\s*(20\d{2}|19\d{2})/i.test(t));
      if (yearMatch) {
        const m = yearMatch.match(/(20\d{2}|19\d{2})/);
        if (m) year = m[1];
      }
      
      let hand = '';
      const handPattern = /יד\s*(\d+)/;
      const handStr = spans.find(t => handPattern.test(t));
      if (handStr) {
        const m = handStr.match(handPattern);
        if (m) hand = m[1];
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
        title,
        trim,
        price: this.parsePrice(priceText),
        city: '', 
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
      const keywords = ['תאונה', 'פגיעה', 'שלדה', 'accident', 'repair', 'damage', 'קצה שלדה', 'יриדת ערך'];
      return keywords.some(word => text.toLowerCase().includes(word.toLowerCase()));
    }
  };
}
