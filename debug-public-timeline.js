/**
 * Debug script for public timeline display issues
 * 
 * Run with: node debug-public-timeline.js <share-token>
 */

// Load environment variables
require('dotenv').config();

async function debugPublicTimeline() {
  try {
    // Get the share token from command line arguments
    const shareToken = process.argv[2];
    
    if (!shareToken) {
      console.error('Error: Please provide a share token as a command line argument');
      console.error('Usage: node debug-public-timeline.js <share-token>');
      process.exit(1);
    }
    
    // Import the database client
    const { createClient } = require('@libsql/client');
    
    // Get database URL from environment variables
    const dbUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    
    if (!dbUrl) {
      console.error('Error: DATABASE_URL is missing in environment variables');
      process.exit(1);
    }

    // Create database client
    const db = createClient({
      url: dbUrl,
      authToken: authToken
    });
    
    console.log('Successfully connected to the database at:', dbUrl);
    console.log(`Debugging public timeline with share token: ${shareToken}`);
    
    // Step 1: Check if the share token exists
    console.log('\nStep 1: Checking share token validity...');
    
    const shareResult = await db.execute({
      sql: `SELECT * FROM public_timeline_shares WHERE share_token = ? AND is_enabled = true`,
      args: [shareToken]
    });
    
    if (shareResult.rows.length === 0) {
      console.error('❌ Share token not found or is disabled');
      process.exit(1);
    }
    
    const share = shareResult.rows[0];
    console.log('✅ Share token is valid');
    console.log('Share details:', share);
    
    // Step 2: Check if the timeline exists
    console.log('\nStep 2: Checking timeline existence...');
    
    const timelineResult = await db.execute({
      sql: `SELECT * FROM timelines WHERE id = ?`,
      args: [share.timeline_id]
    });
    
    if (timelineResult.rows.length === 0) {
      console.error('❌ Timeline not found (ID:', share.timeline_id, ')');
      process.exit(1);
    }
    
    const timeline = timelineResult.rows[0];
    console.log('✅ Timeline found');
    console.log('Timeline details:', timeline);
    
    // Step 3: Check for timeline categories
    console.log('\nStep 3: Checking timeline categories...');
    
    const categoriesResult = await db.execute({
      sql: `SELECT * FROM timeline_categories WHERE timeline_id = ?`,
      args: [share.timeline_id]
    });
    
    console.log(`Found ${categoriesResult.rows.length} categories`);
    if (categoriesResult.rows.length > 0) {
      console.log('Sample categories:', categoriesResult.rows.slice(0, 3));
    }
    
    // Step 4: Check for timeline events
    console.log('\nStep 4: Checking timeline events...');
    
    const eventsResult = await db.execute({
      sql: `SELECT * FROM timeline_events WHERE timeline_id = ?`,
      args: [share.timeline_id]
    });
    
    if (eventsResult.rows.length === 0) {
      console.log('❌ No timeline events found');
    } else {
      console.log(`✅ Found ${eventsResult.rows.length} timeline events`);
      console.log('Sample events:', eventsResult.rows.slice(0, 3));
    }
    
    // Step 5: Check the routing of the API in routes.ts
    console.log('\nStep 5: Diagnose common issues');
    
    if (eventsResult.rows.length === 0) {
      console.log('- Timeline has no events. Please add events to the timeline.');
    }
    
    if (timeline.categories_enabled && categoriesResult.rows.length === 0) {
      console.log('- Timeline has categories enabled but no categories defined.');
    }
    
    console.log('\nRecommendations:');
    console.log('1. Ensure the server is properly processing the request to /api/public/timeline/:token');
    console.log('2. Check browser console for any errors when loading the public timeline page');
    console.log('3. Verify that the TimelineView component correctly renders when items are present');
    
    // Output raw API response format for reference
    console.log('\nExpected API response format:');
    console.log({
      timeline: {
        id: timeline.id,
        title: timeline.title,
        date: timeline.date,
        categoriesEnabled: timeline.categories_enabled
      },
      categories: categoriesResult.rows.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        order: cat.order
      })),
      events: eventsResult.rows.map(event => ({
        id: event.id,
        startTime: event.start_time,
        endTime: event.end_time,
        duration: event.duration,
        title: event.title,
        description: event.description,
        location: event.location,
        type: event.type,
        categoryId: event.category_id,
        order: event.order
      }))
    });
    
  } catch (error) {
    console.error('Error debugging public timeline:', error);
    process.exit(1);
  }
}

// Run the function
debugPublicTimeline().catch(console.error); 