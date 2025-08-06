import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('=== PASSWORD RESET API CALLED ===');
    
    const { accessToken, refreshToken, password } = await request.json();
    
    if (!accessToken || !password) {
      console.error('Missing required fields:', { 
        hasAccessToken: !!accessToken, 
        hasPassword: !!password 
      });
      return NextResponse.json({ 
        error: 'Missing access token or password' 
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters' 
      }, { status: 400 });
    }

    console.log('Creating Supabase client for password reset...');
    
    // Create a new client instance specifically for this reset operation
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    console.log('Setting session with recovery tokens...');
    
    // Set the session with the recovery tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || accessToken
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ 
        error: 'Invalid or expired reset link' 
      }, { status: 401 });
    }

    if (!sessionData.session?.user) {
      console.error('No user found in session');
      return NextResponse.json({ 
        error: 'Invalid reset session' 
      }, { status: 401 });
    }

    console.log('Session established for user:', sessionData.session.user.email);

    // Update the password
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ 
        error: updateError.message || 'Failed to update password' 
      }, { status: 500 });
    }

    console.log('Password updated successfully for user:', updateData.user?.email);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Password reset API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}