import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');
    
    if (!publicId) {
      return NextResponse.json({ error: "Public ID required" }, { status: 400 });
    }

    await connectToDatabase();
    
    const report = await Report.findOne(
      { publicId },
      { attachments: 1, _id: 0 }
    );

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const annotatedAttachments = report.attachments.filter(
      (attachment: any) => attachment.annotations && attachment.annotations.length > 0
    );

    return NextResponse.json({
      publicId,
      annotatedAttachments,
      totalAttachments: report.attachments.length,
      annotatedCount: annotatedAttachments.length
    });

  } catch (error) {
    console.error("Fetch annotations failed:", error);
    return NextResponse.json({ error: "Failed to fetch annotations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { publicId, attachmentIndex, annotations } = await request.json();
    
    if (!publicId || attachmentIndex === undefined || !Array.isArray(annotations)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    await connectToDatabase();
    
    const report = await Report.findOne({ publicId });
    
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (attachmentIndex >= report.attachments.length) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    report.attachments[attachmentIndex].annotations = annotations;
    await report.save();

    return NextResponse.json({
      message: "Annotations updated successfully",
      publicId,
      attachmentIndex,
      annotationsCount: annotations.length
    });

  } catch (error) {
    console.error("Update annotations failed:", error);
    return NextResponse.json({ error: "Failed to update annotations" }, { status: 500 });
  }
}