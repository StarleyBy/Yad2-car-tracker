async function loadCars() {

async function renderCars() {

  const carsContainer = document.getElementById('cars');
  carsContainer.innerHTML = '';

  const cars = await loadCars();

  cars.forEach(car => {
    carsContainer.appendChild(createCarCard(car));
  });
}

function exportCSV(cars) {

  const rows = [
    [
      'Title',
      'Price',
      'City',
      'Mileage',
      'Year',
      'Accident',
      'Notes',
      'Link'
    ]
  ];

  cars.forEach(car => {
    rows.push([
      car.title,
      car.price,
      car.city,
      car.mileage,
      car.year,
      car.accident,
      car.notes,
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

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });

  setTimeout(renderCars, 2000);
}

document.getElementById('refreshBtn')
  .addEventListener('click', refreshCurrentTab);


document.getElementById('exportBtn')
  .addEventListener('click', async () => {
    const cars = await loadCars();
    exportCSV(cars);
  });

renderCars();

<button id="syncBtn">Sync Google Sheets</button>

document.getElementById('syncBtn')
  .addEventListener('click', async () => {

    const cars = await loadCars();

    await syncCarsToSheets(cars);

    alert('Synced');
  });
  
