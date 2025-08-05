import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing subscription downgrades at:', new Date().toISOString());
    
    // Find all users with expired subscriptions
    const now = new Date().toISOString();
    const { data: expiredUsers, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id, email, subscription_plan, subscription_status, subscription_end_date')
      .eq('subscription_plan', 'pro')
      .eq('subscription_status', 'active')
      .not('subscription_end_date', 'is', null)
      .lte('subscription_end_date', now);

    if (lookupError) {
      console.error('❌ Error finding expired subscriptions:', lookupError);
      return NextResponse.json({ 
        error: 'Error finding expired subscriptions',
        details: lookupError 
      }, { status: 500 });
    }

    console.log(`📊 Found ${expiredUsers?.length || 0} expired subscriptions to process`);

    if (!expiredUsers || expiredUsers.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No expired subscriptions to process',
        processed: 0
      });
    }

    // Process each expired user
    let processedCount = 0;
    let errors: any[] = [];

    for (const user of expiredUsers) {
      try {
        console.log(`🔄 Downgrading user ${user.email} (subscription ended: ${user.subscription_end_date})`);
        
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_plan: 'free',
            subscription_status: 'expired',
            subscription_end_date: null, // Clear the end date
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ Error downgrading user ${user.email}:`, updateError);
          errors.push({ userId: user.id, email: user.email, error: updateError });
        } else {
          console.log(`✅ Successfully downgraded user ${user.email} to free plan`);
          processedCount++;
        }
      } catch (userError) {
        console.error(`❌ Unexpected error processing user ${user.email}:`, userError);
        errors.push({ userId: user.id, email: user.email, error: userError });
      }
    }

    console.log(`✅ Subscription downgrade process completed: ${processedCount} users processed`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: expiredUsers.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Subscription downgrade process error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
}

// Allow GET requests for testing/monitoring
export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString();
    
    // Count users with expired subscriptions
    const { data: expiredUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, email, subscription_end_date')
      .eq('subscription_plan', 'pro')
      .eq('subscription_status', 'active')
      .not('subscription_end_date', 'is', null)
      .lte('subscription_end_date', now);

    if (error) {
      return NextResponse.json({ error: 'Database error', details: error }, { status: 500 });
    }

    return NextResponse.json({
      timestamp: now,
      expiredSubscriptionsCount: expiredUsers?.length || 0,
      expiredUsers: expiredUsers?.map(u => ({
        email: u.email,
        subscriptionEndDate: u.subscription_end_date
      })) || []
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}