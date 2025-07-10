import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripe from '@/lib/stripe';

// Create Supabase client for authentication
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for database operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating Stripe customer portal session...');
    
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

    // Get user's Stripe customer ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, subscription_plan, subscription_status')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ Error fetching user data:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('📋 User data:', userData);

    // Check if user is manually upgraded (no Stripe customer ID but is Pro)
    const isManuallyUpgraded = !userData.stripe_customer_id && 
                              userData.subscription_plan === 'pro' && 
                              userData.subscription_status === 'active';

    if (isManuallyUpgraded) {
      console.log('⚠️ User is manually upgraded, cannot access Stripe portal');
      return NextResponse.json({ 
        error: 'You have a manually granted Pro plan. Please contact support to manage your subscription.',
        isManualUpgrade: true
      }, { status: 400 });
    }

    let customerId = userData.stripe_customer_id;

    // If no customer ID but user wants to manage subscription, they shouldn't be here
    if (!customerId) {
      console.log('❌ No Stripe customer ID found for user');
      return NextResponse.json({ 
        error: 'No active subscription found. Please subscribe first.',
        noSubscription: true
      }, { status: 400 });
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${request.headers.get('origin')}/#pricing`,
    });

    console.log('✅ Customer portal session created:', session.id);
    return NextResponse.json({ url: session.url });
    
  } catch (error) {
    console.error('❌ Error creating customer portal session:', error);
    
    let errorMessage = 'Error creating customer portal session';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}