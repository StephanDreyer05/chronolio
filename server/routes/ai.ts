import { Router } from "express";
import OpenAI from "openai";
import { timelines } from "../../db/schema.js";
import { TimelineEventTypes } from "../constants.js";

const router = Router();

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000 // 30 second timeout
});

// Create EVENT_TYPES from TimelineEventTypes
const EVENT_TYPES = Object.entries(TimelineEventTypes).reduce((acc, [key, value]) => {
  acc[key] = value;
  return acc;
}, {} as Record<string, string>);

router.post("/api/ai/generate-timeline", async (req, res) => {
  try {
    console.log("Timeline request received");
    const { prompt, existingTimeline, categoriesEnabled } = req.body;
    
    console.log("Request data:", {
      prompt: prompt,
      isEditing: !!existingTimeline,
      categoriesEnabled
    });
    
    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    const systemMessage = {
      role: "system",
      content: `You are a event timeline expert. ${existingTimeline ? 'Edit the provided timeline based on the user instructions.' : 'Generate a detailed event timeline based on the provided information.'}

      Important rules:
      1. All times must be in 24-hour format (HH:mm)
      2. Duration must be in minutes as a string
      3. Categories must be in the following format: [
         { name: 'Category 1 name', description: 'This is the description of category 1', order: 0, id: timestamp },
         { name: 'Category 2 name', description: 'This is the description of category 2', order: 1, id: timestamp }
      ] where timestamp is current time in milliseconds
      4. Events should be chronologically ordered
      5. Location should be specific to each event
      6. Each event must have a type from this list of available types:
      ${Object.entries(EVENT_TYPES).map(([type, desc]) => `- "${type}": ${desc}`).join('\n      ')}

      Choose the most appropriate type for each event based on its nature and purpose.
      It is the year 2025, unless the date is specified don't use a date before March 2025.

      The response must be a valid JSON object with this exact structure:
      {
        "title": "string (couple's names if wedding)",
        "date": "string (YYYY-MM-DD)",
        "type": "string (pick the most appropriate e.g., 'Wedding', 'Function', 'Conference')",
        "location": "string (main venue)",
        "categoriesEnabled": true,
        "categories": [
          {
            "name": "string (must be relevant to the event. Weddings for example Bride, Groom, Ceremony, Reception, Photos etc)", 
            "description": "string (must provide a detailed description of what this category represents)",
            "order": number (start at 0),
            "id": number (use Date.now() for each category)
          }
        ],
        "events": [
          {
            "startTime": "string (HH:mm)",
            "endTime": "string (HH:mm)",
            "duration": "string (minutes)",
            "title": "string",
            "description": "string",
            "location": "string",
            "type": "string (must be one of the available types listed above)",
            "category": "string (must be one of the categories generated)",
            "order": number
          }
        ]
      }

      ${existingTimeline ? 'Here is the existing timeline to edit:' + JSON.stringify(existingTimeline, null, 2) : ''}

      Ensure each event:
      1. Has realistic duration and timing
      2. Includes clear descriptions
      3. Is assigned to one of the categories
      4. Has specific locations
      5. Follows cultural/religious traditions if specified
      6. Has the most appropriate type from the available types list

      Each category must have a unique ID generated using the current timestamp.
      Each category MUST include a meaningful description that explains its purpose and significance.`
    };

    console.log("Sending request to OpenAI");
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // we use "gpt-4o-mini" because it is cheaper
        messages: [
          { role: "system" as const, content: systemMessage.content },
          { role: "user" as const, content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 10000,
        temperature: 0.7
      });

      console.log("OpenAI response received");
      
      if (!response.choices[0].message.content) {
        console.error("No content in OpenAI response");
        throw new Error("No response from OpenAI");
      }

      const responseContent = response.choices[0].message.content;
      console.log("Response content length:", responseContent.length);
      
      try {
        // Attempt to clean the JSON if it's malformed
        let cleanedResponse = responseContent;
        
        // Check for unterminated strings and common JSON issues
        if (!cleanedResponse.endsWith("}")) {
          console.warn("Response doesn't end with }, attempting to fix");
          // Find the last valid closing bracket and trim the rest
          const lastBracketIndex = cleanedResponse.lastIndexOf("}");
          if (lastBracketIndex > 0) {
            cleanedResponse = cleanedResponse.substring(0, lastBracketIndex + 1);
          }
        }
        
        // Try parsing the JSON
        const timeline = JSON.parse(cleanedResponse);
        console.log("Timeline parsed successfully");

        // Ensure categories have the correct structure and preserve descriptions
        if (timeline.categories && Array.isArray(timeline.categories)) {
          timeline.categories = timeline.categories.map((category: any, index: number) => {
            if (!category.description) {
              console.warn(`Category ${category.name} is missing a description`);
            }

            return {
              ...category,
              description: category.description || `Category for ${category.name} related events`,  // Ensure description exists
              id: Date.now() + index,
              order: index,
            };
          });
        }

        // Validate event types
        if (timeline.events && Array.isArray(timeline.events)) {
          timeline.events = timeline.events.map((event: any, index: number) => {
            // If the event type is not in our list, default to 'event'
            if (!TimelineEventTypes[event.type as keyof typeof TimelineEventTypes]) {
              console.warn(`Invalid event type: ${event.type}, defaulting to 'event'`);
              event.type = 'event';
            }

            return {
              ...event,
              order: index,
            };
          });
        }

        // Respect the user's choice for categories if provided
        if (typeof categoriesEnabled === 'boolean') {
          timeline.categoriesEnabled = categoriesEnabled;
        } else if (existingTimeline && typeof existingTimeline.categoriesEnabled === 'boolean') {
          // Fall back to existing timeline setting
          timeline.categoriesEnabled = existingTimeline.categoriesEnabled;
        } else {
          // Default to true
          timeline.categoriesEnabled = true;
        }

        console.log("Sending timeline response");
        res.json(timeline);
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        console.error("Raw response:", responseContent);
        res.status(500).json({ error: "Failed to parse OpenAI response" });
      }
    } catch (openaiError: any) {
      console.error("OpenAI API error:", openaiError);
      res.status(500).json({ error: "Failed to process with OpenAI: " + openaiError.message });
    }
  } catch (error: any) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Failed to process timeline: " + error.message });
  }
});

export default router;