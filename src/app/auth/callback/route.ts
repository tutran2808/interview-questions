import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      
      // Create server-side Supabase client with proper cookie handling
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            flowType: 'pkce'
          }
        }
      );
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error during exchange:', error);
        return NextResponse.redirect(new URL('/?error=auth_error', request.url));
      }

      console.log('Email verification successful:', {
        user: data.user?.email,
        session: !!data.session
      });
      
      // Create redirect response
      const redirectUrl = new URL('/?verified=true&auto_login=true', request.url);
      const response = NextResponse.redirect(redirectUrl);
      
      // Store session data in localStorage via a script injection approach
      // This is better handled client-side, so let's redirect with session info
      if (data.session) {
        // Store the session tokens as URL parameters temporarily for client-side pickup
        redirectUrl.searchParams.set('access_token', data.session.access_token);
        redirectUrl.searchParams.set('refresh_token', data.session.refresh_token);
        redirectUrl.searchParams.set('expires_at', data.session.expires_at?.toString() || '');
        
        const responseWithTokens = NextResponse.redirect(redirectUrl);
        return responseWithTokens;
      }
      
      return response;
    } catch (error) {
      console.error('Unexpected auth error:', error);
      return NextResponse.redirect(new URL('/?error=unexpected_error', request.url));
    }
  }

  console.log('No code provided in callback');
  // If no code is provided, redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}