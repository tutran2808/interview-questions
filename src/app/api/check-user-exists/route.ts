import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeEmail } from '@/utils/emailValidation';

export async function POST(request: NextRequest) {
  // Create Supabase admin client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  try {
    const { email, originalEmail } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('Checking user existence for:', { email, originalEmail });

    // Check both normalized and original email formats
    const emailsToCheck = [email];
    if (originalEmail && originalEmail !== email) {
      emailsToCheck.push(originalEmail);
    }

    // Use admin client to check auth.users table
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return NextResponse.json(
        { exists: false, error: 'Unable to check user existence' },
        { status: 500 }
      );
    }

    // Check if any of the email variations exist
    const userExists = users.users.some(user => {
      if (!user.email) return false;
      const userNormalizedEmail = normalizeEmail(user.email);
      return emailsToCheck.some(checkEmail => 
        userNormalizedEmail === checkEmail || 
        user.email!.toLowerCase() === checkEmail.toLowerCase()
      );
    });

    console.log('User existence result:', { 
      exists: userExists, 
      emailsChecked: emailsToCheck,
      totalUsers: users.users.length 
    });

    return NextResponse.json({ exists: userExists });

  } catch (error) {
    console.error('Error in check-user-exists API:', error);
    return NextResponse.json(
      { exists: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}