import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripe from '@/lib/stripe';

// Create Supabase client for authentication
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating Stripe checkout session...');
    
    // Check if Stripe keys are configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_secret_key_here')) {
      console.error('❌ Stripe secret key not configured properly');
      return NextResponse.json({ 
        error: 'Stripe not configured. Please add your Stripe secret key to environment variables.' 
      }, { status: 500 });
    }

    // Parse request body to check for direct signup mode
    const body = await request.json();
    const { email: directEmail, mode } = body;

    let user: any = null;
    let userEmail: string = '';

    if (mode === 'subscription_signup' && directEmail) {
      // Direct signup mode - use provided email
      userEmail = directEmail;
      console.log('🔄 Direct signup mode for email:', userEmail);
    } else {
      // Regular mode - require authentication
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ Missing authorization header');
        return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      console.log('🔍 Verifying user token...');
      
      // Verify the token with Supabase
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) {
        console.error('❌ Auth verification failed:', authError);
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }

      user = authUser;
      userEmail = user.email!;
      console.log('✅ User authenticated:', userEmail);
    }

    console.log('🔄 Creating Stripe checkout session...');

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Next Rounds AI - Pro Plan',
              description: 'Unlimited interview questions and all export formats',
            },
            unit_amount: 399, // $3.99 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/#pricing`,
      customer_email: userEmail,
      metadata: {
        user_id: user?.id || 'direct_signup',
        user_email: userEmail,
        signup_mode: mode || 'regular',
      },
      subscription_data: {
        metadata: {
          user_id: user?.id || 'direct_signup',
          user_email: userEmail,
          signup_mode: mode || 'regular',
        },
      },
    });

    console.log('✅ Stripe checkout session created:', session.id);
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Error creating checkout session';
    if (error instanceof Error) {
      if (error.message.includes('Invalid API Key')) {
        errorMessage = 'Invalid Stripe API key. Please check your Stripe configuration.';
      } else if (error.message.includes('No such')) {
        errorMessage = 'Stripe configuration error. Please check your account setup.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}