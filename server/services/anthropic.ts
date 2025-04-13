import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface TimelineEvent {
  startTime: string;
  endTime: string;
  duration: string;
  title: string;
  description: string;
  location: string;
  type: string;
}

export async function suggestEventDescription(currentEvents: TimelineEvent[], eventDetails: Partial<TimelineEvent>) {
  try {
    const eventsContext = currentEvents
      .map(event => `- ${event.title} at ${event.startTime} (${event.duration} minutes) in ${event.location}`)
      .join('\n');

    const prompt = `As a wedding planner AI, I need help writing a descriptive and professional event description for a wedding timeline. Here are the current events:

${eventsContext}

I want to add a description for this event:
- Title: "${eventDetails.title}"
- Type: ${eventDetails.type}
- Time: ${eventDetails.startTime}
- Duration: ${eventDetails.duration} minutes
- Location: ${eventDetails.location}

Please suggest a professional and detailed description that:
1. Explains what happens during this event
2. Provides relevant details for guests
3. Maintains a formal yet warm tone
4. Is about 2-3 sentences long

Return only the description text, without any JSON formatting or quotes.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    return { description: response.content[0].text };
  } catch (error) {
    console.error('Error getting description suggestion:', error);
    throw new Error('Failed to get description suggestion');
  }
}