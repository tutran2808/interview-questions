'use client';

import React, { useState } from 'react';
import ContactForm from './ContactForm';

const FAQSection: React.FC = () => {
  const [openItem, setOpenItem] = useState<number | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  const faqItems = [
    {
      question: "What happens to my data?",
      answer: "Your privacy is our top priority. We use your resume and job description only to generate interview questions. Your data is encrypted in transit and at rest, never shared with third parties, and automatically deleted after 30 days. We comply with GDPR and CCPA regulations."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time. There are no cancellation fees or long-term commitments. If you cancel, you'll continue to have access to Pro features until your current billing period ends."
    },
    {
      question: "How accurate are the generated questions?",
      answer: "Our AI uses Google's advanced Gemini model to analyze your resume against the job description and hiring stage. Questions are tailored to your specific experience and the role requirements, with 95% of users rating the questions as highly relevant."
    },
    {
      question: "What file formats are supported?",
      answer: "We support PDF, Microsoft Word (DOCX), and plain text (TXT) files for resume uploads. Files must be under 10MB in size. We recommend PDF format for best results."
    },
    {
      question: "How many questions do I get?",
      answer: "Each generation provides 15-20 questions organized into relevant categories like 'Technical Skills', 'Behavioral Questions', 'Role-Specific Questions', and more. The exact number and categories depend on your resume and the job requirements."
    },
    {
      question: "Is there a free plan?",
      answer: "Yes! Our free plan includes 3 question generations per month with no credit card required. You can experience the quality of our AI-generated questions and access PDF export functionality."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) processed securely through Stripe. We also support PayPal and Apple Pay for your convenience."
    },
    {
      question: "Do you offer refunds?",
      answer: "Currently, we do not offer refunds. However, if you wish to cancel your Pro subscription, you will continue to have access to all Pro features until your current billing period ends. You can cancel anytime with no cancellation fees."
    }
  ];

  const toggleItem = (index: number) => {
    setOpenItem(openItem === index ? null : index);
  };

  return (
    <>
      {showContactForm && (
        <ContactForm 
          isModal={true}
          onClose={() => setShowContactForm(false)}
        />
      )}
      
      <section id="faq" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about our AI interview question generator
          </p>
        </div>

        <div className="space-y-6">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow duration-200">
              <button
                className="w-full px-8 py-6 text-left flex justify-between items-center focus:outline-none focus:ring-4 focus:ring-indigo-100 rounded-2xl"
                onClick={() => toggleItem(index)}
              >
                <span className="text-lg font-semibold text-gray-900 pr-8">
                  {item.question}
                </span>
                <div className={`w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                  openItem === index ? 'rotate-180' : ''
                }`}>
                  <svg
                    className="w-4 h-4 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>
              {openItem === index && (
                <div className="px-8 pb-6">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 lg:p-12 border border-indigo-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              We're here to help you succeed in your interview preparation.
            </p>
            <button 
              onClick={() => setShowContactForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </section>
    </>
  );
};

export default FAQSection;