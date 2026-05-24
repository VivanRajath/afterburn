import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const filePath = join(
    process.cwd(),
    'agent',
    'examples',
    'sample-pr',
    'diff.patch',
  );
  const content = await readFile(filePath, 'utf8');
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
