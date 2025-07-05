import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import InvestigationReport from '@/models/InvestigationReport';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['ADMIN', 'OFFICER'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const investigation = await InvestigationReport.findById(params.id)
      .populate('originalReportId')
      .populate('investigatorId', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!investigation) {
      return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
    }

    return NextResponse.json({ investigation });
  } catch (error) {
    console.error('Error fetching investigation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['ADMIN', 'OFFICER'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const investigation = await InvestigationReport.findById(params.id);

    if (!investigation) {
      return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
    }

    // Handle status changes and approval workflow
    if (body.status === 'UNDER_REVIEW' && investigation.status === 'DRAFT') {
      body.reviewedBy = (session.user as any).id;
    }
    
    if (body.status === 'APPROVED' && investigation.status === 'UNDER_REVIEW') {
      body.approvedBy = (session.user as any).id;
    }
    
    if (body.status === 'PUBLISHED' && investigation.status === 'APPROVED') {
      body.publishedAt = new Date();
    }

    const updatedInvestigation = await InvestigationReport.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'originalReportId' },
      { path: 'investigatorId', select: 'name email' },
      { path: 'reviewedBy', select: 'name email' },
      { path: 'approvedBy', select: 'name email' }
    ]);

    return NextResponse.json({ investigation: updatedInvestigation });
  } catch (error) {
    console.error('Error updating investigation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const investigation = await InvestigationReport.findById(params.id);
    if (!investigation) {
      return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
    }

    // Only allow deletion of draft investigations
    if (investigation.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft investigations can be deleted' }, 
        { status: 400 }
      );
    }

    await InvestigationReport.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Investigation deleted successfully' });
  } catch (error) {
    console.error('Error deleting investigation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}