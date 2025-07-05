import { NextRequest, NextResponse } from "next/server";
import { checkAuthSession } from "@/lib/auth-check";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthSession("ADMIN");
    
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectToDatabase();
    
    // TODO: maybe add pagination here instead of just limiting to 100
    const reports = await Report.find({})
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({
      reports,
      total: reports.length
    });

  } catch (error) {
    console.error("Dashboard reports fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}