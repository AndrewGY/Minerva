import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";
import { Resend } from 'resend';
import { headers, cookies } from "next/headers";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();
    
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    const report = await Report.findById(params.id);
    
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });

  } catch (error) {
    console.error("Admin report fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();
    
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, comments } = await request.json();
    
    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    await connectToDatabase();
    
    const report = await Report.findById(params.id);
    
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const oldStatus = report.status;
    report.status = status;
    
    if (status === "RESOLVED" && !report.resolvedAt) {
      report.resolvedAt = new Date();
    }
    
    await report.save();

    // Send email notification if reporter provided email
    if (!report.isAnonymous && report.reporterEmail && status !== oldStatus) {
      try {
        await sendStatusUpdateEmail(report, comments);
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the status update if email fails
      }
    }

    return NextResponse.json({ 
      report,
      message: "Status updated successfully"
    });

  } catch (error) {
    console.error("Admin report update failed:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

async function sendStatusUpdateEmail(report: any, comments?: string) {
  // gotta move to config file later
  const statusDescriptions = {
    RECEIVED: "received and is being reviewed",
    UNDER_REVIEW: "currently under review by our team", 
    VERIFIED: "verified and we are taking action",
    RESOLVED: "resolved. Thank you for your report",
    CLOSED: "closed. All follow-up actions have been completed"
  };

  const subject = `HSSE Report Update - ${report.publicId}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Report Status Update</h2>
        
        <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
          <p><strong>Report ID:</strong> ${report.publicId}</p>
          <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">${report.status.replace('_', ' ')}</span></p>
          <p><strong>Description:</strong> Your report has been ${statusDescriptions[report.status]}.</p>
        </div>

        ${comments ? `
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #1e40af;">Additional Notes:</h4>
          <p style="margin: 0; color: #1f2937;">${comments}</p>
        </div>
        ` : ''}

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #6b7280; font-size: 14px;">
            You can track your report status at any time: 
            <a href="${process.env.NEXTAUTH_URL}/status?id=${report.publicId}" 
               style="color: #3b82f6; text-decoration: none;">
              View Report Status
            </a>
          </p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated message from the HSSE Reporting System.
          </p>
        </div>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: 'HSSE System <noreply@minerva-hsse.com>',
    to: [report.reporterEmail],
    subject: subject,
    html: htmlContent,
  });
}