import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Runtime migrations are permanently disabled. Apply reviewed SQL migrations through the deployment pipeline.',
      disabled: true,
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Runtime migrations are permanently disabled. Apply reviewed SQL migrations through the deployment pipeline.',
      disabled: true,
    },
    { status: 410 }
  );
}
