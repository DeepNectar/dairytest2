// Seed a test account with realistic entries (same SHA-256 hashing as the app)
const crypto = require('crypto');
const BASE = "https://unvomzolyjwcdavitdmr.supabase.co/rest/v1/";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudm9tem9seWp3Y2Rhdml0ZG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzQ3NjEsImV4cCI6MjEwNzQ1MDc2MX0.SaukqHzJlXRXfx2R4yvbIEeWFEj7hm9xnkj6Oqw_4wY";
const EMAIL = "qa.tester@dairy.app";
async function post(table, rows) {
  const res = await fetch(BASE + table, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: JSON.stringify(rows) });
  console.log(table, res.status, (await res.text()).slice(0, 200));
}
async function del(q) {
  const res = await fetch(BASE + 'entries?owner=eq.' + EMAIL, { method: 'DELETE', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  console.log('del', res.status);
}
(async () => {
  const hash = crypto.createHash('sha256').update('dairy-salt::TestPass123!').digest('hex');
  await post('users', [{ email: EMAIL, name: 'QA Tester', hash, created: new Date().toISOString() }]);
  await del();
  const heads = ['Morning & Night Greetings', 'Our Promise', 'Little Things'];
  const bodies = [
    'Good morning jaan! 🌅 I woke up thinking about you again today.',
    'Thank you for being honest with me from day one. That means everything.\nWhat I felt: safe, for the first time in years.',
    'Counting the days until we are under the same roof… ✨',
    'You laughed at my terrible joke today and it made my whole week.\nNote: never change, my love.',
    'A short one.',
    'The distance is hard but you are worth every single mile between Dubai and Nadiad. I would cross that ocean a thousand times for one evening chai with you, just the two of us, no phones, no goodbyes at midnight. 💕',
    'gn 🌙 sleep well, dream of us.',
    'Today you said "I trust you" and my heart literally skipped three beats.',
  ];
  const entries = [];
  for (let i = 0; i < 24; i++) {
    entries.push({
      id: 900000 + i, owner: EMAIL, title: 'QA Entry ' + (i + 1), mood: '😊',
      sender: i % 2 ? 'Deep' : '🍯🫰🫶🏻 Chota Don ❣️❤️😘',
      heading: heads[i % 3], date: new Date(Date.now() - (24 - i) * 86400000).toISOString(),
      body: bodies[i % bodies.length], words: bodies[i % bodies.length].split(/\s+/).length
    });
  }
  await post('entries', entries);
})();
