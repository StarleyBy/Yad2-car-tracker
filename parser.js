if (!window.Yad2Parser) {
  window.Yad2Parser = {
    getNestedData(obj) {
      try {
        const paths = [
          obj?.props?.pageProps?.initialState?.feed?.feed_items,
          obj?.props?.pageProps?.initialData?.feed?.feed_items,
          obj?.props?.pageProps?.feedData?.items,
          // Support for individual item page data structure
          obj?.props?.pageProps?.itemData,
          ...(obj?.props?.pageProps?.dehydratedState?.queries || [])
            .map(q => q?.state?.data?.data?.feed?.feed_items || q?.state?.data?.feed?.feed_items || q?.state?.data)
            .filter(Boolean)
        ];

        for (const items of paths) {
          if (Array.isArray(items)) {
            return items.map(item => this.parseJsonItem(item)).filter(Boolean);
          } else if (items && items.id) {
            // Single item page
            return [this.parseJsonItem(items)].filter(Boolean);
          }
        }
      } catch (e) {
        console.error('Yad2 Tracker: JSON Extraction Error', e);
      }
      return null;
    },

    parseJsonItem(item) {
      try {
        if (item.type === 'ad' || (!item.id && !item.order_id)) return null;

        const id = (item.id || item.order_id).toString();
        const make = item.title || item.title_1 || 'Unknown';
        const trim = item.title_2 || item.version || item.sub_title || '';

        let hand = '';
        if (item.hand !== undefined && item.hand !== null) hand = item.hand;
        else if (item.hand_number !== undefined && item.hand_number !== null) hand = item.hand_number;

        const engine = item.engine_size || item.engine_volume || (item.feed_item_info?.find(i => i.label === 'נפח')?.value) || '';

        return {
          id: id,
          title: make,
          trim: (trim === make) ? '' : trim,
          price: (item.price || '').toString().replace(/[^0-9]/g, ''),
          city: item.city || item.area || '',
          mileage: (item.kilometers || item.mileage || '').toString().replace(/[^0-9]/g, ''),
          year: (item.year || item.year_id || '').toString(),
          hand: hand.toString(),
          engine: engine,
          gearbox: item.gearbox || '',
          link: item.link || `https://www.yad2.co.il/item/${id}`,
          accident: false,
          notes: '',
          updatedAt: new Date().toISOString()
        };
      } catch (e) {
        return null;
      }
    },

    // Parser for the individual car page (when you click on a car)
    parseDetailPage() {
      try {
        const title = this.extractText(document, 'h1') || document.title.split('-')[0].trim();
        const price = this.parsePrice(this.extractText(document, '[class*="price"]') || this.extractText(document, '[class*="Price"]'));
        
        // Find specific badges on detail page
        const badges = Array.from(document.querySelectorAll('[class*="Badge"], [class*="item_data"]'))
          .map(el => el.innerText.trim());

        const year = badges.find(b => /^(19|20)\d{2}$/.test(b)) || '';
        
        return {
          id: window.location.href.match(/item\/([a-z0-9]+)/)?.[1] || window.location.href,
          title: title,
          trim: '', // Hard to get from DOM without noise
          price: price,
          city: '',
          mileage: '', // Usually hidden in specific info rows
          year: year,
          hand: '',
          engine: '',
          gearbox: '',
          link: window.location.href,
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
                    'Unknown Car';

      const priceText = this.extractText(card, '[data-testid="item-price"]') || 
                        this.extractText(card, 'span[class*="price"]') ||
                        (card.innerText.match(/[\d,]{2,}\s*₪/) || [''])[0];
      
      const spans = Array.from(card.querySelectorAll('span, div'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 0 && t.length < 100);

      let year = '';
      const yearMatch = spans.find(t => /(?:שנה|year)?\s*(20\d{2}|19\d{2})/i.test(t));
      if (yearMatch) {
        const m = yearMatch.match(/(20\d{2}|19\d{2})/);
        if (m) year = m[1];
      }
      
      let hand = '';
      const handPattern = /יд?\s*(\d+)/i;
      const handStr = spans.find(t => handPattern.test(t));
      if (handStr) {
        const m = handStr.match(handPattern);
        if (m) hand = m[1];
      }

      let link = '';
      const linkEl = card.querySelector('a[href*="/item/"]') || card.querySelector('a');
      if (linkEl) {
        const href = linkEl.getAttribute('href') || '';
        link = href.startsWith('http') ? href : 'https://www.yad2.co.il' + (href.startsWith('/') ? '' : '/') + href;
      }
      
      return {
        id: link || `${title}_${priceText}_${year}`,
        title,
        trim: '', 
        price: this.parsePrice(priceText),
        city: '', 
        mileage: '', 
        year,
        hand,
        engine: '', 
        gearbox: '',
        link,
        accident: false,
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
    }
  };
}
