// Read-only smoke check. No accounts, campus records or emails are created.
const url = new URL(process.argv[2] || 'http://localhost:4000');
if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
  throw new Error('Use the HTTPS Railway API URL.');
}
const response = await fetch(new URL('/health', url), { signal: AbortSignal.timeout(15000) });
if (!response.ok || (await response.json()).status !== 'ok') {
  throw new Error('API/database health check failed.');
}
const demo = await fetch(new URL('/api/auth/demo', url), {
  method: 'POST', signal: AbortSignal.timeout(15000),
});
if (demo.status !== 404) throw new Error('Release API must return 404 for test login.');
console.log('API/database reachable; test login disabled. Real email and device journeys still require testing.');
