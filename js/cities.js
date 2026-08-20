/*
 * cities.js — a bundled table of major world cities (name, country, lat, lon)
 * used as a location fallback when GPS is unavailable. Bundled rather than
 * fetched so the picker works fully offline, at a campsite with no signal.
 *
 * Coordinates are city-centre approximations — plenty accurate for sunrise
 * time (±1 min) and bearing (a fraction of a degree) at city scale.
 */
export const CITIES = [
  // — Africa —
  { n: 'Cairo', c: 'Egypt', lat: 30.0444, lon: 31.2357 },
  { n: 'Lagos', c: 'Nigeria', lat: 6.5244, lon: 3.3792 },
  { n: 'Kinshasa', c: 'DR Congo', lat: -4.4419, lon: 15.2663 },
  { n: 'Johannesburg', c: 'South Africa', lat: -26.2041, lon: 28.0473 },
  { n: 'Cape Town', c: 'South Africa', lat: -33.9249, lon: 18.4241 },
  { n: 'Nairobi', c: 'Kenya', lat: -1.2921, lon: 36.8219 },
  { n: 'Casablanca', c: 'Morocco', lat: 33.5731, lon: -7.5898 },
  { n: 'Addis Ababa', c: 'Ethiopia', lat: 9.03, lon: 38.74 },
  { n: 'Accra', c: 'Ghana', lat: 5.6037, lon: -0.187 },
  { n: 'Dar es Salaam', c: 'Tanzania', lat: -6.7924, lon: 39.2083 },
  { n: 'Algiers', c: 'Algeria', lat: 36.7538, lon: 3.0588 },
  { n: 'Tunis', c: 'Tunisia', lat: 36.8065, lon: 10.1815 },
  { n: 'Dakar', c: 'Senegal', lat: 14.7167, lon: -17.4677 },
  { n: 'Marrakesh', c: 'Morocco', lat: 31.6295, lon: -7.9811 },

  // — Americas —
  { n: 'New York', c: 'United States', lat: 40.7128, lon: -74.006 },
  { n: 'Los Angeles', c: 'United States', lat: 34.0522, lon: -118.2437 },
  { n: 'Chicago', c: 'United States', lat: 41.8781, lon: -87.6298 },
  { n: 'Houston', c: 'United States', lat: 29.7604, lon: -95.3698 },
  { n: 'Denver', c: 'United States', lat: 39.7392, lon: -104.9903 },
  { n: 'Seattle', c: 'United States', lat: 47.6062, lon: -122.3321 },
  { n: 'San Francisco', c: 'United States', lat: 37.7749, lon: -122.4194 },
  { n: 'Miami', c: 'United States', lat: 25.7617, lon: -80.1918 },
  { n: 'Boston', c: 'United States', lat: 42.3601, lon: -71.0589 },
  { n: 'Washington', c: 'United States', lat: 38.9072, lon: -77.0369 },
  { n: 'Las Vegas', c: 'United States', lat: 36.1699, lon: -115.1398 },
  { n: 'Anchorage', c: 'United States', lat: 61.2181, lon: -149.9003 },
  { n: 'Honolulu', c: 'United States', lat: 21.3069, lon: -157.8583 },
  { n: 'Toronto', c: 'Canada', lat: 43.6532, lon: -79.3832 },
  { n: 'Vancouver', c: 'Canada', lat: 49.2827, lon: -123.1207 },
  { n: 'Montreal', c: 'Canada', lat: 45.5017, lon: -73.5673 },
  { n: 'Calgary', c: 'Canada', lat: 51.0447, lon: -114.0719 },
  { n: 'Mexico City', c: 'Mexico', lat: 19.4326, lon: -99.1332 },
  { n: 'Guadalajara', c: 'Mexico', lat: 20.6597, lon: -103.3496 },
  { n: 'Monterrey', c: 'Mexico', lat: 25.6866, lon: -100.3161 },
  { n: 'Havana', c: 'Cuba', lat: 23.1136, lon: -82.3666 },
  { n: 'Guatemala City', c: 'Guatemala', lat: 14.6349, lon: -90.5069 },
  { n: 'Panama City', c: 'Panama', lat: 8.9824, lon: -79.5199 },
  { n: 'Bogotá', c: 'Colombia', lat: 4.711, lon: -74.0721 },
  { n: 'Lima', c: 'Peru', lat: -12.0464, lon: -77.0428 },
  { n: 'Quito', c: 'Ecuador', lat: -0.1807, lon: -78.4678 },
  { n: 'Caracas', c: 'Venezuela', lat: 10.4806, lon: -66.9036 },
  { n: 'São Paulo', c: 'Brazil', lat: -23.5505, lon: -46.6333 },
  { n: 'Rio de Janeiro', c: 'Brazil', lat: -22.9068, lon: -43.1729 },
  { n: 'Brasília', c: 'Brazil', lat: -15.7939, lon: -47.8828 },
  { n: 'Salvador', c: 'Brazil', lat: -12.9777, lon: -38.5016 },
  { n: 'Buenos Aires', c: 'Argentina', lat: -34.6037, lon: -58.3816 },
  { n: 'Santiago', c: 'Chile', lat: -33.4489, lon: -70.6693 },
  { n: 'Montevideo', c: 'Uruguay', lat: -34.9011, lon: -56.1645 },
  { n: 'La Paz', c: 'Bolivia', lat: -16.4897, lon: -68.1193 },

  // — Asia —
  { n: 'Tokyo', c: 'Japan', lat: 35.6762, lon: 139.6503 },
  { n: 'Osaka', c: 'Japan', lat: 34.6937, lon: 135.5023 },
  { n: 'Seoul', c: 'South Korea', lat: 37.5665, lon: 126.978 },
  { n: 'Beijing', c: 'China', lat: 39.9042, lon: 116.4074 },
  { n: 'Shanghai', c: 'China', lat: 31.2304, lon: 121.4737 },
  { n: 'Guangzhou', c: 'China', lat: 23.1291, lon: 113.2644 },
  { n: 'Shenzhen', c: 'China', lat: 22.5431, lon: 114.0579 },
  { n: 'Chengdu', c: 'China', lat: 30.5728, lon: 104.0668 },
  { n: 'Hong Kong', c: 'China', lat: 22.3193, lon: 114.1694 },
  { n: 'Taipei', c: 'Taiwan', lat: 25.033, lon: 121.5654 },
  { n: 'Manila', c: 'Philippines', lat: 14.5995, lon: 120.9842 },
  { n: 'Jakarta', c: 'Indonesia', lat: -6.2088, lon: 106.8456 },
  { n: 'Bali', c: 'Indonesia', lat: -8.4095, lon: 115.1889 },
  { n: 'Bangkok', c: 'Thailand', lat: 13.7563, lon: 100.5018 },
  { n: 'Ho Chi Minh City', c: 'Vietnam', lat: 10.8231, lon: 106.6297 },
  { n: 'Hanoi', c: 'Vietnam', lat: 21.0278, lon: 105.8342 },
  { n: 'Kuala Lumpur', c: 'Malaysia', lat: 3.139, lon: 101.6869 },
  { n: 'Singapore', c: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { n: 'Mumbai', c: 'India', lat: 19.076, lon: 72.8777 },
  { n: 'Delhi', c: 'India', lat: 28.7041, lon: 77.1025 },
  { n: 'Bengaluru', c: 'India', lat: 12.9716, lon: 77.5946 },
  { n: 'Chennai', c: 'India', lat: 13.0827, lon: 80.2707 },
  { n: 'Kolkata', c: 'India', lat: 22.5726, lon: 88.3639 },
  { n: 'Hyderabad', c: 'India', lat: 17.385, lon: 78.4867 },
  { n: 'Karachi', c: 'Pakistan', lat: 24.8607, lon: 67.0011 },
  { n: 'Lahore', c: 'Pakistan', lat: 31.5204, lon: 74.3587 },
  { n: 'Dhaka', c: 'Bangladesh', lat: 23.8103, lon: 90.4125 },
  { n: 'Kathmandu', c: 'Nepal', lat: 27.7172, lon: 85.324 },
  { n: 'Colombo', c: 'Sri Lanka', lat: 6.9271, lon: 79.8612 },
  { n: 'Tehran', c: 'Iran', lat: 35.6892, lon: 51.389 },
  { n: 'Baghdad', c: 'Iraq', lat: 33.3152, lon: 44.3661 },
  { n: 'Riyadh', c: 'Saudi Arabia', lat: 24.7136, lon: 46.6753 },
  { n: 'Dubai', c: 'UAE', lat: 25.2048, lon: 55.2708 },
  { n: 'Abu Dhabi', c: 'UAE', lat: 24.4539, lon: 54.3773 },
  { n: 'Doha', c: 'Qatar', lat: 25.2854, lon: 51.531 },
  { n: 'Jerusalem', c: 'Israel', lat: 31.7683, lon: 35.2137 },
  { n: 'Tel Aviv', c: 'Israel', lat: 32.0853, lon: 34.7818 },
  { n: 'Amman', c: 'Jordan', lat: 31.9454, lon: 35.9284 },
  { n: 'Beirut', c: 'Lebanon', lat: 33.8938, lon: 35.5018 },
  { n: 'Istanbul', c: 'Turkey', lat: 41.0082, lon: 28.9784 },
  { n: 'Ankara', c: 'Turkey', lat: 39.9334, lon: 32.8597 },
  { n: 'Almaty', c: 'Kazakhstan', lat: 43.222, lon: 76.8512 },
  { n: 'Tashkent', c: 'Uzbekistan', lat: 41.2995, lon: 69.2401 },

  // — Europe —
  { n: 'London', c: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { n: 'Manchester', c: 'United Kingdom', lat: 53.4808, lon: -2.2426 },
  { n: 'Edinburgh', c: 'United Kingdom', lat: 55.9533, lon: -3.1883 },
  { n: 'Dublin', c: 'Ireland', lat: 53.3498, lon: -6.2603 },
  { n: 'Paris', c: 'France', lat: 48.8566, lon: 2.3522 },
  { n: 'Marseille', c: 'France', lat: 43.2965, lon: 5.3698 },
  { n: 'Madrid', c: 'Spain', lat: 40.4168, lon: -3.7038 },
  { n: 'Barcelona', c: 'Spain', lat: 41.3874, lon: 2.1686 },
  { n: 'Lisbon', c: 'Portugal', lat: 38.7223, lon: -9.1393 },
  { n: 'Porto', c: 'Portugal', lat: 41.1579, lon: -8.6291 },
  { n: 'Rome', c: 'Italy', lat: 41.9028, lon: 12.4964 },
  { n: 'Milan', c: 'Italy', lat: 45.4642, lon: 9.19 },
  { n: 'Naples', c: 'Italy', lat: 40.8518, lon: 14.2681 },
  { n: 'Berlin', c: 'Germany', lat: 52.52, lon: 13.405 },
  { n: 'Munich', c: 'Germany', lat: 48.1351, lon: 11.582 },
  { n: 'Frankfurt', c: 'Germany', lat: 50.1109, lon: 8.6821 },
  { n: 'Hamburg', c: 'Germany', lat: 53.5511, lon: 9.9937 },
  { n: 'Amsterdam', c: 'Netherlands', lat: 52.3676, lon: 4.9041 },
  { n: 'Brussels', c: 'Belgium', lat: 50.8503, lon: 4.3517 },
  { n: 'Zurich', c: 'Switzerland', lat: 47.3769, lon: 8.5417 },
  { n: 'Geneva', c: 'Switzerland', lat: 46.2044, lon: 6.1432 },
  { n: 'Vienna', c: 'Austria', lat: 48.2082, lon: 16.3738 },
  { n: 'Prague', c: 'Czechia', lat: 50.0755, lon: 14.4378 },
  { n: 'Warsaw', c: 'Poland', lat: 52.2297, lon: 21.0122 },
  { n: 'Budapest', c: 'Hungary', lat: 47.4979, lon: 19.0402 },
  { n: 'Athens', c: 'Greece', lat: 37.9838, lon: 23.7275 },
  { n: 'Bucharest', c: 'Romania', lat: 44.4268, lon: 26.1025 },
  { n: 'Copenhagen', c: 'Denmark', lat: 55.6761, lon: 12.5683 },
  { n: 'Stockholm', c: 'Sweden', lat: 59.3293, lon: 18.0686 },
  { n: 'Oslo', c: 'Norway', lat: 59.9139, lon: 10.7522 },
  { n: 'Helsinki', c: 'Finland', lat: 60.1699, lon: 24.9384 },
  { n: 'Reykjavík', c: 'Iceland', lat: 64.1466, lon: -21.9426 },
  { n: 'Tromsø', c: 'Norway', lat: 69.6492, lon: 18.9553 },
  { n: 'Moscow', c: 'Russia', lat: 55.7558, lon: 37.6173 },
  { n: 'Saint Petersburg', c: 'Russia', lat: 59.9311, lon: 30.3609 },
  { n: 'Kyiv', c: 'Ukraine', lat: 50.4501, lon: 30.5234 },

  // — Oceania —
  { n: 'Sydney', c: 'Australia', lat: -33.8688, lon: 151.2093 },
  { n: 'Melbourne', c: 'Australia', lat: -37.8136, lon: 144.9631 },
  { n: 'Brisbane', c: 'Australia', lat: -27.4698, lon: 153.0251 },
  { n: 'Perth', c: 'Australia', lat: -31.9505, lon: 115.8605 },
  { n: 'Adelaide', c: 'Australia', lat: -34.9285, lon: 138.6007 },
  { n: 'Auckland', c: 'New Zealand', lat: -36.8485, lon: 174.7633 },
  { n: 'Wellington', c: 'New Zealand', lat: -41.2865, lon: 174.7762 },
  { n: 'Christchurch', c: 'New Zealand', lat: -43.532, lon: 172.6362 },
  { n: 'Suva', c: 'Fiji', lat: -18.1416, lon: 178.4419 },
  { n: 'Honiara', c: 'Solomon Islands', lat: -9.4456, lon: 159.9729 },
];

// Normalise for forgiving matches: lower-case, strip accents & punctuation.
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Resolve free-text input (e.g. "paris", "Paris, France", "são paulo") to a
 * city record, or null. Matches "City, Country" first, then city name, then a
 * unique prefix.
 */
export function findCity(input) {
  const q = norm(input);
  if (!q) return null;

  const withCountry = CITIES.find((c) => norm(`${c.n} ${c.c}`) === q);
  if (withCountry) return withCountry;

  const exact = CITIES.find((c) => norm(c.n) === q);
  if (exact) return exact;

  const starts = CITIES.filter((c) => norm(c.n).startsWith(q));
  if (starts.length === 1) return starts[0];

  const contains = CITIES.filter((c) => norm(c.n).includes(q));
  return contains.length === 1 ? contains[0] : null;
}
