import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('Checking if user exists for email:', email);

    // Check if user exists in the users table
    const { data: existingUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, email, created_at')
      .eq('email', email)
      .limit(1);

    if (error) {
      console.error('Error checking user existence:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const userExists = existingUsers && existingUsers.length > 0;
    
    console.log('User exists check result:', { userExists, user: existingUsers?.[0] });
    
    return NextResponse.json({ 
      exists: userExists,
      user: userExists ? existingUsers[0] : null
    });

  } catch (error) {
    console.error('Error in check-user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}