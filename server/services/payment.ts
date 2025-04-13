import {
  lemonSqueezySetup,
  getAuthenticatedUser,
  getStore,
  getProduct,
  getVariant,
  getCustomer,
  getSubscription,
  createCheckout,
} from "@lemonsqueezy/lemonsqueezy.js";
import { db } from "../../db/index.js";
import { 
  users,
  subscriptionPlans,
  subscriptionVariants,
  userSubscriptions,
  type SelectSubscriptionPlan,
  type InsertSubscriptionPlan
} from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

// Initialize Lemon Squeezy
lemonSqueezySetup({
  apiKey: process.env.LEMON_SQUEEZY_API_KEY || '',
  onError: (error) => console.error("Lemon Squeezy Error:", error),
});

export type SubscriptionStatus = 
  'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' | 'inactive';

export type CheckoutUrlResponse = {
  url: string;
  error?: string;
};

/**
 * Initialize payment service and fetch/create plans from Lemon Squeezy
 */
export const initializePaymentService = async () => {
  try {
    // Verify Lemon Squeezy API connection
    const { data, error } = await getAuthenticatedUser();
    
    if (error) {
      console.error("Failed to authenticate with Lemon Squeezy:", error.message);
      return false;
    }
    
    console.log("Lemon Squeezy API connected successfully");
    
    // Sync plans with database (could be expanded to sync from Lemon Squeezy API)
    await syncPlansWithDatabase();
    
    // Ensure we have a webhook registered for subscription events
    await ensureWebhookSetup();
    
    return true;
  } catch (error) {
    console.error("Error initializing payment service:", error);
    return false;
  }
};

/**
 * Ensure webhook is properly set up to receive Lemon Squeezy events
 */
const ensureWebhookSetup = async () => {
  try {
    // Make a request to the Lemon Squeezy API to set up a webhook
    // Using the webhook URL provided by the user: /webhooks
    const webhookUrl = `${process.env.APP_URL || 'https://chronolio.replit.app'}/webhooks`;
    const headers = {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`
    };
    
    // First, check if we already have a webhook set up
    const response = await fetch('https://api.lemonsqueezy.com/v1/webhooks', {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      console.error(`Failed to check webhooks: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const webhooks = await response.json();
    const existingWebhook = webhooks.data?.find((webhook: any) => 
      webhook.attributes.url === webhookUrl
    );
    
    if (existingWebhook) {
      console.log(`Webhook already registered for ${webhookUrl}`);
      return true;
    }
    
    // Get first store ID (for demo - in production would use specific store)
    const storeResponse = await fetch('https://api.lemonsqueezy.com/v1/stores', {
      method: 'GET',
      headers
    });
    
    if (!storeResponse.ok) {
      console.error(`Failed to get stores: ${storeResponse.status} ${storeResponse.statusText}`);
      return false;
    }
    
    const stores = await storeResponse.json();
    if (!stores.data || !stores.data.length) {
      console.error('No stores found in Lemon Squeezy account');
      return false;
    }
    
    const storeId = stores.data[0].id;
    
    // Create a webhook for subscription events
    const webhookResponse = await fetch('https://api.lemonsqueezy.com/v1/webhooks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          type: "webhooks",
          attributes: {
            url: webhookUrl,
            events: [
              "subscription_created",
              "subscription_updated",
              "subscription_cancelled",
              "subscription_resumed",
              "subscription_expired",
              "subscription_paused",
              "subscription_unpaused",
              "order_created",
              "order_refunded"
            ],
            secret: process.env.LEMON_SQUEEZY_API_KEY?.substring(0, 20) || "webhook-secret" // Use part of API key as secret
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: storeId
              }
            }
          }
        }
      })
    });
    
    if (!webhookResponse.ok) {
      console.error(`Failed to create webhook: ${webhookResponse.status} ${webhookResponse.statusText}`);
      const error = await webhookResponse.json();
      console.error('Webhook error details:', error);
      return false;
    }
    
    console.log(`Successfully registered webhook for ${webhookUrl}`);
    return true;
  } catch (error) {
    console.error('Error setting up webhook:', error);
    return false;
  }
};

/**
 * Sync plans with database (this would usually pull data from Lemon Squeezy API)
 * For now, we're just creating placeholder data if none exists
 */
