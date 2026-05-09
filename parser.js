function extractText(element, selector) {
  try {
    const el = element.querySelector(selector);

    if (!el) return '';

    return el.innerText.trim();
  } catch (e) {
    return '';
  }
}

function parsePrice(text) {
  if (!text) return '';

  return text.replace(/[^0-9]/g, '');
}

function detectAccident(text) {

  if (!text) return false;

  const keywords = [
    'תאונה',
    'פגיעה',
    'שלדה',
    'accident',
    'repair',
    'damage'
  ];

  const lower = text.toLowerCase();

  return keywords.some(word =>
    lower.includes(word.toLowerCase())
  );
}

function parseMileage(text) {

  if (!text) return '';

  const patterns = [
    /([0-9,]+)\s*ק["״]?מ/,
    /([0-9,]+)\s*km/i,
    /([0-9,]+)\s*KM/
  ];

  for (const pattern of patterns) {

    const match = text.match(pattern);

    if (match) {
      return match[1].replace(/,/g, '');
    }
  }

  return '';
}

function parseYear(text) {

  if (!text) return '';

  const match = text.match(/20[0-9]{2}/);

  return match ? match[0] : '';
}

function parseCarCard(card) {

  const fullText = card.innerText || '';

  const titleCandidates = fullText
    .split('\n')
    .map(t => t.trim())
    .filter(Boolean);

  const title =
    titleCandidates.find(t =>
      t.includes('Peugeot') ||
      t.includes('פיג') ||
      t.includes('3008') ||
      t.includes('Toyota') ||
      t.includes('יונדאי')
    ) || titleCandidates[0] || '';

  const priceText =
    extractText(card, '[class*=price]') ||
    titleCandidates.find(t => t.includes('₪')) ||
    '';

  const city =
    extractText(card, '[class*=city]') ||
    titleCandidates.find(t =>
      t.includes('ירושלים') ||
      t.includes('תל אביב') ||
      t.includes('חיפה')
    ) ||
    '';

  const mileage = parseMileage(fullText);

  const year = parseYear(fullText);

  const linkEl = card.querySelector('a[href*="/item/"]');

  const link = linkEl
    ? linkEl.href
    : '';

  const id = link || `${title}_${priceText}`;

  return {
    id,
    title,
    price: parsePrice(priceText),
    city,
    mileage,
    year,
    link,
    accident: detectAccident(fullText),
    notes: '',
    checked: false,
    rating: '',
    raw: fullText,
    updatedAt: new Date().toISOString()
  };
}