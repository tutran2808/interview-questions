'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      <Header />
      
      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600">
              Last updated: August 3, 2025
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 prose prose-lg max-w-none">
            
            <h2>Introduction</h2>
            <p>
              Next Rounds AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>

            <h2>Information We Collect</h2>
            
            <h3>Personal Information</h3>
            <ul>
              <li><strong>Account Information:</strong> Email address, password, and profile details</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe</li>
              <li><strong>Communication:</strong> Messages you send through our contact forms</li>
            </ul>

            <h3>Usage Information</h3>
            <ul>
              <li><strong>Interview Content:</strong> Job descriptions and resumes you provide for question generation</li>
              <li><strong>Generated Content:</strong> Interview questions and responses created by our AI</li>
              <li><strong>Analytics:</strong> Usage patterns, feature interactions, and performance metrics</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <ul>
              <li>Provide and improve our AI-powered interview question generation service</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send important account and service updates</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Analyze usage patterns to enhance our platform</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>Information Sharing</h2>
            <p>We do not sell, trade, or rent your personal information. We may share information only in these circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> Trusted third parties who help operate our services (Supabase, Stripe, etc.)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul>
              <li>SSL/TLS encryption for data transmission</li>
              <li>Secure database storage with access controls</li>
              <li>Regular security audits and updates</li>
              <li>PCI DSS compliant payment processing</li>
            </ul>

            <h2>Data Retention</h2>
            <p>
              We retain your information only as long as necessary to provide our services and comply with legal obligations. You can request account deletion at any time through our contact form.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access and review your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of non-essential communications</li>
              <li>Export your data in a portable format</li>
            </ul>

            <h2>Cookies and Tracking</h2>
            <p>
              We use essential cookies for authentication and site functionality. We also use analytics cookies to understand how our service is used and improve user experience. You can control cookie preferences through your browser settings.
            </p>

            <h2>Third-Party Services</h2>
            <p>Our platform integrates with:</p>
            <ul>
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Google Analytics:</strong> Website analytics</li>
              <li><strong>Vercel:</strong> Hosting and deployment</li>
            </ul>
            <p>Each service has its own privacy policy governing their use of your information.</p>

            <h2>Children's Privacy</h2>
            <p>
              Our service is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>

            <h2>International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of any material changes by email or through our website. Your continued use of our services after changes become effective constitutes acceptance of the updated policy.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <ul>
              <li><strong>Email:</strong> nextroundsai@gmail.com</li>
              <li><strong>Website:</strong> <a href="https://nextrounds.ai" className="text-indigo-600 hover:text-indigo-800">nextrounds.ai</a></li>
            </ul>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;