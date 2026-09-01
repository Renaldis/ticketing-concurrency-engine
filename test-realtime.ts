import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function testRealtimeSSE() {
  console.log('--- MEMULAI PENGUJIAN REALTIME SSE STREAM ---\n');

  // Ambil list event
  const eventsRes = await fetch(`${BASE_URL}/events`);
  const eventsData = await eventsRes.json();
  const activeEvent = eventsData.data?.events[0];

  console.log(`[1/2] Menghubungkan ke stream realtime kuota event: ${activeEvent?.id}...`);
  const controller = new AbortController();

  const ssePromise = new Promise((resolve) => {
    fetch(`${BASE_URL}/realtime/events/${activeEvent.id}/quota`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        while (reader) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          if (text.includes('INITIAL_QUOTA') || text.includes('QUOTA_UPDATE')) {
            console.log('-> Diterima dari SSE Stream:', text.trim());
            controller.abort();
            resolve(true);
            break;
          }
        }
      })
      .catch(() => {});
  });

  await Promise.race([
    ssePromise,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);

  console.log('\n--- PENGUJIAN SSE SELESAI ---');
}

testRealtimeSSE().catch(console.error);
