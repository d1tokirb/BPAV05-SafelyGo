import type { SharingSession } from './types';

export function walkStatus(session: SharingSession, now: number) {
  const end = Date.parse(session.expires_at);
  const updated = session.updated_at ? Date.parse(session.updated_at) : NaN;
  const hasPosition = Number.isFinite(session.latitude) && Number.isFinite(session.longitude);
  const age = now - updated;
  return {
    expired: !Number.isFinite(end) || end <= now,
    minutesLeft: Math.max(0, Math.ceil((end - now) / 60000)),
    hasPosition,
    recent: hasPosition && Number.isFinite(age) && age >= -5000 && age <= 60000,
    accuracy: session.accuracy !== null && Number.isFinite(session.accuracy) && session.accuracy >= 0
      ? 'Approximate accuracy: ' + Math.max(1, Math.round(session.accuracy)) + ' m.'
      : 'Accuracy unavailable.',
  };
}
