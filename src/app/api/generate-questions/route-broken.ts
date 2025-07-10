import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

// Dynamic import for pdf-parse to avoid build issues
const pdfParse = async (buffer: Buffer) => {
  try {
    const pdf = await import('pdf-parse');
    return await pdf.default(buffer);
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Unable to parse PDF file');
  }
};

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

// Security: File content extraction with validation
async function extractTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  try {
    switch (file.type) {
      case 'application/pdf':
        const pdfData = await pdfParse(Buffer.from(uint8Array));
        return pdfData.text;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxResult = await mammoth.extractRawText({ buffer: Buffer.from(uint8Array) });
        return docxResult.value;
        
      case 'text/plain':
        return new TextDecoder().decode(uint8Array);
        
      default:
        throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('File extraction error:', error);
    throw new Error('Failed to extract text from file');
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

// AI prompt generation with security considerations
function generatePrompt(jobDescription: string, resumeText: string, hiringStage: string): string {
  // Security: Sanitize all inputs
  const cleanJobDescription = sanitizeInput(jobDescription);
  const cleanResumeText = sanitizeInput(resumeText);
  const cleanHiringStage = sanitizeInput(hiringStage);

  return `You are an expert interview coach. Generate personalized interview questions based on the following information:

JOB DESCRIPTION:
${cleanJobDescription}

RESUME:
${cleanResumeText}

HIRING STAGE:
${cleanHiringStage}

Please generate 15-20 interview questions organized into relevant categories. Always include "Introductory Questions" as one category. Other categories should be dynamically determined based on the job description and hiring stage.

Return the response in the following JSON format:
{
  "Introductory Questions": [
    "question 1",
    "question 2",
    "question 3"
  ],
  "Technical Questions": [
    "question 1",
    "question 2"
  ],
  "Behavioral Questions": [
    "question 1",
    "question 2"
  ]
}

Guidelines:
1. Questions should be tailored to the candidate's experience level shown in the resume
2. Questions should be relevant to the specific job requirements
3. Questions should be appropriate for the hiring stage
4. Include a mix of technical, behavioral, and role-specific questions
5. Questions should be clear and professional
6. Avoid any questions that could be discriminatory or inappropriate`;
}

export async function POST(request: NextRequest) {
  try {
    // Security: Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Security: Check rate limiting
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Security: Validate API key exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.log('Using mock data - GEMINI_API_KEY not configured');
      
      // Return mock data for testing
      const mockQuestions = {
        "Introductory Questions": [
          "Can you tell me about yourself and your background?",
          "What interests you most about this position?",
          "How did you hear about our company?"
        ],
        "Technical Questions": [
          "Can you explain your experience with the technologies mentioned in the job description?",
          "How do you approach problem-solving in your development work?",
          "What is your experience with version control systems like Git?"
        ],
        "Experience Questions": [
          "Tell me about a challenging project you've worked on.",
          "How do you handle debugging and troubleshooting?",
          "Describe your experience working in a team environment."
        ],
        "Behavioral Questions": [
          "Tell me about a time you had to learn something new quickly.",
          "How do you handle tight deadlines?",
          "Describe a situation where you had to adapt to change."
        ]
      };

      return NextResponse.json({
        success: true,
        questions: mockQuestions,
        timestamp: new Date().toISOString(),
        mock: true,
        message: "Using mock data. Add your Gemini API key to .env.local for AI-generated questions."
      });
    }

    // Parse form data
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
    const resumeText = await extractTextFromFile(resumeFile);

    // Security: Validate extracted content
    if (!validateContent(resumeText) || !validateContent(jobDescription)) {
      return NextResponse.json(
        { error: 'Invalid content detected' },
        { status: 400 }
      );
    }

    // Security: Validate resume text length
    if (resumeText.length > 20000) {
      return NextResponse.json(
        { error: 'Resume content too long. Please use a more concise resume.' },
        { status: 400 }
      );
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Generate prompt
    const prompt = generatePrompt(jobDescription, resumeText, hiringStage);

    // Security: Add timeout for AI request
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timeout')), 30000)
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

    // Success response
    return NextResponse.json({
      success: true,
      questions: questions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Security: Don't expose internal error details
    const errorMessage = error instanceof Error ? 
      (error.message.includes('timeout') ? 'Request timeout' : 'Internal server error') :
      'Internal server error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}