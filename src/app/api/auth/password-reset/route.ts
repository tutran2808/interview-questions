import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    console.log('Server-side password reset attempt with token:', token?.substring(0, 20) + '...');

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create Supabase admin client for password reset
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Attempting to verify token with Supabase...');

    // Use verifyOtp to verify the recovery token and get user info
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    });

    if (verifyError) {
      console.error('Token verification error:', verifyError);
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    if (!verifyData.user) {
      console.error('No user found in verification data');
      return NextResponse.json(
        { error: 'Invalid token - no user found' },
        { status: 400 }
      );
    }

    console.log('Token verified, updating password for user:', verifyData.user.id);

    // Update the user's password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      verifyData.user.id,
      { password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('Password reset successful for user:', verifyData.user.id);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Password reset API error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}