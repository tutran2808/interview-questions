import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for authentication
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for database operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing manual downgrade request...');
    
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing authorization header');
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Verifying user token...');
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth verification failed:', authError);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.email);

    // Get user's current subscription status
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription_plan, subscription_status, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ Error fetching user data:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is eligible for manual downgrade (manually upgraded Pro user)
    const isManuallyUpgraded = !userData.stripe_customer_id && 
                              userData.subscription_plan === 'pro' && 
                              userData.subscription_status === 'active';

    if (!isManuallyUpgraded) {
      console.log('❌ User is not eligible for manual downgrade');
      return NextResponse.json({ 
        error: 'Only manually upgraded Pro users can use this feature. Please use the regular subscription management for paid subscriptions.' 
      }, { status: 400 });
    }

    // Downgrade user to free plan
    console.log('🔄 Downgrading user to free plan:', user.email);
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        subscription_plan: 'free',
        subscription_status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select();

    if (error) {
      console.error('❌ Error downgrading user:', error);
      return NextResponse.json({ error: 'Failed to downgrade subscription' }, { status: 500 });
    }

    console.log('✅ User downgraded to free plan successfully:', data);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully downgraded to Free plan',
      newPlan: 'free'
    });
    
  } catch (error) {
    console.error('❌ Error processing manual downgrade:', error);
    
    let errorMessage = 'Error processing downgrade request';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}