import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { 
  getSubscriptionPlans, 
  getUserSubscription, 
  createSubscriptionCheckout,
  handleWebhookEvent,
  updateSubscriptionVariant,
  checkAndUpdateExpiredTrials,
  type CheckoutUrlResponse,
  type SubscriptionStatus
} from '../services/payment.js';
import { getSubscription } from "@lemonsqueezy/lemonsqueezy.js";
import { db } from "../../db/index.js";
import { userSubscriptions } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await getSubscriptionPlans();
    res.json(plans);
  } catch (error: any) {
    console.error('Error getting subscription plans:', error);
    res.status(500).json({ error: error.message || 'Failed to get subscription plans' });
  }
});

// Get the current user's subscription
router.get('/user', requireAuth, async (req, res) => {
  try {
    const subscription = await getUserSubscription(req.user!.id);
    res.json(subscription);
  } catch (error: any) {
    console.error('Error getting user subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to get user subscription' });
  }
});

// Create a checkout session for a subscription
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { variantId } = req.body;
    
    if (!variantId) {
      return res.status(400).json({ error: 'Variant ID is required' });
    }
    
    const checkoutResponse = await createSubscriptionCheckout(req.user!.id, variantId);
    
    if (checkoutResponse.error) {
      return res.status(400).json({ error: checkoutResponse.error });
    }
    
    res.json({ url: checkoutResponse.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

// Get the customer portal URL for a subscription
router.get('/portal', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Getting customer portal URL for user...');
    const userId = req.user!.id;
    console.log(`👤 User ID: ${userId}`);
    
    // Get the user's subscription from our database
    const subscription = await getUserSubscription(userId);
    console.log(`📋 User subscription found:`, JSON.stringify(subscription, null, 2));
    
    if (!subscription || !subscription.lemonSqueezySubscriptionId) {
      console.error('❌ No subscription or Lemon Squeezy subscription ID found');
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    console.log(`🍋 Fetching subscription details from Lemon Squeezy for ID: ${subscription.lemonSqueezySubscriptionId}`);

    // Use Lemon Squeezy SDK to get the subscription details
    const lemonSqueezyResponse = await getSubscription(subscription.lemonSqueezySubscriptionId);
    
    // Log the full response for debugging
    console.log('🍋 Lemon Squeezy API Response:', JSON.stringify(lemonSqueezyResponse, null, 2));
    
    // Check if we have a valid response
    if (!lemonSqueezyResponse || lemonSqueezyResponse.error) {
      console.error('❌ Error fetching subscription details:', lemonSqueezyResponse?.error);
      return res.status(500).json({ error: 'Failed to fetch subscription details from Lemon Squeezy' });
    }
    
    // Access the correct path to customer portal URL based on the API response format
    // Accessing the data object first
    if (!lemonSqueezyResponse.data) {
      console.error('❌ No data found in API response');
      return res.status(404).json({ error: 'No data found in API response' });
    }
    
    // Based on the Lemon Squeezy API structure from debug logs, we need to navigate:
    // lemonSqueezyResponse.data.data.attributes.urls.customer_portal
    
    let portalUrl: string | null = null;
    
    // Log the entire structure for debugging
    console.log('🔍 Full response structure:', JSON.stringify(lemonSqueezyResponse, null, 2));
    
    // Look for customer_portal using the correct nesting structure
    if (
      lemonSqueezyResponse.data &&
      lemonSqueezyResponse.data.data &&
      lemonSqueezyResponse.data.data.attributes &&
      lemonSqueezyResponse.data.data.attributes.urls &&
      lemonSqueezyResponse.data.data.attributes.urls.customer_portal
    ) {
      portalUrl = lemonSqueezyResponse.data.data.attributes.urls.customer_portal;
      console.log('✅ Found customer portal URL at correct path:', portalUrl);
    }
    
    // If we didn't find it in the expected path, log detailed diagnostic information
    if (!portalUrl) {
      console.log('⚠️ Could not find portal URL at expected path, checking response structure');
      
      // Log detailed structure for debugging
      if (lemonSqueezyResponse.data) {
        console.log('📊 Data keys:', Object.keys(lemonSqueezyResponse.data));
        
        if (lemonSqueezyResponse.data.data) {
          console.log('📊 Data.data keys:', Object.keys(lemonSqueezyResponse.data.data));
          
          if (lemonSqueezyResponse.data.data.attributes) {
            console.log('📊 Data.data.attributes keys:', Object.keys(lemonSqueezyResponse.data.data.attributes));
            
            if (lemonSqueezyResponse.data.data.attributes.urls) {
              console.log('📊 Data.data.attributes.urls keys:', 
                Object.keys(lemonSqueezyResponse.data.data.attributes.urls));
            } else {
              console.log('❌ No urls object found in data.data.attributes');
            }
          } else {
            console.log('❌ No attributes object found in data.data');
          }
        } else {
          console.log('❌ No data object found in response.data');
        }
      }
    }
    
    console.log('🔗 Customer portal URL found:', portalUrl);
    
    if (!portalUrl) {
      console.error('❌ Customer portal URL not found in any response structure');
      return res.status(404).json({ error: 'Customer portal URL not found in API response' });
    }
    
    // Return the portal URL to the client
    res.json({ url: portalUrl });
  } catch (error: any) {
    console.error('Error getting customer portal URL:', error);
    res.status(500).json({ error: error.message || 'Failed to get customer portal URL' });
  }
});

// Update a subscription variant
router.patch('/variants/:id', async (req, res) => {
  try {
    const variantId = parseInt(req.params.id);
    
    if (isNaN(variantId)) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }
    
    const { name, price, isActive, lemonSqueezyVariantId } = req.body;
    const updates: any = {};
    
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (isActive !== undefined) updates.isActive = isActive;
    if (lemonSqueezyVariantId !== undefined) updates.lemonSqueezyVariantId = lemonSqueezyVariantId;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const result = await updateSubscriptionVariant(variantId, updates);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error updating subscription variant:', error);
    res.status(500).json({ error: error.message || 'Failed to update subscription variant' });
  }
});

