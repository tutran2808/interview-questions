import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripe from '@/lib/stripe';

// Create Supabase client for authentication
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

    // Get user from database to find Stripe customer ID
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: dbUser, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, email, subscription_plan, subscription_status')
      .eq('id', user.id)
      .single();

    console.log('🔍 Database user lookup result:', { 
      user: dbUser, 
      error: getUserError,
      userId: user.id,
      userEmail: user.email 
    });

    if (getUserError) {
      console.error('❌ Error getting user from database:', getUserError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!dbUser.stripe_customer_id) {
      console.error('❌ No Stripe customer ID found for user:', dbUser.email);
      console.log('📊 User data:', dbUser);
      return NextResponse.json({ 
        error: 'You don\'t have an active subscription yet. Please upgrade to Pro first to manage your subscription.' 
      }, { status: 400 });
    }

    console.log('🔄 Creating portal session for customer:', dbUser.stripe_customer_id);

    // Create Stripe Customer Portal session
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripe_customer_id,
        return_url: `${request.headers.get('origin')}/`,
      });

      console.log('✅ Portal session created:', portalSession.id);
      return NextResponse.json({ url: portalSession.url });
    } catch (stripeError: any) {
      console.error('❌ Stripe portal creation error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
        raw: stripeError
      });
      return NextResponse.json({ 
        error: `Stripe error: ${stripeError.message || 'Failed to create billing portal session'}` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error creating portal session:', error);
    
    let errorMessage = 'Error creating portal session';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}