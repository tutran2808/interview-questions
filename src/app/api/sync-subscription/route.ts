import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripe from '@/lib/stripe';

// Create admin Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual subscription sync requested');
    
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Get regular Supabase client to verify user
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth verification failed:', authError);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    console.log('👤 Syncing subscription for user:', user.email);

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

    console.log('📋 Current user data:', dbUser);

    // Check Stripe for active subscriptions
    try {
      let hasActiveSubscription = false;
      
      if (dbUser.stripe_customer_id) {
        console.log('🔍 Checking Stripe subscriptions for customer:', dbUser.stripe_customer_id);
        
        const subscriptions = await stripe.subscriptions.list({
          customer: dbUser.stripe_customer_id,
          status: 'active',
          limit: 10,
        });

        console.log('📊 Found Stripe subscriptions:', subscriptions.data.length);
        hasActiveSubscription = subscriptions.data.length > 0;
      } else {
        console.log('🔍 No Stripe customer ID found, checking by email...');
        
        // Try to find customer by email
        const customers = await stripe.customers.list({
          email: user.email!,
          limit: 1,
        });

        if (customers.data.length > 0) {
          const customer = customers.data[0];
          console.log('👤 Found Stripe customer:', customer.id);
          
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 10,
          });

          console.log('📊 Found Stripe subscriptions:', subscriptions.data.length);
          hasActiveSubscription = subscriptions.data.length > 0;

          // Update user with Stripe customer ID
          if (hasActiveSubscription) {
            await supabaseAdmin
              .from('users')
              .update({ stripe_customer_id: customer.id })
              .eq('id', user.id);
          }
        }
      }

      // Update user subscription status based on Stripe data
      const newPlan = hasActiveSubscription ? 'pro' : 'free';
      const newStatus = hasActiveSubscription ? 'active' : 'inactive';

      console.log(`🔄 Updating user plan: ${dbUser.subscription_plan} -> ${newPlan}`);

      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          subscription_plan: newPlan,
          subscription_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating user subscription:', updateError);
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
      }

      console.log('✅ User subscription synced successfully:', updatedUser);

      return NextResponse.json({
        success: true,
        user: updatedUser,
        hadActiveSubscription: hasActiveSubscription,
        updated: dbUser.subscription_plan !== newPlan
      });

    } catch (stripeError) {
      console.error('❌ Stripe API error:', stripeError);
      return NextResponse.json({ error: 'Failed to check Stripe subscription' }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error syncing subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}