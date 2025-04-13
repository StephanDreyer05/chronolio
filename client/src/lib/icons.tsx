import { 
  GlassWater, 
  Cake, 
  Music, 
  Camera, 
  Heart, 
  Sparkles,
  CalendarClock,
  Gift,
  Utensils,
  Car,
  Home,
  Mic2,
  PartyPopper,
  Plane,
  Bus,
  Hotel,
  MapPin,
  Users,
  Wine,
  Coffee,
  Trophy,
  Ticket,
  Palette,
  Drumstick,
  Flower2,
  Church,
  Gem,
  Guitar,
  Theater,
  Clock,
  HandshakeIcon,
  IceCream,
  Sunrise,
  Sunset,
} from 'lucide-react';

// Define categories for better organization
export const IconCategories = {
  EVENTS: 'Events',
  FOOD_DRINK: 'Food & Drink',
  TRAVEL: 'Travel',
  ENTERTAINMENT: 'Entertainment',
  CEREMONY: 'Ceremony',
  NATURE: 'Nature & Time',
} as const;

// Extended icon set with categories
export const TimelineIcons = {
  // Basic event types
  event: { icon: CalendarClock, category: IconCategories.EVENTS, label: 'Generic Event' },
  gift: { icon: Gift, category: IconCategories.EVENTS, label: 'Gift Exchange' },
  venue: { icon: Home, category: IconCategories.EVENTS, label: 'Venue' },
  location: { icon: MapPin, category: IconCategories.EVENTS, label: 'Location' },
  gathering: { icon: Users, category: IconCategories.EVENTS, label: 'Gathering' },
  award: { icon: Trophy, category: IconCategories.EVENTS, label: 'Award' },
  decoration: { icon: Flower2, category: IconCategories.EVENTS, label: 'Decoration' },
  photo: { icon: Camera, category: IconCategories.EVENTS, label: 'Photo' },
  handshake: { icon: HandshakeIcon, category: IconCategories.EVENTS, label: 'Meeting' },

  // Ceremony related
  ceremony: { icon: Heart, category: IconCategories.CEREMONY, label: 'Ceremony' },
  church: { icon: Church, category: IconCategories.CEREMONY, label: 'Church' },
  gem: { icon: Gem, category: IconCategories.CEREMONY, label: 'Ring Exchange' },

  // Food & Drink
  toast: { icon: GlassWater, category: IconCategories.FOOD_DRINK, label: 'Toast' },
  cake: { icon: Cake, category: IconCategories.FOOD_DRINK, label: 'Cake' },
  dinner: { icon: Utensils, category: IconCategories.FOOD_DRINK, label: 'Meal' },
  drinks: { icon: Wine, category: IconCategories.FOOD_DRINK, label: 'Drinks' },
  coffee: { icon: Coffee, category: IconCategories.FOOD_DRINK, label: 'Coffee Break' },
  catering: { icon: Drumstick, category: IconCategories.FOOD_DRINK, label: 'Catering' },
  icecream: { icon: IceCream, category: IconCategories.FOOD_DRINK, label: 'Ice Cream' },

  // Entertainment
  dance: { icon: Music, category: IconCategories.ENTERTAINMENT, label: 'Dance' },
  fireworks: { icon: Sparkles, category: IconCategories.ENTERTAINMENT, label: 'Fireworks' },
  speech: { icon: Mic2, category: IconCategories.ENTERTAINMENT, label: 'Speech' },
  party: { icon: PartyPopper, category: IconCategories.ENTERTAINMENT, label: 'Party' },
  ticket: { icon: Ticket, category: IconCategories.ENTERTAINMENT, label: 'Ticket' },
  activity: { icon: Palette, category: IconCategories.ENTERTAINMENT, label: 'Activity' },
  guitar: { icon: Guitar, category: IconCategories.ENTERTAINMENT, label: 'Music' },
  drama: { icon: Theater, category: IconCategories.ENTERTAINMENT, label: 'Performance' },

  // Travel related
  transportation: { icon: Car, category: IconCategories.TRAVEL, label: 'Transportation' },
  flight: { icon: Plane, category: IconCategories.TRAVEL, label: 'Flight' },
  bus: { icon: Bus, category: IconCategories.TRAVEL, label: 'Bus' },
  hotel: { icon: Hotel, category: IconCategories.TRAVEL, label: 'Hotel' },

  // Nature & Time
  clock: { icon: Clock, category: IconCategories.NATURE, label: 'Time' },
  sunrise: { icon: Sunrise, category: IconCategories.NATURE, label: 'Sunrise' },
  sunset: { icon: Sunset, category: IconCategories.NATURE, label: 'Sunset' },
} as const;

// Type for the icon keys
export type TimelineIconType = keyof typeof TimelineIcons;

// Helper function to get icons by category with proper typing
export const getIconsByCategory = (category: typeof IconCategories[keyof typeof IconCategories]) => {
  const result = {} as Record<TimelineIconType, typeof TimelineIcons[TimelineIconType]>;

  Object.entries(TimelineIcons).forEach(([key, value]) => {
    if (value.category === category) {
      result[key as TimelineIconType] = value;
    }
  });

  return result;
};

// Get all available categories
export const getAllCategories = () => Object.values(IconCategories);

// Get all icons as a flat array with their keys
export const getAllIcons = () => 
  Object.entries(TimelineIcons).map(([key, value]) => ({
    key: key as TimelineIconType,
    ...value,
  }));