import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique(), // Make email nullable for backward compatibility
  password: text("password").notNull(),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationTokenExpires: timestamp("email_verification_token_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetTokenExpires: timestamp("password_reset_token_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  eventTypes: jsonb("event_types").$type<Array<{
    type: string;
    color: string;
    customFields?: Array<{
      id: string;
      name: string;
      type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
      required: boolean;
      defaultValue?: string | number | boolean | null;
      order?: number;
    }>;
  }>>().notNull(),
  timeIncrement: integer("time_increment").notNull().default(15),
  durationIncrement: integer("duration_increment").notNull().default(15),
  defaultEventDuration: integer("default_event_duration").notNull().default(60),
  defaultStartTime: text("default_start_time").notNull().default('09:00'),
  theme: text("theme").notNull().default('system'),
  hidePastEvents: boolean("hide_past_events").notNull().default(false),
  showCategories: boolean("show_categories").notNull().default(true),
  defaultCalendarView: text("default_calendar_view").notNull().default('month'),
  defaultSorting: text("default_sorting").notNull().default('date-asc'),
  defaultTimelineViewType: text("default_timeline_view_type").notNull().default('list'),
  exportFooterText: text("export_footer_text").default(''),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timelines = pgTable("timelines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  type: text("type"),
  location: text("location"),
  categoriesEnabled: boolean("categories_enabled").default(false).notNull(),
  vendorsEnabled: boolean("vendors_enabled").default(false).notNull(),
  customFieldValues: jsonb("custom_field_values").$type<Record<string, string | number | boolean | null>>().default({}).notNull(),
  last_modified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timelineCategories = pgTable("timeline_categories", {
  id: serial("id").primaryKey(),
  timelineId: integer("timeline_id").references(() => timelines.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventTypes = pgTable("event_types", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  color: text("color").notNull().default('#000000'),
  icon: text("icon").notNull().default('event'),
  customFields: jsonb("custom_fields").$type<Array<{
    id: string;
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue?: string | number | boolean | null;
    order?: number;
  }>>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  timelineId: integer("timeline_id").references(() => timelines.id, { onDelete: 'cascade' }).notNull(),
  categoryId: integer("category_id").references(() => timelineCategories.id, { onDelete: 'set null' }),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  duration: text("duration").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  type: text("type").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  events: jsonb("events").$type<Array<{
    startTime: string;
    duration: string;
    title: string;
    description?: string;
    location?: string;
    type: string;
    category?: string;
  }>>().notNull(),
  categories: jsonb("categories").$type<Array<{
    name: string;
    description?: string;
    order: number;
  }>>().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  last_modified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timelineImages = pgTable("timeline_images", {
  id: serial("id").primaryKey(),
  timelineId: integer("timeline_id").references(() => timelines.id, { onDelete: 'cascade' }).notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  order: integer("order").notNull(),
  last_modified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vendorTypes = pgTable("vendor_types", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  customFields: jsonb("custom_fields").$type<Array<{
    id: string;
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue?: string | number | boolean | null;
    order?: number;
  }>>().default([]).notNull(),
  last_modified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  typeId: integer("type_id").references(() => vendorTypes.id, { onDelete: 'set null' }),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  alternativePhone: text("alternative_phone"),
  address: text("address"),
  notes: text("notes"),
  customFieldValues: jsonb("custom_field_values").$type<Record<string, string | number | boolean | null>>().default({}).notNull(),
  last_modified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timelineVendors = pgTable("timeline_vendors", {
  id: serial("id").primaryKey(),
  timelineId: integer("timeline_id").references(() => timelines.id, { onDelete: 'cascade' }).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: 'cascade' }).notNull(),
  last_modified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timelineEventVendors = pgTable("timeline_event_vendors", {
  id: serial("id").primaryKey(),
  timelineEventId: integer("timeline_event_id").references(() => timelineEvents.id, { onDelete: 'cascade' }).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: 'cascade' }).notNull(),
  last_modified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const publicTimelineShares = pgTable("public_timeline_shares", {
  id: serial("id").primaryKey(),
  timelineId: integer("timeline_id").references(() => timelines.id, { onDelete: 'cascade' }).notNull(),
  shareToken: text("share_token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  showVendors: boolean("show_vendors").default(false).notNull(),
});

export const trialUsers = pgTable("trial_users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  additionalInfo: jsonb("additional_info").$type<Record<string, string | number | boolean | null>>().default({}).notNull(),
  convertedToUser: boolean("converted_to_user").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  lemonSqueezyProductId: text("lemon_squeezy_product_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  features: jsonb("features").$type<Array<string>>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscription variants table (for different billing periods like monthly/annual)
export const subscriptionVariants = pgTable("subscription_variants", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  lemonSqueezyVariantId: text("lemon_squeezy_variant_id").notNull(),
  price: integer("price").notNull(), // stored in cents
  interval: text("interval").notNull(), // 'month' or 'year'
  intervalCount: integer("interval_count").notNull().default(1),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lemonSqueezyCustomerId: text("lemon_squeezy_customer_id"),
  lemonSqueezySubscriptionId: text("lemon_squeezy_subscription_id").unique(),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  variantId: integer("variant_id").references(() => subscriptionVariants.id),
  status: text("status").notNull().default('inactive'), // 'on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  timelines: many(timelines),
  eventTypes: many(eventTypes),
  templates: many(templates),
  settings: many(userSettings),
  vendorTypes: many(vendorTypes),
  vendors: many(vendors),
  subscriptions: many(userSubscriptions),
}));

export const timelinesRelations = relations(timelines, ({ one, many }) => ({
  user: one(users, {
    fields: [timelines.userId],
    references: [users.id],
  }),
  events: many(timelineEvents),
  categories: many(timelineCategories),
  images: many(timelineImages),
  vendors: many(timelineVendors),
  publicShares: many(publicTimelineShares),
}));

export const timelineCategoriesRelations = relations(timelineCategories, ({ one, many }) => ({
  timeline: one(timelines, {
    fields: [timelineCategories.timelineId],
    references: [timelines.id],
  }),
  events: many(timelineEvents),
}));

export const timelineEventsRelations = relations(timelineEvents, ({ one, many }) => ({
  timeline: one(timelines, {
    fields: [timelineEvents.timelineId],
    references: [timelines.id],
  }),
  category: one(timelineCategories, {
    fields: [timelineEvents.categoryId],
    references: [timelineCategories.id],
  }),
  vendors: many(timelineEventVendors),
}));

export const eventTypesRelations = relations(eventTypes, ({ one }) => ({
  user: one(users, {
    fields: [eventTypes.userId],
    references: [users.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  user: one(users, {
    fields: [templates.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const timelineImagesRelations = relations(timelineImages, ({ one }) => ({
  timeline: one(timelines, {
    fields: [timelineImages.timelineId],
    references: [timelines.id],
  }),
}));

export const vendorTypesRelations = relations(vendorTypes, ({ one, many }) => ({
  user: one(users, {
    fields: [vendorTypes.userId],
    references: [users.id],
  }),
  vendors: many(vendors),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  type: one(vendorTypes, {
    fields: [vendors.typeId],
    references: [vendorTypes.id],
  }),
  timelineVendors: many(timelineVendors),
  timelineEventVendors: many(timelineEventVendors),
}));

export const timelineVendorsRelations = relations(timelineVendors, ({ one }) => ({
  timeline: one(timelines, {
    fields: [timelineVendors.timelineId],
    references: [timelines.id],
  }),
  vendor: one(vendors, {
    fields: [timelineVendors.vendorId],
    references: [vendors.id],
  }),
}));

export const timelineEventVendorsRelations = relations(timelineEventVendors, ({ one }) => ({
  timelineEvent: one(timelineEvents, {
    fields: [timelineEventVendors.timelineEventId],
    references: [timelineEvents.id],
  }),
  vendor: one(vendors, {
    fields: [timelineEventVendors.vendorId],
    references: [vendors.id],
  }),
}));

export const publicTimelineSharesRelations = relations(publicTimelineShares, ({ one }) => ({
  timeline: one(timelines, {
    fields: [publicTimelineShares.timelineId],
    references: [timelines.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  variants: many(subscriptionVariants),
  userSubscriptions: many(userSubscriptions),
}));

export const subscriptionVariantsRelations = relations(subscriptionVariants, ({ one, many }) => ({
  plan: one(subscriptionPlans, {
    fields: [subscriptionVariants.planId],
    references: [subscriptionPlans.id],
  }),
  userSubscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  variant: one(subscriptionVariants, {
    fields: [userSubscriptions.variantId],
    references: [subscriptionVariants.id],
  }),
}));

// Zod schemas for validation
export const insertTimelineSchema = createInsertSchema(timelines);
export const selectTimelineSchema = createSelectSchema(timelines);
export const insertTimelineCategorySchema = createInsertSchema(timelineCategories);
export const selectTimelineCategorySchema = createSelectSchema(timelineCategories);
export const insertTimelineEventSchema = createInsertSchema(timelineEvents);
export const selectTimelineEventSchema = createSelectSchema(timelineEvents);
export const insertEventTypeSchema = createInsertSchema(eventTypes);
export const selectEventTypeSchema = createSelectSchema(eventTypes);
export const insertTemplateSchema = createInsertSchema(templates);
export const selectTemplateSchema = createSelectSchema(templates);
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const selectUserSettingsSchema = createSelectSchema(userSettings);
export const insertTimelineImageSchema = createInsertSchema(timelineImages);
export const selectTimelineImageSchema = createSelectSchema(timelineImages);
export const insertVendorTypeSchema = createInsertSchema(vendorTypes);
export const selectVendorTypeSchema = createSelectSchema(vendorTypes);
export const insertVendorSchema = createInsertSchema(vendors);
export const selectVendorSchema = createSelectSchema(vendors);
export const insertTimelineVendorSchema = createInsertSchema(timelineVendors);
export const selectTimelineVendorSchema = createSelectSchema(timelineVendors);
export const insertTimelineEventVendorSchema = createInsertSchema(timelineEventVendors);
export const selectTimelineEventVendorSchema = createSelectSchema(timelineEventVendors);
export const insertPublicTimelineShareSchema = createInsertSchema(publicTimelineShares);
export const selectPublicTimelineShareSchema = createSelectSchema(publicTimelineShares);
export const insertTrialUserSchema = createInsertSchema(trialUsers);
export const selectTrialUserSchema = createSelectSchema(trialUsers);
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const selectSubscriptionPlanSchema = createSelectSchema(subscriptionPlans);
export const insertSubscriptionVariantSchema = createInsertSchema(subscriptionVariants);
export const selectSubscriptionVariantSchema = createSelectSchema(subscriptionVariants);
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions);
export const selectUserSubscriptionSchema = createSelectSchema(userSubscriptions);

// TypeScript types
export type InsertTimeline = typeof timelines.$inferInsert;
export type SelectTimeline = typeof timelines.$inferSelect;
export type InsertTimelineCategory = typeof timelineCategories.$inferInsert;
export type SelectTimelineCategory = typeof timelineCategories.$inferSelect;
export type InsertTimelineEvent = typeof timelineEvents.$inferInsert;
export type SelectTimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertEventType = typeof eventTypes.$inferInsert;
export type SelectEventType = typeof eventTypes.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
export type SelectTemplate = typeof templates.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type SelectUserSettings = typeof userSettings.$inferSelect;
export type InsertTimelineImage = typeof timelineImages.$inferInsert;
export type SelectTimelineImage = typeof timelineImages.$inferSelect;
export type InsertVendorType = typeof vendorTypes.$inferInsert;
export type SelectVendorType = typeof vendorTypes.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;
export type SelectVendor = typeof vendors.$inferSelect;
export type InsertTimelineVendor = typeof timelineVendors.$inferInsert;
export type SelectTimelineVendor = typeof timelineVendors.$inferSelect;
export type InsertTimelineEventVendor = typeof timelineEventVendors.$inferInsert;
export type SelectTimelineEventVendor = typeof timelineEventVendors.$inferSelect;
export type InsertPublicTimelineShare = typeof publicTimelineShares.$inferInsert;
export type SelectPublicTimelineShare = typeof publicTimelineShares.$inferSelect;
export type InsertTrialUser = typeof trialUsers.$inferInsert;
export type SelectTrialUser = typeof trialUsers.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SelectSubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionVariant = typeof subscriptionVariants.$inferInsert;
export type SelectSubscriptionVariant = typeof subscriptionVariants.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;
export type SelectUserSubscription = typeof userSubscriptions.$inferSelect;