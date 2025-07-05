import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
  incidentType?: string;
  severityLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export async function validateHSSEIncident(title: string, summary: string): Promise<ValidationResult> {
  try {
    const prompt = `You are an expert in Health, Safety, Security, and Environmental (HSSE) incident classification. Analyze the following news article and determine if it describes a genuine HSSE incident.

Title: ${title}
Summary: ${summary}

Consider the following criteria for HSSE incidents:
- Workplace accidents, injuries, or fatalities
- Environmental damage or pollution
- Security breaches or threats
- Health hazards or disease outbreaks
- Industrial accidents or equipment failures
- Chemical spills or hazardous material exposure
- Fire, explosion, or structural collapses
- Transportation accidents (if work-related)
- Safety violations or near-misses

Be LENIENT in your classification to avoid false negatives. If there's any reasonable possibility it could be HSSE-related, classify it as valid.

Respond with a JSON object containing:
{
  "isValid": boolean,
  "confidence": number (0-100),
  "reason": "Brief explanation",
  "incidentType": "injury|environmental|security|health|equipment|chemical|fire|other" (if valid),
  "severityLevel": "LOW|MEDIUM|HIGH|CRITICAL" (if valid)
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an HSSE incident classifier. Be lenient to avoid false negatives. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      const result = JSON.parse(content);
      return {
        isValid: result.isValid || false,
        confidence: result.confidence || 0,
        reason: result.reason || 'No reason provided',
        incidentType: result.incidentType,
        severityLevel: result.severityLevel,
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Default to accepting it if we can't parse the response
      return {
        isValid: true,
        confidence: 50,
        reason: 'Could not parse AI response, defaulting to valid',
      };
    }
  } catch (error) {
    console.error('OpenAI validation error:', error);
    // Default to accepting it if the API fails
    return {
      isValid: true,
      confidence: 0,
      reason: 'Validation service error, defaulting to valid',
    };
  }
}