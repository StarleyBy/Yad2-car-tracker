const API_URL = 'https://script.google.com/macros/s/AKfycbyLkbqre8lA9vrdBTeXuyiulwvPKwoO9GmldTE2NU5Yic-xoHyW1KTIN5Rvx1mfWmyr/exec';

async function syncCarsToSheets(cars) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors', // Use no-cors if you don't need to read the response body, or keep it standard if permissions are set
      headers: {
        'Content-Type': 'text/plain' // Using text/plain avoids preflight (OPTIONS) request
      },
      body: JSON.stringify({ cars })
    });
    
    // Note: with 'no-cors', you can't read the response. 
    // If you need the response, 'cors' mode is required and the manifest permission should handle it.
    return { success: true }; 
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}