async function renderCars() {
  const carsContainer = document.getElementById('cars');
  const carsCountEl = document.getElementById('carsCount');
  const avgPriceEl = document.getElementById('avgPrice');
  
  carsContainer.innerHTML = '';

  const cars = await loadCars();
  carsCountEl.innerText = cars.length;

  if (cars.length > 0) {
    const total = cars.reduce((sum, car) => sum + (parseInt(car.price) || 0), 0);
    avgPriceEl.innerText = Math.round(total / cars.length).toLocaleString() + ' ₪';
  } else {
    avgPriceEl.innerText = '-';
  }

  cars.forEach(car => {
    carsContainer.appendChild(createCarCard(car));
  });
}

function createCarCard(car) {
  const div = document.createElement('div');
  div.className = 'car-card';
  if (car.accident) div.classList.add('accident');

  div.innerHTML = `
    <div class="car-title">${car.title}</div>
    <div class="car-details">
      <div class="detail">
        <div class="detail-label">Price</div>
        <div class="detail-value">${parseInt(car.price).toLocaleString() || 'N/A'} ₪</div>
      </div>
      <div class="detail">
        <div class="detail-label">Year</div>
        <div class="detail-value">${car.year || '-'}</div>
      </div>
      <div class="detail">
        <div class="detail-label">KM</div>
        <div class="detail-value">${car.mileage ? parseInt(car.mileage).toLocaleString() : '-'}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Hand</div>
        <div class="detail-value">${car.hand || '-'}</div>
      </div>
      ${car.engine ? `
      <div class="detail">
        <div class="detail-label">Engine</div>
        <div class="detail-value">${car.engine}</div>
      </div>` : ''}
    </div>
    <div class="badges">
      ${car.accident ? '<span class="badge badge-danger">⚠️ Accident/Damage</span>' : ''}
      ${car.gearbox ? `<span class="badge">${car.gearbox}</span>` : ''}
      <span class="badge">${car.city || 'No city'}</span>
    </div>
    <textarea placeholder="Notes...">${car.notes || ''}</textarea>
    <a href="${car.link}" target="_blank" class="car-link">View on Yad2 →</a>
  `;

  const textarea = div.querySelector('textarea');
  textarea.addEventListener('change', async () => {
    const cars = await loadCars();
    const index = cars.findIndex(c => c.id === car.id);
    if (index !== -1) {
      cars[index].notes = textarea.value;
      await saveCars(cars);
    }
  });

  return div;
}

function exportCSV(cars) {
  const rows = [
    ['Title', 'Price', 'City', 'Mileage', 'Year', 'Hand', 'Engine', 'Accident', 'Notes', 'Link']
  ];

  cars.forEach(car => {
    rows.push([
      `"${car.title}"`,
      car.price,
      `"${car.city}"`,
      car.mileage,
      car.year,
      car.hand,
      car.engine,
      car.accident,
      `"${car.notes || ''}"`,
      car.link
    ]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url,
    filename: 'cars.csv'
  });
}

async function refreshCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['storage.js', 'parser.js', 'content.js']
  });

  setTimeout(renderCars, 3000);
}

document.getElementById('refreshBtn').addEventListener('click', refreshCurrentTab);
document.getElementById('exportBtn').addEventListener('click', async () => {
  const cars = await loadCars();
  exportCSV(cars);
});
document.getElementById('clearBtn').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all tracked cars?')) {
    await saveCars([]);
    renderCars();
  }
});
document.getElementById('syncBtn').addEventListener('click', async () => {
  const cars = await loadCars();
  try {
    const btn = document.getElementById('syncBtn');
    btn.disabled = true;
    btn.innerText = 'Syncing...';
    await syncCarsToSheets(cars);
    alert('Synced successfully!');
  } catch (e) {
    alert('Sync failed: ' + e.message);
  } finally {
    const btn = document.getElementById('syncBtn');
    btn.disabled = false;
    btn.innerText = 'Sheets';
  }
});

renderCars();
