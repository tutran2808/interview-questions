import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Also create a client for user authentication
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Force Pro upgrade requested');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth verification failed:', authError);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    console.log('👤 Forcing Pro upgrade for user:', user.email);

    // Update user to Pro plan directly
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_plan: 'pro',
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating user to Pro:', updateError);
      return NextResponse.json({ error: 'Failed to update to Pro plan' }, { status: 500 });
    }

    console.log('✅ User upgraded to Pro plan successfully:', updatedUser);

    return NextResponse.json({
      success: true,
      message: 'User upgraded to Pro plan successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        subscription_plan: updatedUser.subscription_plan,
        subscription_status: updatedUser.subscription_status
      }
    });

  } catch (error) {
    console.error('❌ Error in force Pro upgrade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}