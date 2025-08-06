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

    console.log('Decoding recovery token to extract user ID...');
    
    try {
      // Decode JWT manually since recovery tokens might not work with getUser()
      const tokenParts = accessToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      // Decode the payload (second part of JWT) - JWT uses URL-safe base64
      const base64Payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if necessary
      const paddedBase64 = base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4);
      const payload = JSON.parse(Buffer.from(paddedBase64, 'base64').toString());
      console.log('Decoded token payload:', {
        sub: payload.sub,
        email: payload.email,
        exp: payload.exp,
        aud: payload.aud
      });
      
      const userId = payload.sub;
      const userEmail = payload.email;
      
      if (!userId) {
        throw new Error('No user ID found in token');
      }
      
      // Verify token is not expired
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        throw new Error('Token expired');
      }
      
      console.log('Token decoded successfully for user:', userEmail, 'User ID:', userId);

      // Use admin client to directly update the user's password
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      );
      
      if (updateError) {
        console.error('Password update error:', updateError);
        return NextResponse.json({ 
          error: `Update failed: ${updateError.message}` 
        }, { status: 500 });
      }

      console.log('Password updated successfully for user:', updateData?.user?.email || userEmail);

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (tokenError: any) {
      console.error('Token decoding error:', tokenError);
      return NextResponse.json({ 
        error: `Invalid reset token: ${tokenError.message}` 
      }, { status: 401 });
    }

  } catch (error: any) {
    console.error('Password reset API error:', error);
    return NextResponse.json({ 
      error: `Server error: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}