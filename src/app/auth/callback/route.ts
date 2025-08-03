import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log('Auth callback received:', request.url);
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error_param = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  console.log('Auth callback params:', { code: !!code, error_param, error_description });

  if (error_param) {
    console.error('Auth callback error from Supabase:', { error_param, error_description });
    return NextResponse.redirect(new URL(`/?error=${error_param}&description=${encodeURIComponent(error_description || '')}`, request.url));
  }

  if (code) {
    try {
      console.log('Exchanging code for session...');
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error during exchange:', error);
        return NextResponse.redirect(new URL('/?error=auth_error', request.url));
      }

      console.log('Email verification successful');
      // Redirect to home page on successful verification
      return NextResponse.redirect(new URL('/?verified=true', request.url));
    } catch (error) {
      console.error('Unexpected auth error:', error);
      return NextResponse.redirect(new URL('/?error=unexpected_error', request.url));
    }
  }

  console.log('No code provided in callback');
  // If no code is provided, redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}