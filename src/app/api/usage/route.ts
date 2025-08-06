import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Also create a client for user authentication
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    console.log('=== USAGE API CALLED ===');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization header in usage API');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Usage API: Token found, verifying...');
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Usage API: Auth verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    console.log('Usage API: User authenticated:', user.id, user.email);

    // Get current month start for usage tracking
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    console.log('Usage API: Checking usage from:', monthStart.toISOString());
    
    // Check user's current usage this month using admin client
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('question_generations')
      .select('id, generated_at')
      .eq('user_id', user.id)
      .gte('generated_at', monthStart.toISOString());

    if (usageError) {
      console.error('Usage API: Error checking usage:', usageError);
      return NextResponse.json(
        { error: 'Error checking usage limits' },
        { status: 500 }
      );
    }

    const currentUsage = usageData?.length || 0;
    console.log('Usage API: Current usage:', currentUsage, 'records:', usageData);
    
    // Check user's subscription plan, end date, and renewal date
    const { data: userPlan, error: planError } = await supabaseAdmin
      .from('users')
      .select('subscription_plan, subscription_status, subscription_end_date, subscription_renewal_date, stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    // Check subscription status and get renewal/end dates from Stripe
    let isSubscriptionCancelled = false;
    let subscriptionEndDate = userPlan?.subscription_end_date;
    let subscriptionRenewalDate = userPlan?.subscription_renewal_date;
    
    if (userPlan?.stripe_customer_id && userPlan?.subscription_plan === 'pro') {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const subscriptions = await stripe.subscriptions.list({
          customer: userPlan.stripe_customer_id,
          status: 'active',
          limit: 1
        });
        
        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          isSubscriptionCancelled = subscription.cancel_at_period_end;
          const nextPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          
          if (isSubscriptionCancelled) {
            // Cancelled subscription - use end date
            if (!subscriptionEndDate) {
              subscriptionEndDate = nextPeriodEnd;
              console.log('Usage API: Got subscription end date from Stripe:', subscriptionEndDate);
            }
            // Clear renewal date for cancelled subscriptions
            subscriptionRenewalDate = null;
          } else {
            // Active auto-renewing subscription - use renewal date
            if (!subscriptionRenewalDate) {
              subscriptionRenewalDate = nextPeriodEnd;
              console.log('Usage API: Got subscription renewal date from Stripe:', subscriptionRenewalDate);
            }
            // Clear end date for active subscriptions
            subscriptionEndDate = null;
          }
          
          console.log('Usage API: Subscription status:', { 
            cancelled: isSubscriptionCancelled, 
            endDate: subscriptionEndDate,
            renewalDate: subscriptionRenewalDate
          });
        }
      } catch (stripeError) {
        console.error('Usage API: Error checking Stripe subscription status:', stripeError);
      }
    }
    
    if (planError) {
      console.error('Usage API: Error fetching user plan:', planError);
      // Default to free plan if error
    }
    
    const isPro = userPlan?.subscription_plan === 'pro' && userPlan?.subscription_status === 'active';
    console.log('Usage API: User plan:', userPlan?.subscription_plan, 'Status:', userPlan?.subscription_status, 'Is Pro:', isPro);
    
    let usageResponse;
    if (isPro) {
      // Check if subscription is renewing soon (2 days warning)
      const now = new Date();
      const relevantDate = isSubscriptionCancelled ? subscriptionEndDate : subscriptionRenewalDate;
      const isRenewingSoon = relevantDate ? 
        new Date(relevantDate) <= new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)) : // 2 days warning
        false;
        
      usageResponse = {
        current: currentUsage,
        limit: -1, // Unlimited
        remaining: -1, // Unlimited
        subscriptionEndDate: subscriptionEndDate,
        subscriptionRenewalDate: subscriptionRenewalDate,
        isRenewingSoon: isRenewingSoon,
        isSubscriptionCancelled: isSubscriptionCancelled
      };
      console.log('Usage API: Pro user - unlimited access', { 
        originalEndDate: userPlan?.subscription_end_date,
        originalRenewalDate: userPlan?.subscription_renewal_date,
        finalEndDate: subscriptionEndDate,
        finalRenewalDate: subscriptionRenewalDate,
        isRenewingSoon,
        isSubscriptionCancelled
      });
    } else {
      const FREE_LIMIT = 3;
      
      // Calculate next reset date (1st of next month)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      console.log('Usage API: Date calculation debug:', {
        now: now.toISOString(),
        currentMonth: now.getMonth(),
        currentYear: now.getFullYear(),
        nextMonth: nextMonth.toISOString(),
        nextMonthLocal: nextMonth.toLocaleDateString()
      });
      const resetDate = nextMonth.toISOString();
      
      usageResponse = {
        current: currentUsage,
        limit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - currentUsage),
        resetDate: resetDate
      };
      console.log('Usage API: Free user - limited access', { 
        current: currentUsage, 
        limit: FREE_LIMIT,
        nextReset: resetDate 
      });
    }
    
    console.log('Usage API: Returning usage:', usageResponse);
    
    return NextResponse.json({
      success: true,
      usage: usageResponse
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}