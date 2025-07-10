import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripe from '@/lib/stripe';
import { headers } from 'next/headers';

// Create admin Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  console.log('🎯 Stripe webhook received');
  
  const body = await request.text();
  const headersList = headers();
  const signature = headersList.get('stripe-signature');

  console.log('📝 Webhook signature present:', !!signature);

  if (!signature) {
    console.error('❌ No Stripe signature found');
    return NextResponse.json({ error: 'No signature found' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    console.log('🔄 Processing webhook event:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        console.log('✅ Checkout session completed:', session.id);
        console.log('📋 Session metadata:', session.metadata);

        // Update user to Pro plan
        if (session.metadata?.user_id) {
          console.log('🔄 Updating user to Pro plan:', session.metadata.user_id);
          
          const { data, error } = await supabaseAdmin
            .from('users')
            .update({
              subscription_plan: 'pro',
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.metadata.user_id)
            .select();

          if (error) {
            console.error('❌ Error updating user subscription:', error);
          } else {
            console.log('✅ User upgraded to Pro plan successfully:', data);
          }
        } else {
          console.error('❌ No user_id found in session metadata');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        console.log('Subscription updated:', subscription.id);

        // Find user by customer ID and update subscription status
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .limit(1);

        if (users && users.length > 0) {
          const status = subscription.status === 'active' ? 'active' : 'inactive';
          
          const { error } = await supabaseAdmin
            .from('users')
            .update({
              subscription_status: status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', users[0].id);

          if (error) {
            console.error('Error updating subscription status:', error);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        console.log('🚫 Subscription cancelled:', subscription.id);

        // Find user by customer ID and downgrade to free plan
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, email')
          .eq('stripe_customer_id', subscription.customer)
          .limit(1);

        if (users && users.length > 0) {
          console.log('🔄 Downgrading user to free plan:', users[0].email);
          
          const { data, error } = await supabaseAdmin
            .from('users')
            .update({
              subscription_plan: 'free',
              subscription_status: 'inactive',
              updated_at: new Date().toISOString(),
            })
            .eq('id', users[0].id)
            .select();

          if (error) {
            console.error('❌ Error downgrading user subscription:', error);
          } else {
            console.log('✅ User downgraded to free plan successfully:', data);
          }
        } else {
          console.error('❌ No user found for customer:', subscription.customer);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}