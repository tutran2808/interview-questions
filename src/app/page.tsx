'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { analytics } from '@/lib/analytics';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import InterviewToolForm from '@/components/InterviewToolForm';
import PricingSection from '@/components/PricingSection';
import FAQSection from '@/components/FAQSection';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

interface QuestionWithAnswer {
  question: string;
  howToAnswer: string;
  example: string;
}

interface GeneratedQuestions {
  [category: string]: QuestionWithAnswer[] | boolean | string;
}

export default function Home() {
  const { user } = useAuth();
  
  // Clear verification message when user signs in
  useEffect(() => {
    try {
      if (user && verificationMessage) {
        console.log('User signed in, clearing verification message');
        setVerificationMessage('');
      }
    } catch (error) {
      console.error('Error in verification message cleanup:', error);
    }
  }, [user]); // Only depend on user, not verificationMessage to avoid infinite loop
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestions | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [verificationMessage, setVerificationMessage] = useState('');
  
  // Check for login query parameter and verification status
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove the '#' and parse
    
    console.log('Checking URL params:', {
      search: window.location.search,
      hash: window.location.hash,
      hasVerifiedInQuery: urlParams.has('verified'),
      hasAccessTokenInHash: hashParams.has('access_token'),
      type: hashParams.get('type')
    });
    
    if (urlParams.get('login') === 'true') {
      setAuthModalOpen(true);
    }
    
    // Check if we need to refresh usage after successful payment
    if (urlParams.get('refresh') && user) {
      console.log('Refreshing usage after successful payment...');
      // Force refresh usage after a delay to allow webhook processing
      setTimeout(async () => {
        try {
          // Get current session
          const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
          
          if (session?.access_token) {
            // Fetch updated usage directly
            const response = await fetch('/api/usage', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.usage) {
                handleUsageUpdate(data.usage);
                console.log('✅ Usage refreshed after payment:', data.usage);
              }
            }
          }
          
          // Clean up URL by removing the refresh parameter
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('refresh');
          window.history.replaceState({}, '', newUrl.toString());
          
        } catch (error) {
          console.error('Error refreshing usage after payment:', error);
        }
      }, 2000);
    }
    
    
    // Handle email verification with session restoration
    // Check for Supabase auth tokens in URL fragment (default behavior)
    const isSignupConfirmation = hashParams.get('type') === 'signup';
    const isEmailVerification = urlParams.get('verified') === 'true' || isSignupConfirmation;
    
    if (isEmailVerification) {
      // Try to get tokens from hash params first (Supabase default), then query params (our custom approach)
      const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
      const expiresAt = hashParams.get('expires_at') || urlParams.get('expires_at');
      
      console.log('Email verification detected:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        expiresAt: expiresAt
      });
      
      if (accessToken && refreshToken) {
        console.log('Email verification successful with tokens');
        
        // Since setSession is consistently failing, provide a better UX
        // Extract email from the JWT token
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const email = payload.email;
          console.log('Extracted email from token:', email);
          
          // Show success message and open sign-in modal
          setVerificationMessage('🎉 Email verified successfully! Please sign in to continue.');
          
          // Auto-open sign-in modal after a brief delay
          setTimeout(() => {
            console.log('Opening sign-in modal for verified user');
            setAuthModalMode('login'); // Ensure it's login mode
            setAuthModalOpen(true);
          }, 2000);
          
          // Store email for potential pre-population (if we want to add that feature later)
          sessionStorage.setItem('verified_email', email);
          
        } catch (tokenError) {
          console.error('Error parsing access token:', tokenError);
          setVerificationMessage('Email verified successfully! Please sign in to continue.');
          setTimeout(() => {
            setAuthModalMode('login'); // Ensure it's login mode
            setAuthModalOpen(true);
          }, 2000);
        }
      } else {
        console.log('No session tokens found, showing basic verification message');
        setVerificationMessage('Email verified successfully! Please sign in to continue.');
        // Clear message after 5 seconds
        setTimeout(() => setVerificationMessage(''), 5000);
      }
    }
    
    // Clean up URL (remove all auth-related parameters from both query and hash)
    const paramsToRemove = ['login', 'verified', 'access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type', 'type'];
    let hasAuthParams = false;
    
    // Check query params
    paramsToRemove.forEach(param => {
      if (urlParams.has(param)) {
        hasAuthParams = true;
      }
    });
    
    // Check hash params
    paramsToRemove.forEach(param => {
      if (hashParams.has(param)) {
        hasAuthParams = true;
      }
    });
    
    if (hasAuthParams) {
      console.log('Cleaning up URL with auth params');
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    } catch (error) {
      console.error('Error in URL parameter processing:', error);
      // Set a safe state if URL processing fails
      setVerificationMessage('');
    }
  }, []);
  const [usageInfo, setUsageInfo] = useState<{current: number, limit: number, remaining: number} | null>(null);
  const [isPro, setIsPro] = useState(false);
  const toolRef = useRef<HTMLElement>(null);
  const questionsRef = useRef<HTMLElement>(null);

  const scrollToTool = () => {
    toolRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Clear generated questions when user signs out
  useEffect(() => {
    if (!user) {
      setGeneratedQuestions(null);
      setExpandedQuestions(new Set());
      setUsageInfo(null);
    }
  }, [user]);

  const handleUsageUpdate = (usage: {current: number, limit: number, remaining: number}) => {
    setUsageInfo(usage);
    // Check if user is Pro based on unlimited limit
    setIsPro(usage.limit === -1);
  };

  const handleQuestionsGenerated = (questions: GeneratedQuestions) => {
    setGeneratedQuestions(questions);
    setExpandedQuestions(new Set()); // Reset expanded state
    // Auto-scroll to questions section after a short delay
    setTimeout(() => {
      questionsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const exportToPDF = async () => {
    if (!generatedQuestions) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // PDF dimensions and margins
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2); // 170 for standard A4
      const bottomMargin = 30; // Reserve space at bottom of page
      
      // Helper function to add text with proper page breaks
      const addTextWithPageBreak = (text: string, x: number, y: number, fontSize: number, lineHeight: number) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth - (x - margin));
        let currentY = y;
        
        for (let i = 0; i < lines.length; i++) {
          // Check if we need a new page
          if (currentY + lineHeight > pageHeight - bottomMargin) {
            doc.addPage();
            currentY = margin;
          }
          
          doc.text(lines[i], x, currentY);
          currentY += lineHeight;
        }
        
        return currentY;
      };
      
      doc.setFontSize(20);
      doc.text('Interview Questions & Answers', margin, 20);
      
      let yPosition = 40;
      
      Object.entries(generatedQuestions).forEach(([category, questions]) => {
        if (category === 'mock' || category === 'message') return;
        
        // Check if we need a new page for category
        if (yPosition > pageHeight - bottomMargin - 30) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Category title
        yPosition = addTextWithPageBreak(category, margin, yPosition, 16, 8);
        yPosition += 7;
        
        questions.forEach((item, index) => {
          // Check if we need a new page for question
          if (yPosition > pageHeight - bottomMargin - 50) {
            doc.addPage();
            yPosition = margin;
          }
          
          // Question
          const questionText = `${index + 1}. ${item.question}`;
          yPosition = addTextWithPageBreak(questionText, margin, yPosition, 12, 6);
          yPosition += 5;
          
          // How to Answer header
          if (yPosition > pageHeight - bottomMargin - 20) {
            doc.addPage();
            yPosition = margin;
          }
          
          doc.setFontSize(10);
          doc.text('How to Answer:', margin + 5, yPosition);
          yPosition += 7;
          
          // How to Answer content
          yPosition = addTextWithPageBreak(item.howToAnswer, margin + 5, yPosition, 10, 5);
          yPosition += 5;
          
          // Example Answer header
          if (yPosition > pageHeight - bottomMargin - 20) {
            doc.addPage();
            yPosition = margin;
          }
          
          doc.setFontSize(10);
          doc.text('Example Answer:', margin + 5, yPosition);
          yPosition += 7;
          
          // Example Answer content
          yPosition = addTextWithPageBreak(item.example, margin + 5, yPosition, 10, 5);
          yPosition += 10;
        });
        
        yPosition += 10;
      });
      
      doc.save('interview-questions.pdf');
      
      // Track PDF export
      const questionCount = Object.values(generatedQuestions).flat().length;
      analytics.trackPDFExport(questionCount);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF. Please try again.');
    }
  };

  const exportToGoogleSheets = () => {
    if (!generatedQuestions) return;
    
    let csvContent = "Category,Question,How to Answer,Example Answer\n";
    
    Object.entries(generatedQuestions).forEach(([category, questions]) => {
      if (category === 'mock' || category === 'message') return;
      
      questions.forEach((item) => {
        const cleanMethod = item.howToAnswer.replace(/"/g, '""').replace(/\n/g, ' ');
        const cleanExample = item.example.replace(/"/g, '""').replace(/\n/g, ' ');
        csvContent += `"${category}","${item.question}","${cleanMethod}","${cleanExample}"\n`;
      });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'interview-questions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToWord = async () => {
    if (!generatedQuestions) return;
    
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      const { saveAs } = await import('file-saver');
      
      const children: any[] = [
        new Paragraph({
          text: "Interview Questions & Answers",
          heading: HeadingLevel.TITLE,
        }),
      ];
      
      Object.entries(generatedQuestions).forEach(([category, questions]) => {
        if (category === 'mock' || category === 'message') return;
        
        children.push(
          new Paragraph({
            text: category,
            heading: HeadingLevel.HEADING_1,
          })
        );
        
        questions.forEach((item, index) => {
          children.push(
            new Paragraph({
              text: `${index + 1}. ${item.question}`,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "How to Answer:", bold: true }),
              ],
            }),
            new Paragraph({
              text: item.howToAnswer,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Example Answer:", bold: true }),
              ],
            }),
            new Paragraph({
              text: item.example,
            }),
            new Paragraph({ text: "" }) // Empty line
          );
        });
      });
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "interview-questions.docx");
    } catch (error) {
      console.error('Error exporting Word document:', error);
      alert('Error exporting Word document. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Next Rounds AI",
            "description": "AI-powered interview question generator that creates personalized questions based on your resume and job description",
            "url": "https://nextrounds.ai",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web Browser",
            "offers": [
              {
                "@type": "Offer",
                "name": "Free Plan",
                "price": "0",
                "priceCurrency": "USD",
                "description": "3 question generations per month"
              },
              {
                "@type": "Offer", 
                "name": "Pro Plan",
                "price": "3.99",
                "priceCurrency": "USD",
                "billingDuration": "P1M",
                "description": "Unlimited question generations and all export formats"
              }
            ],
            "creator": {
              "@type": "Organization",
              "name": "Next Rounds AI",
              "url": "https://nextrounds.ai"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "1250",
              "bestRating": "5"
            },
            "featureList": [
              "AI-powered question generation",
              "Resume analysis",
              "Job description matching", 
              "15-20 tailored questions per generation",
              "Multiple export formats (PDF, CSV, Word)",
              "Categorized questions",
              "Answer guidelines and examples"
            ]
          })
        }}
      />

      <Header 
        usageInfo={usageInfo}
        onUsageUpdate={handleUsageUpdate}
      />
      
      {/* Email Verification Success Message */}
      {verificationMessage && (
        <div className="bg-green-50 border border-green-200 px-4 py-3 mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
            </svg>
            <p className="text-green-800 font-medium">{verificationMessage}</p>
          </div>
        </div>
      )}
      
      <main>
        <HeroSection onGetStarted={scrollToTool} />
        
        <HowItWorksSection />
        
        <section id="tool-section" ref={toolRef} className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <InterviewToolForm 
              onQuestionsGenerated={handleQuestionsGenerated}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
              onAuthRequired={() => {
                setAuthModalMode('signup'); // Default to signup for new users
                setAuthModalOpen(true);
              }}
              onUsageUpdate={handleUsageUpdate}
            />
          </div>
        </section>
        
        {generatedQuestions && (
          <section id="questions-section" ref={questionsRef} className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Your Personalized Interview Questions
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Here are your AI-generated questions tailored to your experience and the job requirements
                </p>
              </div>
              
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 lg:p-12">
                {generatedQuestions.mock && (
                  <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                      </svg>
                      <span className="text-amber-800 font-medium">Demo Mode</span>
                    </div>
                    <p className="text-amber-700 mt-1 text-sm">
                      {generatedQuestions.message || "These are sample questions. Add your Gemini API key for personalized results."}
                    </p>
                  </div>
                )}
                
                <div className="grid gap-8">
                  {Object.entries(generatedQuestions).map(([category, questions]) => {
                    if (category === 'mock' || category === 'message') return null;
                    
                    return (
                      <div key={category} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                        <h3 className="text-2xl font-bold mb-6 text-indigo-900 flex items-center">
                          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          {category}
                        </h3>
                        <div className="space-y-6">
                          {(questions as QuestionWithAnswer[]).map((item: QuestionWithAnswer, index: number) => {
                            const questionId = `${category}-${index}`;
                            const isExpanded = expandedQuestions.has(questionId);
                            
                            return (
                              <div key={index} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                {/* Question */}
                                <div className="p-6">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div className="flex items-start flex-1">
                                      <span className="bg-indigo-600 text-white text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 mr-4">
                                        {index + 1}
                                      </span>
                                      <p className="text-gray-800 leading-relaxed text-lg font-medium">{item.question}</p>
                                    </div>
                                    <button
                                      onClick={() => toggleQuestion(questionId)}
                                      className="self-start sm:ml-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-w-max"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <span className="hidden sm:inline">Hide Answer</span>
                                          <span className="sm:hidden">Hide</span>
                                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                          </svg>
                                        </>
                                      ) : (
                                        <>
                                          <span className="hidden sm:inline">Show Answer</span>
                                          <span className="sm:hidden">Show</span>
                                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Collapsible Answer Section */}
                                {isExpanded && (
                                  <div className="border-t border-gray-100">
                                    {/* How to Answer */}
                                    <div className="p-6 bg-green-50 border-b border-green-100">
                                      <h4 className="text-green-800 font-semibold mb-3 flex items-center">
                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
                                        </svg>
                                        How to Answer
                                      </h4>
                                      <div className="text-green-700 text-sm leading-relaxed whitespace-pre-line">{item.howToAnswer}</div>
                                    </div>
                                    
                                    {/* Example Answer */}
                                    <div className="p-6 bg-blue-50">
                                      <h4 className="text-blue-800 font-semibold mb-3 flex items-center">
                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                                        </svg>
                                        Example Answer
                                      </h4>
                                      <div className="text-blue-700 text-sm leading-relaxed italic whitespace-pre-line">{item.example}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-12 text-center">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                      onClick={scrollToTool}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center text-lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Generate New Questions
                    </button>
                    
                    {/* Export Buttons - Plan-based restrictions */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {/* PDF Export - Available for all users */}
                      <button 
                        onClick={exportToPDF}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center text-sm"
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                        PDF
                      </button>
                      
                      {/* CSV Export - Pro Plan Only */}
                      {user ? (
                        <div className="relative group">
                          <button 
                            onClick={isPro ? exportToGoogleSheets : () => {
                              alert('CSV export is available for Pro Plan members only. Upgrade to Pro to unlock all export formats!');
                            }}
                            className={`px-3 py-2 rounded-lg font-medium flex items-center text-sm transition-colors ${
                              isPro 
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-400 cursor-not-allowed text-white opacity-60'
                            }`}
                            disabled={!isPro}
                          >
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                            </svg>
                            CSV
                            {!isPro && (
                              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                              </svg>
                            )}
                          </button>
                          {!isPro && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              Pro Plan Only
                            </div>
                          )}
                        </div>
                      ) : null}
                      
                      {/* Word Export - Pro Plan Only */}
                      {user ? (
                        <div className="relative group">
                          <button 
                            onClick={isPro ? exportToWord : () => {
                              alert('Word export is available for Pro Plan members only. Upgrade to Pro to unlock all export formats!');
                            }}
                            className={`px-3 py-2 rounded-lg font-medium flex items-center text-sm transition-colors ${
                              isPro 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-400 cursor-not-allowed text-white opacity-60'
                            }`}
                            disabled={!isPro}
                          >
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                            </svg>
                            Word
                            {!isPro && (
                              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                              </svg>
                            )}
                          </button>
                          {!isPro && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              Pro Plan Only
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        
        <PricingSection />
        <FAQSection />
      </main>
      
      <Footer />
      
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}