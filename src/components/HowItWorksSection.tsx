import React from 'react';

const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Paste Job Description',
      description: 'Copy and paste the job description you\'re applying for. Include requirements, responsibilities, and company info.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      step: '02',
      title: 'Upload Your Resume',
      description: 'Upload your resume in PDF, DOCX, or TXT format. Our AI will analyze your skills, experience, and background.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      )
    },
    {
      step: '03',
      title: 'Select Interview Stage',
      description: 'Choose your interview stage from our comprehensive list to get questions tailored to that specific phase.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      step: '04',
      title: 'Get AI Questions',
      description: 'Receive 15-20 personalized interview questions organized by category, tailored to your profile and the role.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            How It Works
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Get personalized interview questions in 4 simple steps. 
            Our AI analyzes your background and the job requirements to create the perfect question set.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line for desktop - positioned to align with circle centers */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200"></div>
          
          <div className="grid lg:grid-cols-4 gap-12 lg:gap-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  {/* Step number and icon */}
                  <div className="relative mx-auto w-24 h-24 mb-6">
                    {/* Background circle */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full"></div>
                    
                    {/* Step number */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                      {step.step}
                    </div>
                    
                    {/* Icon */}
                    <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center text-indigo-600">
                      {step.icon}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="max-w-xs mx-auto">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 lg:p-12 border border-indigo-100">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Ready to ace your interview?
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of job seekers who have successfully prepared for their interviews using our AI-powered question generator.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Start Free
              </button>
              <button 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-indigo-200 text-indigo-700 px-8 py-4 rounded-xl font-semibold hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;