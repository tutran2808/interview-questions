import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

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

    console.log('Server-side password reset attempt');

    // Create Supabase admin client for password reset
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Use the admin client to verify the token and update the password
    // The token should be the recovery token from the email
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      token, // This might need to be parsed differently
      { password }
    );

    if (error) {
      console.error('Server-side password update error:', error);
      
      // Try alternative approach using the recovery token directly
      try {
        const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        });

        if (verifyError) {
          return NextResponse.json(
            { error: 'Invalid or expired reset token' },
            { status: 400 }
          );
        }

        if (verifyData.user) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            verifyData.user.id,
            { password }
          );

          if (updateError) {
            return NextResponse.json(
              { error: 'Failed to update password' },
              { status: 500 }
            );
          }
        }
      } catch (altError) {
        console.error('Alternative password reset failed:', altError);
        return NextResponse.json(
          { error: 'Password reset failed' },
          { status: 500 }
        );
      }
    }

    console.log('Password reset successful');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Password reset API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}