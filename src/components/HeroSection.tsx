import React from 'react';

interface HeroSectionProps {
  onGetStarted: () => void;
  isPro?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted, isPro = false }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-8 py-16 sm:py-24 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center bg-indigo-100 text-indigo-800 px-3 py-2 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
            </svg>
            AI-Powered Interview Question Generator
          </div>
          
          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight px-2">
            Ace Your Next
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Interview</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg sm:text-xl md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
            Get AI-powered interview questions and personalized answers crafted for your specific role that you can download instantly.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 px-4">
            <button
              onClick={onGetStarted}
              className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 whitespace-nowrap"
            >
{isPro ? "Generate Questions Now" : "Generate Questions Free"}
              <svg className="inline-block w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button 
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="border border-gray-300 text-gray-600 px-4 sm:px-6 py-3 rounded-xl text-sm sm:text-base font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              How It Works
            </button>
          </div>
          
          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto px-4">
            <div className="flex flex-col items-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Questions</h3>
              <p className="text-gray-600 text-center">Intelligent interview questions generated specifically for your role</p>
            </div>
            
            <div className="flex flex-col items-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Personalized Answers</h3>
              <p className="text-gray-600 text-center">Tailored answers with approach instructions based on your resume</p>
            </div>
            
            <div className="flex flex-col items-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Multiple Formats</h3>
              <p className="text-gray-600 text-center">Download your questions and answers in PDF, Word, or CSV format</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;