const syncPlansWithDatabase = async () => {
  try {
    // Check if plans exist
    const existingPlans = await db.select().from(subscriptionPlans);
    
    if (existingPlans.length === 0) {
      // No plans found, create default plans
      // In a real implementation, you'd fetch these from Lemon Squeezy API
      
      // Add Premium Plan
      const [premiumPlan] = await db.insert(subscriptionPlans).values({
        name: 'Premium Plan',
        description: 'Full access to all features',
        lemonSqueezyProductId: 'premium-plan', // Replace with real product ID
        features: ['Unlimited timelines', 'Unlimited vendors', 'Export to PDF', 'Premium support'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      // Add variants for Premium Plan
      await db.insert(subscriptionVariants).values([
        {
          planId: premiumPlan.id,
          name: 'Monthly',
          lemonSqueezyVariantId: 'premium-monthly', // Replace with real variant ID
          price: 2900, // $29.99
          interval: 'month',
          intervalCount: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          planId: premiumPlan.id,
          name: 'Annual',
          lemonSqueezyVariantId: 'premium-annual', // Replace with real variant ID
          price: 23900, // $239.99
          interval: 'year',
          intervalCount: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]);
      
      console.log("Created default subscription plans");
    } else {
      console.log("Using existing subscription plans");
    }
    
    return true;
  } catch (error) {
    console.error("Error syncing plans with database:", error);
    return false;
  }
};

/**
 * Get all available subscription plans
 */
export const getSubscriptionPlans = async () => {
  try {
    // Get all active plans with their variants
    const plans = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));
    
    // For each plan, get its variants
    const plansWithVariants = await Promise.all(
      plans.map(async (plan) => {
        const variants = await db.select().from(subscriptionVariants)
          .where(
            and(
              eq(subscriptionVariants.planId, plan.id),
              eq(subscriptionVariants.isActive, true)
            )
          );
        
        return {
          ...plan,
          variants,
        };
      })
    );
    
    return plansWithVariants;
  } catch (error) {
    console.error("Error getting subscription plans:", error);
    return [];
  }
};

/**
 * Update a subscription variant
 */
export const updateSubscriptionVariant = async (
  variantId: number,
  updates: {
    name?: string;
    price?: number;
    isActive?: boolean;
    lemonSqueezyVariantId?: string;
  }
) => {
  try {
    // Verify the variant exists
    const existingVariant = await db.select().from(subscriptionVariants)
      .where(eq(subscriptionVariants.id, variantId))
      .limit(1);
      
    if (!existingVariant.length) {
      return { success: false, error: 'Variant not found' };
    }
    
    // Update the variant
    await db.update(subscriptionVariants)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionVariants.id, variantId));
    
    return { success: true };
  } catch (error) {
    console.error("Error updating subscription variant:", error);
    return { success: false, error: 'Failed to update variant' };
  }
};

/**
 * Get a user's current subscription
 */
export const getUserSubscription = async (userId: number) => {
  try {
    const subscription = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .limit(1);
    
    if (subscription.length === 0) {
      return null;
    }
    
    const [userSubscription] = subscription;
    
    // Get plan and variant details
    const plan = userSubscription.planId 
      ? await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, userSubscription.planId)).limit(1)
      : null;
      
    const variant = userSubscription.variantId
      ? await db.select().from(subscriptionVariants).where(eq(subscriptionVariants.id, userSubscription.variantId)).limit(1)
      : null;
    
    return {
      ...userSubscription,
      plan: plan ? plan[0] : null,
      variant: variant ? variant[0] : null,
    };
  } catch (error) {
    console.error("Error getting user subscription:", error);
    return null;
  }
};

/**
 * Create a checkout URL for a subscription
 */
export const createSubscriptionCheckout = async (
  userId: number,
  variantId: number
): Promise<CheckoutUrlResponse> => {
  try {
    // Get the user
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!userResult.length) {
      return { url: '', error: 'User not found' };
    }
    
    const user = userResult[0];
    
    // Get the variant
    const variantResult = await db.select().from(subscriptionVariants)
      .where(eq(subscriptionVariants.id, variantId))
      .limit(1);
    
    if (!variantResult.length) {
      return { url: '', error: 'Subscription variant not found' };
    }
    
    const variant = variantResult[0];
    
    // Construct the checkout URL directly
    // This is a simplified approach that doesn't require the Lemon Squeezy SDK
    const checkoutUrl = `https://chronolio.lemonsqueezy.com/buy/493c4f30-a5ed-49d5-b2a6-5bc9d874843e?checkout[email]=${encodeURIComponent(user.email || '')}&checkout[custom][userId]=${userId}&checkout[custom][billingInterval]=${variant.interval}&checkout[custom][variantId]=${variant.id}`;
    
    console.log("Generated checkout URL:", checkoutUrl);
    return { url: checkoutUrl };
  } catch (error: any) {
    console.error("Error creating subscription checkout:", error);
    return { url: '', error: error.message || 'Failed to create checkout' };
  }
};

