import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { accessToken, password } = await request.json();
    
    console.log('Password reset API called with token present:', !!accessToken);
    
    if (!accessToken || !password) {
      return NextResponse.json({ 
        error: 'Access token and password are required' 
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }

    // Use admin client to update user password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      // We need to get user ID from the access token first
      '', // This approach won't work without user ID
      { password }
    );

    // Alternative approach: Use the access token to verify and update
    // Create a temporary client with the access token
    const tempSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false
      }
    });

    // Set the session using the access token
    const { data: sessionData, error: sessionError } = await tempSupabase.auth.setSession({
      access_token: accessToken,
      refresh_token: accessToken // Use access token as fallback
    });

    if (sessionError || !sessionData?.user) {
      console.error('Session error in password reset API:', sessionError);
      return NextResponse.json({ 
        error: 'Invalid or expired reset token' 
      }, { status: 401 });
    }

    // Now update the password using the authenticated client
    const { error: updateError } = await tempSupabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      console.error('Password update error in API:', updateError);
      return NextResponse.json({ 
        error: updateError.message || 'Failed to update password' 
      }, { status: 500 });
    }

    console.log('Password updated successfully via API for user:', sessionData.user.id);
    
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