import { TimelineIconType } from './icons';

export interface TemplateEvent {
  title: string;
  startTime: string;
  duration: string;
  description: string;
  location: string;
  type: TimelineIconType;
}

export const traditionalTemplate: TemplateEvent[] = [
  {
    title: "Hair & Makeup",
    startTime: "09:00",
    duration: "120",
    description: "Bridal party hair and makeup preparations",
    location: "Bridal Suite",
    type: "event",
  },
  {
    title: "Wedding Ceremony",
    startTime: "11:00",
    duration: "60",
    description: "Exchange of vows and rings",
    location: "Main Chapel",
    type: "ceremony",
  },
  {
    title: "Wedding Photos",
    startTime: "12:00",
    duration: "60",
    description: "Professional photography session with family and wedding party",
    location: "Garden",
    type: "photo",
  },
  {
    title: "Cocktail Hour",
    startTime: "13:00",
    duration: "60",
    description: "Welcome drinks and canapés",
    location: "Terrace",
    type: "toast",
  },
  {
    title: "Reception",
    startTime: "14:00",
    duration: "60",
    description: "Wedding breakfast and speeches",
    location: "Grand Hall",
    type: "event",
  },
  {
    title: "Cake Cutting",
    startTime: "15:00",
    duration: "30",
    description: "Traditional cake cutting ceremony",
    location: "Grand Hall",
    type: "cake",
  },
  {
    title: "First Dance",
    startTime: "15:30",
    duration: "30",
    description: "Newlyweds' first dance",
    location: "Dance Floor",
    type: "dance",
  },
  {
    title: "Evening Celebration",
    startTime: "16:00",
    duration: "240",
    description: "Dancing and evening entertainment",
    location: "Grand Hall",
    type: "dance",
  },
  {
    title: "Fireworks Display",
    startTime: "20:00",
    duration: "15",
    description: "Grand finale fireworks show",
    location: "Garden",
    type: "fireworks",
  },
];

export const modernTemplate: TemplateEvent[] = [
  {
    title: "Getting Ready",
    startTime: "14:00",
    duration: "120",
    description: "Wedding party preparations",
    location: "Hotel Suite",
    type: "event",
  },
  {
    title: "First Look Photos",
    startTime: "16:00",
    duration: "45",
    description: "Private first look and couple photos",
    location: "Rooftop Garden",
    type: "photo",
  },
  {
    title: "Sunset Ceremony",
    startTime: "17:00",
    duration: "45",
    description: "Intimate ceremony as the sun sets",
    location: "Outdoor Terrace",
    type: "ceremony",
  },
  {
    title: "Cocktail Reception",
    startTime: "17:45",
    duration: "75",
    description: "Craft cocktails and passed appetizers",
    location: "Lounge",
    type: "toast",
  },
  {
    title: "Dinner Experience",
    startTime: "19:00",
    duration: "90",
    description: "Family-style dining and toasts",
    location: "Main Hall",
    type: "event",
  },
  {
    title: "Cake & Dessert",
    startTime: "20:30",
    duration: "30",
    description: "Cutting of the cake and dessert station opens",
    location: "Main Hall",
    type: "cake",
  },
  {
    title: "Dance Party",
    startTime: "21:00",
    duration: "180",
    description: "Dancing and celebration",
    location: "Dance Floor",
    type: "dance",
  },
];