/**
 * Update a user's subscription status
 */
export const updateSubscriptionStatus = async (
  userId: number,
  lemonSqueezySubscriptionId: string,
  status: SubscriptionStatus,
  planId: number,
  variantId: number,
  periodStart?: Date,
  periodEnd?: Date,
  lemonSqueezyCustomerId?: string
) => {
  try {
    console.log(`Updating subscription for user ${userId}, subscription ${lemonSqueezySubscriptionId} to ${status}`);
    
    // Get the variant details to calculate proper period end if not provided
    const variantResult = await db.select().from(subscriptionVariants)
      .where(eq(subscriptionVariants.id, variantId))
      .limit(1);
    
    if (!variantResult.length) {
      console.error(`Could not find variant with ID ${variantId}`);
      return false;
    }
    
    const variant = variantResult[0];
    let calculatedPeriodEnd = periodEnd;
    let trialEndsAt = null;
    
    // Calculate period end if not provided based on interval
    if (!calculatedPeriodEnd && periodStart) {
      const now = new Date();
      if (status === 'on_trial') {
        // Default trial period is 7 days if not specified
        const trialDays = 7;
        trialEndsAt = new Date(periodStart);
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
        calculatedPeriodEnd = trialEndsAt;
        console.log(`Trial subscription will end on ${calculatedPeriodEnd}`);
      } else {
        // Calculate based on variant interval
        calculatedPeriodEnd = new Date(periodStart);
        if (variant.interval === 'month') {
          calculatedPeriodEnd.setMonth(calculatedPeriodEnd.getMonth() + 1);
        } else if (variant.interval === 'year') {
          calculatedPeriodEnd.setFullYear(calculatedPeriodEnd.getFullYear() + 1);
        }
        console.log(`Regular subscription period calculated to end on ${calculatedPeriodEnd}`);
      }
    }
    
    // First check if we have an existing subscription with this Lemon Squeezy ID
    const subscriptionWithLsId = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.lemonSqueezySubscriptionId, lemonSqueezySubscriptionId))
      .limit(1);
    
    if (subscriptionWithLsId.length > 0) {
      console.log(`Found existing subscription with Lemon Squeezy ID ${lemonSqueezySubscriptionId}`);
      // Update the existing subscription that matches the Lemon Squeezy ID
      await db.update(userSubscriptions)
        .set({
          userId, // Ensure the user ID is updated (for cases where it was missing)
          lemonSqueezyCustomerId: lemonSqueezyCustomerId || subscriptionWithLsId[0].lemonSqueezyCustomerId,
          status,
          planId,
          variantId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: calculatedPeriodEnd,
          trialEndsAt: status === 'on_trial' ? trialEndsAt : null,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.lemonSqueezySubscriptionId, lemonSqueezySubscriptionId));
      
      return true;
    }
    
    // Check if the user already has a subscription (regardless of Lemon Squeezy ID)
    const existingSubscription = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .limit(1);
    
    if (existingSubscription.length > 0) {
      console.log(`User ${userId} has existing subscription, updating with new Lemon Squeezy ID`);
      // Update existing subscription with the new Lemon Squeezy ID
      await db.update(userSubscriptions)
        .set({
          lemonSqueezySubscriptionId,
          lemonSqueezyCustomerId: lemonSqueezyCustomerId || existingSubscription[0].lemonSqueezyCustomerId,
          status,
          planId,
          variantId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: calculatedPeriodEnd,
          trialEndsAt: status === 'on_trial' ? trialEndsAt : null,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.userId, userId));
    } else {
      console.log(`Creating new subscription for user ${userId}`);
      // Create new subscription
      await db.insert(userSubscriptions).values({
        userId,
        lemonSqueezySubscriptionId,
        lemonSqueezyCustomerId,
        status,
        planId,
        variantId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: calculatedPeriodEnd,
        trialEndsAt: status === 'on_trial' ? trialEndsAt : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error updating subscription status:", error);
    return false;
  }
};

/**
 * Handle webhook events from Lemon Squeezy
 */
export const handleWebhookEvent = async (event: any) => {
  try {
    const eventName = event.meta.event_name;
    const data = event.data;
    
    console.log(`Processing webhook event: ${eventName}`);
    
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_payment_success':
        // Handle subscription created/updated or payment success
        const subscription = data.attributes;
        
        // Extract customData and userId from the event payload
        // This might be in different places depending on the event structure
        // First try to find it in meta data (newer webhook format)
        let userId: number | null = null;
        let billingInterval: string | undefined = undefined;
        
        // For payment success events, the user_id is often in meta.custom_data
        if (event.meta && event.meta.custom_data && event.meta.custom_data.user_id) {
          userId = parseInt(event.meta.custom_data.user_id);
          console.log(`Found userId ${userId} in meta.custom_data`);
        }
        
        // Special handling for subscription_payment_success event
        if (eventName === 'subscription_payment_success') {
          console.log("Processing payment success event");
          
          // For payment_success events, subscription info is in a different location
          const subscriptionId = subscription.subscription_id;
          const userEmail = subscription.user_email;
          
          console.log(`Payment success details - Subscription ID: ${subscriptionId}, Email: ${userEmail}`);
          
          if (!subscriptionId) {
            console.error("No subscription ID found in payment success webhook");
            return false;
          }
          
          // Get the subscription details from Lemon Squeezy to update our database
          try {
            console.log(`Fetching subscription details for ${subscriptionId} from Lemon Squeezy`);
            const headers = {
              'Accept': 'application/vnd.api+json',
              'Content-Type': 'application/vnd.api+json',
              'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`
            };
            
            const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
              method: 'GET',
              headers
            });
            
            if (!response.ok) {
              console.error(`Failed to fetch subscription details: ${response.status} ${response.statusText}`);
            } else {
              const data = await response.json();
              console.log("Subscription details fetched successfully");
              
              // Extract subscription attributes
              const subAttributes = data?.data?.attributes;
              if (subAttributes) {
                // Use these attributes to update our subscription
                subscription.status = subAttributes.status;
                subscription.product_id = subAttributes.product_id;
                subscription.variant_id = subAttributes.variant_id;
                subscription.customer_id = subAttributes.customer_id;
                subscription.user_email = subAttributes.user_email;
                subscription.renews_at = subAttributes.renews_at;
                subscription.ends_at = subAttributes.ends_at;
                subscription.id = subscriptionId;
                
                console.log("Updated subscription data from API:", JSON.stringify(subscription, null, 2));
              }
            }
          } catch (error) {
            console.error("Error fetching subscription details:", error);
            // Continue with the information we have
          }
          
          // If we don't have a user ID yet, find the subscription in our database
          if (!userId) {
            // First try to find by subscription ID
            const subscriptionResult = await db.select().from(userSubscriptions)
              .where(eq(userSubscriptions.lemonSqueezySubscriptionId, subscriptionId.toString()))
              .limit(1);
              
            if (subscriptionResult.length > 0) {
              userId = subscriptionResult[0].userId;
              console.log(`Found user ID ${userId} from existing subscription record`);
            } 
            // If not found, try to find by email
            else if (userEmail) {
              const userResult = await db.select().from(users)
                .where(eq(users.email, userEmail))
                .limit(1);
                
              if (userResult.length > 0) {
                userId = userResult[0].id;
                console.log(`Found user ID ${userId} by email ${userEmail}`);
              }
            }
          }
        }
        
        // Check other possible locations for the userId
        if (!userId && subscription.custom_data && subscription.custom_data.userId) {
          userId = parseInt(subscription.custom_data.userId);
          billingInterval = subscription.custom_data.billingInterval;
        } else if (!userId && subscription.first_order_item && 
                   subscription.first_order_item.custom_data && 
                   subscription.first_order_item.custom_data.userId) {
          userId = parseInt(subscription.first_order_item.custom_data.userId);
          billingInterval = subscription.first_order_item.custom_data.billingInterval;
        } else if (!userId && subscription.user_email && 
                   subscription.user_email.customData && 
                   subscription.user_email.customData.userId) {
          userId = parseInt(subscription.user_email.customData.userId);
          billingInterval = subscription.user_email.customData.billingInterval;
        }
        
        // Log full event data for debugging
        console.log("Webhook subscription data:", JSON.stringify(subscription, null, 2));
        
        if (!userId) {
          console.error("No user ID found in webhook payload. Attempting to find user by email...");
          
          // Try to find user by email if available
          if (subscription.user_email) {
            const userEmail = subscription.user_email;
            const userResult = await db.select().from(users)
              .where(eq(users.email, userEmail))
              .limit(1);
              
            if (userResult.length > 0) {
              userId = userResult[0].id;
              console.log(`Found user with ID ${userId} by email ${userEmail}`);
            } else {
              console.error(`No user found with email ${userEmail}`);
              return false;
            }
          } else {
            console.error("No user email available to find user");
            return false;
          }
        }
        
        // Get the plan and variant from our database
        // First try exact match
        let planResult = await db.select().from(subscriptionPlans)
          .where(eq(subscriptionPlans.lemonSqueezyProductId, subscription.product_id.toString()))
          .limit(1);
          
        // If no plan found, use the first active plan (fallback for testing)
        if (!planResult.length) {
          console.log(`No plan found for product ID ${subscription.product_id}, using first active plan`);
          planResult = await db.select().from(subscriptionPlans)
            .where(eq(subscriptionPlans.isActive, true))
            .limit(1);
        }
        
        let variantResult = await db.select().from(subscriptionVariants)
          .where(eq(subscriptionVariants.lemonSqueezyVariantId, subscription.variant_id.toString()))
          .limit(1);
        
        // If no variant found, try to determine by interval
        if (!variantResult.length && planResult.length > 0) {
          const interval = subscription.billing_interval || subscription.variant_interval || 'month';
          console.log(`No variant found for variant ID ${subscription.variant_id}, looking for ${interval} variant`);
          
          variantResult = await db.select().from(subscriptionVariants)
            .where(
              and(
                eq(subscriptionVariants.planId, planResult[0].id),
                eq(subscriptionVariants.interval, interval)
              )
            )
            .limit(1);
        }
        
        if (!planResult.length || !variantResult.length) {
          console.error("Plan or variant not found even after fallback search");
          return false;
        }
        
        // Determine subscription status (active, on_trial, etc.)
        let status: SubscriptionStatus = subscription.status as SubscriptionStatus;
        if (!status) {
          status = 'active'; // Default to active if status not provided
        }
        
        // Make sure we have a valid subscription ID
        if (!subscription.id) {
          console.error("Missing subscription ID in webhook payload");
          return false;
        }
        
        // Create a safe subscription ID string
        const subscriptionId = String(subscription.id);
        
        // Update the subscription in our database
        await updateSubscriptionStatus(
          userId,
          subscriptionId,
          status,
          planResult[0].id,
          variantResult[0].id,
          subscription.renews_at ? new Date(subscription.renews_at) : new Date(),
          subscription.ends_at ? subscription.ends_at ? new Date(subscription.ends_at) : undefined : undefined,
          subscription.customer_id ? String(subscription.customer_id) : undefined
        );
        
        break;
        
      case 'subscription_cancelled':
        // Handle subscription cancelled
        const cancelledSubscription = data.attributes;
        
        // Make sure we have a valid subscription ID
        if (!cancelledSubscription || !cancelledSubscription.id) {
          console.error("Missing subscription ID in cancellation webhook payload");
          return false;
        }
        
        // Create a safe subscription ID string
        const cancelledSubId = String(cancelledSubscription.id);
        
        // Find subscription in our database
        const subResult = await db.select().from(userSubscriptions)
          .where(eq(userSubscriptions.lemonSqueezySubscriptionId, cancelledSubId))
          .limit(1);
          
        if (!subResult.length) {
          console.error(`Subscription not found for cancellation: ${cancelledSubId}`);
          return false;
        }
        
        // Update the subscription status
        await db.update(userSubscriptions)
          .set({
            status: 'cancelled',
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.lemonSqueezySubscriptionId, cancelledSubId));
          
        break;
        
      // Add more event handlers as needed
        
      default:
        console.log(`Unhandled webhook event: ${eventName}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error handling webhook event:", error);
    return false;
  }
};