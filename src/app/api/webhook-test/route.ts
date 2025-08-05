import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🎯 WEBHOOK TEST - Simple endpoint called');
  console.log('📅 Timestamp:', new Date().toISOString());
  
  try {
    const body = await request.text();
    console.log('📦 Body length:', body.length);
    console.log('🔍 Headers:', Object.fromEntries(request.headers.entries()));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook test endpoint reached',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Webhook test endpoint is working',
    timestamp: new Date().toISOString()
  });
}