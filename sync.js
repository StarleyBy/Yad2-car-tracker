const API_URL = 'https://script.google.com/macros/s/AKfycbyLkbqre8lA9vrdBTeXuyiulwvPKwoO9GmldTE2NU5Yic-xoHyW1KTIN5Rvx1mfWmyr/exec';

async function syncCarsToSheets(cars) {

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cars })
  });

  return response.json();
}