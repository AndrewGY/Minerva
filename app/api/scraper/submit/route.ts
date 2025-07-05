import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";
import { validateHSSEIncident } from "@/lib/openai-validator";
import { z } from "zod";

const scraperSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  summary: z.string().min(10),
  image_paths: z.array(z.string()).optional(),
  article_url: z.string().url(),
  //is_health_safety: z.boolean().optional(),
});

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== SCRAPER_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const data = scraperSchema.parse(body);

    // Validate if it's a genuine HSSE incident using AI
    const validation = await validateHSSEIncident(data.title, data.summary);
    
    if (!validation.isValid) {
      return NextResponse.json({
        accepted: false,
        reason: validation.reason,
        confidence: validation.confidence,
      }, { status: 200 });
    }

    await connectToDatabase();

    const incidentDate = new Date(data.date);

    const reportData = {
      incidentDate,
      location: {
        address: 'News Report - Location TBD',
        lat: 0,
        lng: 0,
        details: `Source: ${data.article_url}`,
      },
      description: `${data.title}\n\n${data.summary}\n\nSource: ${data.article_url}`,
      incidentType: validation.incidentType || 'other',
      severityLevel: validation.severityLevel,
      isAnonymous: true,
      status: 'RECEIVED',
      // Add metadata to indicate this came from scraper
      metadata: {
        source: 'news_scraper',
        articleUrl: data.article_url,
        validationConfidence: validation.confidence,
        validationReason: validation.reason,
        imagePaths: data.image_paths,
      },
    };

    // Create the report
    const report = await Report.create(reportData);

    console.log(`Scraper report created: ${report.publicId} (${validation.incidentType})`);

    return NextResponse.json({
      accepted: true,
      publicId: report.publicId,
      validation: {
        confidence: validation.confidence,
        reason: validation.reason,
        incidentType: validation.incidentType,
        severityLevel: validation.severityLevel,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("Scraper submission failed:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Submission failed" },
      { status: 500 }
    );
  }
}

// Health check endpoint for the scraper
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== SCRAPER_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/scraper/submit',
    method: 'POST',
    requiredHeaders: {
      'x-api-key': 'Your API key',
      'Content-Type': 'application/json',
    },
    schema: {
      title: 'string (required)',
      date: 'ISO 8601 date string (required)',
      summary: 'string (required, min 10 chars)',
      image_paths: 'array of strings (optional)',
      article_url: 'valid URL (required)',
    },
  });
}