import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('=== PASSWORD RESET API CALLED ===');
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...'
    });
    
    const { accessToken, refreshToken, password } = await request.json();
    console.log('Request data:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasPassword: !!password,
      passwordLength: password?.length
    });
    
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

    // Check environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      });
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    console.log('Creating Supabase clients for password reset...');
    
    // Create admin client for direct user management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create regular client to verify the token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    console.log('Verifying recovery token...');
    
    // First, try to get user info from the access token using regular client
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.error('Token verification failed:', userError);
      return NextResponse.json({ 
        error: `Invalid reset token: ${userError?.message || 'No user found'}` 
      }, { status: 401 });
    }

    console.log('Token verified for user:', user.email, 'User ID:', user.id);

    // Use admin client to directly update the user's password
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ 
        error: `Update failed: ${updateError.message}` 
      }, { status: 500 });
    }

    console.log('Password updated successfully for user:', updateData?.user?.email || user.email);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error: any) {
    console.error('Password reset API error:', error);
    return NextResponse.json({ 
      error: `Server error: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}