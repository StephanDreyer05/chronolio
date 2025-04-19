import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "../db/index.js";
import { timelines, timelineCategories, timelineEvents, templates, userSettings, timelineImages, vendorTypes, vendors, timelineVendors, timelineEventVendors, publicTimelineShares, trialUsers, type SelectUser } from "../db/schema.js";
import { eq, and, inArray, or } from "drizzle-orm";
import multer from 'multer';
import { sql } from 'drizzle-orm';
import express from 'express';
import crypto from 'crypto';
import { sendFeatureSuggestionEmail, sendTimelineShareEmail } from './services/email.js';
import { requireAuth } from './auth.js';
import { Request, Response, NextFunction } from 'express';

// Define all required type interfaces
interface VendorType {
  id: number;
  userId: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  last_modified?: Date;
}

interface Vendor {
  id: number;
  userId: number;
  name: string;
  typeId: number | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  alternativePhone: string | null;
  address: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  last_modified?: Date;
}

interface TimelineVendor {
  id: number;
  timelineId: number;
  vendorId: number;
  createdAt?: Date;
  updatedAt?: Date;
  last_modified?: Date;
}

interface TimelineEventVendor {
  id: number;
  timelineEventId: number;
  vendorId: number;
  createdAt?: Date;
  updatedAt?: Date;
  last_modified?: Date;
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

export function registerRoutes(app: Express): Server {
  // Add global debugging for API requests
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    console.log(`[API Debug] ${req.method} ${req.url}`);
    console.log(`[API Debug] Auth status: ${req.isAuthenticated ? req.isAuthenticated() : 'isAuthenticated not defined'}`);
    console.log(`[API Debug] User: ${req.user ? JSON.stringify(req.user) : 'No user'}`);
    
    // Patch error handling to avoid hanging requests
    const originalSend = res.send;
    // @ts-ignore - Ignoring type error due to complex express types
    res.send = function(body) {
      console.log(`[API Debug] Response for ${req.method} ${req.url}: ${typeof body === 'string' ? body.substring(0, 100) : 'Non-string body'}`);
      return originalSend.call(this, body);
    };
    
    // Log any errors that occur in this request
    res.on('error', (err) => {
      console.error(`[API Debug] Error in ${req.method} ${req.url}:`, err);
    });
    
    next();
  });

  // Serve uploaded files statically
  // app.use('/uploads', express.static('uploads')); // Removed as we use memoryStorage now

  // Add fallback auth handler for all API routes
  app.use('/api', (req, res, next) => {
    // Continue if the user is authenticated or if this is a public route
    const publicRoutes = [
      '/api/login',
      '/api/register',
      '/api/health',
      '/api/health/database',
      '/api/health/detailed',
      '/api/reset-password',
      '/api/verify-email',
      '/api/validate-reset-token',
      '/api/trial-user',
      '/api/templates/public',
      '/api/templates/:id',  // Allow access to individual public templates
      '/api/public/timeline'  // Add this to handle all /api/public/timeline/* routes
    ];
    
    // Get the full URL path (including /api prefix)
    const fullPath = '/api' + req.path;
    
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log('[API Auth] User authenticated, proceeding with request');
      return next();
    }
    
    // Skip auth for public routes - check both with and without /api prefix
    if (publicRoutes.some(route => {
      // Exact match
      if (fullPath === route || req.path === route.replace('/api', '')) {
        return true;
      }
      
      // Check for routes with path parameters (e.g. /api/public/timeline/:token)
      if (route.includes(':') && (
        fullPath.startsWith(route.split(':')[0]) || 
        req.path.startsWith(route.replace('/api', '').split(':')[0])
      )) {
        return true;
      }
      
      return false;
    })) {
      console.log('[API Auth] Public route, no auth required:', req.path);
      return next();
    }
    
    // For specific routes that should return fallback data instead of 401
    const shouldProvideFallbackData = [
      '/api/settings',
      '/api/timelines',
      '/api/templates',
      '/api/vendors',
      '/api/vendor-types'
    ].some(route => req.path.startsWith(route));
    
    // Special case: if unauthenticated request for data comes in, provide fallback empty data
    if (shouldProvideFallbackData) {
      console.log('[API Auth] Returning fallback data for unauthenticated request to:', req.path);
      
      // For endpoints that return a collection
      if (req.path === '/api/settings') {
        return res.json({
          eventTypes: [],
          vendorTypes: [],
          defaultTimelineViewType: 'list',
          exportFooterText: '',
          theme: 'system'
        });
      }
      
      // For collection endpoints
      if (['/api/timelines', '/api/templates', '/api/vendors', '/api/vendor-types'].includes(req.path)) {
        return res.json([]);
      }
      
      // For individual timeline endpoints
      if (req.path.match(/^\/api\/timelines\/\d+$/)) {
        return res.status(404).json({ error: 'Timeline not found' });
      }
      
      // For timeline images
      if (req.path.startsWith('/api/timeline-images') || req.path.match(/^\/api\/timelines\/\d+\/images$/)) {
        return res.json([]);
      }
    }
    
    // Default case, return 401 for unauthorized access
    console.log('[API Auth] Unauthorized access attempt to:', req.path);
    return res.status(401).json({ error: 'Not authenticated' });
  });

  // Store trial user email (no authentication required)
  app.post('/api/trial-user', async (req, res) => {
    try {
      const { email, additionalInfo } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if email already exists
      const existingUser = await db
        .select()
        .from(trialUsers)
        .where(eq(trialUsers.email, email));

      if (existingUser.length > 0) {
        // If email exists, just update the additionalInfo and timestamps
        const [updatedUser] = await db
          .update(trialUsers)
          .set({
            additionalInfo: additionalInfo || {},
            updatedAt: new Date()
          })
          .where(eq(trialUsers.email, email))
          .returning();
        
        return res.status(200).json(updatedUser);
      }

      // Otherwise create a new trial user
      const [newUser] = await db
        .insert(trialUsers)
        .values({
          email,
          additionalInfo: additionalInfo || {},
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error storing trial user email:', error);
      res.status(500).json({ message: 'Failed to store email' });
    }
  });

  // Get user settings with default fallback
  app.get('/api/settings', async (req, res) => {
    try {
      console.log('[Settings Debug] GET /api/settings request received');
      console.log('[Settings Debug] isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'isAuthenticated not defined');
      console.log('[Settings Debug] User:', req.user ? JSON.stringify(req.user) : 'No user');
      
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.log('[Settings Debug] User not authenticated, returning 401');
        return res.status(401).json({ message: 'Not authenticated' });
      }

      console.log(`[Settings Debug] Looking for settings for user: ${req.user.id}`);
      
      try {
        // Check database connection first
        try {
          console.log('[Settings Debug] Checking database connection');
          const dbCheck = await db.execute(sql`SELECT 1 as check`);
          console.log('[Settings Debug] Database connection check result:', dbCheck.rows[0]);
        } catch (dbConnError) {
          console.error('[Settings Debug] Database connection error:', dbConnError);
          const errorMessage = dbConnError instanceof Error ? dbConnError.message : 'Unknown database connection error';
          throw new Error(`Database connection failed: ${errorMessage}`);
        }
        
        // Check if user_settings table exists
        try {
          console.log('[Settings Debug] Checking if user_settings table exists');
          const tableCheck = await db.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'user_settings'
            ) as exists
          `);
          console.log('[Settings Debug] user_settings table exists:', tableCheck.rows[0]?.exists);
          
          if (!tableCheck.rows[0]?.exists) {
            console.log('[Settings Debug] user_settings table does not exist, trying to create it');
            
            // Instead of trying to create the table (which might fail), 
            // we'll just return default settings
            throw new Error('user_settings table does not exist');
          }
        } catch (tableError) {
          console.error('[Settings Debug] Error checking for user_settings table:', tableError);
          const errorMessage = tableError instanceof Error ? tableError.message : 'Unknown table error';
          throw new Error(`Could not verify user_settings table: ${errorMessage}`);
        }
        
        console.log('[Settings Debug] Fetching settings from database');
        const [settings] = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, req.user!.id));

        console.log('[Settings Debug] Settings query result:', settings ? 'Found settings' : 'No settings found');

        // Check if vendor_types table exists
        try {
          console.log('[Settings Debug] Checking if vendor_types table exists');
          const tableCheck = await db.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'vendor_types'
            ) as exists
          `);
          console.log('[Settings Debug] vendor_types table exists:', tableCheck.rows[0]?.exists);
          
          if (!tableCheck.rows[0]?.exists) {
            console.log('[Settings Debug] vendor_types table does not exist, returning empty vendor types');
            
            // Return settings with empty vendor types array
            if (settings) {
              return res.json({
                ...settings,
                vendorTypes: []
              });
            }
            
            throw new Error('vendor_types table does not exist');
          }
        } catch (tableError) {
          console.error('[Settings Debug] Error checking for vendor_types table:', tableError);
          const errorMessage = tableError instanceof Error ? tableError.message : 'Unknown table error';
          
          // If settings exists but checking vendor_types fails, still return the settings
          if (settings) {
            return res.json({
              ...settings,
              vendorTypes: []
            });
          }
          
          throw new Error(`Could not verify vendor_types table: ${errorMessage}`);
        }

        // Get vendor types for the user
        console.log('[Settings Debug] Fetching vendor types');
        const userVendorTypes = await db
          .select()
          .from(vendorTypes)
          .where(eq(vendorTypes.userId, req.user!.id));

        console.log('[Settings Debug] Vendor types found:', userVendorTypes.length);

        if (!settings) {
          // Create default settings for new user
          console.log('[Settings Debug] Creating default settings for new user');
          const defaultSettings = {
            userId: req.user!.id,
            eventTypes: [
              { type: "Wedding", color: "#FF69B4" },
              { type: "Birthday", color: "#4169E1" },
              { type: "Corporate Event", color: "#32CD32" },
              { type: "Conference", color: "#FFD700" },
              { type: "Workshop", color: "#9370DB" },
              { type: "Party", color: "#FF7F50" },
              { type: "Other", color: "#808080" }
            ],
            timeIncrement: 15,
            durationIncrement: 15,
            defaultEventDuration: 60,
            defaultStartTime: "09:00",
            theme: "system",
            hidePastEvents: false,
            showCategories: true,
            defaultCalendarView: "month",
            defaultSorting: "date-asc",
            defaultTimelineViewType: "list",
            exportFooterText: ""
          };

          // If db insert fails, at least return default settings to the client
          try {
            const [newSettings] = await db
              .insert(userSettings)
              .values(defaultSettings)
              .returning();

            console.log('[Settings Debug] Successfully created default settings');

            // Create default vendor types
            const defaultVendorTypes = [
              { userId: req.user!.id, name: "Venue" },
              { userId: req.user!.id, name: "Caterer" },
              { userId: req.user!.id, name: "Florist" },
              { userId: req.user!.id, name: "Photographer" },
              { userId: req.user!.id, name: "Videographer" },
              { userId: req.user!.id, name: "DJ/Band" },
              { userId: req.user!.id, name: "Decorator" },
              { userId: req.user!.id, name: "Other" }
            ];

            // Define proper type for vendor types
            let createdVendorTypes: VendorType[] = [];
            try {
              createdVendorTypes = await db
                .insert(vendorTypes)
                .values(defaultVendorTypes)
                .returning();
              console.log('[Settings Debug] Successfully created default vendor types');
            } catch (vendorTypeErr) {
              console.error('[Settings Debug] Error creating default vendor types:', vendorTypeErr);
            }

            return res.json({
              ...newSettings,
              vendorTypes: createdVendorTypes
            });
          } catch (createErr) {
            console.error('[Settings Debug] Error creating settings:', createErr);
            // Return default settings even if DB insert fails
            return res.json({
              ...defaultSettings,
              vendorTypes: []
            });
          }
        }

        console.log('[Settings Debug] Successfully returning settings');
        res.json({
          ...settings,
          vendorTypes: userVendorTypes
        });
      } catch (dbError) {
        console.error('[Settings Debug] Database error:', dbError);
        
        // Provide default settings as a fallback
        const defaultSettings = {
          userId: req.user ? req.user.id : 0,
          eventTypes: [
            { type: "Wedding", color: "#FF69B4" },
            { type: "Birthday", color: "#4169E1" },
            { type: "Corporate Event", color: "#32CD32" },
            { type: "Conference", color: "#FFD700" },
            { type: "Workshop", color: "#9370DB" },
            { type: "Party", color: "#FF7F50" },
            { type: "Other", color: "#808080" }
          ],
          timeIncrement: 15,
          durationIncrement: 15,
          defaultEventDuration: 60,
          defaultStartTime: "09:00",
          theme: "system",
          hidePastEvents: false,
          showCategories: true,
          defaultCalendarView: "month",
          defaultSorting: "date-asc",
          defaultTimelineViewType: "list",
          exportFooterText: "",
          vendorTypes: []
        };
        
        // Return a graceful error with default settings
        console.log('[Settings Debug] Returning default settings due to DB error');
        return res.json(defaultSettings);
      }
    } catch (error) {
      console.error('[Settings Debug] Unexpected error:', error);
      
      // Return a useful error message instead of a 500
      return res.status(500).json({ 
        message: 'Failed to fetch settings', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update user settings
  app.put('/api/settings', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const [settings] = await db
        .update(userSettings)
        .set({
          ...req.body,
          updatedAt: new Date(),
          last_modified: new Date()
        })
        .where(eq(userSettings.userId, req.user!.id))
        .returning();

      res.json(settings);
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Reset user settings to default
  app.delete('/api/settings', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Delete existing settings
      await db.delete(userSettings)
        .where(eq(userSettings.userId, req.user!.id));

      // Create default settings
      const defaultSettings = {
        userId: req.user!.id,
        eventTypes: [
          { type: "Wedding", color: "#FF69B4" },
          { type: "Birthday", color: "#4169E1" },
          { type: "Corporate Event", color: "#32CD32" },
          { type: "Conference", color: "#FFD700" },
          { type: "Workshop", color: "#9370DB" },
          { type: "Party", color: "#FF7F50" },
          { type: "Other", color: "#808080" }
        ],
        timeIncrement: 15,
        durationIncrement: 15,
        defaultEventDuration: 60,
        defaultStartTime: "09:00",
        theme: "system",
        hidePastEvents: false,
        showCategories: true,
        defaultCalendarView: "month",
        defaultSorting: "date-asc",
        defaultTimelineViewType: "list",
        exportFooterText: ""
      };

      const [newSettings] = await db
        .insert(userSettings)
        .values(defaultSettings)
        .returning();

      res.json(newSettings);
    } catch (error) {
      console.error('Error resetting user settings:', error);
      res.status(500).json({ message: 'Failed to reset settings' });
    }
  });

  // Create a new timeline
  app.post("/api/timelines", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      console.log('Creating timeline with data:', req.body);

      const now = new Date();
      // Create timeline first with user association and custom field values
      const [timeline] = await db.insert(timelines).values({
        userId: req.user!.id,
        title: req.body.title,
        date: req.body.date,
        type: req.body.type,
        location: req.body.location,
        categoriesEnabled: req.body.categoriesEnabled,
        vendorsEnabled: req.body.vendorsEnabled,
        customFieldValues: req.body.customFieldValues || {},
        last_modified: now,
        createdAt: now,
        updatedAt: now,
      }).returning();

      // Create categories if enabled
      let categoryNameToId = new Map();
      if (req.body.categoriesEnabled && req.body.categories?.length) {
        const insertedCategories = await db.insert(timelineCategories)
          .values(
            req.body.categories.map((category: any, index: number) => ({
              timelineId: timeline.id,
              name: category.name,
              description: category.description,
              order: index,
            }))
          )
          .returning();

        insertedCategories.forEach(cat => {
          categoryNameToId.set(cat.name, cat.id);
        });
      }

      // Create events
      if (req.body.events?.length) {
        await db.insert(timelineEvents)
          .values(
            req.body.events.map((event: any, index: number) => {
              // Determine the category ID using multiple strategies:
              
              // 1. If event has a direct categoryId that's a number, use it
              if (event.categoryId && !isNaN(parseInt(event.categoryId.toString()))) {
                return {
                  timelineId: timeline.id,
                  categoryId: parseInt(event.categoryId.toString()),
                  startTime: event.startTime,
                  endTime: event.endTime,
                  duration: event.duration,
                  title: event.title,
                  description: event.description || '',
                  location: event.location || '',
                  type: event.type,
                  order: index,
                };
              }
              
              // 2. If event has a category name and we can map it to a categoryId
              if (event.category && categoryNameToId.has(event.category)) {
                return {
                  timelineId: timeline.id,
                  categoryId: categoryNameToId.get(event.category),
                  startTime: event.startTime,
                  endTime: event.endTime,
                  duration: event.duration,
                  title: event.title,
                  description: event.description || '',
                  location: event.location || '',
                  type: event.type,
                  order: index,
                };
              }
              
              // 3. Otherwise use null for the categoryId
              return {
                timelineId: timeline.id,
                categoryId: null,
                startTime: event.startTime,
                endTime: event.endTime,
                duration: event.duration,
                title: event.title,
                description: event.description || '',
                location: event.location || '',
                type: event.type,
                order: index,
              };
            })
          )
          .returning();
      }

      const result = await db.query.timelines.findFirst({
        where: eq(timelines.id, timeline.id),
        with: {
          events: {
            orderBy: (timelineEvents, { asc }) => [asc(timelineEvents.order)],
          },
          categories: {
            orderBy: (timelineCategories, { asc }) => [asc(timelineCategories.order)],
          },
        },
      });

      res.json(result);
    } catch (error) {
      console.error('Error creating timeline:', error);
      res.status(500).json({ message: 'Failed to create timeline' });
    }
  });

  // Get all timelines (only for authenticated user)
  app.get('/api/timelines', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const result = await db.query.timelines.findMany({
        where: eq(timelines.userId, req.user!.id),
        orderBy: (timelines, { desc }) => [desc(timelines.createdAt)],
        with: {
          events: {
            orderBy: (timelineEvents, { asc }) => [asc(timelineEvents.order)],
          },
          categories: {
            orderBy: (timelineCategories, { asc }) => [asc(timelineCategories.order)],
          },
        },
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching timelines:', error);
      res.status(500).json({ message: 'Failed to fetch timelines' });
    }
  });

  // Get all templates (only for authenticated user)
  app.get('/api/templates', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const result = await db
        .select()
        .from(templates)
        .where(eq(templates.userId, req.user!.id))
        .orderBy(templates.createdAt);

      res.json(result);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  });
  
  // Get public templates with pagination
  app.get('/api/templates/public', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const [templateResults, total] = await Promise.all([
        db
          .select()
          .from(templates)
          .where(eq(templates.isPublic, true))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(templates)
          .where(eq(templates.isPublic, true))
      ]);

      res.json({
        templates: templateResults,
        pagination: {
          total: total[0].count,
          page,
          limit,
          totalPages: Math.ceil(total[0].count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching public templates:', error);
      res.status(500).json({ message: 'Failed to fetch public templates' });
    }
  });

  // Get a single template
  app.get('/api/templates/:id', async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      // Check if the user is authenticated
      const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
      
      // For authenticated users, we check both user's templates and public templates
      if (isAuthenticated) {
        const [template] = await db
          .select()
          .from(templates)
          .where(and(
            eq(templates.id, templateId),
            or(
              eq(templates.userId, req.user!.id),
              eq(templates.isPublic, true)
            )
          ));

        if (!template) {
          return res.status(404).json({ message: 'Template not found' });
        }

        return res.json(template);
      } else {
        // For unauthenticated users, we only check public templates
        const [template] = await db
          .select()
          .from(templates)
          .where(and(
            eq(templates.id, templateId),
            eq(templates.isPublic, true)
          ));

        if (!template) {
          return res.status(404).json({ message: 'Template not found' });
        }

        return res.json(template);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ message: 'Failed to fetch template' });
    }
  });

  // Create a new template (with user association)
  app.post('/api/templates', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const [result] = await db.insert(templates).values({
        userId: req.user!.id,
        title: req.body.title,
        events: req.body.events,
        categories: req.body.categories,
        last_modified: new Date()
      }).returning();

      res.json(result);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ message: 'Failed to create template' });
    }
  });

  // Update a template (verify ownership)
  app.put('/api/templates/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const templateId = parseInt(req.params.id);

      // Verify ownership
      const [template] = await db
        .select()
        .from(templates)
        .where(and(
          eq(templates.id, templateId),
          eq(templates.userId, req.user!.id)
        ));

      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      // Get the current template data for comparison
      const currentTemplate = await db
        .select()
        .from(templates)
        .where(eq(templates.id, templateId))
        .then(rows => rows[0]);

      // Update template with new data
      const [result] = await db
        .update(templates)
        .set({
          title: req.body.title,
          events: req.body.events,
          categories: req.body.categories,
          updatedAt: new Date(),
          last_modified: new Date()
        })
        .where(eq(templates.id, templateId))
        .returning();

      res.json(result);
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ message: 'Failed to update template' });
    }
  });

  // Delete a template (verify ownership)
  app.delete('/api/templates/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const templateId = parseInt(req.params.id);

      // Verify ownership and delete in a single query using AND condition
      const result = await db
        .delete(templates)
        .where(and(
          eq(templates.id, templateId),
          eq(templates.userId, req.user!.id)
        ))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Template not found or not authorized' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ message: 'Failed to delete template' });
    }
  });

  // Get a single timeline with its events, categories, and images
  app.get('/api/timelines/:id', async (req, res) => {
    try {
      const result = await db.query.timelines.findFirst({
        where: eq(timelines.id, parseInt(req.params.id)),
        with: {
          events: {
            orderBy: (timelineEvents, { asc }) => [asc(timelineEvents.order)],
          },
          categories: {
            orderBy: (timelineCategories, { asc }) => [asc(timelineCategories.order)],
          },
          images: {
            orderBy: (timelineImages, { asc }) => [asc(timelineImages.order)],
          },
          vendors: {
            with: {
              vendor: true
            }
          }
        },
      });

      if (!result) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ message: 'Failed to fetch timeline' });
    }
  });
  // Define interface for vendor data
  interface VendorData {
    name: string;
    typeId?: number | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    alternativePhone?: string | null;
    address?: string | null;
    notes?: string | null;
  }

  // Define interface for timeline update data
  interface TimelineUpdateData {
    title: string;
    date: string;
    type: string;
    location: string | null;
    categoriesEnabled: boolean;
    vendorsEnabled: boolean;
    customFieldValues: Record<string, any>;
  }

  // Update timeline endpoint
  app.put('/api/timelines/:id', async (req, res) => {
    try {
      console.log('Updating timeline with data:', req.body);
      const timelineId = parseInt(req.params.id);

      // Update timeline with custom field values and last_modified timestamp
      await db.update(timelines)
        .set({
          title: req.body.title,
          date: req.body.date,
          type: req.body.type,
          location: req.body.location,
          categoriesEnabled: req.body.categoriesEnabled,
          vendorsEnabled: req.body.vendorsEnabled,
          customFieldValues: req.body.customFieldValues || {},
          last_modified: new Date(), // Ensure last_modified is updated
          updatedAt: new Date(),
        })
        .where(eq(timelines.id, timelineId));

      // Handle categories - create a name to ID mapping
      // Either from the new categories being created, or from existing categories if we're just disabling
      let categoryNameToId = new Map<string, number>();

      // Only delete existing categories if new ones are provided (not when just disabling)
      if (req.body.categories?.length) {
        await db.delete(timelineCategories).where(eq(timelineCategories.timelineId, timelineId));
        // Create new categories
        const insertedCategories = await db.insert(timelineCategories)
          .values(
            req.body.categories.map((category: any, index: number) => ({
              timelineId: timelineId,
              name: category.name,
              description: category.description,
              order: index,
            }))
          )
          .returning();

        // Update events with new category IDs
        insertedCategories.forEach(cat => {
          categoryNameToId.set(cat.name, cat.id);
        });
      }

      // Get existing event vendor assignments before deleting events
      const existingEventVendors = await db
        .select({
          timelineEvents,
          timelineEventVendors
        })
        .from(timelineEvents)
        .leftJoin(timelineEventVendors, eq(timelineEventVendors.timelineEventId, timelineEvents.id))
        .where(eq(timelineEvents.timelineId, timelineId));

      // Create mapping of old event titles to vendor IDs for restoration
      const eventVendorMap = new Map();
      existingEventVendors.forEach(ev => {
        if (ev.timelineEventVendors) {
          const key = `${ev.timelineEvents.title}-${ev.timelineEvents.startTime}`;
          if (!eventVendorMap.has(key)) {
            eventVendorMap.set(key, []);
          }
          eventVendorMap.get(key).push(ev.timelineEventVendors.vendorId);
        }
      });

      // Delete and recreate events
      await db.delete(timelineEvents).where(eq(timelineEvents.timelineId, timelineId));

      if (req.body.events?.length) {
        // Insert new events
        const newEvents = await db.insert(timelineEvents)
          .values(
            req.body.events.map((event: any, index: number) => {
              // Determine the category ID using multiple strategies:
              
              // 1. If event has a direct categoryId that's a number, use it
              if (event.categoryId && !isNaN(parseInt(event.categoryId.toString()))) {
                return {
                  timelineId: timelineId,
                  categoryId: parseInt(event.categoryId.toString()),
                  startTime: event.startTime,
                  endTime: event.endTime,
                  duration: event.duration,
                  title: event.title,
                  description: event.description || '',
                  location: event.location || '',
                  type: event.type,
                  order: index,
                };
              }
              
              // 2. If event has a category name and we can map it to a categoryId
              if (event.category && categoryNameToId.has(event.category)) {
                return {
                  timelineId: timelineId,
                  categoryId: categoryNameToId.get(event.category),
                  startTime: event.startTime,
                  endTime: event.endTime,
                  duration: event.duration,
                  title: event.title,
                  description: event.description || '',
                  location: event.location || '',
                  type: event.type,
                  order: index,
                };
              }
              
              // 3. Otherwise use null for the categoryId
              return {
                timelineId: timelineId,
                categoryId: null,
                startTime: event.startTime,
                endTime: event.endTime,
                duration: event.duration,
                title: event.title,
                description: event.description || '',
                location: event.location || '',
                type: event.type,
                order: index,
              };
            })
          )
          .returning();

        // Restore vendor assignments for each event
        interface VendorAssignment {
          timelineEventId: number;
          vendorId: number;
        }
        const vendorAssignments: VendorAssignment[] = [];
        newEvents.forEach((newEvent, index) => {
          const originalEvent = req.body.events[index];
          const key = `${originalEvent.title}-${originalEvent.startTime}`;
          const vendorIds = eventVendorMap.get(key);

          if (vendorIds && Array.isArray(vendorIds)) {
            vendorIds.forEach(vendorId => {
              if (vendorId) {
                vendorAssignments.push({
                  timelineEventId: newEvent.id,
                  vendorId: vendorId
                });
              }
            });
          }
        });

        // Insert vendor assignments if any exist
        if (vendorAssignments.length > 0) {
          console.log('Restoring vendor assignments:', vendorAssignments);
          await db.insert(timelineEventVendors)
            .values(vendorAssignments)
            .returning();
        }
      }

      const result = await db.query.timelines.findFirst({
        where: eq(timelines.id, timelineId),
        with: {
          events: {
            orderBy: (timelineEvents, { asc }) => [asc(timelineEvents.order)],
          },
          categories: {
            orderBy: (timelineCategories, { asc }) => [asc(timelineCategories.order)],
          },
        },
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error updating timeline:', error);
      res.status(500).json({ message: 'Failed to update timeline', error: error.message });
    }
  });

  // Delete a timeline
  app.delete('/api/timelines/:id', async (req, res) => {
    try {
      const timelineId = parseInt(req.params.id);
      await db.delete(timelineEvents).where(eq(timelineEvents.timelineId, timelineId));
      await db.delete(timelineCategories).where(eq(timelineCategories.timelineId, timelineId));
      await db.delete(timelines).where(eq(timelines.id, timelineId));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting timeline:', error);
      res.status(500).json({ message: 'Failed to delete timeline' });
    }
  });

  // Get images for a timeline
  app.get('/api/timelines/:id/images', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);
      const images = await db
        .select()
        .from(timelineImages)
        .where(eq(timelineImages.timelineId, timelineId))
        .orderBy(timelineImages.order);

      res.json(images);
    } catch (error) {
      console.error('Error fetching timeline images:', error);
      res.status(500).json({ message: 'Failed to fetch timeline images' });
    }
  });

  // Update the image upload endpoint to correctly handle image uploads and S3 storage
  app.post('/api/timelines/:id/images', upload.array('images', 10), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);
      const files = req.files as Express.Multer.File[];
      const captions = req.body.captions ? JSON.parse(req.body.captions) : {};

      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      // Check current number of images
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(timelineImages)
        .where(eq(timelineImages.timelineId, timelineId));

      const remainingSlots = 10 - parseInt(count.toString());

      if (remainingSlots <= 0) {
        return res.status(400).json({ message: 'Maximum limit of 10 images reached' });
      }

      // Only process up to the remaining slots
      const filesToProcess = files.slice(0, remainingSlots);

      console.log('Files received in memory:', filesToProcess.map(f => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })));

      // Import the S3 service
      const s3Service = (await import('./services/s3Service.js')).default;
      
      // Upload each file to S3 and store results
      const uploadResults = await Promise.all(
        filesToProcess.map(async (file, index) => {
          // Generate a unique S3 key
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
          const key = `timelines/${timelineId}/images/${timestamp}-${randomString}-${sanitizedFileName}`;
          
          try {
            // Upload the file to S3
            const uploadResult = await s3Service.uploadFile(
              file.buffer,
              key,
              file.mimetype
            );
            
            if (!uploadResult.success) {
              console.warn('S3 upload failed, using fallback storage:', uploadResult.error);
              return {
                imageUrl: `memory-storage-placeholder-${sanitizedFileName}`,
                caption: captions[file.originalname] || '',
                order: parseInt(count.toString()) + index,
                uploadFailed: true
              };
            }
            
            return {
              imageUrl: key, // Store the S3 key as the image URL
              caption: captions[file.originalname] || '',
              order: parseInt(count.toString()) + index,
              uploadFailed: false
            };
          } catch (error) {
            console.error('Error during file upload:', error);
            return {
              imageUrl: `memory-storage-placeholder-${sanitizedFileName}`,
              caption: captions[file.originalname] || '',
              order: parseInt(count.toString()) + index,
              uploadFailed: true
            };
          }
        })
      );
      
      // Insert the results into the database
      const insertedImages = await db.insert(timelineImages)
        .values(
          uploadResults.map(result => ({
            timelineId,
            imageUrl: result.imageUrl,
            caption: result.caption,
            order: result.order
          }))
        )
        .returning();

      // Add a flag to indicate which uploads used fallback storage
      const responseImages = insertedImages.map((img, index) => ({
        ...img,
        usingFallbackStorage: uploadResults[index].uploadFailed
      }));

      res.json(responseImages);
    } catch (error) {
      console.error('Error uploading timeline images:', error);
      res.status(500).json({ message: 'Failed to upload timeline images' });
    }
  });

  // Delete an image
  app.delete('/api/timelines/:timelineId/images/:imageId', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const imageId = parseInt(req.params.imageId);
      const [deletedImage] = await db
        .delete(timelineImages)
        .where(eq(timelineImages.id, imageId))
        .returning();

      // In a production environment, you would also delete the file from your cloud storage
      // For example: await s3.deleteObject({ Bucket: 'your-bucket', Key: 'your-key' }).promise();

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting timeline image:', error);
      res.status(500).json({ message: 'Failed to delete timeline image' });
    }
  });

  // Update image captions
  app.put('/api/timelines/:timelineId/images/:imageId', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const imageId = parseInt(req.params.imageId);
      const { caption } = req.body;

      const [updatedImage] = await db
        .update(timelineImages)
        .set({ caption, updatedAt: new Date(), last_modified: new Date() })
        .where(eq(timelineImages.id, imageId))
        .returning();

      res.json(updatedImage);
    } catch (error) {
      console.error('Error updating timeline image:', error);
      res.status(500).json({ message: 'Failed to update timeline image' });
    }
  });

  // Add endpoint for reordering images
  app.put('/api/timelines/:timelineId/images/reorder', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.timelineId);
      console.log(`[Reorder Debug] Parsed timelineId: ${timelineId} (type: ${typeof timelineId})`);
      if (isNaN(timelineId)) {
        return res.status(400).json({ message: 'Invalid timeline ID' });
      }

      const { imageIds } = req.body;
      
      // --- TEMPORARY DEBUGGING: Comment out DB logic --- 
      console.log(`[Reorder Debug] Received imageIds: ${JSON.stringify(imageIds)}`);
      console.log(`[Reorder Debug] Skipping database update for now.`);
      return res.json({ message: "Debug: Skipped DB update", timelineId: timelineId, receivedIds: imageIds });
      /* --- Original Code Start ---
      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ message: 'Invalid or empty image ID array' });
      }

      // Update each image individually with a raw SQL query to avoid issues with the "order" keyword
      for (let i = 0; i < imageIds.length; i++) {
        try {
          const currentImageId = imageIds[i]; // Use a variable for clarity
          const orderIndex = i;
          
          // Add detailed logging and stricter checks
          console.log(`[Reorder Debug] Iteration ${i}: timelineId=${timelineId} (type: ${typeof timelineId}), imageId=${currentImageId} (type: ${typeof currentImageId}), order=${orderIndex} (type: ${typeof orderIndex})`);

          if (isNaN(timelineId) || typeof timelineId !== 'number') {
            console.error(`[Reorder Error] Invalid timelineId before query: ${timelineId}`);
            return res.status(500).json({ message: 'Internal error: Invalid timelineId' });
          }
          if (isNaN(currentImageId) || typeof currentImageId !== 'number') {
            console.error(`[Reorder Error] Invalid imageId before query: ${currentImageId}`);
            return res.status(500).json({ message: 'Internal error: Invalid imageId' });
          }
          if (isNaN(orderIndex) || typeof orderIndex !== 'number') {
            console.error(`[Reorder Error] Invalid orderIndex before query: ${orderIndex}`);
            return res.status(500).json({ message: 'Internal error: Invalid orderIndex' });
          }

          // Use raw SQL with explicit quoting for the "order" column name
          await db.execute(sql`
            UPDATE "timelineImages" 
            SET "order" = ${orderIndex} 
            WHERE "id" = ${currentImageId} 
            AND "timelineId" = ${timelineId}
          `);
        } catch (err) {
          // Log parameters again on error
          console.error(`[Reorder DB Error] Failed on Iteration ${i}: timelineId=${timelineId}, imageId=${imageIds[i]}, order=${i}`);
          console.error(`Error updating image order:`, err);
          return res.status(500).json({ message: 'Failed to update timeline image' });
        }
      }

      // Get the updated images
      const updatedImages = await db
        .select()
        .from(timelineImages)
        .where(eq(timelineImages.timelineId, timelineId))
        .orderBy(timelineImages.order);

      res.json(updatedImages);
      */ // --- Original Code End ---
    } catch (error) {
      // Log timelineId in the outer catch block as well
      // const timelineId = parseInt(req.params.timelineId); // timelineId might not be defined here if error is early
      console.error(`[Reorder Outer Catch] Error occurred during image reorder processing.`); // Simplified log
      console.error('Error reordering timeline images:', error);
      res.status(500).json({ message: 'Failed to reorder images' });
    }
  });
  
  // Add endpoint to register S3 keys that are already uploaded
  app.post('/api/timelines/:timelineId/images/register-s3', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.timelineId);
      const { s3Keys, filenames } = req.body;

      if (!s3Keys || !Array.isArray(s3Keys) || s3Keys.length === 0) {
        return res.status(400).json({ message: 'No S3 keys provided' });
      }

      // Check current number of images
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(timelineImages)
        .where(eq(timelineImages.timelineId, timelineId));

      const remainingSlots = 10 - parseInt(count.toString());

      if (remainingSlots <= 0) {
        return res.status(400).json({ message: 'Maximum limit of 10 images reached' });
      }

      // Only process up to the remaining slots
      const keysToProcess = s3Keys.slice(0, remainingSlots);
      
      console.log('Registering S3 keys:', keysToProcess);
      
      // Prepare values for database insertion
      const imagesToInsert = keysToProcess.map((key, index) => ({
        timelineId,
        imageUrl: key,
        caption: '', // Default empty caption
        order: parseInt(count.toString()) + index
      }));
      
      // Insert the keys into the database
      const insertedImages = await db.insert(timelineImages)
        .values(imagesToInsert)
        .returning();

      res.json(insertedImages);
    } catch (error) {
      console.error('Error registering S3 images:', error);
      res.status(500).json({ message: 'Failed to register S3 images' });
    }
  });

  // Duplicate a timeline
  app.post('/api/timelines/:id/duplicate', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);
      const now = new Date();

      // Get the original timeline with all its data
      const originalTimeline = await db.query.timelines.findFirst({
        where: eq(timelines.id, timelineId),
        with: {
          events: true,
          categories: true,
        },
      });

      if (!originalTimeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      // Create a new timeline with copied data
      const [newTimeline] = await db.insert(timelines).values({
        userId: req.user!.id,
        title: `${originalTimeline.title} (Copy)`,
        date: originalTimeline.date,
        type: originalTimeline.type,
        location: originalTimeline.location,
        categoriesEnabled: originalTimeline.categoriesEnabled,
        customFieldValues: originalTimeline.customFieldValues,
        last_modified: now, // Set last_modified for new copy
        updatedAt: now,
        createdAt: now
      }).returning();

      // Create categories and store mapping of old to new IDs
      const categoryMapping = new Map();
      if (originalTimeline.categories?.length) {
        const newCategories = await db.insert(timelineCategories)
          .values(
            originalTimeline.categories.map((category) => ({
              timelineId: newTimeline.id,
              name: category.name,
              description: category.description,
              order: category.order,
            }))
          )
          .returning();

        originalTimeline.categories.forEach((oldCat, index) => {
          categoryMapping.set(oldCat.id, newCategories[index].id);
        });
      }

      // Create events with updated category references
      if (originalTimeline.events?.length) {
        await db.insert(timelineEvents)
          .values(
            originalTimeline.events.map((event) => ({
              timelineId: newTimeline.id,
              categoryId: event.categoryId ? categoryMapping.get(event.categoryId) : null,
              startTime: event.startTime,
              endTime: event.endTime,
              duration: event.duration,
              title: event.title,
              description: event.description,
              location: event.location,
              type: event.type,
              order: event.order,
            }))
          );
      }

      // Return the new timeline with all its data
      const result = await db.query.timelines.findFirst({
        where: eq(timelines.id, newTimeline.id),
        with: {
          events: {
            orderBy: (timelineEvents, { asc }) => [asc(timelineEvents.order)],
          },
          categories: {
            orderBy: (timelineCategories, { asc }) => [asc(timelineCategories.order)],
          },
        },      });

      res.json(result);
    } catch (error) {
      console.error('Error duplicating timeline:', error);
      res.status(500).json({ message: 'Failed to duplicate timeline' });
    }
  });

  // Vendor Types API
  app.get('/api/vendor-types', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userVendorTypes = await db
        .select()
        .from(vendorTypes)
        .where(eq(vendorTypes.userId, req.user!.id));

      res.json(userVendorTypes);
    } catch (error) {
      console.error('Error fetching vendor types:', error);
      res.status(500).json({ message: 'Failed to fetch vendor types' });
    }
  });

  app.post('/api/vendor-types', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Vendor type name is required' });
      }

      const [newVendorType] = await db
        .insert(vendorTypes)
        .values({
          userId: req.user!.id,
          name,
          last_modified: new Date()
        })
        .returning();

      res.status(201).json(newVendorType);
    } catch (error) {
      console.error('Error creating vendor type:', error);
      res.status(500).json({ message: 'Failed to create vendor type' });
    }
  });

  // Update vendor type name
  app.put('/api/vendor-types/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Vendor type name is required' });
      }

      // Check if vendor type exists and belongs to user
      const [vendorType] = await db
        .select()
        .from(vendorTypes)
        .where(and(
          eq(vendorTypes.id, parseInt(id)),
          eq(vendorTypes.userId, req.user!.id)
        ));

      if (!vendorType) {
        return res.status(404).json({ message: 'Vendor type not found' });
      }

      // Update vendor type name
      const [updatedVendorType] = await db
        .update(vendorTypes)
        .set({
          name: name.trim(),
          updatedAt: new Date(),
          last_modified: new Date()
        })
        .where(eq(vendorTypes.id, parseInt(id)))
        .returning();

      // Ensure proper headers and response
      res.setHeader('Content-Type', 'application/json');
      res.json(updatedVendorType);
    } catch (error) {
      console.error('Error updating vendor type:', error);
      res.status(500).json({ message: 'Failed to update vendor type' });
    }
  });

  // Update vendor type custom fields
  app.put('/api/vendor-types/:id/custom-fields', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const vendorTypeId = parseInt(req.params.id);
      const { customFields } = req.body;

      // Validate that the vendor type belongs to the user
      const [vendorType] = await db
        .select()
        .from(vendorTypes)
        .where(and(
          eq(vendorTypes.id, vendorTypeId),
          eq(vendorTypes.userId, req.user!.id)
        ));

      if (!vendorType) {
        return res.status(404).json({ message: 'Vendor type not found' });
      }

      // Update the vendor type with new custom fields
      const [updatedVendorType] = await db
        .update(vendorTypes)
        .set({
          customFields,
          updatedAt: new Date(),
          last_modified: new Date()
        })
        .where(eq(vendorTypes.id, vendorTypeId))
        .returning();

      // Set proper headers and response
      res.setHeader('Content-Type', 'application/json');
      res.json(updatedVendorType);
    } catch (error) {
      console.error('Error updating vendor type custom fields:', error);
      res.status(500).json({ message: 'Failed to update vendor type custom fields' });
    }
  });

  // Delete vendor type
  app.delete('/api/vendor-types/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const vendorTypeId = parseInt(req.params.id);

      // Check if vendor type exists and belongs to the user
      const [vendorType] = await db
        .select()
        .from(vendorTypes)
        .where(and(
          eq(vendorTypes.id, vendorTypeId),
          eq(vendorTypes.userId, req.user!.id)
        ));

      if (!vendorType) {
        return res.status(404).json({ message: 'Vendor type not found' });
      }

      // Delete the vendor type
      await db
        .delete(vendorTypes)
        .where(eq(vendorTypes.id, vendorTypeId));

      res.status(204).end();
    } catch (error) {
      console.error('Error deleting vendor type:', error);
      res.status(500).json({ message: 'Failed to delete vendor type' });
    }
  });

  // Reorder vendor type custom fields
  app.put('/api/vendor-types/:id/custom-fields/reorder', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const vendorTypeId = parseInt(req.params.id);
      const { customFields } = req.body;

      // Validate that the vendor type belongs to the user
      const [vendorType] = await db
        .select()
        .from(vendorTypes)
        .where(and(
          eq(vendorTypes.id, vendorTypeId),
          eq(vendorTypes.userId, req.user!.id)
        ));

      if (!vendorType) {
        return res.status(404).json({ message: 'Vendor type not found' });
      }

      // Update the vendor type with reordered custom fields
      const [updatedVendorType] = await db
        .update(vendorTypes)
        .set({
          customFields,
          updatedAt: new Date(),
          last_modified: new Date()
        })
        .where(eq(vendorTypes.id, vendorTypeId))
        .returning();

      // Set proper headers and response
      res.setHeader('Content-Type', 'application/json');
      res.json(updatedVendorType);
    } catch (error) {
      console.error('Error reordering vendor type custom fields:', error);
      res.status(500).json({ message: 'Failed to reorder vendor type custom fields' });
    }
  });

  // Reorder event type custom fields
  app.put('/api/event-types/:type/custom-fields/reorder', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const eventTypeName = req.params.type;
      const { customFields } = req.body;

      // Get user settings to update the event types within the settings JSON
      const [userSetting] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, req.user!.id));

      if (!userSetting) {
        return res.status(404).json({ message: 'User settings not found' });
      }

      // Find the event type in the userSettings.eventTypes array
      const eventTypesArray = userSetting.eventTypes || [];
      const eventTypeIndex = eventTypesArray.findIndex(et => et.type === eventTypeName);
      
      if (eventTypeIndex === -1) {
        return res.status(404).json({ message: 'Event type not found' });
      }

      // Update the event type with custom fields
      // Create a new eventTypes array with the updated event type
      const updatedEventTypes = [...eventTypesArray];
      updatedEventTypes[eventTypeIndex] = {
        ...updatedEventTypes[eventTypeIndex],
        customFields: customFields
      };

      // Update the user settings with the new eventTypes array
      const [updatedSettings] = await db
        .update(userSettings)
        .set({
          eventTypes: updatedEventTypes,
          updatedAt: new Date()
        })
        .where(eq(userSettings.userId, req.user!.id))
        .returning();

      // Return the updated event type
      const updatedEventType = updatedSettings.eventTypes[eventTypeIndex];

      // Set proper headers and response
      res.setHeader('Content-Type', 'application/json');
      return res.json(updatedEventType);
    } catch (error) {
      console.error('Error reordering event type custom fields:', error);
      // Ensure we return valid JSON
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ message: 'Failed to reorder event type custom fields' });
    }
  });

  // Vendors API
  // Update the vendors API endpoint to support filtering by IDs
  app.get('/api/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      console.log("Fetching vendors for user:", req.user!.id);

      let query = db
        .select({
          vendor: vendors,
          type: vendorTypes
        })
        .from(vendors)
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(vendors.userId, req.user!.id));

      // Add ID filtering if ids parameter is present
      if (req.query.ids) {
        const vendorIds = req.query.ids.toString().split(',').map(Number);
        console.log("Filtering vendors by IDs:", vendorIds);
        // Create a new query with both conditions
        query = db
          .select({
            vendor: vendors,
            type: vendorTypes
          })
          .from(vendors)
          .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
          .where(and(
            eq(vendors.userId, req.user!.id),
            inArray(vendors.id, vendorIds)
          ));
      }

      const results = await query;
      console.log(`Retrieved ${results.length} vendors from database`);

      // Debug and check for custom fields
      const vendorsWithCustomFields = results.filter(
        r => r.vendor.customFieldValues && Object.keys(r.vendor.customFieldValues).length > 0
      );
      console.log(`Found ${vendorsWithCustomFields.length} vendors with custom field values`);
      
      if (vendorsWithCustomFields.length > 0) {
        const example = vendorsWithCustomFields[0];
        console.log(`Example vendor with custom fields: ${example.vendor.name}`);
        console.log("Custom field values:", example.vendor.customFieldValues);
        if (example.type) {
          console.log("Custom field definitions:", example.type.customFields);
        }
      }

      // Transform the results to match the expected format
      const transformedResults = results.map(result => {
        const transformed = {
          id: result.vendor.id,
          name: result.vendor.name,
          type: result.type ? {
            id: result.type.id,
            name: result.type.name,
            customFields: result.type.customFields
          } : null,
          contactName: result.vendor.contactName,
          email: result.vendor.email,
          phone: result.vendor.phone,
          alternativePhone: result.vendor.alternativePhone,
          address: result.vendor.address,
          notes: result.vendor.notes,
          customFieldValues: result.vendor.customFieldValues
        };
        
        // Verify custom field values are included in transformed result
        if (result.vendor.customFieldValues && Object.keys(result.vendor.customFieldValues).length > 0) {
          if (!transformed.customFieldValues || Object.keys(transformed.customFieldValues).length === 0) {
            console.error("WARNING: Custom field values lost during transformation for vendor:", result.vendor.id);
          }
        }
        
        return transformed;
      });

      console.log(`Returning ${transformedResults.length} transformed vendors`);
      res.json(transformedResults);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ message: 'Failed to fetch vendors' });
    }
  });

  app.post('/api/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { name, typeId, contactName, email, phone, alternativePhone, address, notes, customFieldValues } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Vendor name is required' });
      }

      const [newVendor] = await db
        .insert(vendors)
        .values({
          userId: req.user!.id,
          name,
          typeId: typeId || null,
          contactName: contactName || null,
          email: email || null,
          phone: phone || null,
          alternativePhone: alternativePhone || null,
          address: address || null,
          notes: notes || null,
          customFieldValues: customFieldValues || {},
          last_modified: new Date()
        })
        .returning();

      if (newVendor.typeId) {
        const [vendorType] = await db
          .select()
          .from(vendorTypes)
          .where(eq(vendorTypes.id, newVendor.typeId));

        res.status(201).json({
          ...newVendor,
          type: vendorType
        });
      } else {
        res.status(201).json({
          ...newVendor,
          type: null
        });
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ message: 'Failed to create vendor' });
    }
  });

  app.get('/api/vendors/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { id } = req.params;

      const [vendorData] = await db
        .select({
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(vendors)
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(and(
          eq(vendors.id, parseInt(id)),
          eq(vendors.userId, req.user!.id)
        ));

      if (!vendorData) {
        return res.status(404).json({ message: 'Vendor not found' });
      }

      res.json({
        ...vendorData.vendor,
        type: vendorData.vendorType
      });
    } catch (error) {
      console.error('Error fetching vendor:', error);
      res.status(500).json({ message: 'Failed to fetch vendor' });
    }
  });

  app.put('/api/vendors/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { id } = req.params;
      const { name, typeId, contactName, email, phone, alternativePhone, address, notes, customFieldValues } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Vendor name is required' });
      }

      // Check if vendor exists and belongs to this user
      const [existingVendor] = await db
        .select()
        .from(vendors)
        .where(and(
          eq(vendors.id, parseInt(id)),
          eq(vendors.userId, req.user!.id)
        ));

      if (!existingVendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }

      const [updatedVendor] = await db
        .update(vendors)
        .set({
          name,
          typeId: typeId || null,
          contactName: contactName || null,
          email: email || null,
          phone: phone || null,
          alternativePhone: alternativePhone || null,
          address: address || null,
          notes: notes || null,
          customFieldValues: customFieldValues || {},
          updatedAt: new Date(),
          last_modified: new Date()
        })
        .where(eq(vendors.id, parseInt(id)))
        .returning();

      if (updatedVendor.typeId) {
        const [vendorType] = await db
          .select()
          .from(vendorTypes)
          .where(eq(vendorTypes.id, updatedVendor.typeId));

        res.json({
          ...updatedVendor,
          type: vendorType
        });
      } else {
        res.json({
          ...updatedVendor,
          type: null
        });
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      res.status(500).json({ message: 'Failed to update vendor' });
    }
  });

  app.delete('/api/vendors/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { id } = req.params;

      const [vendor] = await db
        .select()
        .from(vendors)
        .where(and(
          eq(vendors.id, parseInt(id)),
          eq(vendors.userId, req.user!.id)
        ));

      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }

      await db
        .delete(vendors)
        .where(eq(vendors.id, parseInt(id)));

      res.status(204).end();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({ message: 'Failed to delete vendor' });
    }
  });

  // Timeline Vendors API
  app.get('/api/timelines/:timelineId/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { timelineId } = req.params;

      const [timeline] = await db
        .select()
        .from(timelines)
        .where(and(
          eq(timelines.id, parseInt(timelineId)),
          eq(timelines.userId, req.user!.id)
        ));

      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      const timelineVendorsData = await db
        .select({
          timelineVendor: timelineVendors,
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(timelineVendors)
        .innerJoin(vendors, eq(timelineVendors.vendorId, vendors.id))
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(timelineVendors.timelineId, parseInt(timelineId)));

      const formattedTimelineVendors = timelineVendorsData.map(({ timelineVendor, vendor, vendorType }) => ({
        id: timelineVendor.id,
        timelineId: timelineVendor.timelineId,
        vendor: {
          ...vendor,
          type: vendorType
        }
      }));

      res.json(formattedTimelineVendors);
    } catch (error) {
      console.error('Error fetching timeline vendors:', error);
      res.status(500).json({ message: 'Failed to fetch timeline vendors' });
    }
  });

  app.post('/api/timelines/:timelineId/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { timelineId } = req.params;
      const { vendorId } = req.body;

      if (!vendorId) {
        return res.status(400).json({ message: 'Vendor ID is required' });
      }

      const [timeline] = await db
        .select()
        .from(timelines)
        .where(and(
          eq(timelines.id, parseInt(timelineId)),
          eq(timelines.userId, req.user!.id)
        ));

      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      const [vendor] = await db
        .select()
        .from(vendors)
        .where(and(
          eq(vendors.id, vendorId),
          eq(vendors.userId, req.user!.id)
        ));

      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }

      // Check if vendor is already assigned to timeline
      const [existingTimelineVendor] = await db
        .select()
        .from(timelineVendors)
        .where(and(
          eq(timelineVendors.timelineId, parseInt(timelineId)),
          eq(timelineVendors.vendorId, vendorId)
        ));

      if (existingTimelineVendor) {
        return res.status(400).json({ message: 'Vendor is already assigned to this timeline' });
      }

      const [newTimelineVendor] = await db
        .insert(timelineVendors)
        .values({
          timelineId: parseInt(timelineId),
          vendorId,
          last_modified: new Date()
        })
        .returning();

      const [vendorType] = vendor.typeId ? await db
        .select()
        .from(vendorTypes)
        .where(eq(vendorTypes.id, vendor.typeId)) : [null];

      res.status(201).json({
        id: newTimelineVendor.id,
        timelineId: newTimelineVendor.timelineId,
        vendor: {
          ...vendor,
          type: vendorType
        }
      });
    } catch (error) {
      console.error('Error assigning vendor to timeline:', error);
      res.status(500).json({ message: 'Failed to assign vendor to timeline' });
    }
  });

  app.delete('/api/timelines/:timelineId/vendors/:vendorId', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.timelineId);
      const vendorId = parseInt(req.params.vendorId);

      // Get all events for this timeline
      const events = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.timelineId, timelineId));

      // Remove the vendor from all timeline events
      if (events.length > 0) {
        const eventIds = events.map(event => event.id);
        await db
          .delete(timelineEventVendors)
          .where(and(
            inArray(timelineEventVendors.timelineEventId, eventIds),
            eq(timelineEventVendors.vendorId, vendorId)
          ));
      }

      // Remove the vendor from the timeline
      await db
        .delete(timelineVendors)
        .where(and(
          eq(timelineVendors.timelineId, timelineId),
          eq(timelineVendors.vendorId, vendorId)
        ));

      res.status(204).end();
    } catch (error) {
      console.error('Error removing vendor from timeline:', error);
      res.status(500).json({ message: 'Failed to remove vendor from timeline' });
    }
  });

  // Timeline Event Vendors API
  app.get('/api/timeline-events/:eventId/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { eventId } = req.params;

      const [event] = await db
        .select({
          event: timelineEvents,
          timeline: timelines
        })
        .from(timelineEvents)
        .innerJoin(timelines, eq(timelineEvents.timelineId, timelines.id))
        .where(and(
          eq(timelineEvents.id, parseInt(eventId)),
          eq(timelines.userId, req.user!.id)
        ));

      if (!event) {
        return res.status(404).json({ message: 'Timeline event not found' });
      }

      const eventVendorsData = await db
        .select({
          eventVendor: timelineEventVendors,
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(timelineEventVendors)
        .innerJoin(vendors, eq(timelineEventVendors.vendorId, vendors.id))
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(timelineEventVendors.timelineEventId, parseInt(eventId)));

      const formattedEventVendors = eventVendorsData.map(({ eventVendor, vendor, vendorType }: { eventVendor: any, vendor: any, vendorType: any }) => ({
        id: eventVendor.id,
        timelineEventId: eventVendor.timelineEventId,
        vendor: {
          ...vendor,
          type: vendorType
        }
      }));

      res.json(formattedEventVendors);
    } catch (error) {
      console.error('Error fetching timeline event vendors:', error);
      res.status(500).json({ message: 'Failed to fetch timeline event vendors' });
    }
  });

  app.post('/api/timeline-events/:eventId/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { eventId } = req.params;
      const { vendorId } = req.body;

      if (!vendorId) {
        return res.status(400).json({ message: 'Vendor ID is required' });
      }

      const [event] = await db
        .select({
          event: timelineEvents,
          timeline: timelines
        })
        .from(timelineEvents)
        .innerJoin(timelines, eq(timelineEvents.timelineId, timelines.id))
        .where(and(
          eq(timelineEvents.id, parseInt(eventId)),
          eq(timelines.userId, req.user!.id)
        ));

      if (!event) {
        return res.status(404).json({ message: 'Timeline event not found' });
      }

      const [vendor] = await db
        .select()
        .from(vendors)
        .where(and(
          eq(vendors.id, vendorId),
          eq(vendors.userId, req.user!.id)
        ));

      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }

      // Check if vendor is already assigned to timeline event
      const [existingEventVendor] = await db
        .select()
        .from(timelineEventVendors)
        .where(and(
          eq(timelineEventVendors.timelineEventId, parseInt(eventId)),
          eq(timelineEventVendors.vendorId, vendorId)
        ));

      if (existingEventVendor) {
        return res.status(400).json({ message: 'Vendor is already assigned to this timeline event' });
      }

      const [newEventVendor] = await db
        .insert(timelineEventVendors)
        .values({
          timelineEventId: parseInt(eventId),
          vendorId,
          last_modified: new Date()
        })
        .returning();

      const [vendorType] = vendor.typeId ? await db
        .select()
        .from(vendorTypes)
        .where(eq(vendorTypes.id, vendor.typeId)) : [null];

      res.status(201).json({
        id: newEventVendor.id,
        timelineEventId: newEventVendor.timelineEventId,
        vendor: {
          ...vendor,
          type: vendorType
        }
      });
    } catch (error) {
      console.error('Error assigning vendor to timeline event:', error);
      res.status(500).json({ message: 'Failed to assign vendor to timeline event' });
    }
  });

  app.delete('/api/timeline-events/:eventId/vendors/:vendorId', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { eventId, vendorId } = req.params;

      const [event] = await db
        .select({
          event: timelineEvents,
          timeline: timelines
        })
        .from(timelineEvents)
        .innerJoin(timelines, eq(timelineEvents.timelineId, timelines.id))
        .where(and(
          eq(timelineEvents.id, parseInt(eventId)),
          eq(timelines.userId, req.user!.id)
        ));

      if (!event) {
        return res.status(404).json({ message: 'Timeline event not found' });
      }

      await db
        .delete(timelineEventVendors)
        .where(and(
          eq(timelineEventVendors.timelineEventId, parseInt(eventId)),
          eq(timelineEventVendors.vendorId, parseInt(vendorId))
        ));

      res.status(204).end();
    } catch (error) {
      console.error('Error removing vendor from timeline event:', error);
      res.status(500).json({ message: 'Failed to remove vendor from timeline event' });
    }
  });

  // Add new timeline event vendor endpoints
  app.get('/api/timeline-events/:id/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.json([]);
      }
      const eventVendors = await db
        .select({
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(timelineEventVendors)
        .leftJoin(vendors, eq(timelineEventVendors.vendorId, vendors.id))
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(timelineEventVendors.timelineEventId, eventId));

      const formattedVendors = eventVendors.map(({ vendor, vendorType }: { vendor: any, vendorType: any }) => ({
        ...vendor,
        type: vendorType
      }));

      res.json(formattedVendors);
    } catch (error) {
      console.error('Error fetching event vendors:', error);
      res.status(500).json({ message: 'Failed to fetch event vendors' });
    }
  });

  app.post('/api/timeline-events/:id/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const eventId = parseInt(req.params.id);
      const { vendorId } = req.body;

      if (!vendorId) {
        return res.status(400).json({ message: 'Vendor ID is required' });
      }

      const [newEventVendor] = await db
        .insert(timelineEventVendors)
        .values({
          timelineEventId: eventId,
          vendorId,
          last_modified: new Date()
        })
        .returning();

      const eventVendor = await db
        .select({
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(vendors)
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(vendors.id, vendorId))
        .then(rows => rows[0]);

      res.status(201).json({
        ...eventVendor.vendor,
        type: eventVendor.vendorType
      });
    } catch (error) {
      console.error('Error assigning vendor to event:', error);
      res.status(500).json({ message: 'Failed to assign vendor to event' });
    }
  });

  app.delete('/api/timeline-events/:eventId/vendors/:vendorId', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const eventId = parseInt(req.params.eventId);
      const vendorId = parseInt(req.params.vendorId);

      const [event] = await db
        .select({
          event: timelineEvents,
          timeline: timelines
        })
        .from(timelineEvents)
        .innerJoin(timelines, eq(timelineEvents.timelineId, timelines.id))
        .where(and(
          eq(timelineEvents.id, eventId),
          eq(timelines.userId, req.user!.id)
        ));

      if (!event) {
        return res.status(404).json({ message: 'Timeline event not found' });
      }

      await db
        .delete(timelineEventVendors)
        .where(and(
          eq(timelineEventVendors.timelineEventId, eventId),
          eq(timelineEventVendors.vendorId, vendorId)
        ));

      res.status(204).end();
    } catch (error) {
      console.error('Error removing vendor from timeline event:', error);
      res.status(500).json({ message: 'Failed to remove vendor from timeline event' });
    }
  });

  // Add timeline vendor endpoints
  app.get('/api/timelines/:id/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);
      if (isNaN(timelineId)) {
        return res.json([]);
      }
      const timelineVendorsList = await db
        .select({
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(timelineVendors)
        .leftJoin(vendors, eq(timelineVendors.vendorId, vendors.id))
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(timelineVendors.timelineId, timelineId));

      const formattedVendors = timelineVendorsList.map(({ vendor, vendorType }: { vendor: any, vendorType: any }) => ({
        ...vendor,
        type: vendorType
      }));

      res.json(formattedVendors);
    } catch (error) {
      console.error('Error fetching timeline vendors:', error);
      res.status(500).json({ message: 'Failed to fetch timeline vendors' });
    }
  });

  app.post('/api/timelines/:id/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);
      const { vendorId } = req.body;

      if (!vendorId) {
        return res.status(400).json({ message: 'Vendor ID is required' });
      }

      const [newTimelineVendor] = await db
        .insert(timelineVendors)
        .values({
          timelineId,
          vendorId,
          last_modified: new Date()
        })
        .returning();

      const timelineVendor = await db
        .select({
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(vendors)
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(vendors.id, vendorId))
        .then(rows => rows[0]);

      res.status(201).json({
        ...timelineVendor.vendor,
        type: timelineVendor.vendorType
      });
    } catch (error) {
      console.error('Error assigning vendor to timeline:', error);
      res.status(500).json({ message: 'Failed to assign vendor to timeline' });
    }
  });

  app.delete('/api/timelines/:timelineId/vendors/:vendorId', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.timelineId);
      const vendorId = parseInt(req.params.vendorId);

      // Get all events for this timeline
      const events = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.timelineId, timelineId));

      // Remove the vendor from all timeline events
      if (events.length > 0) {
        const eventIds = events.map(event => event.id);
        await db
          .delete(timelineEventVendors)
          .where(and(
            inArray(timelineEventVendors.timelineEventId, eventIds),
            eq(timelineEventVendors.vendorId, vendorId)
          ));
      }

      // Remove the vendor from the timeline
      await db
        .delete(timelineVendors)
        .where(and(
          eq(timelineVendors.timelineId, timelineId),
          eq(timelineVendors.vendorId, vendorId)
        ));

      res.status(204).end();
    } catch (error) {
      console.error('Error removing vendor from timeline:', error);
      res.status(500).json({ message: 'Failed to remove vendor from timeline' });
    }
  });

  // Add batch vendor operations endpoint
  app.post('/api/timeline-events/:eventId/vendors/batch', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const eventId = parseInt(req.params.eventId);
      const { add = [], remove = [] } = req.body;

      // Process all operations in a single transaction
      await db.transaction(async (tx) => {
                // Add new vendors
        if (add.length > 0) {
          await tx.insert(timelineEventVendors)
            .values(add.map((vendorId: string | number) => ({
              timelineEventId: eventId,
              vendorId: typeof vendorId === 'string' ? parseInt(vendorId) : vendorId,
              last_modified: new Date()
            })));
        }

        // Remove vendors
        if (remove.length > 0) {
          await tx.delete(timelineEventVendors)
            .where(and(
              eq(timelineEventVendors.timelineEventId, eventId),
              inArray(timelineEventVendors.vendorId, remove.map((id: string | number) => typeof id === 'string' ? parseInt(id) : id))
            ));
        }
      });

      const updatedVendors = await db
        .select({
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(timelineEventVendors)
        .leftJoin(vendors, eq(timelineEventVendors.vendorId, vendors.id))
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(timelineEventVendors.timelineEventId, eventId));

      const formattedVendors = updatedVendors.map(({ vendor, vendorType }: { vendor: any, vendorType: any }) => ({
        ...vendor,
        type: vendorType
      }));

      res.json(formattedVendors);
    } catch (error) {
      console.error('Error updating event vendors:', error);
      res.status(500).json({ message: 'Failed to update event vendors' });
    }
  });

  // Update the GET endpoint to handle new timelines/events better
  app.get('/api/timeline-events/:id/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const eventId = parseInt(req.params.id);

      // If the ID is NaN (new timeline/event), return empty array
      if (isNaN(eventId)) {
        return res.json([]);
      }

      const eventVendors = await db
        .select({
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(timelineEventVendors)
        .leftJoin(vendors, eq(timelineEventVendors.vendorId, vendors.id))
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(timelineEventVendors.timelineEventId, eventId));

      const formattedVendors = eventVendors.map(({ vendor, vendorType }: { vendor: any, vendorType: any }) => ({
        ...vendor,
        type: vendorType
      }));

      res.json(formattedVendors);
    } catch (error) {
      console.error('Error fetching event vendors:', error);
      res.status(500).json({ message: 'Failed to fetch event vendors' });
    }
  });

  // Similarly update the timeline vendors endpoint
  app.get('/api/timelines/:id/vendors', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);

      // If the ID is NaN (new timeline), return empty array
      if (isNaN(timelineId)) {
        return res.json([]);
      }

      const timelineVendorsResults = await db
        .select({
          vendor: vendors,
          vendorType: vendorTypes
        })
        .from(timelineVendors)
        .leftJoin(vendors, eq(timelineVendors.vendorId, vendors.id))
        .leftJoin(vendorTypes, eq(vendors.typeId, vendorTypes.id))
        .where(eq(timelineVendors.timelineId, timelineId));

      const formattedVendors = timelineVendorsResults.map(({ vendor, vendorType }: { vendor: any, vendorType: any }) => ({
        ...vendor,
        type: vendorType
      }));

      res.json(formattedVendors);
    } catch (error) {
      console.error('Error fetching timeline vendors:', error);
      res.status(500).json({ message: 'Failed to fetch timeline vendors' });
    }
  });

  // Update the timeline fetch endpoint to include vendors in the response
  app.get('/api/timelines/:id', async (req, res) => {
    try {
      const result = await db.query.timelines.findFirst({
        where: eq(timelines.id, parseInt(req.params.id)),
        with: {
          events: {
            orderBy: (timelineEvents, { asc }) => [asc(timelineEvents.order)],
            with: {
              vendors: {
                with: {
                  vendor: true
                }
              }
            }
          },
          categories: {
            orderBy: (timelineCategories, { asc }) => [asc(timelineCategories.order)],
          },
          images: {
            orderBy: (timelineImages, { asc }) => [asc(timelineImages.order)],
          },
          vendors: {
            with: {
              vendor: true
            }
          }
        },
      });

      if (!result) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ message: 'Failed to fetch timeline' });
    }
  });

  app.post('/api/vendors/import', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { name, typeName, typeId, contactName, email, phone, alternativePhone, address, notes } = req.body;

      // Enhanced validation for name field
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'Vendor name is required and cannot be empty' });
      }

      // Check for vendor type by name if provided
      let resolvedTypeId = null;
      if (typeName && typeof typeName === 'string' && typeName.trim()) {
        // Try to find an existing vendor type with this name
        const [existingType] = await db
          .select()
          .from(vendorTypes)
          .where(and(
            eq(vendorTypes.userId, req.user!.id),
            eq(vendorTypes.name, typeName.trim())
          ));

        if (existingType) {
          resolvedTypeId = existingType.id;
        } else {
          // Create a new vendor type with this name
          const [newType] = await db
            .insert(vendorTypes)
            .values({
              userId: req.user!.id,
              name: typeName.trim(),
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          resolvedTypeId = newType.id;
        }
      } else if (typeId) {
        // If typeId is provided directly, verify it exists
        const [existingType] = await db
          .select()
          .from(vendorTypes)
          .where(and(
            eq(vendorTypes.userId, req.user!.id),
            eq(vendorTypes.id, typeId)
          ));

        if (existingType) {
          resolvedTypeId = existingType.id;
        }
      }

      const [newVendor] = await db
        .insert(vendors)
        .values({
          userId: req.user!.id,
          name: name.trim(),
          typeId: resolvedTypeId,
          contactName: contactName ? contactName.trim() : null,
          email: email ? email.trim() : null,
          phone: phone ? phone.trim() : null,
          alternativePhone: alternativePhone ? alternativePhone.trim() : null,
          address: address ? address.trim() : null,
          notes: notes ? notes.trim() : null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (newVendor.typeId) {
        const [vendorType] = await db
          .select()
          .from(vendorTypes)
          .where(eq(vendorTypes.id, newVendor.typeId));

        res.status(201).json({
          ...newVendor,
          type: vendorType
        });
      } else {
        res.status(201).json({
          ...newVendor,
          type: null
        });
      }
    } catch (error) {
      console.error('Error importing vendor:', error);
      res.status(500).json({ message: 'Failed to import vendor' });
    }
  });

  // Create a new public share for a timeline
  app.post("/api/timelines/:id/public-share", async (req, res) => {
    try {
      console.log("Public share creation request received for timeline:", req.params.id);
      console.log("Authentication status:", req.isAuthenticated());
      console.log("Request user:", req.user);
      
      if (!req.isAuthenticated()) {
        console.log("User not authenticated, returning 401");
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);
      console.log("Looking up timeline with ID:", timelineId, "for user:", req.user!.id);
      
      // Check if the timeline belongs to the user
      const timelineExists = await db
        .select()
        .from(timelines)
        .where(and(
          eq(timelines.id, timelineId),
          eq(timelines.userId, req.user!.id)
        ))
        .limit(1);
      
      console.log("Timeline lookup result:", timelineExists);
      
      if (!timelineExists.length) {
        console.log("Timeline not found for this user, returning 404");
        return res.status(404).json({ message: 'Timeline not found' });
      }
      
      // Get parameters from the request body
      const showVendors = req.body && req.body.showVendors === true;
      const expiresAt = req.body && req.body.expiresAt ? new Date(req.body.expiresAt) : null;
      
      console.log("Share parameters:", {
        showVendors,
        expiresAt,
        rawExpiresAt: req.body.expiresAt
      });
      
      console.log("Full request body:", req.body);
      
      // Check if this timeline already has a share token
      console.log("Checking for existing share token");
      const existingShare = await db
        .select()
        .from(publicTimelineShares)
        .where(and(
          eq(publicTimelineShares.timelineId, timelineId),
          eq(publicTimelineShares.isEnabled, true)
        ))
        .limit(1);
      
      console.log("Existing share result:", existingShare);
      
      if (existingShare.length) {
        // Update the existing share with the new values
        console.log("Updating existing share with new values:", { showVendors, expiresAt });
        const updatedShare = await db
          .update(publicTimelineShares)
          .set({ 
            showVendors: showVendors,
            expiresAt: expiresAt,
            updatedAt: new Date()
          })
          .where(eq(publicTimelineShares.id, existingShare[0].id))
          .returning();
          
        console.log("Updated share:", updatedShare);
        console.log("Updated values:", {
          showVendors: updatedShare[0].showVendors,
          expiresAt: updatedShare[0].expiresAt
        });
        return res.json(updatedShare[0]);
      }
      
      // Generate a random token
      const shareToken = crypto.randomBytes(16).toString('hex');
      console.log("Generated new share token:", shareToken);
      
      // Create a new public share - only include fields that match the schema exactly
      console.log("Creating new public share record with these values:", {
        timelineId,
        shareToken,
        isEnabled: true,
        showVendors,
        expiresAt
      });
      
      try {
        // Use a more explicit approach to ensure only valid fields are included
        const insertResult = await db
          .insert(publicTimelineShares)
          .values({
            timelineId: timelineId,
            shareToken: shareToken,
            isEnabled: true,
            showVendors: showVendors,
            expiresAt: expiresAt
            // Note: createdAt and updatedAt will use default values
          })
          .returning();
        
        console.log("Insert result:", insertResult);
        console.log("Inserted values:", {
          showVendors: insertResult[0].showVendors,
          expiresAt: insertResult[0].expiresAt
        });
        
        if (!insertResult || insertResult.length === 0) {
          console.error("Insert succeeded but no records were returned");
          return res.status(500).json({ 
            message: 'Database error: No records returned after insert' 
          });
        }
        
        console.log("New share created successfully:", insertResult[0]);
        res.json(insertResult[0]);
      } catch (insertError: any) {
        console.error("Database insertion error:", insertError);
        console.error("Error message:", insertError.message);
        console.error("Error code:", insertError.code);
        console.error("Error stack:", insertError.stack);
        
        if (insertError.message && insertError.message.includes("FOREIGN KEY constraint failed")) {
          return res.status(400).json({ 
            message: 'Foreign key constraint failed. The timeline may have been deleted.',
            error: insertError.message
          });
        }
        
        return res.status(500).json({ 
          message: 'Database error creating share', 
          error: insertError.message || String(insertError) 
        });
      }
    } catch (error: any) {
      console.error('Error creating public share:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: 'Failed to create public share', 
        error: error.message || String(error) 
      });
    }
  });

  // Get public share status for a timeline
  app.get("/api/timelines/:id/public-share", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);
      
      // Check if the timeline belongs to the user
      const timelineExists = await db
        .select()
        .from(timelines)
        .where(and(
          eq(timelines.id, timelineId),
          eq(timelines.userId, req.user!.id)
        ))
        .limit(1);
      
      if (!timelineExists.length) {
        return res.status(404).json({ message: 'Timeline not found' });
      }
      
      // Get the share token if it exists
      const existingShare = await db
        .select()
        .from(publicTimelineShares)
        .where(and(
          eq(publicTimelineShares.timelineId, timelineId),
          eq(publicTimelineShares.isEnabled, true)
        ))
        .limit(1);
      
      if (existingShare.length) {
        res.json(existingShare[0]);
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error('Error fetching public share:', error);
      res.status(500).json({ message: 'Failed to fetch public share' });
    }
  });

  // Revoke a public share
  app.delete("/api/timelines/:id/public-share", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const timelineId = parseInt(req.params.id);
      
      // Check if the timeline belongs to the user
      const timelineExists = await db
        .select()
        .from(timelines)
        .where(and(
          eq(timelines.id, timelineId),
          eq(timelines.userId, req.user!.id)
        ))
        .limit(1);
      
      if (!timelineExists.length) {
        return res.status(404).json({ message: 'Timeline not found' });
      }
      
      // Update share to be disabled
      await db
        .update(publicTimelineShares)
        .set({ isEnabled: false })
        .where(eq(publicTimelineShares.timelineId, timelineId));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error revoking public share:', error);
      res.status(500).json({ message: 'Failed to revoke public share' });
    }
  });

  // GET /api/public/timeline/:token - get public timeline by token
  app.get("/api/public/timeline/:token", async (req, res) => {
    const { token } = req.params;
    
    console.log(`Fetching public timeline with token: ${token}`);
    
    try {
      // Find the share record for this token
      const shareResult = await db
        .select()
        .from(publicTimelineShares)
        .where(eq(publicTimelineShares.shareToken, token))
        .limit(1);

      if (!shareResult || shareResult.length === 0) {
        console.log(`No share found for token: ${token}`);
        return res.status(404).json({ error: "Timeline share not found" });
      }

      const share = shareResult[0];
      console.log("Found share:", share);
      console.log("Share showVendors flag:", share.showVendors);

      if (!share.isEnabled) {
        console.log(`Share is disabled for token: ${token}`);
        return res.status(403).json({ error: "Timeline share has been revoked" });
      }
      
      // Check if the share has expired
      if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        console.log(`Share has expired for token: ${token}. Expiry date: ${share.expiresAt}`);
        return res.status(403).json({ error: "Timeline share has expired" });
      }

      // Get the timeline
      const timelineResult = await db
        .select()
        .from(timelines)
        .where(eq(timelines.id, share.timelineId))
        .limit(1);

      if (!timelineResult || timelineResult.length === 0) {
        console.log(`Timeline not found for share: ${share.id}`);
        return res.status(404).json({ error: "Timeline not found" });
      }

      const timeline = timelineResult[0];

      // Get the categories for this timeline
      const categories = await db
        .select()
        .from(timelineCategories)
        .where(eq(timelineCategories.timelineId, timeline.id))
        .orderBy(timelineCategories.order);

      // Get the events for this timeline
      const events = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.timelineId, timeline.id))
        .orderBy(timelineEvents.order);

      console.log(`Successfully retrieved timeline data. Events: ${events.length}, Categories: ${categories.length}`);
      console.log(`Sending response with showVendors: ${share.showVendors}`);

      // Return the timeline, categories, events and share info
      return res.json({
        timeline,
        categories,
        events,
        shareToken: share.shareToken,
        showVendors: share.showVendors
      });
    } catch (error) {
      console.error("Error fetching public timeline:", error);
      return res.status(500).json({ error: "Failed to fetch timeline" });
    }
  });
  
  // Handle feature suggestions
  app.post('/api/feature-suggestions', async (req, res) => {
    try {
      const { description, email } = req.body;
      
      if (!description || description.trim() === '') {
        return res.status(400).json({ message: 'Feature description is required' });
      }
      
      // Get the authenticated user if available
      let username: string | null = null;
      if (req.isAuthenticated() && req.user) {
        username = req.user.username;
      }
      
      // Send emails (to admin and to user if email provided)
      const emailSent = await sendFeatureSuggestionEmail(
        description,
        email || null,
        username
      );
      
      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send feature suggestion emails' });
      }
      
      res.status(200).json({ message: 'Feature suggestion submitted successfully' });
    } catch (error) {
      console.error('Error submitting feature suggestion:', error);
      res.status(500).json({ message: 'Failed to submit feature suggestion' });
    }
  });

  // Share timeline via email endpoint
  app.post('/api/timelines/:id/share-via-email', requireAuth, async (req, res) => {
    try {
      const timelineId = parseInt(req.params.id);
      const { recipientEmails, customMessage } = req.body;
      
      if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
        return res.status(400).json({ error: 'At least one recipient email is required' });
      }
      
      // Validate email format for all recipients
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmails = recipientEmails.every(email => 
        typeof email === 'string' && emailRegex.test(email)
      );
      
      if (!validEmails) {
        return res.status(400).json({ error: 'One or more email addresses are invalid' });
      }
      
      if (!customMessage || typeof customMessage !== 'string') {
        return res.status(400).json({ error: 'Custom message is required' });
      }
      
      // Get the user and timeline data
      const user = req.user as SelectUser;
      
      // First, check if a share already exists
      let shareData = await db.query.publicTimelineShares.findFirst({
        where: eq(publicTimelineShares.timelineId, timelineId)
      });
      
      // If no share exists, create one
      if (!shareData) {
        const shareToken = crypto.randomBytes(32).toString('hex');
        
        const newShare = await db.insert(publicTimelineShares).values({
          timelineId,
          shareToken,
          isEnabled: true,
          showVendors: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        shareData = newShare[0];
      }
      
      // Make sure we have a valid share to work with
      if (!shareData) {
        return res.status(500).json({ error: 'Failed to create or find timeline share' });
      }
      
      // Get the timeline details for the email
      const timeline = await db.query.timelines.findFirst({
        where: eq(timelines.id, timelineId)
      });
      
      if (!timeline) {
        return res.status(404).json({ error: 'Timeline not found' });
      }
      
      // Create the share URL with the correct path
      const hostname = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const shareUrl = `${protocol}://${hostname}/public/timeline/${shareData.shareToken}`;
      
      // Send the email to all recipients
      const emailResult = await sendTimelineShareEmail(
        recipientEmails,
        shareUrl,
        customMessage,
        timeline.title,
        user.username
      );
      
      if (emailResult) {
        return res.status(200).json({ 
          success: true, 
          message: 'Timeline shared successfully via email',
          shareUrl
        });
      } else {
        return res.status(500).json({ error: 'Failed to send share emails' });
      }
    } catch (error) {
      console.error('Error sharing timeline via email:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all timeline images (global endpoint)
  app.get('/api/timeline-images', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user!.id;
      
      // Join with timelines to only get images for timelines that belong to this user
      const images = await db
        .select({
          id: timelineImages.id,
          timelineId: timelineImages.timelineId,
          imageUrl: timelineImages.imageUrl,
          caption: timelineImages.caption,
          order: timelineImages.order,
          createdAt: timelineImages.createdAt,
          updatedAt: timelineImages.updatedAt,
        })
        .from(timelineImages)
        .innerJoin(timelines, eq(timelineImages.timelineId, timelines.id))
        .where(eq(timelines.userId, userId))
        .orderBy(timelineImages.order);

      res.json(images);
    } catch (error) {
      console.error('Error fetching all timeline images:', error);
      res.status(500).json({ message: 'Failed to fetch timeline images' });
    }
  });

  // Add these new S3 API endpoints alongside your existing s3/test endpoint

  // Get a signed URL for an S3 object
  app.get('/api/s3/url/:key', async (req, res) => {
    try {
      const key = req.params.key;
      
      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Key parameter is required'
        });
      }
      
      // Import the S3 service
      const s3Service = (await import('./services/s3Service.js')).default;
      
      // Generate a signed URL
      const result = await s3Service.generateSignedUrl(key);
      
      // Return the result
      res.json(result);
    } catch (error) {
      console.error('Error generating S3 signed URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate signed URL',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update the upload endpoint for files to S3 - direct implementation
  app.post('/api/s3/upload/:timelineId', upload.single('file'), async (req, res) => {
    try {
      console.log('=== DIRECT S3 UPLOAD ===');
      
      // Authentication check
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // File check
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      const timelineId = parseInt(req.params.timelineId);
      const file = req.file;
      
      // Generate a unique key using the filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
      const userId = req.user!.id;
      const key = `timelines/${timelineId}/images/${timestamp}-${randomString}-${sanitizedFileName}`;

      console.log('Upload details:', {
        userId,
        timelineId,
        fileName: file.originalname,
        fileSize: file.size,
        fileMimeType: file.mimetype,
        sanitizedFileName,
        s3Key: key
      });
      
      // Import S3 service
      const s3Service = (await import('./services/s3Service.js')).default;
      
      // Directly upload to S3
      const uploadResult = await s3Service.uploadFile(file.buffer, key, file.mimetype);
      
      console.log('Upload result:', {
        success: uploadResult.success,
        key: uploadResult.key,
        error: uploadResult.error || null
      });
      
      // Only return success if the upload was actually successful
      if (!uploadResult.success) {
        console.error('S3 UPLOAD FAILED:', uploadResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file to S3',
          error: uploadResult.error
        });
      }
      
      // Return success response with the appropriate data
      return res.status(200).json({
        success: true,
        key: uploadResult.key,
        url: uploadResult.url
      });
    } catch (error) {
      console.error('S3 UPLOAD ERROR:', error);
      
      // Return detailed error for debugging
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to S3',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete an object from S3
  app.delete('/api/s3/object/:key', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const key = req.params.key;
      
      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Key parameter is required'
        });
      }
      
      // Here you would delete the file from S3
      // For now, we'll just return success
      
      res.json({
        success: true,
        message: 'Server-side delete simulation successful'
      });
    } catch (error) {
      console.error('Error deleting from S3:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add a route to serve images stored with the memory-storage-placeholder prefix
  app.get('/api/images/:filename', async (req, res) => {
    try {
      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      
      const filename = req.params.filename;
      
      // Check if this is a local/fallback image (memory-storage-placeholder prefix)
      if (filename.startsWith('memory-storage-placeholder-')) {
        // For fallback images, look them up in the database and serve a placeholder
        res.set('Content-Type', 'image/svg+xml');
        const placeholderSvg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="#f0f0f0"/>
          <text x="50%" y="50%" font-family="Arial" font-size="20" text-anchor="middle" fill="#999999">Image Unavailable</text>
          <text x="50%" y="70%" font-family="Arial" font-size="12" text-anchor="middle" fill="#999999">${filename.replace('memory-storage-placeholder-', '')}</text>
        </svg>`;
        return res.send(placeholderSvg);
      }
      
      // For S3 images, get the URL and redirect
      const s3Service = (await import('./services/s3Service.js')).default;
      
      // Use the key directly without any format conversion
      console.log(`Attempting to serve image with standardized key: ${filename}`);
      
      // Generate signed URL using the original key
      const urlResult = await s3Service.generateSignedUrl(filename);
      
      // If we got a valid URL, redirect to it
      if (urlResult.success && urlResult.url) {
        console.log('Successfully generated URL, redirecting to:', urlResult.url);
        return res.redirect(urlResult.url);
      }
      
      // If we couldn't get a URL, show a placeholder
      console.log('Could not generate URL, showing placeholder');
      res.set('Content-Type', 'image/svg+xml');
      const errorSvg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f8d7da"/>
        <text x="50%" y="50%" font-family="Arial" font-size="20" text-anchor="middle" fill="#721c24">Image Error</text>
        <text x="50%" y="70%" font-family="Arial" font-size="12" text-anchor="middle" fill="#721c24">Could not load ${filename}</text>
      </svg>`;
      return res.send(errorSvg);
    } catch (error) {
      console.error('Error serving image:', error);
      res.status(500).set('Content-Type', 'image/svg+xml');
      const errorSvg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f8d7da"/>
        <text x="50%" y="50%" font-family="Arial" font-size="20" text-anchor="middle" fill="#721c24">Server Error</text>
      </svg>`;
      res.send(errorSvg);
    }
  });

  // Add a diagnostic endpoint for AWS connectivity
  app.get('/api/aws-check', async (req, res) => {
    try {
      // Log environment variable availability
      console.log('AWS environment check from endpoint:');
      console.log('AWS_REGION:', process.env.AWS_REGION ? 'Available' : 'Not available');
      console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Available' : 'Not available');
      console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Available' : 'Not available');
      console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME ? 'Available' : 'Not available');
      
      // Import the S3 service
      const s3Service = (await import('./services/s3Service.js')).default;
      
      // Run connection test
      const testResult = await s3Service.testConnection();
      
      // Return diagnostic information
      return res.json({
        environmentCheck: {
          hasRegion: Boolean(process.env.AWS_REGION),
          hasAccessKey: Boolean(process.env.AWS_ACCESS_KEY_ID),
          hasSecretKey: Boolean(process.env.AWS_SECRET_ACCESS_KEY),
          hasBucketName: Boolean(process.env.AWS_S3_BUCKET_NAME)
        },
        serviceStatus: {
          usingDirectFetch: s3Service.usingDirectFetch || false,
          connectionTestResult: testResult
        },
        serverInfo: {
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
          region: process.env.VERCEL_REGION
        }
      });
    } catch (error) {
      console.error('Error in AWS check endpoint:', error);
      return res.status(500).json({
        error: String(error),
        message: 'Failed to check AWS configuration'
      });
    }
  });

  // Add a comprehensive AWS diagnostic endpoint
  app.get('/api/aws-diagnostics', async (req, res) => {
    try {
      console.log('=== COMPREHENSIVE AWS DIAGNOSTICS ===');
      
      // Phase 1: Basic environment variable check
      console.log('Phase 1: Checking environment variables');
      const diagnosticResult = {
        timestamp: new Date().toISOString(),
        phases: {
          environment: {
            variables: {
              AWS_REGION: {
                exists: typeof process.env.AWS_REGION !== 'undefined',
                value: process.env.AWS_REGION || 'undefined',
                empty: !process.env.AWS_REGION
              },
              AWS_ACCESS_KEY_ID: {
                exists: typeof process.env.AWS_ACCESS_KEY_ID !== 'undefined',
                length: process.env.AWS_ACCESS_KEY_ID?.length || 0,
                prefix: process.env.AWS_ACCESS_KEY_ID ? 
                       process.env.AWS_ACCESS_KEY_ID.substring(0, 4) + '...' : 'undefined',
                empty: !process.env.AWS_ACCESS_KEY_ID
              },
              AWS_SECRET_ACCESS_KEY: {
                exists: typeof process.env.AWS_SECRET_ACCESS_KEY !== 'undefined',
                length: process.env.AWS_SECRET_ACCESS_KEY?.length || 0,
                empty: !process.env.AWS_SECRET_ACCESS_KEY
              },
              AWS_S3_BUCKET_NAME: {
                exists: typeof process.env.AWS_S3_BUCKET_NAME !== 'undefined',
                value: process.env.AWS_S3_BUCKET_NAME || 'undefined',
                empty: !process.env.AWS_S3_BUCKET_NAME
              }
            },
            summary: {
              allVariablesExist: Boolean(
                process.env.AWS_REGION && 
                process.env.AWS_ACCESS_KEY_ID && 
                process.env.AWS_SECRET_ACCESS_KEY && 
                process.env.AWS_S3_BUCKET_NAME
              ),
              missingVariables: [
                !process.env.AWS_REGION ? 'AWS_REGION' : null,
                !process.env.AWS_ACCESS_KEY_ID ? 'AWS_ACCESS_KEY_ID' : null,
                !process.env.AWS_SECRET_ACCESS_KEY ? 'AWS_SECRET_ACCESS_KEY' : null,
                !process.env.AWS_S3_BUCKET_NAME ? 'AWS_S3_BUCKET_NAME' : null
              ].filter(Boolean)
            }
          }
        }
      };
      
      // Phase 2: AWS SDK import check
      console.log('Phase 2: Checking AWS SDK import');
      diagnosticResult.phases.awsSdk = {
        status: 'pending'
      };
      
      try {
        const awsSdkStart = Date.now();
        const { S3Client } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const awsSdkEnd = Date.now();
        
        diagnosticResult.phases.awsSdk = {
          status: 'success',
          importTime: `${awsSdkEnd - awsSdkStart}ms`,
          modules: {
            S3Client: typeof S3Client === 'function',
            getSignedUrl: typeof getSignedUrl === 'function'
          }
        };
        
        // Phase 3: S3 Client initialization
        console.log('Phase 3: Initializing S3 client');
        diagnosticResult.phases.s3Client = {
          status: 'pending'
        };
        
        if (diagnosticResult.phases.environment.summary.allVariablesExist) {
          try {
            const clientStart = Date.now();
            const s3Client = new S3Client({
              region: process.env.AWS_REGION,
              credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
              }
            });
            const clientEnd = Date.now();
            
            diagnosticResult.phases.s3Client = {
              status: 'success',
              initTime: `${clientEnd - clientStart}ms`
            };
            
            // Phase 4: Connection test
            console.log('Phase 4: Testing S3 connection');
            diagnosticResult.phases.connectionTest = {
              status: 'pending'
            };
            
            try {
              const { ListBucketsCommand } = await import('@aws-sdk/client-s3');
              const testStart = Date.now();
              const command = new ListBucketsCommand({});
              const response = await s3Client.send(command);
              const testEnd = Date.now();
              
              diagnosticResult.phases.connectionTest = {
                status: 'success',
                responseTime: `${testEnd - testStart}ms`,
                bucketCount: response.Buckets?.length || 0,
                requestId: response.$metadata?.requestId
              };
            } catch (connectionError) {
              diagnosticResult.phases.connectionTest = {
                status: 'error',
                message: connectionError.message,
                code: connectionError.code,
                requestId: connectionError.$metadata?.requestId,
                stackTrace: connectionError.stack
              };
            }
          } catch (clientError) {
            diagnosticResult.phases.s3Client = {
              status: 'error',
              message: clientError.message,
              stackTrace: clientError.stack
            };
          }
        } else {
          diagnosticResult.phases.s3Client = {
            status: 'skipped',
            reason: 'Missing required environment variables'
          };
          
          diagnosticResult.phases.connectionTest = {
            status: 'skipped',
            reason: 'S3 client initialization skipped'
          };
        }
      } catch (sdkError) {
        diagnosticResult.phases.awsSdk = {
          status: 'error',
          message: sdkError.message,
          stackTrace: sdkError.stack
        };
        
        diagnosticResult.phases.s3Client = {
          status: 'skipped',
          reason: 'AWS SDK import failed'
        };
        
        diagnosticResult.phases.connectionTest = {
          status: 'skipped',
          reason: 'AWS SDK import failed'
        };
      }
      
      // Phase 5: S3 service test
      console.log('Phase 5: Testing S3 service wrapper');
      diagnosticResult.phases.s3Service = {
        status: 'pending'
      };
      
      try {
        const s3Service = (await import('./services/s3Service.js')).default;
        const serviceTestStart = Date.now();
        const testResult = await s3Service.testConnection();
        const serviceTestEnd = Date.now();
        
        diagnosticResult.phases.s3Service = {
          status: 'complete',
          responseTime: `${serviceTestEnd - serviceTestStart}ms`,
          success: testResult.success,
          message: testResult.message,
          usingDirectFetch: testResult.usingDirectFetch,
          additionalDetails: testResult
        };
      } catch (serviceError) {
        diagnosticResult.phases.s3Service = {
          status: 'error',
          message: serviceError.message,
          stackTrace: serviceError.stack
        };
      }
      
      // Return the diagnostic results
      console.log('=== DIAGNOSTICS COMPLETE ===');
      return res.json(diagnosticResult);
    } catch (error) {
      console.error('Error in AWS diagnostics endpoint:', error);
      return res.status(500).json({
        timestamp: new Date().toISOString(),
        status: 'error',
        message: 'Error while running AWS diagnostics',
        error: String(error),
        stack: error.stack
      });
    }
  });

  // Add comprehensive AWS diagnostic endpoint
  app.get('/api/aws-status', async (req, res) => {
    try {
      console.log('=== AWS DIAGNOSTIC REQUEST ===');
      
      // 1. Check AWS environment variables
      const envVars = {
        AWS_REGION: process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME
      };
      
      // Log environment variable status (without exposing secrets)
      const envStatus = {
        AWS_REGION: envVars.AWS_REGION ? `Set (${envVars.AWS_REGION})` : 'NOT SET',
        AWS_ACCESS_KEY_ID: envVars.AWS_ACCESS_KEY_ID ? 
          `Set (Length: ${envVars.AWS_ACCESS_KEY_ID.length}, starts with: ${envVars.AWS_ACCESS_KEY_ID.substring(0, 3)}...)` : 
          'NOT SET',
        AWS_SECRET_ACCESS_KEY: envVars.AWS_SECRET_ACCESS_KEY ? 
          `Set (Length: ${envVars.AWS_SECRET_ACCESS_KEY.length})` : 
          'NOT SET',
        AWS_S3_BUCKET_NAME: envVars.AWS_S3_BUCKET_NAME ? 
          `Set (${envVars.AWS_S3_BUCKET_NAME})` : 
          'NOT SET'
      };
      
      console.log('AWS Environment Variables:', envStatus);
      
      // 2. Check AWS SDK availability
      let awsSdkStatus = { available: false, error: null };
      try {
        const startTime = Date.now();
        const { S3Client } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        awsSdkStatus = {
          available: true,
          loadTime: `${Date.now() - startTime}ms`,
          modules: {
            S3Client: typeof S3Client === 'function',
            getSignedUrl: typeof getSignedUrl === 'function'
          }
        };
        console.log('AWS SDK successfully imported');
      } catch (sdkError) {
        awsSdkStatus = {
          available: false,
          error: sdkError instanceof Error ? sdkError.message : String(sdkError)
        };
        console.error('AWS SDK import failed:', sdkError);
      }
      
      // 3. Test S3 connection
      let s3ConnectionStatus = { connected: false, error: null };
      if (awsSdkStatus.available && 
          envVars.AWS_REGION && 
          envVars.AWS_ACCESS_KEY_ID && 
          envVars.AWS_SECRET_ACCESS_KEY) {
        try {
          console.log('Testing S3 connection...');
          const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
          
          const s3Client = new S3Client({
            region: envVars.AWS_REGION,
            credentials: {
              accessKeyId: envVars.AWS_ACCESS_KEY_ID,
              secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY
            }
          });
          
          // Minimal test with timeout
          const startTime = Date.now();
          const command = new ListBucketsCommand({});
          const response = await Promise.race([
            s3Client.send(command),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('S3 connection timeout')), 5000)
            )
          ]);
          
          s3ConnectionStatus = {
            connected: true,
            responseTime: `${Date.now() - startTime}ms`,
            buckets: response.Buckets?.length || 0
          };
          console.log('S3 connection successful');
        } catch (connError) {
          s3ConnectionStatus = {
            connected: false,
            error: connError instanceof Error ? connError.message : String(connError)
          };
          console.error('S3 connection failed:', connError);
        }
      } else {
        console.log('Skipping S3 connection test due to missing requirements');
      }
      
      // 4. Try to upload a test file
      let uploadTest = { success: false, error: null };
      if (s3ConnectionStatus.connected) {
        try {
          console.log('Performing test upload...');
          const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
          
          const s3Client = new S3Client({
            region: envVars.AWS_REGION,
            credentials: {
              accessKeyId: envVars.AWS_ACCESS_KEY_ID,
              secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY
            }
          });
          
          // Create a simple test file
          const testKey = `test-${Date.now()}.txt`;
          const testContent = Buffer.from('This is a test file from AWS diagnostics');
          
          const uploadCommand = new PutObjectCommand({
            Bucket: envVars.AWS_S3_BUCKET_NAME,
            Key: testKey,
            Body: testContent,
            ContentType: 'text/plain'
          });
          
          const startTime = Date.now();
          await s3Client.send(uploadCommand);
          
          uploadTest = {
            success: true,
            key: testKey,
            uploadTime: `${Date.now() - startTime}ms`
          };
          console.log('Test upload successful');
        } catch (uploadError) {
          uploadTest = {
            success: false,
            error: uploadError instanceof Error ? uploadError.message : String(uploadError)
          };
          console.error('Test upload failed:', uploadError);
        }
      } else {
        console.log('Skipping upload test due to S3 connection failure');
      }
      
      // Return comprehensive diagnostic results
      res.json({
        timestamp: new Date().toISOString(),
        environment: {
          node_env: process.env.NODE_ENV,
          vercel_env: process.env.VERCEL_ENV,
          region: process.env.REGION || process.env.VERCEL_REGION
        },
        aws_environment: envStatus,
        aws_sdk: awsSdkStatus,
        s3_connection: s3ConnectionStatus,
        upload_test: uploadTest,
        overall_status: uploadTest.success ? 'healthy' : 'unhealthy'
      });
    } catch (error) {
      console.error('AWS diagnostic endpoint error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add S3 diagnostic endpoint for troubleshooting
  app.get('/api/s3/diagnostic', async (req, res) => {
    try {
      console.log('Running S3 diagnostic check...');
      
      // Import the S3 service
      const s3Module = await import('./services/s3Service.js');
      const s3Service = s3Module.default;
      
      // Run the diagnostic check
      const diagnosticResult = await s3Module.diagnosticCheck();
      
      // Return the comprehensive diagnostic information
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        diagnosticResult,
        // Add some additional environment information that might be useful
        environment: {
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
          region: process.env.VERCEL_REGION,
          deploymentUrl: process.env.VERCEL_URL
        }
      });
    } catch (error) {
      console.error('Error in S3 diagnostic endpoint:', error);
      return res.status(500).json({
        success: false,
        error: String(error),
        message: 'Failed to run S3 diagnostic check'
      });
    }
  });

  const server = createServer(app);
  return server;
}