/**
 * Script to add public template examples to the database
 * These templates will be available to trial users
 */

import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

// Template definitions
const publicTemplates = [
  {
    title: "Wedding Day Timeline",
    events: [
      {
        startTime: "08:00",
        duration: "02:00",
        title: "Hair and makeup",
        description: "Bride and bridesmaids get ready",
        type: "preparation",
        category: "Getting Ready"
      },
      {
        startTime: "10:00",
        duration: "01:00",
        title: "Photographer arrives",
        description: "Capture getting ready photos",
        type: "vendor",
        category: "Getting Ready"
      },
      {
        startTime: "11:00",
        duration: "00:30",
        title: "Pre-ceremony photos",
        description: "Bride and bridesmaids",
        type: "photography",
        category: "Getting Ready"
      },
      {
        startTime: "12:00",
        duration: "00:15",
        title: "Guests arrive",
        description: "Guests begin to arrive at ceremony venue",
        type: "ceremony",
        category: "Ceremony"
      },
      {
        startTime: "12:30",
        duration: "00:45",
        title: "Ceremony",
        description: "Wedding ceremony",
        type: "ceremony",
        category: "Ceremony"
      },
      {
        startTime: "13:30",
        duration: "01:30",
        title: "Cocktail hour",
        description: "Guests enjoy drinks & appetizers while photos are taken",
        type: "reception",
        category: "Reception"
      },
      {
        startTime: "15:00",
        duration: "00:15",
        title: "Grand entrance",
        description: "Bridal party and couple are introduced",
        type: "reception",
        category: "Reception"
      },
      {
        startTime: "15:15",
        duration: "00:15",
        title: "First dance",
        description: "Couple's first dance as married",
        type: "reception",
        category: "Reception"
      },
      {
        startTime: "15:30",
        duration: "01:30",
        title: "Dinner service",
        description: "Dinner is served to guests",
        type: "reception",
        category: "Reception"
      },
      {
        startTime: "17:00",
        duration: "00:15",
        title: "Cake cutting",
        description: "Couple cuts the wedding cake",
        type: "reception",
        category: "Reception"
      },
      {
        startTime: "17:15",
        duration: "02:45",
        title: "Dancing",
        description: "Open dance floor",
        type: "reception",
        category: "Reception"
      },
      {
        startTime: "20:00",
        duration: "00:15",
        title: "Bouquet & garter toss",
        description: "Traditional tosses",
        type: "reception",
        category: "Reception"
      },
      {
        startTime: "21:30",
        duration: "00:15",
        title: "Send-off",
        description: "Guests line up for couple's departure",
        type: "reception",
        category: "Reception"
      }
    ],
    categories: [
      {
        name: "Getting Ready",
        description: "Preparation before the ceremony",
        order: 0
      },
      {
        name: "Ceremony",
        description: "The wedding ceremony",
        order: 1
      },
      {
        name: "Reception",
        description: "Celebration after the ceremony",
        order: 2
      }
    ]
  },
  {
    title: "Conference Schedule",
    events: [
      {
        startTime: "08:00",
        duration: "01:00",
        title: "Registration & Coffee",
        description: "Check in and enjoy morning refreshments",
        type: "break",
        category: "Day 1"
      },
      {
        startTime: "09:00",
        duration: "00:30",
        title: "Welcome Address",
        description: "Introduction and opening remarks",
        type: "presentation",
        category: "Day 1"
      },
      {
        startTime: "09:30",
        duration: "01:00",
        title: "Keynote Speaker",
        description: "Industry insights and trends",
        type: "presentation",
        category: "Day 1"
      },
      {
        startTime: "10:30",
        duration: "00:15",
        title: "Coffee Break",
        description: "Refreshments and networking",
        type: "break",
        category: "Day 1"
      },
      {
        startTime: "10:45",
        duration: "01:15",
        title: "Workshop Session 1",
        description: "Hands-on technical workshop",
        type: "workshop",
        category: "Day 1"
      },
      {
        startTime: "12:00",
        duration: "01:00",
        title: "Lunch",
        description: "Catered lunch service",
        type: "break",
        category: "Day 1"
      },
      {
        startTime: "13:00",
        duration: "01:00",
        title: "Panel Discussion",
        description: "Expert panel on industry challenges",
        type: "presentation",
        category: "Day 1"
      },
      {
        startTime: "14:00",
        duration: "01:30",
        title: "Workshop Session 2",
        description: "Advanced techniques workshop",
        type: "workshop",
        category: "Day 1"
      },
      {
        startTime: "15:30",
        duration: "00:15",
        title: "Afternoon Break",
        description: "Refreshments and networking",
        type: "break",
        category: "Day 1"
      },
      {
        startTime: "15:45",
        duration: "01:15",
        title: "Presentation Sessions",
        description: "Concurrent technical presentations",
        type: "presentation",
        category: "Day 1"
      },
      {
        startTime: "17:00",
        duration: "01:00",
        title: "Networking Reception",
        description: "Drinks and appetizers",
        type: "break",
        category: "Day 1"
      },
      {
        startTime: "08:30",
        duration: "00:30",
        title: "Morning Coffee",
        description: "Coffee and light breakfast",
        type: "break",
        category: "Day 2"
      },
      {
        startTime: "09:00",
        duration: "01:00",
        title: "Day 2 Keynote",
        description: "Future outlook and opportunities",
        type: "presentation",
        category: "Day 2"
      },
      {
        startTime: "10:00",
        duration: "01:30",
        title: "Workshop Session 3",
        description: "Interactive problem-solving workshop",
        type: "workshop",
        category: "Day 2"
      },
      {
        startTime: "11:30",
        duration: "01:00",
        title: "Lunch",
        description: "Catered lunch service",
        type: "break",
        category: "Day 2"
      },
      {
        startTime: "12:30",
        duration: "01:30",
        title: "Product Demos",
        description: "New product showcases",
        type: "presentation",
        category: "Day 2"
      },
      {
        startTime: "14:00",
        duration: "00:15",
        title: "Break",
        description: "Short refreshment break",
        type: "break",
        category: "Day 2"
      },
      {
        startTime: "14:15",
        duration: "01:45",
        title: "Breakout Sessions",
        description: "Specialized topic discussions",
        type: "workshop",
        category: "Day 2"
      },
      {
        startTime: "16:00",
        duration: "00:30",
        title: "Closing Remarks",
        description: "Conference summary and farewell",
        type: "presentation",
        category: "Day 2"
      }
    ],
    categories: [
      {
        name: "Day 1",
        description: "First day of the conference",
        order: 0
      },
      {
        name: "Day 2",
        description: "Second day of the conference",
        order: 1
      }
    ]
  },
  {
    title: "Birthday Party Timeline",
    events: [
      {
        startTime: "13:00",
        duration: "01:00",
        title: "Setup & Decoration",
        description: "Set up tables, decorations, and food stations",
        type: "setup",
        category: "Preparation"
      },
      {
        startTime: "14:00",
        duration: "00:30",
        title: "Guests Arrival",
        description: "Welcome guests as they arrive",
        type: "event",
        category: "Main Event"
      },
      {
        startTime: "14:30",
        duration: "00:30",
        title: "Welcome Activities",
        description: "Ice breakers and initial games",
        type: "activity",
        category: "Main Event"
      },
      {
        startTime: "15:00",
        duration: "00:30",
        title: "Food Service",
        description: "Serve food to guests",
        type: "food",
        category: "Main Event"
      },
      {
        startTime: "15:30",
        duration: "00:15",
        title: "Birthday Speech",
        description: "Short speech from host and well-wishes",
        type: "event",
        category: "Main Event"
      },
      {
        startTime: "15:45",
        duration: "00:15",
        title: "Cake Cutting",
        description: "Bring out the cake, sing happy birthday, and cut the cake",
        type: "event",
        category: "Main Event"
      },
      {
        startTime: "16:00",
        duration: "01:00",
        title: "Organized Games",
        description: "Party games and activities",
        type: "activity",
        category: "Main Event"
      },
      {
        startTime: "17:00",
        duration: "00:30",
        title: "Present Opening",
        description: "Birthday person opens gifts",
        type: "event",
        category: "Main Event"
      },
      {
        startTime: "17:30",
        duration: "00:30",
        title: "Free Time",
        description: "Unstructured time for socializing",
        type: "break",
        category: "Main Event"
      },
      {
        startTime: "18:00",
        duration: "00:15",
        title: "Party Favors",
        description: "Hand out party favors to guests",
        type: "event",
        category: "Wrap Up"
      },
      {
        startTime: "18:15",
        duration: "00:15",
        title: "Goodbyes",
        description: "Thank guests as they leave",
        type: "event",
        category: "Wrap Up"
      },
      {
        startTime: "18:30",
        duration: "00:30",
        title: "Cleanup",
        description: "Clean up venue after party",
        type: "cleanup",
        category: "Wrap Up"
      }
    ],
    categories: [
      {
        name: "Preparation",
        description: "Setup before guests arrive",
        order: 0
      },
      {
        name: "Main Event",
        description: "Main party activities",
        order: 1
      },
      {
        name: "Wrap Up",
        description: "Conclusion of the party",
        order: 2
      }
    ]
  }
];

