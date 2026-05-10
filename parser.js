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
        
        // Anti-dupe for JSON
        if (trim === make || trim === item.title) trim = '';

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

      // BROAD PRICE SEARCH - Fix for disappearing prices
      const priceText = this.extractText(card, '[data-testid="item-price"]') || 
                        this.extractText(card, 'span[class*="price"]') ||
                        this.extractText(card, 'div[class*="price"]') ||
                        (card.innerText.match(/[\d,]{2,}\s*₪/) || [''])[0];
      
      const spans = Array.from(card.querySelectorAll('span, div'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 0 && t.length < 100);

      // EXTRACT YEAR AND HAND FIRST
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

      // EXTRACT TRIM (CLEANLY)
      let trim = this.extractText(card, '[data-testid="item-subtitle"]') || 
                 this.extractText(card, '.subtitle') || 
                 this.extractText(card, '[class*="subtitle"]');

      // Blacklist for UI status messages that are not actual trim levels
      const blacklist = ['המודעה נשמרה', 'נשמר', 'saved', 'ad saved', 'השוואה', 'compare'];

      // If trim is just a duplicate or looks like year/hand/price/status, clear it
      const isBadTrim = (t) => {
        if (!t) return true;
        const low = t.toLowerCase();
        return low === title.toLowerCase() || 
               low === year || 
               low.includes('יד') || 
               low.includes('₪') || 
               low.includes('км') ||
               low.includes('ק"מ') ||
               blacklist.some(b => low.includes(blacklist.indexOf(b) !== -1 ? b : b.toLowerCase()));
      };
      
      if (isBadTrim(trim)) {
        trim = '';
        const titleIndex = spans.indexOf(title);
        if (titleIndex !== -1) {
          // Check following spans but strictly avoid the blacklist
          for (let i = titleIndex + 1; i < titleIndex + 8 && i < spans.length; i++) {
            const c = spans[i];
            if (c && c.length > 3 && !isBadTrim(c)) {
              trim = c;
              break;
            }
          }
        }
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
      if (!text) return '';
      const clean = text.replace(/[^0-9]/g, '');
      return clean.length > 1 ? clean : '';
    },

    detectAccident(text) {
      if (!text) return false;
      const keywords = ['תאונה', 'פגיעה', 'שלדה', 'accident', 'repair', 'damage', 'קצה שלדה', 'ירידת ערך'];
      return keywords.some(word => text.toLowerCase().includes(word.toLowerCase()));
    }
  };
}
