export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          subscription_plan: 'free' | 'pro'
          subscription_status: 'active' | 'cancelled' | 'expired'
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_renewal_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          subscription_plan?: 'free' | 'pro'
          subscription_status?: 'active' | 'cancelled' | 'expired'
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_renewal_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          subscription_plan?: 'free' | 'pro'
          subscription_status?: 'active' | 'cancelled' | 'expired'
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_renewal_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          questions_generated: number
          last_reset_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          questions_generated?: number
          last_reset_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          questions_generated?: number
          last_reset_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      question_generations: {
        Row: {
          id: string
          user_id: string
          job_title: string | null
          company_name: string | null
          hiring_stage: string
          questions_count: number
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_title?: string | null
          company_name?: string | null
          hiring_stage: string
          questions_count?: number
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_title?: string | null
          company_name?: string | null
          hiring_stage?: string
          questions_count?: number
          generated_at?: string
        }
      }
      user_resumes: {
        Row: {
          id: string
          user_id: string
          resume_filename: string
          resume_content: string
          file_type: string
          file_size: number
          uploaded_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          resume_filename: string
          resume_content: string
          file_type: string
          file_size: number
          uploaded_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          resume_filename?: string
          resume_content?: string
          file_type?: string
          file_size?: number
          uploaded_at?: string
          is_active?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_generate_questions: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      reset_monthly_usage: {
        Args: {}
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}