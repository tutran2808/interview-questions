'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      <Header />
      
      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600">
              Last updated: August 3, 2025
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 prose prose-lg max-w-none">
            
            <h2>Agreement to Terms</h2>
            <p>
              By accessing and using Next Rounds AI ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
            </p>

            <h2>Description of Service</h2>
            <p>
              Next Rounds AI is an artificial intelligence-powered platform that generates personalized interview questions based on job descriptions and resumes. Our Service includes:
            </p>
            <ul>
              <li>AI-generated interview questions tailored to specific roles</li>
              <li>Question categorization and organization</li>
              <li>Export functionality (PDF, CSV, Word formats)</li>
              <li>Account management and subscription services</li>
            </ul>

            <h2>User Accounts</h2>
            
            <h3>Account Creation</h3>
            <ul>
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must be at least 13 years old to create an account</li>
              <li>One person may not maintain multiple accounts</li>
            </ul>

            <h3>Account Responsibilities</h3>
            <ul>
              <li>You are responsible for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>You may not share your account with others</li>
            </ul>

            <h2>Subscription Plans</h2>
            
            <h3>Free Plan</h3>
            <ul>
              <li>3 question generations per month</li>
              <li>Basic export functionality</li>
              <li>Subject to usage limitations</li>
            </ul>

            <h3>Pro Plan</h3>
            <ul>
              <li>Monthly subscription at $3.99/month</li>
              <li>Unlimited question generations</li>
              <li>All export formats available</li>
              <li>Priority customer support</li>
            </ul>

            <h2>Payment Terms</h2>
            <ul>
              <li>Subscription fees are billed monthly in advance</li>
              <li>All payments are processed securely through Stripe</li>
              <li>Prices are subject to change with 30 days notice</li>
              <li>No refunds for partial months of service</li>
              <li>You may cancel your subscription at any time</li>
            </ul>

            <h2>Acceptable Use</h2>
            
            <h3>Permitted Uses</h3>
            <ul>
              <li>Generate interview questions for legitimate hiring purposes</li>
              <li>Prepare for job interviews as a candidate</li>
              <li>Educational and training purposes</li>
            </ul>

            <h3>Prohibited Uses</h3>
            <ul>
              <li>Using the Service for any illegal or unauthorized purpose</li>
              <li>Attempting to reverse engineer or copy our AI models</li>
              <li>Sharing copyrighted content without permission</li>
              <li>Creating discriminatory or biased interview questions</li>
              <li>Automated or bulk usage that violates rate limits</li>
              <li>Reselling or redistributing our Service without permission</li>
            </ul>

            <h2>Content and Intellectual Property</h2>
            
            <h3>Your Content</h3>
            <ul>
              <li>You retain ownership of content you provide (resumes, job descriptions)</li>
              <li>You grant us license to use your content to provide the Service</li>
              <li>You represent that you have rights to all content you provide</li>
            </ul>

            <h3>Generated Content</h3>
            <ul>
              <li>You own the interview questions generated for your use</li>
              <li>We may use anonymized, aggregated data to improve our Service</li>
              <li>We retain rights to our AI models and underlying technology</li>
            </ul>

            <h3>Our Intellectual Property</h3>
            <ul>
              <li>The Service, including all AI models, is protected by intellectual property laws</li>
              <li>Our trademarks, logos, and brand elements are our property</li>
              <li>You may not use our intellectual property without written permission</li>
            </ul>

            <h2>Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Please review our <a href="/privacy-policy" className="text-indigo-600 hover:text-indigo-800">Privacy Policy</a> to understand how we collect, use, and protect your information.
            </p>

            <h2>Service Availability</h2>
            <ul>
              <li>We strive to maintain high service availability but do not guarantee uninterrupted access</li>
              <li>We may perform maintenance that temporarily affects service availability</li>
              <li>We may modify or discontinue features with reasonable notice</li>
            </ul>

            <h2>Disclaimers and Limitations</h2>
            
            <h3>AI-Generated Content</h3>
            <ul>
              <li>Interview questions are generated by AI and may not always be perfect</li>
              <li>You should review and adapt generated content for your specific needs</li>
              <li>We do not guarantee the accuracy or appropriateness of generated content</li>
            </ul>

            <h3>Service Limitations</h3>
            <ul>
              <li>The Service is provided "as is" without warranties of any kind</li>
              <li>We disclaim all warranties, express or implied</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability is limited to the amount you paid in the last 12 months</li>
            </ul>

            <h2>Termination</h2>
            
            <h3>By You</h3>
            <ul>
              <li>You may cancel your account at any time</li>
              <li>Cancellation takes effect at the end of your current billing period</li>
              <li>You remain responsible for charges incurred before cancellation</li>
            </ul>

            <h3>By Us</h3>
            <ul>
              <li>We may suspend or terminate accounts for violations of these Terms</li>
              <li>We may terminate the Service with 30 days notice</li>
              <li>We may immediately suspend accounts for security reasons</li>
            </ul>

            <h2>Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms or use of the Service will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
            </p>

            <h2>Changes to Terms</h2>
            <p>
              We may update these Terms periodically. We will notify users of material changes via email or through the Service. Continued use after changes become effective constitutes acceptance of the updated Terms.
            </p>

            <h2>Governing Law</h2>
            <p>
              These Terms are governed by the laws of the United States and the State of California, without regard to conflict of law principles.
            </p>

            <h2>Contact Information</h2>
            <p>
              If you have questions about these Terms of Service, please contact us:
            </p>
            <ul>
              <li><strong>Email:</strong> nextroundsai@gmail.com</li>
              <li><strong>Website:</strong> <a href="https://nextrounds.ai" className="text-indigo-600 hover:text-indigo-800">nextrounds.ai</a></li>
            </ul>

            <h2>Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </p>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfServicePage;