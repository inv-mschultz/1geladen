/**
 * All event times are wall-clock times at the party's location. The server
 * runs in UTC (Vercel), so every server-side format must pin the timezone —
 * otherwise "15:00" renders as "13:00".
 */
export const EVENT_TIMEZONE = 'Europe/Berlin'
