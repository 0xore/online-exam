export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      answers: {
        Row: {
          answer: Json | null
          attempt_id: string
          auto_marks: number | null
          created_at: string
          id: string
          manual_marks: number | null
          marker_comment: string | null
          question_id: string
          saved_at: string
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          attempt_id: string
          auto_marks?: number | null
          created_at?: string
          id?: string
          manual_marks?: number | null
          marker_comment?: string | null
          question_id: string
          saved_at?: string
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          attempt_id?: string
          auto_marks?: number | null
          created_at?: string
          id?: string
          manual_marks?: number | null
          marker_comment?: string | null
          question_id?: string
          saved_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_start_events: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          student_email_normalized: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          student_email_normalized: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          student_email_normalized?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_start_events_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          auto_score: number | null
          created_at: string
          exam_id: string
          expires_at: string
          final_score: number | null
          id: string
          manual_score: number | null
          option_order: Json | null
          question_order: string[] | null
          session_token_hash: string
          started_at: string
          status: string
          student_email: string
          student_email_normalized: string | null
          student_name: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          auto_score?: number | null
          created_at?: string
          exam_id: string
          expires_at: string
          final_score?: number | null
          id?: string
          manual_score?: number | null
          option_order?: Json | null
          question_order?: string[] | null
          session_token_hash: string
          started_at?: string
          status?: string
          student_email: string
          student_email_normalized?: string | null
          student_name: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_score?: number | null
          created_at?: string
          exam_id?: string
          expires_at?: string
          final_score?: number | null
          id?: string
          manual_score?: number | null
          option_order?: Json | null
          question_order?: string[] | null
          session_token_hash?: string
          started_at?: string
          status?: string
          student_email?: string
          student_email_normalized?: string | null
          student_name?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          available_from: string | null
          available_until: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          exam_type: string
          id: string
          pass_mark: number | null
          published: boolean
          settings: Json
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          exam_type?: string
          id?: string
          pass_mark?: number | null
          published?: boolean
          settings?: Json
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          exam_type?: string
          id?: string
          pass_mark?: number | null
          published?: boolean
          settings?: Json
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          acceptable_answers: Json | null
          correct_answer: Json | null
          created_at: string
          exam_id: string
          id: string
          marks: number
          options: Json | null
          position: number
          question_text: string
          type: string
          updated_at: string
        }
        Insert: {
          acceptable_answers?: Json | null
          correct_answer?: Json | null
          created_at?: string
          exam_id: string
          id?: string
          marks: number
          options?: Json | null
          position: number
          question_text: string
          type: string
          updated_at?: string
        }
        Update: {
          acceptable_answers?: Json | null
          correct_answer?: Json | null
          created_at?: string
          exam_id?: string
          id?: string
          marks?: number
          options?: Json | null
          position?: number
          question_text?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_exam: { Args: { p_exam_id: string }; Returns: boolean }
      bootstrap_first_admin: { Args: never; Returns: boolean }
      exam_is_mcq_only: { Args: { p_exam_id: string }; Returns: boolean }
      get_candidate_attempt: {
        Args: { p_slug: string; p_token_hash: string }
        Returns: Json
      }
      get_candidate_paper: {
        Args: { p_slug: string; p_token_hash: string }
        Returns: Json
      }
      get_candidate_result: {
        Args: { p_slug: string; p_token_hash: string }
        Returns: Json
      }
      save_candidate_answer: {
        Args: {
          p_answer: Json
          p_question_id: string
          p_slug: string
          p_token_hash: string
        }
        Returns: Json
      }
      submit_candidate_attempt: {
        Args: { p_slug: string; p_token_hash: string }
        Returns: Json
      }
      sync_candidate_attempt: {
        Args: { p_slug: string; p_token_hash: string }
        Returns: Json
      }
      has_admin_users: { Args: never; Returns: boolean }
      provision_first_admin: {
        Args: { p_email: string; p_password: string }
        Returns: boolean
      }
      start_or_resume_attempt: {
        Args: {
          p_slug: string
          p_student_email: string
          p_student_name: string
          p_token_hash: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type ExamType = "mcq" | "mixed"

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "long_answer"

export type AttemptStatus = "active" | "submitted" | "expired" | "reset"
