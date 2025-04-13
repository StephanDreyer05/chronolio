// Timeline event types and their labels
export const TimelineEventTypes = {
  // Basic event types
  event: 'Generic Event',
  gift: 'Gift Exchange',
  venue: 'Venue',
  location: 'Location',
  gathering: 'Gathering',
  award: 'Award',
  decoration: 'Decoration',
  photo: 'Photo',
  handshake: 'Meeting',

  // Ceremony related
  ceremony: 'Ceremony',
  church: 'Church',
  gem: 'Ring Exchange',

  // Food & Drink
  toast: 'Toast',
  cake: 'Cake',
  dinner: 'Meal',
  drinks: 'Drinks',
  coffee: 'Coffee Break',
  catering: 'Catering',
  icecream: 'Ice Cream',

  // Entertainment
  dance: 'Dance',
  fireworks: 'Fireworks',
  speech: 'Speech',
  party: 'Party',
  ticket: 'Ticket',
  activity: 'Activity',
  guitar: 'Music',
  drama: 'Performance',

  // Travel related
  transportation: 'Transportation',
  flight: 'Flight',
  bus: 'Bus',
  hotel: 'Hotel',

  // Nature & Time
  clock: 'Time',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
} as const;

export type TimelineEventType = keyof typeof TimelineEventTypes; 