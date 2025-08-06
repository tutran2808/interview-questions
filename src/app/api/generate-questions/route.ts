import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Also create a client for user authentication
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Security: Rate limiting map (in production, use Redis or database)
const rateLimitMap = new Map();

// Security: File type validation
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Security: Input sanitization
function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .trim();
}

// Security: Rate limiting
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 10; // 10 requests per hour for testing

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const record = rateLimitMap.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Enhanced file content extraction with proper parsing
async function extractTextFromFile(file: File): Promise<string> {
  console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

  try {
    switch (file.type) {
      case 'text/plain':
        const arrayBuffer = await file.arrayBuffer();
        const textContent = new TextDecoder('utf-8').decode(arrayBuffer);
        console.log('TXT extraction successful, length:', textContent.length);
        return textContent.trim();
        
      case 'application/pdf':
        console.log('Attempting PDF extraction with pdf-parse...');
        
        try {
          // Import pdf-parse
          const pdfParse = (await import('pdf-parse')).default;
          
          // Get array buffer and convert to Buffer
          const pdfArrayBuffer = await file.arrayBuffer();
          const pdfBuffer = Buffer.from(pdfArrayBuffer);
          
          console.log('PDF buffer created, size:', pdfBuffer.length);
          
          // Parse PDF with simple options
          const data = await pdfParse(pdfBuffer);
          
          console.log('PDF extraction successful:');
          console.log('- Text length:', data.text.length);
          console.log('- Number of pages:', data.numpages);
          console.log('- First 200 chars:', data.text.substring(0, 200));
          
          if (!data.text || data.text.trim().length < 10) {
            throw new Error('PDF contains no readable text or is image-based');
          }
          
          // Clean and format the text properly
          const cleanText = data.text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n\s*/g, '\n\n')
            .trim();
          
          return cleanText;
        } catch (pdfError) {
          console.error('PDF parsing failed:', pdfError);
          console.error('Error details:', pdfError);
          
          // If it's the test file issue, provide a clearer message
          if (pdfError instanceof Error && pdfError.message && pdfError.message.includes('test/data/05-versions-space.pdf')) {
            throw new Error('PDF file format is not supported by the current parser. Please try saving your PDF in a different format or convert to DOCX.');
          }
          
          throw new Error(`PDF parsing failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
        }
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        console.log('Attempting DOCX extraction with mammoth...');
        
        // Import mammoth dynamically
        const mammoth = await import('mammoth');
        
        // Get array buffer
        const docxBuffer = await file.arrayBuffer();
        
        // Extract text using mammoth with better options
        const result = await mammoth.extractRawText({
          buffer: Buffer.from(docxBuffer)
        });
        
        console.log('DOCX extraction successful:');
        console.log('- Text length:', result.value.length);
        console.log('- Messages:', result.messages);
        console.log('- First 200 chars:', result.value.substring(0, 200));
        
        if (!result.value || result.value.trim().length < 10) {
          throw new Error('DOCX contains no readable text');
        }
        
        // Clean the extracted text
        const cleanDocxText = result.value
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\t/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n\s*/g, '\n\n')
          .trim();
        
        return cleanDocxText;
        
      case 'application/msword':
        throw new Error('Legacy DOC format is not supported. Please convert to DOCX or PDF format.');
        
      default:
        throw new Error(`Unsupported file type: ${file.type}`);
    }
  } catch (error) {
    console.error('File extraction error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    // Re-throw with clear error message
    throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Security: Content validation
function validateContent(content: string): boolean {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i
  ];

  return !suspiciousPatterns.some(pattern => pattern.test(content));
}

// Authentication and usage checking
async function checkUserAuthAndUsage(request: NextRequest) {
  console.log('=== CHECKING USER AUTH AND USAGE ===');
  
  // Get the authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No authorization header found');
    return { error: 'Authentication required', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  console.log('Token found, verifying with Supabase...');
  
  // Verify the token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('Auth verification failed:', error);
    return { error: 'Invalid authentication token', status: 401 };
  }

  console.log('User authenticated:', user.id, user.email);

  // Get current month start for usage tracking
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  console.log('Checking usage from:', monthStart.toISOString());
  
  // Check user's current usage this month using admin client
  const { data: usageData, error: usageError } = await supabaseAdmin
    .from('question_generations')
    .select('id, generated_at')
    .eq('user_id', user.id)
    .gte('generated_at', monthStart.toISOString());

  if (usageError) {
    console.error('Error checking usage:', usageError);
    return { error: 'Error checking usage limits', status: 500 };
  }

  const currentUsage = usageData?.length || 0;
  console.log('Current usage found:', currentUsage, 'records:', usageData);
  
  // Get user's subscription plan, dates, and Stripe info
  const { data: userPlan, error: planError } = await supabaseAdmin
    .from('users')
    .select('subscription_plan, subscription_status, subscription_end_date, subscription_renewal_date, stripe_customer_id')
    .eq('id', user.id)
    .single();
  
  if (planError) {
    console.error('Error fetching user plan:', planError);
    // Default to free plan if error
  }
  
  const isPro = userPlan?.subscription_plan === 'pro' && userPlan?.subscription_status === 'active';
  console.log('User plan:', userPlan?.subscription_plan, 'Status:', userPlan?.subscription_status, 'Is Pro:', isPro);
  
  if (isPro) {
    console.log('Pro user - unlimited access');
    
    // Get renewal/end dates and subscription status from Stripe
    let isSubscriptionCancelled = false;
    let subscriptionEndDate = userPlan?.subscription_end_date;
    let subscriptionRenewalDate = userPlan?.subscription_renewal_date;
    
    if (userPlan?.stripe_customer_id) {
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
              console.log('Generate API: Got subscription end date from Stripe:', subscriptionEndDate);
            }
            // Clear renewal date for cancelled subscriptions
            subscriptionRenewalDate = null;
          } else {
            // Active auto-renewing subscription - use renewal date
            if (!subscriptionRenewalDate) {
              subscriptionRenewalDate = nextPeriodEnd;
              console.log('Generate API: Got subscription renewal date from Stripe:', subscriptionRenewalDate);
            }
            // Clear end date for active subscriptions
            subscriptionEndDate = null;
          }
          
          console.log('Generate API: Subscription status:', {
            cancelled: isSubscriptionCancelled,
            endDate: subscriptionEndDate,
            renewalDate: subscriptionRenewalDate
          });
        }
      } catch (stripeError) {
        console.error('Generate API: Error checking Stripe subscription status:', stripeError);
      }
    }
    
    return {
      user,
      currentUsage,
      limit: -1, // Unlimited
      remaining: -1, // Unlimited
      isPro: true,
      subscriptionEndDate: subscriptionEndDate,
      subscriptionRenewalDate: subscriptionRenewalDate,
      isSubscriptionCancelled
    };
  }
  
  // Check if user has exceeded free limit (3 questions per month)
  const FREE_LIMIT = 3;
  
  if (currentUsage >= FREE_LIMIT) {
    console.log('User has exceeded limit:', currentUsage, '>=', FREE_LIMIT);
    return { 
      error: `You've reached your limit of ${FREE_LIMIT} questions per month. Upgrade to Pro for unlimited questions!`, 
      status: 429,
      usage: currentUsage,
      limit: FREE_LIMIT
    };
  }

  console.log('Usage check passed:', currentUsage, '/', FREE_LIMIT);
  return { 
    user, 
    currentUsage, 
    limit: FREE_LIMIT,
    remaining: FREE_LIMIT - currentUsage,
    isPro: false
  };
}

// Role-specific focus areas for Panel/Onsite interviews
function getRoleSpecificFocusAreas(jobDescription: string): string {
  const jobDescLower = jobDescription.toLowerCase();
  
  // Determine role based on job description
  if (jobDescLower.includes('software engineer') || jobDescLower.includes('developer') || jobDescLower.includes('programming')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR SOFTWARE ENGINEER:**
- Data structures & algorithms coding interviews (LeetCode, HackerRank style)
- System design (for mid/senior roles)
- Technical knowledge (programming languages, frameworks)
- Problem solving and code quality assessment
- Behavioral questions about collaboration and teamwork`;
  } else if (jobDescLower.includes('product manager') || jobDescLower.includes('pm ')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR PRODUCT MANAGER:**
- Product sense & strategy (prioritization, roadmap planning)
- Execution capabilities (handling trade-offs, metrics)
- Analytical skills (case studies, metrics interpretation)
- Leadership & influence (stakeholder management)
- Behavioral questions around ownership and decision-making`;
  } else if (jobDescLower.includes('engineering manager') || jobDescLower.includes('tech lead')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR ENGINEERING MANAGER:**
- People management & coaching scenarios
- Technical depth (high-level architecture discussions)
- Delivery & execution (how you ship products)
- Cross-team collaboration and communication
- Leadership style & cultural fit assessment`;
  } else if (jobDescLower.includes('designer') || jobDescLower.includes('ui/ux') || jobDescLower.includes('product design')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR DESIGNER:**
- Portfolio deep-dive (past design decisions and process)
- Design exercise or whiteboard challenge
- User research & testing methodologies
- Collaboration with PM and engineering teams
- Visual and interaction design judgment
- Behavioral fit and communication skills`;
  } else if (jobDescLower.includes('data scientist') || jobDescLower.includes('data analyst') || jobDescLower.includes('analytics')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR DATA SCIENTIST/ANALYST:**
- SQL and coding interviews (Python/R)
- Statistics and experimentation design
- Modeling case studies and approach
- Business and product analytics cases
- Communication of findings to stakeholders
- Behavioral fit and analytical thinking`;
  } else if (jobDescLower.includes('sales') || jobDescLower.includes('account executive') || jobDescLower.includes('business development')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR SALES/ACCOUNT EXECUTIVE:**
- Role-play scenarios (discovery calls, objection handling)
- Pipeline strategy and management
- Revenue targets & forecasting approach
- Relationship-building and client management
- Culture and motivation alignment
- Behavioral questions about resilience and results`;
  } else if (jobDescLower.includes('customer success') || jobDescLower.includes('customer support') || jobDescLower.includes('client success')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR CUSTOMER SUCCESS:**
- Situational scenarios (customer escalations, difficult conversations)
- Prioritization and time management skills
- Communication, empathy, and relationship building
- Collaboration with sales and product teams
- Behavioral questions about problem-solving and resilience`;
  } else if (jobDescLower.includes('marketing') || jobDescLower.includes('growth') || jobDescLower.includes('brand')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR MARKETING MANAGER:**
- Campaign strategy & planning exercises
- Analytical thinking (metrics, ROI analysis)
- Messaging and positioning challenges
- Cross-functional stakeholder collaboration
- Creative problem-solving and behavioral fit`;
  } else if (jobDescLower.includes('finance') || jobDescLower.includes('operations') || jobDescLower.includes('analyst')) {
    return `
**ONSITE INTERVIEW FOCUS AREAS FOR FINANCE/OPERATIONS:**
- Technical skills (Excel, financial modeling)
- Scenario-based problem solving
- Process improvement case studies
- Cross-functional collaboration skills
- Detail-oriented behavioral questions`;
  } else {
    return `
**GENERAL ONSITE INTERVIEW FOCUS AREAS:**
- Role-specific technical/functional skills
- Problem-solving and analytical thinking
- Communication and presentation skills
- Team collaboration and cultural fit
- Leadership potential and growth mindset`;
  }
}

// AI prompt generation with security considerations
function generatePrompt(jobDescription: string, resumeText: string, hiringStage: string): string {
  // Security: Sanitize all inputs
  const cleanJobDescription = sanitizeInput(jobDescription);
  const cleanResumeText = sanitizeInput(resumeText);
  const cleanHiringStage = sanitizeInput(hiringStage);

  // Get role-specific focus areas if this is a Panel/Onsite interview
  const roleSpecificFocus = cleanHiringStage.toLowerCase().includes('panel') || 
                           cleanHiringStage.toLowerCase().includes('onsite') 
                           ? getRoleSpecificFocusAreas(cleanJobDescription) 
                           : '';

  return `You are an expert interview coach and talent acquisition specialist with 15+ years of experience. I need you to conduct DEEP RESEARCH and analysis to generate highly personalized, challenging interview questions that are SPECIFICALLY TAILORED to the hiring stage.

🔍 **DEEP RESEARCH REQUIRED**
Please analyze the following information comprehensively:

**JOB DESCRIPTION:**
${cleanJobDescription}

**CANDIDATE RESUME:**
${cleanResumeText}

**HIRING STAGE:**
${cleanHiringStage}

${roleSpecificFocus}

🎯 **CRITICAL: STAGE-SPECIFIC QUESTION GENERATION**

You MUST adapt your questions based on the specific hiring stage. Each stage has different objectives:

**RECRUITER SCREEN:**
- Focus: Basic qualifications, motivation, salary expectations, availability
- Depth: Surface-level, screening questions
- Avoid: Deep technical details, complex scenarios
- Include: "Why are you interested?", "Tell me about yourself", compensation discussions

**HIRING MANAGER INTERVIEW:**
- Focus: Role fit, leadership potential, team dynamics, strategic thinking
- Depth: Moderate technical + strong behavioral focus
- Include: Management scenarios, decision-making, conflict resolution
- Avoid: Deep coding or hands-on technical tests

**TECHNICAL/FUNCTIONAL ASSESSMENT:**
- Focus: Core technical skills, problem-solving, hands-on abilities
- Depth: Deep technical, specific to role requirements
- Include: Technical scenarios, methodology questions, tools/frameworks
- Avoid: Basic behavioral questions, high-level strategy

**PANEL/ONSITE/VIRTUAL ONSITE INTERVIEWS:**
- Focus: Comprehensive evaluation, cultural fit, advanced technical + behavioral
- Depth: Mix of deep technical, complex scenarios, team collaboration
- Include: System design, complex problem-solving, cross-functional scenarios
- Use role-specific focus areas provided above

**EXECUTIVE/FINAL INTERVIEW:**
- Focus: Strategic vision, leadership, cultural alignment, final decision factors
- Depth: High-level strategic, vision-based, company direction
- Include: Industry trends, long-term goals, leadership philosophy
- Avoid: Basic technical details, entry-level questions

📋 **RESEARCH & ANALYSIS TASKS:**
1. **Job Analysis**: Identify key skills, technologies, responsibilities, and company culture clues
2. **Resume Analysis**: Map candidate's experience, skills, achievements, and career progression
3. **Gap Analysis**: Find potential skill gaps or areas needing clarification
4. **Stage-Appropriate Depth**: CRITICALLY IMPORTANT - Adjust question complexity and focus based on hiring stage
5. **Industry Context**: Consider current industry trends and challenges
6. **Stage Objective**: What is this specific interview stage trying to accomplish?

🎯 **QUESTION GENERATION REQUIREMENTS:**
- Generate **EXACTLY 20-25 interview questions** (not 18-20)
- Create **5-6 different categories** with 4-5 questions each
- **ADAPT CATEGORIES** based on the hiring stage:

**FOR RECRUITER SCREEN:**
- "Introductory Questions" (MANDATORY)
- "Basic Qualifications & Experience"
- "Motivation & Interest"  
- "Logistics & Expectations"
- "Culture Fit Basics"

**FOR HIRING MANAGER INTERVIEW:**
- "Introductory Questions" (MANDATORY)
- "Leadership & Management Style"
- "Strategic Thinking & Decision Making"
- "Team Collaboration & Conflict Resolution"
- "Role-Specific Scenarios"

**FOR TECHNICAL/FUNCTIONAL ASSESSMENT:**
- "Technical Skills Assessment"
- "Problem-Solving & Methodology"
- "Tools & Technologies"
- "Project Experience & Implementation"
- "Code Quality & Best Practices" (for technical roles)

**FOR PANEL/ONSITE/VIRTUAL ONSITE:**
- "Introductory Questions" (MANDATORY)
- "Advanced Technical Challenges"
- "System Design & Architecture" (for senior roles)
- "Cross-Functional Collaboration"
- "Cultural Fit & Values Alignment"
- "Complex Behavioral Scenarios"

**FOR EXECUTIVE/FINAL INTERVIEW:**
- "Vision & Strategic Thinking"
- "Industry Knowledge & Trends"
- "Leadership Philosophy"
- "Long-term Goals & Growth"
- "Company Culture & Values"

- Each question must be **stage-appropriate** and **personally tailored**
- Include **progressive difficulty** within each category
- **CRITICAL**: Questions should be SIGNIFICANTLY DIFFERENT for each stage

For EACH question, provide:
1. The question itself
2. A detailed approach for answering including specific framework, structure, and tips
3. An example answer based on the actual resume content provided

⚠️ **CRITICAL PERSONALIZATION REQUIREMENTS:**

**FOR RESUME-BASED EXAMPLES** (Use actual resume content):
- Extract and reference SPECIFIC company names, job titles, and roles
- Use REAL projects, technologies, and technical skills mentioned
- Include CONCRETE achievements with metrics and numbers
- Reference actual years of experience and career progression
- Mention specific education, certifications, and training
- Use candidate's actual industry experience and domain knowledge

**FOR INCOMPLETE RESUME DATA:**
1. Work with ANY available information first
2. Create relevant examples based on job description requirements
3. Focus on skills and experience typically needed for the role
4. Clearly indicate examples should be customized to candidate's actual experience
5. Provide framework for candidate to adapt examples

**QUALITY STANDARDS:**
- Each question must be **professional** and **legally compliant**
- Examples must be **detailed** and **actionable**
- "How to Answer" sections must include **specific frameworks** and **strategic tips**
- Questions should **differentiate** strong candidates from average ones
- Include **follow-up question suggestions** where appropriate

📋 **REQUIRED JSON FORMAT:**

Return your response in this exact JSON structure:

{
  "Introductory Questions": [
    {
      "question": "Can you tell me about yourself and your background?",
      "howToAnswer": "Use the Present-Past-Future framework:\n\n1. PRESENT (30 seconds): Start with your current role and key strengths\n2. PAST (60 seconds): Highlight 2-3 relevant experiences that demonstrate your value\n3. FUTURE (30 seconds): Connect your goals to this specific opportunity\n\nTips:\n- Keep it to 2 minutes maximum\n- Focus on professional achievements, not personal details\n- Practice smooth transitions between timeframes\n- End with enthusiasm for the role",
      "example": "[Extract actual experience from resume: companies, projects, technologies, achievements with metrics]"
    }
    // Generate 4-5 questions total in this category
  ],
  "Technical/Domain Questions": [
    {
      "question": "[Technical question based on job requirements]",
      "howToAnswer": "Use the PREP method:\n\n1. POINT: State your main answer clearly\n2. REASON: Explain the 'why' behind your approach\n3. EXAMPLE: Give a specific example from your experience\n4. POINT: Restate your conclusion and connect to the role\n\nTips:\n- Use specific technical terminology appropriately\n- Mention tools, frameworks, and methodologies you've used\n- Quantify results when possible\n- Show your problem-solving thought process",
      "example": "[Base on actual technologies and projects from resume]"
    }
    // Generate 4-5 questions total in this category
  ],
  "Behavioral/Situational Questions": [
    {
      "question": "[Behavioral question targeting key competencies]",
      "howToAnswer": "Use the STAR method:\n\n1. SITUATION (20%): Set the context - when, where, who was involved\n2. TASK (20%): Describe your specific responsibility or challenge\n3. ACTION (50%): Detail the steps you took - this is the most important part\n4. RESULT (10%): Share the outcomes with specific metrics when possible\n\nTips:\n- Use 'I' not 'we' to highlight your individual contribution\n- Include lessons learned or skills developed\n- Choose examples that demonstrate the competency being assessed\n- Prepare multiple STAR examples for different scenarios",
      "example": "[Create examples using actual projects, challenges, and achievements from resume]"
    }
    // Generate 4-5 questions total in this category
  ],
  "Role-Specific Questions": [
    {
      "question": "[Question specific to this role and company]",
      "howToAnswer": "[Framework and approach for this specific question type]",
      "example": "[Personalized example based on candidate's background]"
    }
    // Generate 4-5 questions total in this category
  ],
  "Strategic/Leadership Questions": [
    {
      "question": "[Question about strategic thinking, leadership, or decision-making]",
      "howToAnswer": "[Framework and approach for this specific question type]",
      "example": "[Personalized example based on candidate's background]"
    }
    // Generate 4-5 questions total in this category
  ]
}

🎯 **FINAL QUALITY CHECKLIST:**

✅ **Content Quality:**
- 20-25 total questions generated
- 5-6 categories with 4-5 questions each
- Questions are personally tailored to candidate's experience
- Examples use actual resume content when possible
- Progressive difficulty within categories
- Mix of technical, behavioral, and strategic questions

✅ **Professional Standards:**
- Questions are legally compliant (no discriminatory content)
- Language is professional and clear
- Appropriate for the specified hiring stage
- Industry-relevant and current
- Actionable "How to Answer" guidance

✅ **Personalization:**
- References specific technologies/skills from resume
- Considers candidate's career level and experience
- Aligned with job requirements and company context
- Examples are detailed and practical
- Strategic depth appropriate for role seniority

🚨 **FINAL REMINDER - STAGE DIFFERENTIATION:**

**ABSOLUTELY CRITICAL**: The questions you generate MUST be dramatically different based on the hiring stage. 

- **RECRUITER SCREEN** = Basic, surface-level, qualification questions
- **HIRING MANAGER** = Role fit, leadership, strategic thinking  
- **TECHNICAL ASSESSMENT** = Deep technical, hands-on, problem-solving
- **PANEL/ONSITE** = Comprehensive mix, advanced technical + behavioral
- **EXECUTIVE/FINAL** = Strategic vision, industry knowledge, leadership

DO NOT generate the same types of questions for different stages. Each stage serves a unique purpose in the hiring process.

**REMEMBER**: This is a critical hiring decision. Generate questions that will help identify the best candidate for this specific role and stage.`;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and usage limits
    const authResult = await checkUserAuthAndUsage(request);
    
    if (authResult.error) {
      return NextResponse.json(
        { 
          error: authResult.error,
          ...(authResult.usage && { usage: authResult.usage, limit: authResult.limit })
        },
        { status: authResult.status }
      );
    }

    const { user, currentUsage, remaining } = authResult;

    // Parse form data first
    const formData = await request.formData();
    const jobDescription = formData.get('jobDescription') as string;
    const resumeFile = formData.get('resume') as File;
    const hiringStage = formData.get('hiringStage') as string;

    // Security: Validate required fields
    if (!jobDescription || !resumeFile || !hiringStage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Security: Validate API key exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.log('Using mock data - GEMINI_API_KEY not configured');
      
      // Still record the usage even in mock mode
      const mockQuestionCount = 20;
      const usageRecord = {
        user_id: user!.id,
        job_title: jobDescription.substring(0, 500),
        hiring_stage: hiringStage,
        questions_count: mockQuestionCount,
        generated_at: new Date().toISOString()
      };
      
      console.log('Mock mode: Inserting usage record:', usageRecord);
      
      const { data: insertData, error: recordError } = await supabaseAdmin
        .from('question_generations')
        .insert(usageRecord)
        .select('*');

      if (recordError) {
        console.error('Mock mode: Error recording usage:', recordError);
        return NextResponse.json(
          { error: 'Failed to record usage. Please try again.' },
          { status: 500 }
        );
      }
      
      console.log('Mock mode: Usage recorded successfully:', insertData);
      
      // Update the usage_tracking table for mock mode too
      console.log('=== UPDATING USAGE TRACKING TABLE (MOCK MODE) ===');
      try {
        const { error: trackingError } = await supabaseAdmin
          .from('usage_tracking')
          .update({
            questions_generated: currentUsage! + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user!.id);
        
        if (trackingError) {
          console.error('Mock mode: Error updating usage_tracking:', trackingError);
        } else {
          console.log('Mock mode: Usage tracking updated successfully');
        }
      } catch (trackingUpdateError) {
        console.error('Mock mode: Usage tracking update error:', trackingUpdateError);
      }
      
      // Return enhanced mock data for testing - 20+ questions
      const mockQuestions = {
        "Introductory Questions": [
          {
            "question": "Can you tell me about yourself and your background?",
            "howToAnswer": "Use the Present-Past-Future framework:\n\n1. PRESENT (30 seconds): Start with your current role and key strengths\n2. PAST (60 seconds): Highlight 2-3 relevant experiences that demonstrate your value\n3. FUTURE (30 seconds): Connect your goals to this specific opportunity\n\nTips:\n- Keep it to 2 minutes maximum\n- Focus on professional achievements, not personal details\n- Practice smooth transitions between timeframes\n- End with enthusiasm for the role",
            "example": "I'm currently working as a software engineer with 3 years of experience in React and JavaScript. In my previous roles, I've built several web applications from scratch and improved user engagement by 40%. I'm excited about this opportunity because it aligns with my goal of working on larger-scale systems and contributing to innovative projects."
          },
          {
            "question": "What interests you most about this position?",
            "howToAnswer": "Connect your interests to the company's mission and your career goals:\n\n1. Research the company's values and mission\n2. Identify 2-3 specific aspects that excite you\n3. Connect these to your career aspirations\n4. Show genuine enthusiasm\n\nTips:\n- Avoid generic answers like 'good company culture'\n- Be specific about what attracts you\n- Demonstrate you've done your homework\n- Connect to your long-term career goals",
            "example": "What excites me most is the opportunity to work with cutting-edge technologies while solving real-world problems. Your company's focus on user experience aligns perfectly with my passion for creating intuitive interfaces. The collaborative environment and growth opportunities make this an ideal next step in my career."
          }
        ],
        "Technical Questions": [
          {
            "question": "Can you explain your experience with React and JavaScript?",
            "howToAnswer": "Use the PREP method:\n\n1. POINT: State your main answer clearly\n2. REASON: Explain the 'why' behind your approach\n3. EXAMPLE: Give a specific example from your experience\n4. POINT: Restate your conclusion and connect to the role\n\nTips:\n- Use specific technical terminology appropriately\n- Mention tools, frameworks, and methodologies you've used\n- Quantify results when possible (performance improvements, user growth, etc.)\n- Show your problem-solving thought process",
            "example": "I have extensive experience with Git across multiple projects. I follow GitFlow branching strategy with feature branches, develop, and main branches. I've handled complex merge conflicts by understanding the codebase context and collaborating with team members. I regularly use interactive rebase to clean up commit history and cherry-pick for selective changes."
          },
          {
            "question": "How do you stay current with technology trends?",
            "howToAnswer": "Show continuous learning mindset:\n\n1. SOURCES: Mention specific resources you use\n2. PRACTICE: Explain how you apply new knowledge\n3. SHARING: Discuss knowledge sharing with team\n4. EVALUATION: How you assess new technologies\n\nTips:\n- Mention specific blogs, podcasts, or conferences\n- Show balance between bleeding-edge and stable tech\n- Demonstrate practical application\n- Include community involvement",
            "example": "I stay current through a combination of technical blogs like Dev.to and Medium, attending local meetups, and following key developers on Twitter. I regularly dedicate time to side projects to experiment with new frameworks. I also participate in code reviews and tech talks at work to share knowledge with the team."
          }
        ],
        "Behavioral Questions": [
          {
            "question": "Tell me about a time you had to deal with a difficult team member.",
            "howToAnswer": "Use the STAR method:\n\n1. SITUATION: Set the context professionally\n2. TASK: Your responsibility in the situation\n3. ACTION: Specific steps you took to address the issue\n4. RESULT: Outcome and lessons learned\n\nTips:\n- Focus on your actions, not blaming others\n- Show emotional intelligence and professionalism\n- Highlight conflict resolution skills\n- Demonstrate learning and growth",
            "example": "In my previous role, I worked with a developer who was resistant to code reviews and often missed deadlines. I scheduled a one-on-one meeting to understand their perspective and concerns. I discovered they felt overwhelmed with the workload. Together, we broke down tasks into smaller, manageable pieces and established regular check-ins. This improved their performance and our team dynamics."
          },
          {
            "question": "Describe a time when you had to learn a new technology quickly.",
            "howToAnswer": "Use the STAR method with learning focus:\n\n1. SITUATION: The business need or project context\n2. TASK: What you needed to learn and timeline\n3. ACTION: Your learning strategy and approach\n4. RESULT: How you successfully applied the knowledge\n\nTips:\n- Show resourcefulness and adaptability\n- Mention specific learning resources\n- Demonstrate ability to learn under pressure\n- Include how you shared knowledge with others",
            "example": "When our team needed to implement real-time features, I had to learn WebSockets and Socket.io within two weeks. I started with official documentation, built small proof-of-concept examples, and joined online communities for troubleshooting. I successfully implemented the feature and created documentation for the team, which became our standard reference."
          },
          {
            "question": "Tell me about a time you made a mistake and how you handled it.",
            "howToAnswer": "Use the STAR method with accountability focus:\n\n1. SITUATION: Context of the mistake\n2. TASK: What you were trying to accomplish\n3. ACTION: How you discovered, addressed, and prevented recurrence\n4. RESULT: Outcome and personal growth\n\nTips:\n- Show accountability and ownership\n- Focus on problem-solving and prevention\n- Demonstrate learning from mistakes\n- Include process improvements you implemented",
            "example": "I once deployed a feature that caused a performance regression in production. I immediately rolled back the deployment, investigated the issue, and found I hadn't properly tested with production-scale data. I implemented comprehensive load testing in our CI/CD pipeline and created a deployment checklist. This incident taught me the importance of thorough testing and has prevented similar issues since."
          },
          {
            "question": "How do you handle competing priorities and tight deadlines?",
            "howToAnswer": "Show prioritization and time management skills:\n\n1. ASSESS: How you evaluate and prioritize tasks\n2. COMMUNICATE: How you work with stakeholders\n3. EXECUTE: Your approach to managing time and resources\n4. ADAPT: How you handle changing priorities\n\nTips:\n- Mention specific prioritization frameworks\n- Show communication with stakeholders\n- Demonstrate flexibility and adaptability\n- Include stress management techniques",
            "example": "I use the Eisenhower Matrix to categorize tasks by urgency and importance. I regularly communicate with stakeholders about realistic timelines and potential trade-offs. For example, when faced with three urgent requests, I analyzed the business impact, negotiated extended deadlines for lower-priority items, and delivered the most critical feature on time while maintaining quality."
          }
        ],
        "Role-Specific Questions": [
          {
            "question": "How would you approach architecting a scalable web application?",
            "howToAnswer": "Show systematic thinking and technical depth:\n\n1. REQUIREMENTS: Understand scale and performance needs\n2. ARCHITECTURE: Discuss patterns and technologies\n3. SCALABILITY: Address horizontal and vertical scaling\n4. MONITORING: Include observability and maintenance\n\nTips:\n- Consider both technical and business requirements\n- Discuss trade-offs between different approaches\n- Include security and performance considerations\n- Show understanding of modern cloud architectures",
            "example": "I would start by understanding the expected load and growth patterns. I'd design a microservices architecture with API Gateway, implement caching strategies with Redis, use load balancers for distribution, and set up monitoring with tools like New Relic. I'd also consider database sharding and CDN for static assets to handle traffic spikes."
          },
          {
            "question": "What's your approach to code quality and testing?",
            "howToAnswer": "Demonstrate quality-focused mindset:\n\n1. STANDARDS: Coding standards and best practices\n2. TESTING: Different types of testing strategies\n3. REVIEW: Code review processes\n4. AUTOMATION: CI/CD and automated quality checks\n\nTips:\n- Mention specific testing frameworks and tools\n- Discuss different testing levels (unit, integration, e2e)\n- Show understanding of TDD/BDD\n- Include code coverage and quality metrics",
            "example": "I follow TDD principles, writing tests before implementation. I use Jest for unit tests, Cypress for end-to-end testing, and maintain 90%+ code coverage. I participate actively in code reviews, focusing on readability, performance, and maintainability. I've also set up automated quality gates in our CI/CD pipeline that block deployments if quality standards aren't met."
          },
          {
            "question": "How do you handle database design and optimization?",
            "howToAnswer": "Show database expertise:\n\n1. DESIGN: Normalization, relationships, and schema design\n2. PERFORMANCE: Indexing, query optimization\n3. SCALING: Sharding, replication, caching\n4. MAINTENANCE: Monitoring, backups, migrations\n\nTips:\n- Discuss both SQL and NoSQL databases\n- Mention specific optimization techniques\n- Show understanding of ACID properties\n- Include real-world performance examples",
            "example": "I design databases with proper normalization to 3NF, create appropriate indexes for query patterns, and use database profiling tools to identify bottlenecks. I've optimized queries that reduced response times from 2 seconds to 200ms by adding compound indexes and restructuring joins. I also implement caching strategies and read replicas for high-traffic applications."
          }
        ],
        "Leadership Questions": [
          {
            "question": "Tell me about a time you had to lead a technical initiative.",
            "howToAnswer": "Use the STAR method with leadership focus:\n\n1. SITUATION: The technical challenge or opportunity\n2. TASK: Your leadership role and objectives\n3. ACTION: How you guided the team and made decisions\n4. RESULT: Technical and business outcomes\n\nTips:\n- Show technical leadership skills\n- Demonstrate decision-making under uncertainty\n- Include team motivation and development\n- Highlight both technical and business impact",
            "example": "I led the migration of our legacy system to a microservices architecture. I created a migration roadmap, formed a cross-functional team, and established clear milestones. I facilitated technical discussions, made architectural decisions, and ensured knowledge transfer. The project reduced deployment time by 70% and improved system reliability, while developing technical skills across the team."
          },
          {
            "question": "How do you approach mentoring junior developers?",
            "howToAnswer": "Show mentoring and development skills:\n\n1. ASSESSMENT: How you evaluate skill levels\n2. PLANNING: Creating development plans\n3. SUPPORT: Providing guidance and feedback\n4. GROWTH: Measuring and celebrating progress\n\nTips:\n- Show patience and empathy\n- Mention specific mentoring techniques\n- Demonstrate investment in others' growth\n- Include examples of mentee success stories",
            "example": "I start by understanding each developer's current skills and career goals. I create personalized learning plans with specific milestones and pair programming sessions. I provide regular feedback, encourage questions, and create safe spaces for making mistakes. One junior developer I mentored became a tech lead within 18 months, successfully launching three major features."
          }
        ],
        "Learning and Adaptability": [
          {
            "question": "Tell me about a time you had to learn something new quickly.",
            "howToAnswer": "Use the STAR method:\n\n1. SITUATION (20%): Set the context - when, where, who was involved\n2. TASK (20%): Describe your specific responsibility or challenge\n3. ACTION (50%): Detail the steps you took - this is the most important part\n4. RESULT (10%): Share the outcomes with specific metrics when possible\n\nTips:\n- Use 'I' not 'we' to highlight your individual contribution\n- Include lessons learned or skills developed\n- Choose examples that demonstrate the competency being assessed\n- Prepare multiple STAR examples for different scenarios",
            "example": "Situation: Our team needed to integrate a new payment system within two weeks. Task: I had to learn the API and implement it despite having no prior experience. Action: I dedicated extra hours to reading documentation, built small test projects, and consulted with senior developers. Result: I successfully implemented the integration on time, and it processed over $10K in transactions in the first month."
          }
        ]
      };

      return NextResponse.json({
        success: true,
        questions: mockQuestions,
        usage: {
          current: currentUsage! + 1,
          limit: authResult.limit,
          remaining: authResult.remaining! - 1,
          ...(authResult.subscriptionEndDate && { subscriptionEndDate: authResult.subscriptionEndDate }),
          ...(authResult.subscriptionRenewalDate && { subscriptionRenewalDate: authResult.subscriptionRenewalDate }),
          ...(authResult.hasOwnProperty('isSubscriptionCancelled') && { isSubscriptionCancelled: authResult.isSubscriptionCancelled })
        },
        timestamp: new Date().toISOString(),
        mock: true,
        message: "Using mock data. Add your Gemini API key to .env.local for AI-generated questions."
      });
    }

    // Security: Validate file
    if (!ALLOWED_FILE_TYPES.includes(resumeFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, DOCX, or TXT files only.' },
        { status: 400 }
      );
    }

    if (resumeFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Security: Validate content length
    if (jobDescription.length > 10000) {
      return NextResponse.json(
        { error: 'Job description too long. Maximum 10,000 characters.' },
        { status: 400 }
      );
    }

    // Extract text from resume
    let resumeText: string;
    try {
      resumeText = await extractTextFromFile(resumeFile);
      console.log('Extracted resume text length:', resumeText.length);
      console.log('Resume text preview:', resumeText.substring(0, 200));
      
      if (resumeText.length < 10) {
        return NextResponse.json(
          { error: 'Resume file appears to be empty or contains no readable text. Please check your file and try again.' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Resume extraction failed:', error);
      return NextResponse.json(
        { error: `Failed to process resume file: ${error instanceof Error ? error.message : 'Unknown error'}. Please try converting to a different format or ensure the file is not corrupted.` },
        { status: 400 }
      );
    }

    // Security: Validate extracted content
    if (!validateContent(resumeText) || !validateContent(jobDescription)) {
      return NextResponse.json(
        { error: 'Invalid content detected in uploaded files' },
        { status: 400 }
      );
    }
    
    // Store resume for future use
    console.log('=== STORING RESUME ===');
    try {
      // First, mark all existing resumes as inactive
      const { error: updateError } = await supabaseAdmin
        .from('user_resumes')
        .update({ is_active: false })
        .eq('user_id', user!.id);
      
      if (updateError && updateError.code !== '42P01') {
        console.error('Error deactivating old resumes:', updateError);
      }
      
      // Store the new resume
      const { data: resumeData, error: resumeError } = await supabaseAdmin
        .from('user_resumes')
        .insert({
          user_id: user!.id,
          resume_filename: resumeFile.name,
          resume_content: resumeText,
          file_type: resumeFile.type,
          file_size: resumeFile.size,
          is_active: true
        })
        .select('*');
      
      if (resumeError) {
        if (resumeError.code === '42P01') {
          console.log('Resume storage table not yet created - skipping resume storage');
        } else {
          console.error('Error storing resume:', resumeError);
        }
      } else {
        console.log('Resume stored successfully:', resumeData?.[0]?.id);
      }
    } catch (resumeStorageError) {
      console.error('Resume storage error:', resumeStorageError);
      // Don't fail the request, just log the error
    }

    // Security: Validate resume text length (allow shorter content for failed parsing)
    if (resumeText.length > 20000) {
      return NextResponse.json(
        { error: 'Resume content too long. Please use a more concise resume (max 20,000 characters).' },
        { status: 400 }
      );
    }

    // Ensure we have some content to work with
    if (resumeText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Resume content appears to be empty or too short. Please upload a valid resume file.' },
        { status: 400 }
      );
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Generate prompt
    const prompt = generatePrompt(jobDescription, resumeText, hiringStage);

    // Security: Add timeout for AI request (increased to 60 seconds)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timeout')), 60000)
    );

    const aiRequestPromise = model.generateContent(prompt);

    // Race between AI request and timeout
    const result = await Promise.race([aiRequestPromise, timeoutPromise]);

    if (!result || typeof result !== 'object' || !('response' in result)) {
      throw new Error('Invalid AI response');
    }

    const response = (result as { response: { text: () => string } }).response;
    const text = response.text();

    // Security: Parse and validate JSON response
    let questions;
    try {
      // Clean the response text (remove markdown code blocks if present)
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(cleanText);
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.error('Raw response:', text);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Security: Validate response structure
    if (!questions || typeof questions !== 'object') {
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      );
    }

    // Security: Validate that we have questions
    const hasQuestions = Object.keys(questions).length > 0 &&
                        Object.values(questions).some(category => 
                          Array.isArray(category) && category.length > 0
                        );

    if (!hasQuestions) {
      return NextResponse.json(
        { error: 'No questions generated' },
        { status: 500 }
      );
    }

    // Record the usage in database
    console.log('=== RECORDING USAGE IN DATABASE ===');
    const questionCount = Object.values(questions).reduce((total: number, category) => total + (category as any[]).length, 0);
    console.log('Total questions generated:', questionCount);
    
    const usageRecord = {
      user_id: user!.id,
      job_title: jobDescription.substring(0, 500),
      hiring_stage: hiringStage,
      questions_count: questionCount,
      generated_at: new Date().toISOString()
    };
    
    console.log('Inserting usage record:', usageRecord);
    
    const { data: insertData, error: recordError } = await supabaseAdmin
      .from('question_generations')
      .insert(usageRecord)
      .select('*');

    if (recordError) {
      console.error('=== DATABASE INSERT ERROR ===');
      console.error('Error recording usage:', recordError);
      console.error('Error code:', recordError.code);
      console.error('Error message:', recordError.message);
      console.error('Error details:', recordError.details);
      
      // This is critical - if we can't record usage, we shouldn't allow the request
      return NextResponse.json(
        { error: 'Failed to record usage. Please try again.' },
        { status: 500 }
      );
    }
    
    console.log('Usage recorded successfully:', insertData);

    // Update the usage_tracking table
    console.log('=== UPDATING USAGE TRACKING TABLE ===');
    try {
      const { error: trackingError } = await supabaseAdmin
        .from('usage_tracking')
        .update({
          questions_generated: currentUsage! + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user!.id);
      
      if (trackingError) {
        console.error('Error updating usage_tracking:', trackingError);
      } else {
        console.log('Usage tracking updated successfully');
      }
    } catch (trackingUpdateError) {
      console.error('Usage tracking update error:', trackingUpdateError);
    }

    // Success response
    const updatedUsage = {
      current: currentUsage! + 1,
      limit: authResult.limit,
      remaining: authResult.remaining! - 1,
      ...(authResult.subscriptionEndDate && { subscriptionEndDate: authResult.subscriptionEndDate }),
      ...(authResult.subscriptionRenewalDate && { subscriptionRenewalDate: authResult.subscriptionRenewalDate }),
      ...(authResult.hasOwnProperty('isSubscriptionCancelled') && { isSubscriptionCancelled: authResult.isSubscriptionCancelled })
    };
    
    console.log('=== SUCCESS RESPONSE ===');
    console.log('Updated usage:', updatedUsage);
    
    return NextResponse.json({
      success: true,
      questions: questions,
      usage: updatedUsage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Security: Don't expose internal error details
    const errorMessage = error instanceof Error ? 
      (error.message.includes('timeout') ? 'Request timeout' : `Internal server error: ${error.message}`) :
      'Internal server error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}