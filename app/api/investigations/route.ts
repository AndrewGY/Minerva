import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import InvestigationReport from '@/models/InvestigationReport';
import Report from '@/models/Report';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['ADMIN', 'OFFICER'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const investigatorId = searchParams.get('investigatorId');

    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (investigatorId) {
      filter.investigatorId = investigatorId;
    }

    const investigations = await InvestigationReport.find(filter)
      .populate('originalReportId', 'publicId incidentType severityLevel')
      .populate('investigatorId', 'name email')
      .populate('reviewedBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await InvestigationReport.countDocuments(filter);

    return NextResponse.json({
      investigations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching investigations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['ADMIN', 'OFFICER'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    
    // Verify the original report exists
    const originalReport = await Report.findById(body.originalReportId);
    if (!originalReport) {
      return NextResponse.json({ error: 'Original report not found' }, { status: 404 });
    }

    const investigationData = {
      ...body,
      investigatorId: (session.user as any).id,
    };

    const investigation = new InvestigationReport(investigationData);
    await investigation.save();

    await investigation.populate([
      { path: 'originalReportId', select: 'publicId incidentType severityLevel' },
      { path: 'investigatorId', select: 'name email' }
    ]);

    return NextResponse.json({ investigation }, { status: 201 });
  } catch (error) {
    console.error('Error creating investigation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}