if (!window.Yad2Parser) {
  window.Yad2Parser = {
    getNestedData(obj) {
      try {
        const paths = [
          obj?.props?.pageProps?.initialState?.feed?.feed_items,
          obj?.props?.pageProps?.initialData?.feed?.feed_items,
          obj?.props?.pageProps?.feedData?.items,
          obj?.props?.pageProps?.itemData,
          ...(obj?.props?.pageProps?.dehydratedState?.queries || [])
            .map(q => q?.state?.data?.data?.feed?.feed_items || q?.state?.data?.feed?.feed_items || q?.state?.data)
            .filter(Boolean)
        ];

        let allFound = [];
        for (const items of paths) {
          if (Array.isArray(items)) {
            allFound = allFound.concat(items.map(item => this.parseJsonItem(item)).filter(Boolean));
          } else if (items && items.id) {
            allFound.push(this.parseJsonItem(items));
          }
        }
        return allFound;
      } catch (e) {
        return [];
      }
    },

    parseJsonItem(item) {
      try {
        if (item.type === 'ad' || (!item.id && !item.order_id)) return null;
        const id = (item.id || item.order_id).toString();
        const make = item.title || item.title_1 || 'Unknown';
        const trim = item.title_2 || item.version || item.sub_title || '';
        let hand = item.hand || item.hand_number || '';
        const engine = item.engine_size || item.engine_volume || (item.feed_item_info?.find(i => i.label === 'נפח')?.value) || '';

        return {
          id,
          title: make,
          trim: (trim === make) ? '' : trim,
          price: (item.price || '').toString().replace(/[^0-9]/g, ''),
          city: item.city || item.area || '',
          mileage: (item.kilometers || item.mileage || '').toString().replace(/[^0-9]/g, ''),
          year: (item.year || item.year_id || '').toString(),
          hand: hand.toString(),
          engine: engine.toString(),
          gearbox: item.gearbox || '',
          link: item.link || `https://www.yad2.co.il/item/${id}`,
          updatedAt: new Date().toISOString()
        };
      } catch (e) { return null; }
    },

    parseCarCard(card) {
      const title = this.extractText(card, '[data-testid="item-title"]') || 
                    this.extractText(card, 'span[class*="heading"]') ||
                    this.extractText(card, 'div[class*="title"]') || 'Unknown Car';

      const priceText = this.extractText(card, '[data-testid="item-price"]') || 
                        this.extractText(card, 'span[class*="price"]') ||
                        (card.innerText.match(/[\d,]{2,}\s*₪/) || [''])[0];
      
      const spans = Array.from(card.querySelectorAll('span, div'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 0 && t.length < 100);

      // RELIABLE YEAR SEARCH
      // We look for any 4-digit number that starts with 19 or 20
      let year = '';
      for (const text of spans) {
        const match = text.match(/\b(19\d{2}|20\d{2})\b/);
        if (match) {
          year = match[1];
          break;
        }
      }
      
      let hand = '';
      const handMatch = spans.find(t => /יד\s*(\d+)/.test(t));
      if (handMatch) {
        const m = handMatch.match(/יד\s*(\d+)/);
        if (m) hand = m[1];
      }

      let mileage = '';
      const mileageMatch = spans.find(t => t.includes('ק"מ') || /[\d,]+\s*km/i.test(t));
      if (mileageMatch) mileage = mileageMatch.replace(/[^0-9]/g, '');

      let trim = '';
      const subtitle = this.extractText(card, '[data-testid="item-subtitle"]');
      if (subtitle && subtitle !== title && !subtitle.includes('שמורה')) trim = subtitle;

      let link = '';
      const linkEl = card.querySelector('a[href*="/item/"]') || card.querySelector('a');
      if (linkEl) {
        const href = linkEl.getAttribute('href') || '';
        link = href.startsWith('http') ? href : 'https://www.yad2.co.il' + (href.startsWith('/') ? '' : '/') + href;
      }
      
      return {
        id: link || `${title}_${priceText}_${year}`,
        title, trim, price: this.parsePrice(priceText),
        year, hand, mileage,
        city: '', engine: '', gearbox: '', link,
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
