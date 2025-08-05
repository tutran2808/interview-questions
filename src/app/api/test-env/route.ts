import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasStripePriceId: !!process.env.STRIPE_PRICE_ID,
    priceIdLength: process.env.STRIPE_PRICE_ID?.length || 0,
    priceIdPrefix: process.env.STRIPE_PRICE_ID?.substring(0, 8) || 'none',
  });
}