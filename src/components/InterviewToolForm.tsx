'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UpgradeModal from './UpgradeModal';
import { analytics, trackFunnel } from '@/lib/analytics';

interface QuestionWithAnswer {
  question: string;
  howToAnswer: string;
  example: string;
}

interface GeneratedQuestions {
  [category: string]: QuestionWithAnswer[];
}

interface InterviewToolFormProps {
  onQuestionsGenerated: (questions: GeneratedQuestions) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  onAuthRequired?: () => void;
  onUsageUpdate?: (usage: {current: number, limit: number, remaining: number}) => void;
}

const InterviewToolForm: React.FC<InterviewToolFormProps> = ({
  onQuestionsGenerated,
  isGenerating,
  setIsGenerating,
  onAuthRequired,
  onUsageUpdate
}) => {
  const { session, user } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [hiringStage, setHiringStage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{current: number, limit: number, remaining: number} | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch usage info when user logs in
  useEffect(() => {
    const fetchUsage = async () => {
      if (session?.access_token) {
        try {
          const response = await fetch('/api/usage', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.usage) {
              console.log('Fetched usage info:', data.usage);
              setUsageInfo(data.usage);
            }
          }
        } catch (error) {
          console.error('Error fetching usage:', error);
        }
      } else {
        // Clear usage info when user signs out
        setUsageInfo(null);
      }
    };

    fetchUsage();
  }, [session]);

  // Security: File validation
  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid file (PDF, DOCX, or TXT)');
      return false;
    }
    
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return false;
    }
    
    return true;
  };

  const handleFileUpload = (file: File) => {
    if (validateFile(file)) {
      setResumeFile(file);
      trackFunnel.uploadResume();
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!jobDescription.trim()) {
      alert('Please enter a job description');
      return;
    }
    
    if (!resumeFile) {
      alert('Please upload your resume');
      return;
    }
    
    if (!hiringStage) {
      alert('Please select a hiring stage');
      return;
    }

    setIsGenerating(true);

    try {
      // Check if user is authenticated
      if (!session?.access_token) {
        setIsGenerating(false);
        onAuthRequired?.();
        return;
      }

      // Track question generation
      trackFunnel.submitGeneration();

      // Create form data for file upload
      const formData = new FormData();
      formData.append('jobDescription', jobDescription);
      formData.append('resume', resumeFile);
      formData.append('hiringStage', hiringStage);

      // Call API endpoint with authentication
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        
        // If user has reached their limit, show upgrade modal
        if (response.status === 429) {
          setIsGenerating(false);
          setShowUpgradeModal(true);
          return;
        }
        
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      if (!data.success && !data.questions) {
        throw new Error(data.error || 'Invalid response format');
      }
      
      // Update usage info if provided
      if (data.usage) {
        console.log('Updating usage info:', data.usage);
        setUsageInfo(data.usage);
        onUsageUpdate?.(data.usage);
      }
      
      // Track successful question generation
      const questionCount = Object.values(data.questions || data).flat().length;
      analytics.trackQuestionGeneration(hiringStage, questionCount);
      
      onQuestionsGenerated(data.questions || data);
      
    } catch (error) {
      console.error('Error generating questions:', error);
      console.error('Error details:', error.message);
      console.error('Full error:', error);
      
      // Provide more specific error messages
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error - please check your connection and try again.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Request timed out - please try again. Large files may take longer to process.';
      }
      
      alert(`Failed to generate questions: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const hiringStages = [
    'Recruiter Screen',
    'Hiring Manager Interview',
    'Technical/Functional Assessment',
    'Panel/Onsite/Virtual Onsite Interviews',
    'Executive/Final Interview'
  ];

  return (
    <>
      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentUsage={usageInfo?.current || 0}
        limit={usageInfo?.limit || 3}
      />
      
      <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 px-6 py-3 rounded-full text-sm font-semibold mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI-Powered Tool
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Generate Your Interview Questions
        </h2>
        <p className="text-lg sm:text-xl text-gray-600">
          Our AI analyzes your resume and job requirements to create personalized questions
        </p>
      </div>
      
      <div className="relative">
        {/* AI Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-3xl"></div>
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
        
        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-100 p-8 lg:p-12">
        
        {/* Auth Required Overlay */}
        {!session && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl z-10 flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Sign Up to Get Started
              </h3>
              <p className="text-gray-600 mb-6">
                Create your free account to access our AI-powered interview question generator and start preparing for your dream job.
              </p>
              <button
                onClick={() => onAuthRequired?.()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Sign Up for Free
              </button>
              <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  3 Free Generations
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                  No Credit Card
                </span>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Job Description Input */}
          <div className="relative">
            {/* Background decoration */}
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <label className="block text-xl font-bold text-gray-900">
                    Job Description *
                  </label>
                  <p className="text-gray-600">
                    Copy and paste the complete job description
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={6}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 resize-none text-gray-900 placeholder-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                  required
                />
                {jobDescription && (
                  <div className="absolute top-3 right-3">
                    <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resume Upload */}
          <div className="relative">
            {/* Background decoration */}
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <label className="block text-xl font-bold text-gray-900">
                    Upload Resume *
                  </label>
                  <p className="text-gray-600">
                    Upload your current resume
                  </p>
                </div>
              </div>
              
              <label
                className={`relative block border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.02] shadow-lg'
                    : resumeFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                {resumeFile ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-green-700">{resumeFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove File
                    </button>
                    <div className="absolute top-3 right-3">
                      <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-1">
                        Drop your resume here or click to browse
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, DOCX, TXT up to 10MB
                      </p>
                    </div>
                    {dragActive && (
                      <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                        <div className="text-indigo-600 font-semibold">Drop your file here!</div>
                      </div>
                    )}
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Hiring Stage Selection */}
          <div className="relative">
            {/* Background decoration */}
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <label className="block text-xl font-bold text-gray-900">
                    Interview Stage *
                  </label>
                  <p className="text-gray-600">
                    Select your interview type
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <select
                  value={hiringStage}
                  onChange={(e) => setHiringStage(e.target.value)}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 bg-white transition-all duration-200 shadow-sm hover:shadow-md appearance-none"
                  required
                >
                  <option value="">Choose your interview stage</option>
                  {hiringStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {hiringStage && (
                  <div className="absolute top-3 right-14">
                    <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Usage Info for Free Plan users only */}
          {user && usageInfo && usageInfo.limit !== -1 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                  </svg>
                  <span className="text-blue-800 font-medium">
                    Usage: {usageInfo.current}/{usageInfo.limit} questions this month
                  </span>
                </div>
                <span className="text-blue-600 text-sm">
                  {usageInfo.remaining} remaining
                </span>
              </div>
            </div>
          ) : null}

          {/* Generate Button */}
          <div className="relative">
            <div className="text-center pt-6">
              
              <button
                type="submit"
                disabled={isGenerating}
                className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 sm:px-16 py-4 rounded-2xl text-base sm:text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg overflow-hidden whitespace-nowrap"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse"></div>
                
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI is Generating Your Questions...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Generate Questions
                  </span>
                )}
              </button>
              
              <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                  Secure & Private
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  No Storage
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI-Powered
                </span>
              </div>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
    </>
  );
};

export default InterviewToolForm;