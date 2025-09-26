
/**
 * Enhanced analytics tracking function
 * This can be replaced with a real analytics implementation like Google Analytics or Mixpanel
 */

// Track recently sent events to prevent duplicates
const recentlyTrackedEvents = new Map();
const DUPLICATE_PREVENTION_WINDOW = 2000; // 2 seconds window to prevent duplicates

export const trackEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  // Create a unique key for this event type + properties to detect duplicates
  const eventKey = `${eventName}-${JSON.stringify(properties)}`;
  const now = Date.now();
  
  // Check if this exact event was tracked recently
  if (recentlyTrackedEvents.has(eventKey)) {
    const lastTrackedTime = recentlyTrackedEvents.get(eventKey);
    if (now - lastTrackedTime < DUPLICATE_PREVENTION_WINDOW) {
      console.log(`[Analytics] Skipping duplicate event: ${eventName}`);
      return; // Skip duplicate event
    }
  }
  
  // Store this event in recently tracked map
  recentlyTrackedEvents.set(eventKey, now);
  
  // Clean up old events from the map (basic garbage collection)
  for (const [key, timestamp] of recentlyTrackedEvents.entries()) {
    if (now - timestamp > DUPLICATE_PREVENTION_WINDOW) {
      recentlyTrackedEvents.delete(key);
    }
  }
  
  // Log the event to the console for development
  // console.log(`[Analytics] Event: ${eventName}`, properties);
  
  try {
    // Add timestamp to event properties
    const eventProperties = {
      ...properties,
      user_id: properties.user_id || null,
      timestamp: new Date().toISOString()
    };
    
    // Mock successful tracking without actually making a network request that might fail
    // console.log(`[Analytics] Sending tracking data for: ${eventName}`, eventProperties);
    
    // Contact integration specific events
    if (
      eventName === 'contacts_viewed' || 
      eventName === 'contact_selected' || 
      eventName === 'invite_sent'
    ) {
      console.log('Tracking contacts integration event:', eventName);
    }
    
    // Comment out the actual request to prevent errors in development
    // In production, you would uncomment this and add proper error handling
    /*
    const response = await fetch('https://rnctzmgmoopmfohdypcb.supabase.co/functions/v1/track-analytics-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventName,
        properties: eventProperties
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Analytics tracking failed: ${response.statusText || 'Unknown error'}`);
    }
    */
    
    // Additional tracking for gamification events
    if (
      eventName === 'tier_upgraded' || 
      eventName === 'badge_earned' || 
      eventName === 'streak_updated'
    ) {
      console.log('Tracking gamification event:', eventName);
    }
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    // Don't throw the error further, just log it to prevent UI disruption
  }
};
