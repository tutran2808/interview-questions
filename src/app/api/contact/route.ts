import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
import { validateEmail, checkRateLimit } from '@/utils/emailValidation';

const SUPPORT_EMAIL = 'nextroundsai@gmail.com';

// Create transporter for sending emails
const createTransporter = async () => {
  // For development: use ethereal email (fake SMTP server)
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || 
      process.env.GMAIL_USER === 'your_email@gmail.com') {
    console.log('Using Ethereal Email for development testing');
    
    // Create test account for ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }
  
  // Production: use real Gmail
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    // Rate limiting by email
    const rateLimit = checkRateLimit(email, 3, 300000); // 3 attempts per 5 minutes
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: `Too many requests. Please try again in ${rateLimit.timeLeft} seconds.`,
          timeLeft: rateLimit.timeLeft 
        },
        { status: 429 }
      );
    }

    // Skip credential check - we'll handle it in createTransporter

    // Create email content
    const emailContent = `
      <h2>New Contact Support Message</h2>
      <p><strong>From:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
    `;

    // Send email
    const transporter = await createTransporter();
    const mailOptions = {
      from: process.env.GMAIL_USER || 'noreply@ethereal.email',
      to: SUPPORT_EMAIL,
      subject: `Contact Support: ${subject}`,
      html: emailContent,
      replyTo: email
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // Log ethereal preview URL for development
    if (process.env.NODE_ENV === 'development' && (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'your_email@gmail.com')) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending contact message:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}