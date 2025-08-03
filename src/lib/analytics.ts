// Analytics utility functions for tracking user interactions

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

// Track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      event_category: 'engagement',
      event_label: eventName,
      ...parameters,
    });
  }
};

// Track specific Next Rounds AI events
export const analytics = {
  // User signup
  trackSignup: (method: 'email' | 'social' = 'email') => {
    trackEvent('sign_up', {
      method,
      event_category: 'user_acquisition',
    });
  },

  // User login
  trackLogin: (method: 'email' | 'social' = 'email') => {
    trackEvent('login', {
      method,
      event_category: 'user_engagement',
    });
  },

  // Question generation
  trackQuestionGeneration: (hiringStage: string, questionCount: number) => {
    trackEvent('generate_questions', {
      hiring_stage: hiringStage,
      question_count: questionCount,
      event_category: 'core_feature',
      value: questionCount,
    });
  },

  // PDF export
  trackPDFExport: (questionCount: number) => {
    trackEvent('export_pdf', {
      question_count: questionCount,
      event_category: 'feature_usage',
      value: 1,
    });
  },

  // CSV export (Pro feature)
  trackCSVExport: (questionCount: number) => {
    trackEvent('export_csv', {
      question_count: questionCount,
      event_category: 'pro_feature',
      value: 1,
    });
  },

  // Upgrade to Pro
  trackUpgrade: (plan: string, amount: number = 3.99) => {
    trackEvent('purchase', {
      transaction_id: Date.now().toString(),
      value: amount,
      currency: 'USD',
      items: [{
        item_id: plan,
        item_name: `Next Rounds AI - ${plan}`,
        item_category: 'subscription',
        price: amount,
        quantity: 1,
      }],
      event_category: 'conversion',
    });
  },

  // Contact form submission
  trackContactForm: (subject: string) => {
    trackEvent('contact_form_submit', {
      form_subject: subject,
      event_category: 'lead_generation',
    });
  },

  // Feature clicks
  trackFeatureClick: (feature: string, location: string) => {
    trackEvent('feature_click', {
      feature_name: feature,
      click_location: location,
      event_category: 'user_interaction',
    });
  },

  // Page views (custom tracking)
  trackPageView: (pageName: string) => {
    trackEvent('page_view', {
      page_title: pageName,
      event_category: 'navigation',
    });
  },

  // Tool usage flow
  trackToolInteraction: (action: 'start' | 'upload_resume' | 'paste_job' | 'select_stage' | 'submit') => {
    trackEvent('tool_interaction', {
      interaction_type: action,
      event_category: 'tool_usage',
    });
  },

  // Engagement metrics
  trackEngagement: (action: string, section: string) => {
    trackEvent('engagement', {
      action,
      section,
      event_category: 'user_engagement',
    });
  },
};

// Track conversion funnel
export const trackFunnel = {
  visitLanding: () => analytics.trackPageView('Landing Page'),
  viewTool: () => analytics.trackEngagement('view_tool', 'hero_section'),
  startTool: () => analytics.trackToolInteraction('start'),
  uploadResume: () => analytics.trackToolInteraction('upload_resume'),
  pasteJob: () => analytics.trackToolInteraction('paste_job'),
  selectStage: () => analytics.trackToolInteraction('select_stage'),
  submitGeneration: () => analytics.trackToolInteraction('submit'),
  viewPricing: () => analytics.trackEngagement('view_pricing', 'pricing_section'),
  clickUpgrade: () => analytics.trackFeatureClick('upgrade_button', 'pricing_section'),
};