// Webhook endpoint for Lemon Squeezy events
router.post('/webhooks', async (req, res) => {
  try {
    console.log('Received webhook request');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Basic verification that this is a valid webhook request
    if (!req.body || !req.body.meta || !req.body.meta.event_name) {
      console.error('Invalid webhook payload format');
      return res.status(400).json({ error: 'Invalid webhook payload format' });
    }
    
    // Log the event type
    console.log(`Processing webhook event: ${req.body.meta.event_name}`);
    
    // Verify webhook signature if available
    const signature = req.headers['x-signature'];
    if (signature) {
      // In production, verify the signature
      // if (!verifyWebhookSignature(signature, req.body)) {
      //   return res.status(401).json({ error: 'Invalid webhook signature' });
      // }
      console.log('Webhook signature received:', signature);
    } else {
      console.log('No webhook signature found in request headers');
    }
    
    // Process the webhook event
    const success = await handleWebhookEvent(req.body);
    
    if (!success) {
      console.error('Failed to process webhook event');
      // Still return 200 to Lemon Squeezy so it doesn't retry (we've logged the issue)
      return res.status(200).json({ 
        success: false, 
        message: 'Webhook received but processing failed. Event has been logged.' 
      });
    }
    
    console.log('Webhook processed successfully');
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // Still return 200 to avoid retries, but log the error
    res.status(200).json({ 
      success: false, 
      message: 'Webhook received but processing failed with error. Event has been logged.' 
    });
  }
});

// Check and update expired trials
router.post('/check-expired-trials', requireAuth, async (req, res) => {
  try {
    // Check if user is an admin (adjust as needed based on your user roles system)
    if (req.user!.role !== 'admin' && req.user!.id !== 1) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    console.log('Starting check for all expired trial subscriptions');
    
    // Get all subscriptions in trial mode
    const trialSubscriptions = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.status, 'on_trial'));
    
    console.log(`Found ${trialSubscriptions.length} subscriptions in trial mode`);
    
    // Process each subscription
    const results = [];
    for (const subscription of trialSubscriptions) {
      const wasUpdated = await checkAndUpdateExpiredTrials(subscription.userId);
      results.push({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        wasUpdated
      });
    }
    
    // Return results
    res.json({
      message: `Processed ${trialSubscriptions.length} trial subscriptions`,
      updatedCount: results.filter(r => r.wasUpdated).length,
      results
    });
  } catch (error: any) {
    console.error('Error checking expired trials:', error);
    res.status(500).json({ error: error.message || 'Failed to check expired trials' });
  }
});

export default router;