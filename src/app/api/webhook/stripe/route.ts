import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import stripe from '@/lib/stripe';
import { headers } from 'next/headers';

// Create admin Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`🎯 Stripe webhook received at ${timestamp}`);
  
  const body = await request.text();
  const headersList = await headers();
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
        console.log('👤 Customer info:', {
          customer: session.customer,
          customer_email: session.customer_email,
          mode: session.mode,
          payment_status: session.payment_status
        });

        // Update user to Pro plan
        if (session.metadata?.user_id) {
          console.log('🔄 Updating user to Pro plan:', session.metadata.user_id);
          console.log('📧 User email from metadata:', session.metadata.user_email);
          console.log('💳 Stripe customer ID:', session.customer);
          
          let lookupField;
          let lookupValue;
          
          if (session.metadata.user_id === 'direct_signup') {
            // Direct signup flow - find user by email
            console.log('🔄 Direct signup mode - finding user by email:', session.metadata.user_email);
            lookupField = 'email';
            lookupValue = session.metadata.user_email;
          } else {
            // Regular flow - find user by ID
            console.log('🔄 Regular mode - finding user by ID:', session.metadata.user_id);
            lookupField = 'id';
            lookupValue = session.metadata.user_id;
          }
          
          console.log(`🔍 Looking up user by ${lookupField}:`, lookupValue);
          
          // First check if user exists
          const { data: existingUser, error: lookupError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq(lookupField, lookupValue)
            .single();

          if (lookupError) {
            console.error('❌ Error finding user:', lookupError);
            console.log('🔍 Attempting to list all users to debug...');
            const { data: allUsers } = await supabaseAdmin
              .from('users')
              .select('id, email, subscription_plan')
              .limit(10);
            console.log('📋 Current users in database:', allUsers);
            return;
          }

          console.log('👤 Found user:', existingUser);

          // Get subscription details to set proper dates
          let subscriptionEndDate = null;
          let subscriptionRenewalDate = null;
          try {
            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(session.subscription);
              const nextPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
              
              if (subscription.cancel_at_period_end) {
                // Cancelled subscription - use end date
                subscriptionEndDate = nextPeriodEnd;
                console.log('📅 Setting subscription end date (cancelled):', subscriptionEndDate);
              } else {
                // Active auto-renewing subscription - use renewal date
                subscriptionRenewalDate = nextPeriodEnd;
                console.log('📅 Setting subscription renewal date (active):', subscriptionRenewalDate);
              }
            }
          } catch (subError) {
            console.error('⚠️  Could not retrieve subscription details:', subError);
          }

          // Update user to Pro plan with customer ID and appropriate date
          const { data, error } = await supabaseAdmin
            .from('users')
            .update({
              subscription_plan: 'pro',
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              subscription_end_date: subscriptionEndDate,
              subscription_renewal_date: subscriptionRenewalDate,
              updated_at: new Date().toISOString(),
            })
            .eq(lookupField, lookupValue)
            .select()
            .single();

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

      case 'customer.subscription.created': {
        const subscription = event.data.object as any;
        console.log('✅ New subscription created:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price?.id
        });

        // Find user by customer ID and update to Pro plan
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, email')
          .eq('stripe_customer_id', subscription.customer)
          .limit(1);

        if (users && users.length > 0) {
          const userId = users[0].id;
          console.log('🔄 Upgrading user to Pro via subscription.created:', userId);
          
          // Set proper date based on subscription status
          const nextPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          let subscriptionEndDate = null;
          let subscriptionRenewalDate = null;
          
          if (subscription.cancel_at_period_end) {
            // Cancelled subscription - use end date
            subscriptionEndDate = nextPeriodEnd;
            console.log('📅 Setting subscription end date (cancelled):', subscriptionEndDate);
          } else {
            // Active auto-renewing subscription - use renewal date
            subscriptionRenewalDate = nextPeriodEnd;
            console.log('📅 Setting subscription renewal date (active):', subscriptionRenewalDate);
          }
          
          const { data, error } = await supabaseAdmin
            .from('users')
            .update({
              subscription_plan: 'pro',
              subscription_status: 'active',
              subscription_end_date: subscriptionEndDate,
              subscription_renewal_date: subscriptionRenewalDate,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single();

          if (error) {
            console.error('❌ Error updating user subscription via created event:', error);
          } else {
            console.log('✅ User upgraded to Pro via subscription.created:', data);
          }
        } else {
          console.error('❌ No user found for customer ID:', subscription.customer);
        }
        
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        console.log('🔄 Subscription updated:', {
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end
        });

        // Find user by customer ID and update subscription status
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, email')
          .eq('stripe_customer_id', subscription.customer)
          .limit(1);

        if (users && users.length > 0) {
          // Handle different subscription states
          let plan = 'free';
          let status = 'inactive';
          let subscriptionEndDate = null;
          let subscriptionRenewalDate = null;
          
          if (subscription.status === 'active') {
            plan = 'pro';
            status = 'active';
            const nextPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
            
            // Check if subscription is set to cancel at period end
            if (subscription.cancel_at_period_end) {
              console.log('🔔 Subscription will cancel at period end, keeping Pro access until:', nextPeriodEnd);
              // Cancelled subscription - use end date, clear renewal date
              subscriptionEndDate = nextPeriodEnd;
              subscriptionRenewalDate = null;
              status = 'active'; // Keep Pro access until period ends
            } else {
              // Active auto-renewing subscription - use renewal date, clear end date
              subscriptionRenewalDate = nextPeriodEnd;
              subscriptionEndDate = null;
            }
          } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
            plan = 'free';
            status = 'inactive';
            subscriptionEndDate = null;
            subscriptionRenewalDate = null;
          }
          
          const updateData: any = {
            subscription_plan: plan,
            subscription_status: status,
            subscription_end_date: subscriptionEndDate,
            subscription_renewal_date: subscriptionRenewalDate,
            updated_at: new Date().toISOString(),
          };
          
          console.log('📅 Setting dates:', { endDate: subscriptionEndDate, renewalDate: subscriptionRenewalDate });
          
          const { error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', users[0].id);

          if (error) {
            console.error('❌ Error updating subscription status:', error);
          } else {
            console.log('✅ Subscription updated for user:', users[0].email, { plan, status });
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        console.log('💳 Invoice payment succeeded (potential renewal):', {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          billingReason: invoice.billing_reason,
          periodStart: invoice.period_start,
          periodEnd: invoice.period_end
        });

        // Only process subscription renewals (not one-time payments)
        if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
          console.log('🔄 Processing subscription renewal for customer:', invoice.customer);
          
          // Find user by customer ID
          const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, email, subscription_plan, subscription_status, subscription_end_date')
            .eq('stripe_customer_id', invoice.customer)
            .limit(1);

          if (users && users.length > 0) {
            const user = users[0];
            console.log('👤 Found user for renewal:', {
              email: user.email,
              currentPlan: user.subscription_plan,
              currentStatus: user.subscription_status,
              currentEndDate: user.subscription_end_date
            });

            // Update subscription renewal date on renewal (assume it's auto-renewing unless cancelled)
            const newRenewalDate = new Date(invoice.period_end * 1000).toISOString();
            console.log('📅 Updating subscription renewal date on renewal:', newRenewalDate);
            
            const { data, error } = await supabaseAdmin
              .from('users')
              .update({
                subscription_plan: 'pro',
                subscription_status: 'active',
                subscription_renewal_date: newRenewalDate, // Set new renewal date - subscription renewed
                subscription_end_date: null, // Clear end date since it's auto-renewing
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id)
              .select()
              .single();

            if (error) {
              console.error('❌ Error updating subscription on renewal:', error);
            } else {
              console.log('✅ Subscription renewed successfully:', {
                email: user.email,
                newEndDate: newSubscriptionEndDate
              });
            }
          } else {
            console.error('❌ No user found for customer on renewal:', invoice.customer);
          }
        } else {
          console.log('ℹ️  Ignoring non-renewal payment:', invoice.billing_reason);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        console.log('🚫 Subscription cancelled:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          canceledAt: subscription.canceled_at
        });

        // Find user by customer ID and downgrade to free plan
        const { data: users, error: lookupError } = await supabaseAdmin
          .from('users')
          .select('id, email, subscription_plan, subscription_status')
          .eq('stripe_customer_id', subscription.customer)
          .limit(1);

        console.log('🔍 User lookup result:', { users, lookupError, customerId: subscription.customer });

        if (lookupError) {
          console.error('❌ Error looking up user:', lookupError);
          return;
        }

        if (users && users.length > 0) {
          console.log('🔄 Downgrading user to free plan:', {
            email: users[0].email,
            currentPlan: users[0].subscription_plan,
            currentStatus: users[0].subscription_status
          });
          
          const { data, error } = await supabaseAdmin
            .from('users')
            .update({
              subscription_plan: 'free',
              subscription_status: 'canceled',
              subscription_end_date: null,
              subscription_renewal_date: null,
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
          
          // Debug: Let's see what customers we have
          const { data: allUsers } = await supabaseAdmin
            .from('users')
            .select('email, stripe_customer_id')
            .not('stripe_customer_id', 'is', null)
            .limit(5);
          console.log('📋 Users with Stripe customer IDs:', allUsers);
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