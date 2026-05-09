async function saveCars(cars) {
  return chrome.storage.local.set({ cars });
}

async function loadCars() {
  const result = await chrome.storage.local.get('cars');
  return result.cars || [];
}