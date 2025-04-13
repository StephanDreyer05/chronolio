import { useQuery } from '@tanstack/react-query';

// Mock templates for fallback
const MOCK_TEMPLATES = [
  {
    id: 1,
    title: "Wedding Day Timeline",
    type: "Wedding",
    events: Array(15).fill({}),
    categories: Array(4).fill({})
  },
  {
    id: 2,
    title: "Corporate Conference",
    type: "Conference",
    events: Array(10).fill({}),
    categories: Array(3).fill({})
  },
  {
    id: 3,
    title: "Birthday Party",
    type: "Birthday",
    events: Array(8).fill({}),
    categories: Array(2).fill({})
  },
  {
    id: 4,
    title: "Team Meeting",
    type: "Meeting",
    events: Array(6).fill({}),
    categories: Array(2).fill({})
  }
];

// Detailed mock templates with full event and category data
const DETAILED_MOCK_TEMPLATES = {
  1: { // Wedding Day Timeline
    id: 1,
    title: "Wedding Day Timeline",
    type: "Wedding",
    categories: [
      { name: "Preparations", description: "Getting ready activities", order: 1 },
      { name: "Ceremony", description: "Wedding ceremony events", order: 2 },
      { name: "Photos", description: "Photography sessions", order: 3 },
      { name: "Reception", description: "Wedding reception events", order: 4 }
    ],
    events: [
      { startTime: "08:00", duration: "02:00", title: "Hair & Makeup", description: "Bride and bridesmaids hair and makeup session", location: "Bridal Suite", type: "Wedding", category: "Preparations" },
      { startTime: "10:00", duration: "01:00", title: "Groom & Groomsmen Preparation", description: "Groom and groomsmen get ready", location: "Groom's Suite", type: "Wedding", category: "Preparations" },
      { startTime: "11:00", duration: "00:30", title: "Final Touches", description: "Last minute preparations and adjustments", location: "Bridal Suite", type: "Wedding", category: "Preparations" },
      { startTime: "12:00", duration: "00:30", title: "Guest Arrival", description: "Guests arrive and are seated", location: "Ceremony Venue", type: "Wedding", category: "Ceremony" },
      { startTime: "12:30", duration: "01:00", title: "Wedding Ceremony", description: "Exchange of vows and rings", location: "Ceremony Venue", type: "Wedding", category: "Ceremony" },
      { startTime: "13:30", duration: "01:30", title: "Family & Group Photos", description: "Formal photographs with family and wedding party", location: "Garden Area", type: "Wedding", category: "Photos" },
      { startTime: "15:00", duration: "01:00", title: "Cocktail Hour", description: "Guests enjoy drinks and appetizers", location: "Reception Venue", type: "Wedding", category: "Reception" },
      { startTime: "16:00", duration: "00:30", title: "Grand Entrance", description: "Introduction of the wedding party and newlyweds", location: "Reception Hall", type: "Wedding", category: "Reception" },
      { startTime: "16:30", duration: "01:30", title: "Dinner Service", description: "Formal dinner service", location: "Reception Hall", type: "Wedding", category: "Reception" },
      { startTime: "18:00", duration: "00:30", title: "Toasts & Speeches", description: "Best man and maid of honor speeches", location: "Reception Hall", type: "Wedding", category: "Reception" },
      { startTime: "18:30", duration: "00:30", title: "First Dance", description: "Newlyweds' first dance followed by parent dances", location: "Dance Floor", type: "Wedding", category: "Reception" },
      { startTime: "19:00", duration: "02:00", title: "Dancing & Entertainment", description: "Open dance floor and entertainment", location: "Reception Hall", type: "Wedding", category: "Reception" },
      { startTime: "21:00", duration: "00:30", title: "Cake Cutting", description: "Cutting of the wedding cake", location: "Reception Hall", type: "Wedding", category: "Reception" },
      { startTime: "21:30", duration: "00:30", title: "Bouquet & Garter Toss", description: "Traditional bouquet and garter toss", location: "Dance Floor", type: "Wedding", category: "Reception" },
      { startTime: "22:00", duration: "00:30", title: "Grand Exit", description: "Newlyweds' departure", location: "Venue Entrance", type: "Wedding", category: "Reception" }
    ]
  },
  2: { // Corporate Conference
    id: 2,
    title: "Corporate Conference",
    type: "Conference",
    categories: [
      { name: "Registration", description: "Check-in activities", order: 1 },
      { name: "Sessions", description: "Main conference content", order: 2 },
      { name: "Networking", description: "Networking opportunities", order: 3 }
    ],
    events: [
      { startTime: "08:00", duration: "01:00", title: "Registration & Check-in", description: "Attendees arrive and collect badges", location: "Conference Center Lobby", type: "Conference", category: "Registration" },
      { startTime: "09:00", duration: "00:30", title: "Welcome Address", description: "Opening remarks by conference chair", location: "Main Hall", type: "Conference", category: "Sessions" },
      { startTime: "09:30", duration: "01:00", title: "Keynote Speaker", description: "Industry expert presentation", location: "Main Hall", type: "Conference", category: "Sessions" },
      { startTime: "10:30", duration: "00:30", title: "Coffee Break", description: "Refreshments and networking", location: "Foyer", type: "Conference", category: "Networking" },
      { startTime: "11:00", duration: "01:00", title: "Panel Discussion", description: "Expert panel on industry trends", location: "Main Hall", type: "Conference", category: "Sessions" },
      { startTime: "12:00", duration: "01:00", title: "Lunch", description: "Buffet lunch and networking", location: "Dining Area", type: "Conference", category: "Networking" },
      { startTime: "13:00", duration: "01:30", title: "Breakout Sessions", description: "Specialized topic discussions", location: "Conference Rooms", type: "Conference", category: "Sessions" },
      { startTime: "14:30", duration: "00:30", title: "Afternoon Break", description: "Refreshments and networking", location: "Foyer", type: "Conference", category: "Networking" },
      { startTime: "15:00", duration: "01:30", title: "Workshop", description: "Interactive skill-building session", location: "Workshop Room", type: "Conference", category: "Sessions" },
      { startTime: "16:30", duration: "00:30", title: "Closing Remarks", description: "Summary and next steps", location: "Main Hall", type: "Conference", category: "Sessions" }
    ]
  },
  3: { // Birthday Party
    id: 3,
    title: "Birthday Party",
    type: "Birthday",
    categories: [
      { name: "Setup", description: "Preparation activities", order: 1 },
      { name: "Party", description: "Main celebration events", order: 2 }
    ],
    events: [
      { startTime: "15:00", duration: "02:00", title: "Venue Setup", description: "Decorating and arranging the venue", location: "Party Venue", type: "Birthday", category: "Setup" },
      { startTime: "17:00", duration: "00:30", title: "Host Preparation", description: "Final touches and getting ready", location: "Home", type: "Birthday", category: "Setup" },
      { startTime: "17:30", duration: "00:30", title: "Guest Arrival", description: "Welcoming guests", location: "Party Venue", type: "Birthday", category: "Party" },
      { startTime: "18:00", duration: "01:00", title: "Drinks & Appetizers", description: "Socializing and light refreshments", location: "Party Venue", type: "Birthday", category: "Party" },
      { startTime: "19:00", duration: "01:00", title: "Dinner", description: "Main meal service", location: "Dining Area", type: "Birthday", category: "Party" },
      { startTime: "20:00", duration: "00:30", title: "Cake & Speeches", description: "Birthday cake presentation and toasts", location: "Party Venue", type: "Birthday", category: "Party" },
      { startTime: "20:30", duration: "02:00", title: "Entertainment & Dancing", description: "Music, dancing and activities", location: "Party Venue", type: "Birthday", category: "Party" },
      { startTime: "22:30", duration: "00:30", title: "Farewell", description: "Saying goodbye to guests", location: "Party Venue", type: "Birthday", category: "Party" }
    ]
  },
  4: { // Team Meeting
    id: 4,
    title: "Team Meeting",
    type: "Meeting",
    categories: [
      { name: "Introduction", description: "Opening items", order: 1 },
      { name: "Discussion", description: "Main agenda items", order: 2 }
    ],
    events: [
      { startTime: "09:00", duration: "00:15", title: "Welcome & Check-in", description: "Brief introduction and attendee check-in", location: "Meeting Room", type: "Meeting", category: "Introduction" },
      { startTime: "09:15", duration: "00:15", title: "Agenda Overview", description: "Review of meeting objectives and agenda", location: "Meeting Room", type: "Meeting", category: "Introduction" },
      { startTime: "09:30", duration: "00:45", title: "Project Updates", description: "Status updates on current projects", location: "Meeting Room", type: "Meeting", category: "Discussion" },
      { startTime: "10:15", duration: "00:45", title: "Strategy Discussion", description: "Discussion of upcoming strategy and goals", location: "Meeting Room", type: "Meeting", category: "Discussion" },
      { startTime: "11:00", duration: "00:30", title: "Action Items", description: "Assigning tasks and responsibilities", location: "Meeting Room", type: "Meeting", category: "Discussion" },
      { startTime: "11:30", duration: "00:30", title: "Q&A and Closing", description: "Addressing questions and wrapping up", location: "Meeting Room", type: "Meeting", category: "Discussion" }
    ]
  }
};

