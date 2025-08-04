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
    
    // Check user's subscription plan and end date
    const { data: userPlan, error: planError } = await supabaseAdmin
      .from('users')
      .select('subscription_plan, subscription_status, subscription_end_date, stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (planError) {
      console.error('Usage API: Error fetching user plan:', planError);
      // Default to free plan if error
    }
    
    const isPro = userPlan?.subscription_plan === 'pro' && userPlan?.subscription_status === 'active';
    console.log('Usage API: User plan:', userPlan?.subscription_plan, 'Status:', userPlan?.subscription_status, 'Is Pro:', isPro);
    
    let usageResponse;
    if (isPro) {
      usageResponse = {
        current: currentUsage,
        limit: -1, // Unlimited
        remaining: -1, // Unlimited
        subscriptionEndDate: userPlan?.subscription_end_date,
        isEndingSoon: userPlan?.subscription_end_date ? new Date(userPlan.subscription_end_date) > new Date() : false
      };
      console.log('Usage API: Pro user - unlimited access', { endDate: userPlan?.subscription_end_date });
    } else {
      const FREE_LIMIT = 3;
      usageResponse = {
        current: currentUsage,
        limit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - currentUsage)
      };
      console.log('Usage API: Free user - limited access');
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