import { NextRequest, NextResponse } from 'next/server';
import { getAvailableCreditPackages } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { packages, error } = await getAvailableCreditPackages();

    if (error) {
      console.error('Error fetching credit packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credit packages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error in packages API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
