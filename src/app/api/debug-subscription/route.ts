import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripe from '@/lib/stripe';

// Create admin Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Also create a client for user authentication
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug subscription endpoint called');
    
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

    console.log('👤 Debugging subscription for user:', user.email);

    // Get user from database
    const { data: dbUser, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (getUserError) {
      console.error('❌ Error getting user from database:', getUserError);
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    console.log('📋 Database user data:', dbUser);

    // Check Stripe for subscriptions
    let stripeData = { subscriptions: [], customer: null };
    
    try {
      if (dbUser.stripe_customer_id) {
        console.log('🔍 Checking Stripe subscriptions for customer:', dbUser.stripe_customer_id);
        
        // Get customer info
        const customer = await stripe.customers.retrieve(dbUser.stripe_customer_id);
        stripeData.customer = customer;
        
        // Get subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: dbUser.stripe_customer_id,
          limit: 10,
        });
        
        stripeData.subscriptions = subscriptions.data;
        console.log('📊 Found Stripe subscriptions:', subscriptions.data.length);
      } else {
        console.log('🔍 No Stripe customer ID, searching by email...');
        
        // Try to find customer by email
        const customers = await stripe.customers.list({
          email: user.email!,
          limit: 5,
        });

        if (customers.data.length > 0) {
          const customer = customers.data[0];
          stripeData.customer = customer;
          console.log('👤 Found Stripe customer by email:', customer.id);
          
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 10,
          });
          
          stripeData.subscriptions = subscriptions.data;
          console.log('📊 Found Stripe subscriptions:', subscriptions.data.length);
        }
      }
    } catch (stripeError) {
      console.error('❌ Stripe API error:', stripeError);
      stripeData.error = stripeError.message;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      database: dbUser,
      stripe: stripeData,
      debug: {
        hasStripeCustomerId: !!dbUser.stripe_customer_id,
        subscriptionPlan: dbUser.subscription_plan,
        subscriptionStatus: dbUser.subscription_status,
        activeSubscriptions: stripeData.subscriptions.filter(sub => sub.status === 'active').length,
      }
    });

  } catch (error) {
    console.error('❌ Error in debug endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}