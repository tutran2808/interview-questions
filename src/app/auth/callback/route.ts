import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/?error=auth_error', request.url));
      }

      // Redirect to home page on successful verification
      return NextResponse.redirect(new URL('/?verified=true', request.url));
    } catch (error) {
      console.error('Unexpected auth error:', error);
      return NextResponse.redirect(new URL('/?error=unexpected_error', request.url));
    }
  }

  // If no code is provided, redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}