import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'video/mp4', 'video/avi', 'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type' 
      }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large' 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}-${random}.${extension}`;
    
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      message: 'Upload successful',
      url: `/uploads/${fileName}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}