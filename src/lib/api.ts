/**
 * API helper functions for making authenticated requests
 */

// Add type definition at the top of the file with other types
export interface PublicShareResponse {
  id: number;
  timelineId: number;
  shareToken: string;
  isEnabled: boolean;
  showVendors: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
}

/**
 * Makes an authenticated request to the API
 * @param url The URL to fetch
 * @param options Additional fetch options
 * @returns The fetch response
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Ensure credentials are included
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  };

  try {
    console.log(`Making authenticated request to ${url} with method ${options.method || 'GET'}`);
    const response = await fetch(url, fetchOptions);
    
    // Handle authentication errors
    if (response.status === 401) {
      console.error('Authentication error: User not logged in');
      // Redirect to login page if not authenticated
      window.location.href = '/auth';
      throw new Error('You must be logged in to perform this action');
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Creates a public share for a timeline
 * @param timelineId The ID of the timeline to share
 * @param showVendors Whether to show vendors in the public view
 * @param expiresAt Optional ISO date string for when the share expires
 * @returns The share data including token
 */
export async function createPublicShare(
  timelineId: number, 
  showVendors: boolean, 
  expiresAt?: string | null
): Promise<PublicShareResponse> {
  console.log(`Creating public share for timeline ${timelineId} with showVendors=${showVendors}, expiresAt=${expiresAt || 'none'}`);
  try {
    const response = await fetchWithAuth(`/api/timelines/${timelineId}/public-share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        showVendors,
        expiresAt
      }),
    });

    console.log("API response status:", response.status);
    
    if (!response.ok) {
      throw new Error(`Error creating public share: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Public share creation successful:", data);
    return data;
  } catch (error) {
    console.error("Error in createPublicShare:", error);
    throw error;
  }
}

/**
 * Checks if a timeline has a public share
 * @param timelineId The ID of the timeline to check
 * @returns The share data if exists, null otherwise
 */
export async function getPublicShare(timelineId: number): Promise<PublicShareResponse | null> {
  const response = await fetchWithAuth(`/api/timelines/${timelineId}/public-share`);
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to get public share: ${response.status} ${errorText}`);
    throw new Error(`Failed to get public share: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Gets the status of a public share (active, expired, etc.)
 * @param timelineId The ID of the timeline
 * @returns Share status information
 */
export async function getPublicShareStatus(timelineId: number): Promise<{
  isShared: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  shareToken: string | null;
}> {
  try {
    const share = await getPublicShare(timelineId);
    
    if (!share || !share.isEnabled) {
      return {
        isShared: false,
        isExpired: false,
        expiresAt: null,
        shareToken: null
      };
    }
    
    // Check if expired
    const isExpired = share.expiresAt 
      ? new Date(share.expiresAt) < new Date() 
      : false;
      
    return {
      isShared: true,
      isExpired,
      expiresAt: share.expiresAt || null,
      shareToken: share.shareToken
    };
  } catch (error) {
    console.error("Error checking share status:", error);
    return {
      isShared: false,
      isExpired: false,
      expiresAt: null,
      shareToken: null
    };
  }
}

/**
 * Revokes a public share for a timeline
 * @param timelineId The ID of the timeline
 */
export async function revokePublicShare(timelineId: number) {
  const response = await fetchWithAuth(`/api/timelines/${timelineId}/public-share`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to revoke public share: ${response.status} ${errorText}`);
    throw new Error(`Failed to revoke public share: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Shares a timeline via email
 * @param timelineId The ID of the timeline to share
 * @param recipientEmails Array of email addresses to share with
 * @param customMessage Custom message to include in the email
 * @returns The result of the share operation
 */
export async function shareTimelineViaEmail(
  timelineId: number,
  recipientEmails: string[],
  customMessage: string
): Promise<{success: boolean; message: string; shareUrl: string}> {
  const response = await fetchWithAuth(`/api/timelines/${timelineId}/share-via-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipientEmails,
      customMessage
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Failed to share timeline via email:', errorData);
    throw new Error(errorData.error || `Failed to share timeline via email: ${response.status}`);
  }
  
  return response.json();
}