async function addPublicTemplates() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    await client.connect();
    
    // Create a default user for public templates if it doesn't exist
    const checkUserResult = await client.query(`
      SELECT id FROM users WHERE username = 'system_templates';
    `);
    
    let userId;
    
    if (checkUserResult.rows.length === 0) {
      console.log('Creating system templates user...');
      const userResult = await client.query(`
        INSERT INTO users (username, password, created_at, updated_at) 
        VALUES ('system_templates', 'not_a_real_password', NOW(), NOW())
        RETURNING id;
      `);
      userId = userResult.rows[0].id;
    } else {
      userId = checkUserResult.rows[0].id;
    }
    
    console.log(`Using system user ID: ${userId}`);
    
    // Loop through and add each template
    for (const template of publicTemplates) {
      console.log(`Adding public template: ${template.title}`);
      
      // Check if template already exists
      const checkTemplateResult = await client.query(`
        SELECT id FROM templates 
        WHERE title = $1 AND user_id = $2;
      `, [template.title, userId]);
      
      if (checkTemplateResult.rows.length === 0) {
        await client.query(`
          INSERT INTO templates (title, events, categories, user_id, is_public, created_at, updated_at)
          VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW());
        `, [template.title, JSON.stringify(template.events), JSON.stringify(template.categories), userId]);
        console.log(`✅ Added template: ${template.title}`);
      } else {
        console.log(`⏭️ Template "${template.title}" already exists, updating...`);
        await client.query(`
          UPDATE templates 
          SET events = $1, categories = $2, is_public = TRUE, updated_at = NOW()
          WHERE title = $3 AND user_id = $4;
        `, [JSON.stringify(template.events), JSON.stringify(template.categories), template.title, userId]);
        console.log(`✅ Updated template: ${template.title}`);
      }
    }
    
    console.log('Public templates added successfully!');
  } catch (error) {
    console.error('Error adding public templates:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the function
addPublicTemplates().catch(console.error);