export const usePublicTemplates = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['publicTemplates', page, limit],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/templates/public?page=${page}&limit=${limit}`);
        
        if (!response.ok) {
          console.log('Using mock templates since API returned:', response.status);
          // Return properly formatted mock data
          return {
            templates: MOCK_TEMPLATES,
            pagination: {
              total: MOCK_TEMPLATES.length,
              page: 1,
              limit: 10,
              totalPages: 1
            }
          };
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching templates:', error);
        // Return mock data on error
        return {
          templates: MOCK_TEMPLATES,
          pagination: {
            total: MOCK_TEMPLATES.length,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTemplateById = (id: number) => {
  return useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/templates/${id}`);
        
        if (!response.ok) {
          console.log(`API call failed for template ${id}, using mock data instead:`, response.status);
          
          // Use the detailed mock data based on template ID
          const mockTemplate = DETAILED_MOCK_TEMPLATES[id as keyof typeof DETAILED_MOCK_TEMPLATES];
          
          if (!mockTemplate) {
            throw new Error('Template not found in mock data');
          }
          
          return mockTemplate;
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching template by ID:', error);
        
        // Try to use mock data as a fallback
        const mockTemplate = DETAILED_MOCK_TEMPLATES[id as keyof typeof DETAILED_MOCK_TEMPLATES];
        
        if (!mockTemplate) {
          throw new Error('Template not found in mock data');
        }
        
        return mockTemplate;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserTemplates = () => {
  return useQuery({
    queryKey: ['userTemplates'],
    queryFn: async () => {
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch user templates');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 