export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answer_keys: {
        Row: {
          answer: string
          id: string
          position: number
          question_id: string
        }
        Insert: {
          answer: string
          id?: string
          position?: number
          question_id: string
        }
        Update: {
          answer?: string
          id?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          choice_id: string | null
          is_correct: boolean | null
          question_id: string
          text_answer: string | null
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          choice_id?: string | null
          is_correct?: boolean | null
          question_id: string
          text_answer?: string | null
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          choice_id?: string | null
          is_correct?: boolean | null
          question_id?: string
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "exam_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      choices: {
        Row: {
          body: string
          id: string
          is_correct: boolean
          position: number
          question_id: string
        }
        Insert: {
          body: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id: string
        }
        Update: {
          body?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_feedback: {
        Row: {
          course_comment: string | null
          course_id: string
          created_at: string
          general_comment: string | null
          id: string
          user_id: string
        }
        Insert: {
          course_comment?: string | null
          course_id: string
          created_at?: string
          general_comment?: string | null
          id?: string
          user_id: string
        }
        Update: {
          course_comment?: string | null
          course_id?: string
          created_at?: string
          general_comment?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_files: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_published: boolean
          position: number
          size_bytes: number | null
          storage_path: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          position?: number
          size_bytes?: number | null
          storage_path: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          position?: number
          size_bytes?: number | null
          storage_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_files_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          exam_id: string
          id: string
          passed: boolean | null
          score: number | null
          started_at: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          exam_id: string
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          exam_id?: string
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_feedback: {
        Row: {
          attempt_id: string
          created_at: string
          exam_comment: string | null
          exam_id: string
          general_comment: string | null
          id: string
          user_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          exam_comment?: string | null
          exam_id: string
          general_comment?: string | null
          id?: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          exam_comment?: string | null
          exam_id?: string
          general_comment?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_feedback_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          closes_at: string | null
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fuzzy_matching: boolean
          id: string
          is_published: boolean
          max_attempts: number | null
          opens_at: string | null
          passing_score: number | null
          reveal_answers: boolean
          slug: string
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fuzzy_matching?: boolean
          id?: string
          is_published?: boolean
          max_attempts?: number | null
          opens_at?: string | null
          passing_score?: number | null
          reveal_answers?: boolean
          slug: string
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fuzzy_matching?: boolean
          id?: string
          is_published?: boolean
          max_attempts?: number | null
          opens_at?: string | null
          passing_score?: number | null
          reveal_answers?: boolean
          slug?: string
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      id_answers: {
        Row: {
          answered_at: string
          answered_on: string
          card_id: string
          given: string
          id: string
          is_correct: boolean
          label_no: number
          user_id: string
        }
        Insert: {
          answered_at?: string
          answered_on?: string
          card_id: string
          given: string
          id?: string
          is_correct: boolean
          label_no: number
          user_id: string
        }
        Update: {
          answered_at?: string
          answered_on?: string
          card_id?: string
          given?: string
          id?: string
          is_correct?: boolean
          label_no?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "id_answers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "id_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "id_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      id_card_labels: {
        Row: {
          answer: string
          card_id: string
          id: string
          label_no: number
          synonyms: string[]
        }
        Insert: {
          answer: string
          card_id: string
          id?: string
          label_no: number
          synonyms?: string[]
        }
        Update: {
          answer?: string
          card_id?: string
          id?: string
          label_no?: number
          synonyms?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "id_card_labels_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "id_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      id_card_organ_systems: {
        Row: {
          card_id: string
          organ_system_id: number
        }
        Insert: {
          card_id: string
          organ_system_id: number
        }
        Update: {
          card_id?: string
          organ_system_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "id_card_organ_systems_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "id_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "id_card_organ_systems_organ_system_id_fkey"
            columns: ["organ_system_id"]
            isOneToOne: false
            referencedRelation: "organ_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      id_cards: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_path: string
          is_published: boolean
          subject: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_path: string
          is_published?: boolean
          subject?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string
          is_published?: boolean
          subject?: string
          title?: string
        }
        Relationships: []
      }
      id_pending: {
        Row: {
          card_id: string
          label_no: number
          served_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          label_no: number
          served_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          label_no?: number
          served_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "id_pending_card_id_label_no_fkey"
            columns: ["card_id", "label_no"]
            isOneToOne: false
            referencedRelation: "id_card_labels"
            referencedColumns: ["card_id", "label_no"]
          },
          {
            foreignKeyName: "id_pending_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organ_systems: {
        Row: {
          id: number
          name_en: string
          name_th: string
          position: number
          slug: string
        }
        Insert: {
          id?: never
          name_en: string
          name_th: string
          position?: number
          slug: string
        }
        Update: {
          id?: never
          name_en?: string
          name_th?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          line_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          line_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          line_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      question_organ_systems: {
        Row: {
          organ_system_id: number
          question_id: string
        }
        Insert: {
          organ_system_id: number
          question_id: string
        }
        Update: {
          organ_system_id?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_organ_systems_organ_system_id_fkey"
            columns: ["organ_system_id"]
            isOneToOne: false
            referencedRelation: "organ_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_organ_systems_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          exam_id: string
          explanation: string | null
          id: string
          image_path: string | null
          kind: Database["public"]["Enums"]["question_kind"]
          points: number
          position: number
          stem: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          explanation?: string | null
          id?: string
          image_path?: string | null
          kind?: Database["public"]["Enums"]["question_kind"]
          points?: number
          position?: number
          stem: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          explanation?: string | null
          id?: string
          image_path?: string | null
          kind?: Database["public"]["Enums"]["question_kind"]
          points?: number
          position?: number
          stem?: string
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
      user_activity: {
        Row: {
          activity_date: string
          created_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          created_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_files: {
        Row: {
          course_id: string
          file_id: string
          video_id: string
        }
        Insert: {
          course_id: string
          file_id: string
          video_id: string
        }
        Update: {
          course_id?: string
          file_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_files_file_id_course_id_fkey"
            columns: ["file_id", "course_id"]
            isOneToOne: false
            referencedRelation: "course_files"
            referencedColumns: ["id", "course_id"]
          },
          {
            foreignKeyName: "video_files_video_id_course_id_fkey"
            columns: ["video_id", "course_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id", "course_id"]
          },
        ]
      }
      video_issue_reports: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved: boolean
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved?: boolean
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved?: boolean
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_issue_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_issue_reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          seconds_watched: number
          started_at: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          seconds_watched?: number
          started_at?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          seconds_watched?: number
          started_at?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_watch_days: {
        Row: {
          user_id: string
          video_id: string
          watch_date: string
        }
        Insert: {
          user_id: string
          video_id: string
          watch_date: string
        }
        Update: {
          user_id?: string
          video_id?: string
          watch_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_watch_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_watch_days_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          external_url: string | null
          id: string
          is_published: boolean
          position: number
          published_at: string | null
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          is_published?: boolean
          position?: number
          published_at?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          is_published?: boolean
          position?: number
          published_at?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      exam_choices: {
        Row: {
          body: string | null
          id: string | null
          position: number | null
          question_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      answer_distance: {
        Args: { p_answer: string; p_key: string }
        Returns: number
      }
      answer_id_label: {
        Args: { p_answer: string }
        Returns: {
          answer: string
          card_id: string
          daily_limit: number | null
          given: string
          is_correct: boolean
          label_no: number
          used: number
        }[]
      }
      current_user_email: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      exam_is_open: { Args: { p_exam_id: string }; Returns: boolean }
      fuzzy_tolerance: { Args: { p_norm_key: string }; Returns: number }
      get_attempt_review: {
        Args: { p_attempt_id: string }
        Returns: {
          accepted_answers: string[]
          closest_answer: string
          correct_choice_id: string
          distance: number
          question_id: string
        }[]
      }
      get_course_progress_pace: {
        Args: { p_course_id: string }
        Returns: {
          active_students: number
          avg_completed: number
          published_videos: number
        }[]
      }
      get_my_streak: {
        Args: never
        Returns: {
          current_streak: number
          last_active_date: string
          longest_streak: number
        }[]
      }
      get_video_learning_time_stats: {
        Args: { p_course_id?: string }
        Returns: {
          avg_active_days: number
          avg_span_days: number
          finished_count: number
          in_progress_count: number
          median_active_days: number
          median_span_days: number
          timed_count: number
          video_id: string
        }[]
      }
      get_video_progress_summary: {
        Args: { p_course_id?: string }
        Returns: {
          avg_completed: number
          median_completed: number
          not_started_students: number
          published_videos: number
          students: number
        }[]
      }
      id_daily_limit: { Args: never; Returns: number | null }
      id_item_groups: {
        Args: never
        Returns: {
          card_id: string
          grp: number
          label_no: number
        }[]
      }
      id_quota: {
        Args: never
        Returns: {
          daily_limit: number | null
          used: number
        }[]
      }
      is_staff: { Args: never; Returns: boolean }
      next_id_question: {
        Args: { p_card_id?: string }
        Returns: {
          card_id: string
          label_no: number
        }[]
      }
      normalize_answer: { Args: { p: string }; Returns: string }
      submit_exam_attempt: {
        Args: { p_attempt_id: string }
        Returns: {
          exam_id: string
          id: string
          passed: boolean | null
          score: number | null
          started_at: string
          submitted_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "exam_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      text_answer_matches: {
        Args: { p_answer: string; p_question_id: string }
        Returns: boolean
      }
    }
    Enums: {
      question_kind: "choice" | "text"
      user_role: "student" | "instructor" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      question_kind: ["choice", "text"],
      user_role: ["student", "instructor", "admin"],
    },
  },
} as const
