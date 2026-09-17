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
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          assessment_date: string | null
          created_at: string
          expected_content: string | null
          id: string
          name: string
          notebook_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          assessment_date?: string | null
          created_at?: string
          expected_content?: string | null
          id?: string
          name: string
          notebook_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assessment_date?: string | null
          created_at?: string
          expected_content?: string | null
          id?: string
          name?: string
          notebook_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category: string | null
          created_at: string
          estimated_value: number | null
          id: string
          location: string | null
          name: string
          updated_at: string
          user_id: string
          warranty_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          location?: string | null
          name: string
          updated_at?: string
          user_id: string
          warranty_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
          user_id?: string
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      base_formulas: {
        Row: {
          base_id: string
          created_at: string
          expression: string
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          base_id: string
          created_at?: string
          expression: string
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          base_id?: string
          created_at?: string
          expression?: string
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_formulas_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
      base_pages: {
        Row: {
          base_id: string
          created_at: string
          page_id: string
        }
        Insert: {
          base_id: string
          created_at?: string
          page_id: string
        }
        Update: {
          base_id?: string
          created_at?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_pages_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "base_pages_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      bases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          view_config: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          view_config?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          view_config?: Json
        }
        Relationships: []
      }
      blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["block_type"]
          content: Json
          created_at: string
          id: string
          order_index: number
          page_id: string
          updated_at: string
        }
        Insert: {
          block_type?: Database["public"]["Enums"]["block_type"]
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          page_id: string
          updated_at?: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["block_type"]
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          page_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          alert_sent_at: string | null
          category_id: string
          created_at: string
          id: string
          limit_amount: number
          updated_at: string
          user_id: string
          year_month: string
        }
        Insert: {
          alert_sent_at?: string | null
          category_id: string
          created_at?: string
          id?: string
          limit_amount: number
          updated_at?: string
          user_id: string
          year_month: string
        }
        Update: {
          alert_sent_at?: string | null
          category_id?: string
          created_at?: string
          id?: string
          limit_amount?: number
          updated_at?: string
          user_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      card_statements: {
        Row: {
          card_id: string
          closing_date: string
          created_at: string
          due_date: string
          due_reminder_sent_at: string | null
          id: string
          paid_at: string | null
          reference_month: string
          status: Database["public"]["Enums"]["card_statement_status"]
          user_id: string
        }
        Insert: {
          card_id: string
          closing_date: string
          created_at?: string
          due_date: string
          due_reminder_sent_at?: string | null
          id?: string
          paid_at?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["card_statement_status"]
          user_id: string
        }
        Update: {
          card_id?: string
          closing_date?: string
          created_at?: string
          due_date?: string
          due_reminder_sent_at?: string | null
          id?: string
          paid_at?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["card_statement_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_statements_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          closing_day: number | null
          created_at: string
          due_day: number | null
          id: string
          institution: string | null
          last_digits: string | null
          nickname: string
          user_id: string
        }
        Insert: {
          closing_day?: number | null
          created_at?: string
          due_day?: number | null
          id?: string
          institution?: string | null
          last_digits?: string | null
          nickname: string
          user_id: string
        }
        Update: {
          closing_day?: number | null
          created_at?: string
          due_day?: number | null
          id?: string
          institution?: string | null
          last_digits?: string | null
          nickname?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          energy: number
          id: string
          mood: number
          note: string | null
          sleep_quality: number
          user_id: string
        }
        Insert: {
          checkin_date: string
          created_at?: string
          energy: number
          id?: string
          mood: number
          note?: string | null
          sleep_quality: number
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          energy?: number
          id?: string
          mood?: number
          note?: string | null
          sleep_quality?: number
          user_id?: string
        }
        Relationships: []
      }
      document_important_dates: {
        Row: {
          created_at: string
          date: string
          document_id: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          date: string
          document_id: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          date?: string
          document_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_important_dates_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_relations: {
        Row: {
          created_at: string
          document_id: string
          id: string
          note: string | null
          related_entity_id: string
          related_module: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          note?: string | null
          related_entity_id: string
          related_module: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          note?: string | null
          related_entity_id?: string
          related_module?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_relations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          content_hash: string | null
          created_at: string
          document_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          version_number: number
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          document_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          version_number: number
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          document_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content_hash: string | null
          created_at: string
          current_version: number
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          extracted_text: string | null
          file_name: string
          folder_id: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          is_important: boolean
          is_vault: boolean
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          current_version?: number
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          extracted_text?: string | null
          file_name: string
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_important?: boolean
          is_vault?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          current_version?: number
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          extracted_text?: string | null
          file_name?: string
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_important?: boolean
          is_vault?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      errors_doubts: {
        Row: {
          created_at: string
          description: string
          flashcard_id: string | null
          id: string
          is_resolved: boolean
          kind: Database["public"]["Enums"]["error_doubt_kind"]
          notebook_id: string
          summary_id: string | null
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          flashcard_id?: string | null
          id?: string
          is_resolved?: boolean
          kind?: Database["public"]["Enums"]["error_doubt_kind"]
          notebook_id: string
          summary_id?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          flashcard_id?: string | null
          id?: string
          is_resolved?: boolean
          kind?: Database["public"]["Enums"]["error_doubt_kind"]
          notebook_id?: string
          summary_id?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "errors_doubts_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errors_doubts_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errors_doubts_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "errors_doubts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          id: string
          minutes_before: number
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          minutes_before: number
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          minutes_before?: number
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          assessment_id: string | null
          buffer_after_minutes: number
          buffer_before_minutes: number
          category: string
          created_at: string
          description: string | null
          end_at: string
          google_event_id: string | null
          google_updated_at: string | null
          id: string
          is_all_day: boolean
          location: string | null
          meeting_link: string | null
          start_at: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category?: string
          created_at?: string
          description?: string | null
          end_at: string
          google_event_id?: string | null
          google_updated_at?: string | null
          id?: string
          is_all_day?: boolean
          location?: string | null
          meeting_link?: string | null
          start_at: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category?: string
          created_at?: string
          description?: string | null
          end_at?: string
          google_event_id?: string | null
          google_updated_at?: string | null
          id?: string
          is_all_day?: boolean
          location?: string | null
          meeting_link?: string | null
          start_at?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          flashcard_id: string
          grade: Database["public"]["Enums"]["flashcard_review_grade"]
          id: string
          reviewed_at: string
        }
        Insert: {
          flashcard_id: string
          grade: Database["public"]["Enums"]["flashcard_review_grade"]
          id?: string
          reviewed_at?: string
        }
        Update: {
          flashcard_id?: string
          grade?: Database["public"]["Enums"]["flashcard_review_grade"]
          id?: string
          reviewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          next_review_date: string
          notebook_id: string
          repetitions: number
          summary_id: string | null
          tags: string[]
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          back: string
          created_at?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          next_review_date?: string
          notebook_id: string
          repetitions?: number
          summary_id?: string | null
          tags?: string[]
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          back?: string
          created_at?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          next_review_date?: string
          notebook_id?: string
          repetitions?: number
          summary_id?: string | null
          tags?: string[]
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_stats: {
        Row: {
          habit_or_goal_checkins: number
          library_items_completed: number
          quizzes_completed: number
          tasks_completed: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          habit_or_goal_checkins?: number
          library_items_completed?: number
          quizzes_completed?: number
          tasks_completed?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          habit_or_goal_checkins?: number
          library_items_completed?: number
          quizzes_completed?: number
          tasks_completed?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      goal_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          goal_id: string
          id: string
          note: string | null
          progress_percent_snapshot: number | null
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          progress_percent_snapshot?: number | null
        }
        Update: {
          checkin_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          progress_percent_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_checkins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_habit_relations: {
        Row: {
          created_at: string
          goal_id: string
          habit_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          habit_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          habit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_habit_relations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_habit_relations_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          is_done: boolean
          note: string | null
          order_index: number
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          is_done?: boolean
          note?: string | null
          order_index?: number
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          is_done?: boolean
          note?: string | null
          order_index?: number
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          motivation_note: string | null
          parent_goal_id: string | null
          progress_numeric_current: number | null
          progress_numeric_target: number | null
          progress_percent: number | null
          progress_source_account_id: string | null
          progress_source_module: string | null
          progress_type: Database["public"]["Enums"]["goal_progress_type"]
          status: Database["public"]["Enums"]["goal_status"]
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          motivation_note?: string | null
          parent_goal_id?: string | null
          progress_numeric_current?: number | null
          progress_numeric_target?: number | null
          progress_percent?: number | null
          progress_source_account_id?: string | null
          progress_source_module?: string | null
          progress_type?: Database["public"]["Enums"]["goal_progress_type"]
          status?: Database["public"]["Enums"]["goal_status"]
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          motivation_note?: string | null
          parent_goal_id?: string | null
          progress_numeric_current?: number | null
          progress_numeric_target?: number | null
          progress_percent?: number | null
          progress_source_account_id?: string | null
          progress_source_module?: string | null
          progress_type?: Database["public"]["Enums"]["goal_progress_type"]
          status?: Database["public"]["Enums"]["goal_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_progress_source_account_id_fkey"
            columns: ["progress_source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          created_at: string
          google_calendar_id: string
          last_synced_at: string | null
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_calendar_id: string
          last_synced_at?: string | null
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_calendar_id?: string
          last_synced_at?: string | null
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_oauth_states: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          log_date: string
          note: string | null
          quantity: number | null
          state: Database["public"]["Enums"]["habit_log_state"]
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          log_date: string
          note?: string | null
          quantity?: number | null
          state: Database["public"]["Enums"]["habit_log_state"]
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          note?: string | null
          quantity?: number | null
          state?: Database["public"]["Enums"]["habit_log_state"]
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          frequency_config: Json
          frequency_type: Database["public"]["Enums"]["habit_frequency_type"]
          id: string
          last_reminder_sent_date: string | null
          name: string
          preferred_time: string | null
          status: Database["public"]["Enums"]["habit_status"]
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          frequency_config?: Json
          frequency_type?: Database["public"]["Enums"]["habit_frequency_type"]
          id?: string
          last_reminder_sent_date?: string | null
          name: string
          preferred_time?: string | null
          status?: Database["public"]["Enums"]["habit_status"]
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          frequency_config?: Json
          frequency_type?: Database["public"]["Enums"]["habit_frequency_type"]
          id?: string
          last_reminder_sent_date?: string | null
          name?: string
          preferred_time?: string | null
          status?: Database["public"]["Enums"]["habit_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      important_purchases: {
        Row: {
          created_at: string
          estimated_price: number | null
          id: string
          is_purchased: boolean
          priority: Database["public"]["Enums"]["purchase_priority"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_price?: number | null
          id?: string
          is_purchased?: boolean
          priority?: Database["public"]["Enums"]["purchase_priority"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_price?: number | null
          id?: string
          is_purchased?: boolean
          priority?: Database["public"]["Enums"]["purchase_priority"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      installments: {
        Row: {
          account_id: string | null
          card_id: string | null
          category_id: string | null
          created_at: string
          first_installment_date: string
          id: string
          installment_count: number
          name: string
          total_amount: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          first_installment_date: string
          id?: string
          installment_count: number
          name: string
          total_amount: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          first_installment_date?: string
          id?: string
          installment_count?: number
          name?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      library_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          item_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          item_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "library_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_collection_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      library_collections: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      library_consumption_cycles: {
        Row: {
          created_at: string
          end_state: string | null
          ended_at: string | null
          id: string
          item_id: string
          note: string | null
          rating: number | null
          started_at: string
        }
        Insert: {
          created_at?: string
          end_state?: string | null
          ended_at?: string | null
          id?: string
          item_id: string
          note?: string | null
          rating?: number | null
          started_at?: string
        }
        Update: {
          created_at?: string
          end_state?: string | null
          ended_at?: string | null
          id?: string
          item_id?: string
          note?: string | null
          rating?: number | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_consumption_cycles_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      library_item_creators: {
        Row: {
          id: string
          item_id: string
          name: string
          order_index: number
          role: string
        }
        Insert: {
          id?: string
          item_id: string
          name: string
          order_index?: number
          role?: string
        }
        Update: {
          id?: string
          item_id?: string
          name?: string
          order_index?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_item_creators_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      library_item_relations: {
        Row: {
          created_at: string
          relation_type: Database["public"]["Enums"]["library_relation_type"]
          source_item_id: string
          target_item_id: string
        }
        Insert: {
          created_at?: string
          relation_type?: Database["public"]["Enums"]["library_relation_type"]
          source_item_id: string
          target_item_id: string
        }
        Update: {
          created_at?: string
          relation_type?: Database["public"]["Enums"]["library_relation_type"]
          source_item_id?: string
          target_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_item_relations_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_item_relations_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          item_type: Database["public"]["Enums"]["library_item_type"]
          language: string | null
          origin_url: string | null
          progress_current: number | null
          progress_mode: string | null
          progress_total: number | null
          progress_unit: string | null
          rating: number | null
          short_note: string | null
          status: Database["public"]["Enums"]["library_item_status"]
          subtitle: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          item_type?: Database["public"]["Enums"]["library_item_type"]
          language?: string | null
          origin_url?: string | null
          progress_current?: number | null
          progress_mode?: string | null
          progress_total?: number | null
          progress_unit?: string | null
          rating?: number | null
          short_note?: string | null
          status?: Database["public"]["Enums"]["library_item_status"]
          subtitle?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          item_type?: Database["public"]["Enums"]["library_item_type"]
          language?: string | null
          origin_url?: string | null
          progress_current?: number | null
          progress_mode?: string | null
          progress_total?: number | null
          progress_unit?: string | null
          rating?: number | null
          short_note?: string | null
          status?: Database["public"]["Enums"]["library_item_status"]
          subtitle?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      notebook_library_items: {
        Row: {
          created_at: string
          library_item_id: string
          notebook_id: string
        }
        Insert: {
          created_at?: string
          library_item_id: string
          notebook_id: string
        }
        Update: {
          created_at?: string
          library_item_id?: string
          notebook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_library_items_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_library_items_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          area: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          institution: string | null
          instructor: string | null
          is_favorite: boolean
          name: string
          notebook_type: Database["public"]["Enums"]["notebook_type"]
          start_date: string | null
          status: Database["public"]["Enums"]["notebook_status"]
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          institution?: string | null
          instructor?: string | null
          is_favorite?: boolean
          name: string
          notebook_type?: Database["public"]["Enums"]["notebook_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["notebook_status"]
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          institution?: string | null
          instructor?: string | null
          is_favorite?: boolean
          name?: string
          notebook_type?: Database["public"]["Enums"]["notebook_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["notebook_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_checkpoints: {
        Row: {
          blocks_snapshot: Json
          created_at: string
          id: string
          page_id: string
          title: string
        }
        Insert: {
          blocks_snapshot: Json
          created_at?: string
          id?: string
          page_id: string
          title: string
        }
        Update: {
          blocks_snapshot?: Json
          created_at?: string
          id?: string
          page_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_checkpoints_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_links: {
        Row: {
          created_at: string
          source_page_id: string
          target_page_id: string
        }
        Insert: {
          created_at?: string
          source_page_id: string
          target_page_id: string
        }
        Update: {
          created_at?: string
          source_page_id?: string
          target_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_links_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_links_target_page_id_fkey"
            columns: ["target_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_properties: {
        Row: {
          created_at: string
          id: string
          key: string
          page_id: string
          property_type: Database["public"]["Enums"]["page_property_type"]
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          page_id: string
          property_type?: Database["public"]["Enums"]["page_property_type"]
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          page_id?: string
          property_type?: Database["public"]["Enums"]["page_property_type"]
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "page_properties_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_tags: {
        Row: {
          created_at: string
          page_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          page_id: string
          tag: string
        }
        Update: {
          created_at?: string
          page_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_tags_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          is_favorite: boolean
          page_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          page_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          page_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_google_deletions: {
        Row: {
          created_at: string
          google_event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_goals: {
        Row: {
          created_at: string
          goal_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          plan_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          period_end: string
          period_start: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: Database["public"]["Enums"]["plan_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          period_end: string
          period_start: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["plan_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          period_end?: string
          period_start?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["plan_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pomodoro_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          ended_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["pomodoro_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          ended_at?: string | null
          id?: string
          started_at: string
          status: Database["public"]["Enums"]["pomodoro_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["pomodoro_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_tier: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          pin_failed_attempts: number
          pin_hash: string | null
          pin_locked_until: string | null
          role: string
          updated_at: string
          username: string | null
        }
        Insert: {
          account_tier?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          pin_failed_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          role?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_tier?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          pin_failed_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          role?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          created_at: string
          project_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["plan_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string
          id?: string
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_option_index: number
          id: string
          options: Json
          order_index: number
          question_text: string
          quiz_id: string
        }
        Insert: {
          correct_option_index: number
          id?: string
          options: Json
          order_index?: number
          question_text: string
          quiz_id: string
        }
        Update: {
          correct_option_index?: number
          id?: string
          options?: Json
          order_index?: number
          question_text?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          notebook_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          notebook_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          notebook_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_events: {
        Row: {
          buffer_after_minutes: number
          buffer_before_minutes: number
          category: string
          created_at: string
          description: string | null
          end_time: string | null
          frequency: Database["public"]["Enums"]["task_recurrence_frequency"]
          id: string
          is_all_day: boolean
          location: string | null
          meeting_link: string | null
          next_occurrence_date: string
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["recurring_status"]
          title: string
          user_id: string
        }
        Insert: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          frequency: Database["public"]["Enums"]["task_recurrence_frequency"]
          id?: string
          is_all_day?: boolean
          location?: string | null
          meeting_link?: string | null
          next_occurrence_date: string
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["recurring_status"]
          title: string
          user_id: string
        }
        Update: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          frequency?: Database["public"]["Enums"]["task_recurrence_frequency"]
          id?: string
          is_all_day?: boolean
          location?: string | null
          meeting_link?: string | null
          next_occurrence_date?: string
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["recurring_status"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_tasks: {
        Row: {
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["task_recurrence_frequency"]
          id: string
          next_occurrence_date: string
          priority: Database["public"]["Enums"]["task_priority"]
          start_date: string
          status: Database["public"]["Enums"]["recurring_status"]
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency: Database["public"]["Enums"]["task_recurrence_frequency"]
          id?: string
          next_occurrence_date: string
          priority?: Database["public"]["Enums"]["task_priority"]
          start_date: string
          status?: Database["public"]["Enums"]["recurring_status"]
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["task_recurrence_frequency"]
          id?: string
          next_occurrence_date?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          start_date?: string
          status?: Database["public"]["Enums"]["recurring_status"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category_id: string | null
          created_at: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          is_subscription: boolean
          name: string
          next_occurrence_date: string
          note: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          start_date: string
          status: Database["public"]["Enums"]["recurring_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          is_subscription?: boolean
          name: string
          next_occurrence_date: string
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          start_date: string
          status?: Database["public"]["Enums"]["recurring_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          is_subscription?: boolean
          name?: string
          next_occurrence_date?: string
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          start_date?: string
          status?: Database["public"]["Enums"]["recurring_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          note: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          tier: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          tier: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          tier?: string
        }
        Relationships: []
      }
      routine_habits: {
        Row: {
          created_at: string
          habit_id: string
          routine_id: string
        }
        Insert: {
          created_at?: string
          habit_id: string
          routine_id: string
        }
        Update: {
          created_at?: string
          habit_id?: string
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_habits_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_habits_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          created_at: string
          id: string
          is_purchased: boolean
          name: string
          quantity: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_purchased?: boolean
          name: string
          quantity?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_purchased?: boolean
          name?: string
          quantity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          note: string | null
          notebook_id: string
          occurred_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          note?: string | null
          notebook_id: string
          occurred_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          note?: string | null
          notebook_id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          content: string
          created_at: string
          id: string
          notebook_id: string
          origin: string
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          notebook_id: string
          origin?: string
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          notebook_id?: string
          origin?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          position: number
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          position?: number
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          position?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          id: string
          is_cancelled: boolean
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          is_cancelled?: boolean
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          is_cancelled?: boolean
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          notebook_id: string
          order_index: number
          parent_topic_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notebook_id: string
          order_index?: number
          parent_topic_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notebook_id?: string
          order_index?: number
          parent_topic_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category_id: string | null
          created_at: string
          date: string
          document_id: string | null
          id: string
          installment_id: string | null
          installment_number: number | null
          name: string
          note: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          recurring_transaction_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          tags: string[]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          transfer_to_account_id: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date: string
          document_id?: string | null
          id?: string
          installment_id?: string | null
          installment_number?: number | null
          name: string
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurring_transaction_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tags?: string[]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          transfer_to_account_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          document_id?: string | null
          id?: string
          installment_id?: string | null
          installment_number?: number | null
          name?: string
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurring_transaction_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tags?: string[]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          transfer_to_account_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_to_account_id_fkey"
            columns: ["transfer_to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      useful_contacts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_important_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          label: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          label: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          label?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_important_dates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          model: string | null
          nickname: string
          plate: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          model?: string | null
          nickname: string
          plate?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          model?: string | null
          nickname?: string
          plate?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      vex_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vex_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "vex_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "vex_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          created_at: string
          document_id: string | null
          duration_months: number
          end_date: string
          id: string
          note: string | null
          product_name: string
          purchase_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          duration_months: number
          end_date: string
          id?: string
          note?: string | null
          product_name: string
          purchase_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          duration_months?: number
          end_date?: string
          id?: string
          note?: string | null
          product_name?: string
          purchase_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_account: { Args: { target_user_id: string }; Returns: undefined }
      get_system_overview: {
        Args: never
        Returns: {
          total_documents: number
          total_events: number
          total_pages: number
          total_tasks: number
          total_transactions: number
          total_users: number
        }[]
      }
      has_security_pin: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      list_all_accounts: {
        Args: never
        Returns: {
          account_tier: string
          created_at: string
          display_name: string
          email: string
          id: string
          role: string
          username: string
        }[]
      }
      list_my_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: string
          not_after: string
          refreshed_at: string
          user_agent: string
        }[]
      }
      list_secret_keys: {
        Args: never
        Returns: {
          has_value: boolean
          key: string
          updated_at: string
        }[]
      }
      redeem_code: { Args: { input_code: string }; Returns: string }
      revoke_my_session: {
        Args: { target_session_id: string }
        Returns: undefined
      }
      set_secret: {
        Args: { input_key: string; input_value: string }
        Returns: undefined
      }
      set_security_pin: {
        Args: { current_pin?: string; new_pin: string }
        Returns: undefined
      }
      verify_security_pin: { Args: { candidate_pin: string }; Returns: boolean }
    }
    Enums: {
      account_type: "dinheiro" | "conta_bancaria" | "carteira_digital" | "outro"
      block_type:
        | "texto"
        | "titulo1"
        | "titulo2"
        | "titulo3"
        | "lista"
        | "checklist"
        | "citacao"
        | "callout"
        | "codigo"
        | "tabela"
        | "imagem"
        | "arquivo"
        | "link"
        | "divisor"
        | "toggle"
        | "equacao"
        | "embed"
        | "referencia_pagina"
        | "referencia_entidade"
      card_statement_status: "aberta" | "fechada" | "paga"
      category_kind: "entrada" | "saida"
      document_type:
        | "nota_fiscal"
        | "recibo"
        | "contrato"
        | "garantia"
        | "comprovante"
        | "certificado"
        | "documento_pessoal"
        | "fatura"
        | "manual"
        | "outro"
      error_doubt_kind: "duvida" | "erro" | "conceito_confundido"
      flashcard_review_grade: "errei" | "dificil" | "bom" | "facil"
      goal_progress_type:
        | "binario"
        | "percentual_manual"
        | "marcos"
        | "numerico"
        | "derivado"
      goal_status: "planejada" | "ativa" | "pausada" | "concluida" | "cancelada"
      habit_frequency_type:
        | "diaria"
        | "dias_especificos"
        | "x_vezes_semana"
        | "semanal"
        | "mensal"
        | "personalizada"
      habit_log_state: "concluido" | "parcial" | "pulado"
      habit_status: "ativo" | "pausado" | "arquivado"
      library_item_status:
        | "quero_consumir"
        | "em_andamento"
        | "concluido"
        | "pausado"
        | "abandonado"
      library_item_type:
        | "book"
        | "comic"
        | "manga"
        | "movie"
        | "series"
        | "anime"
        | "podcast"
        | "podcast_episode"
        | "video"
        | "article"
        | "web_content"
        | "course"
        | "academic_paper"
        | "game"
        | "other"
      library_relation_type:
        | "adaptacao"
        | "continuacao"
        | "prequela"
        | "mesma_franquia"
        | "baseado_em"
        | "relacionado"
      notebook_status: "ativo" | "pausado" | "concluido" | "arquivado"
      notebook_type:
        | "materia"
        | "curso"
        | "certificacao"
        | "preparacao_prova"
        | "tema_estudo"
        | "outro"
      page_property_type:
        | "texto"
        | "numero"
        | "data"
        | "checkbox"
        | "select"
        | "multi_select"
        | "url"
        | "relacao"
        | "favorito"
      payment_method:
        | "dinheiro"
        | "pix"
        | "debito"
        | "credito"
        | "boleto"
        | "transferencia"
        | "outra"
      plan_status: "ativo" | "concluido" | "arquivado"
      plan_type: "mensal" | "anual" | "quinquenal"
      pomodoro_status: "completed" | "died"
      purchase_priority: "baixa" | "media" | "alta"
      recurrence_frequency:
        | "mensal"
        | "anual"
        | "bimestral"
        | "trimestral"
        | "semestral"
      recurring_status: "ativa" | "pausada" | "cancelada"
      task_priority: "sem_prioridade" | "baixa" | "media" | "alta"
      task_recurrence_frequency: "diaria" | "semanal" | "mensal"
      task_status: "nao_iniciado" | "em_andamento" | "concluido"
      transaction_status:
        | "concluida"
        | "futura"
        | "pendente"
        | "vencida"
        | "cancelada"
      transaction_type: "entrada" | "saida" | "transferencia"
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
      account_type: ["dinheiro", "conta_bancaria", "carteira_digital", "outro"],
      block_type: [
        "texto",
        "titulo1",
        "titulo2",
        "titulo3",
        "lista",
        "checklist",
        "citacao",
        "callout",
        "codigo",
        "tabela",
        "imagem",
        "arquivo",
        "link",
        "divisor",
        "toggle",
        "equacao",
        "embed",
        "referencia_pagina",
        "referencia_entidade",
      ],
      card_statement_status: ["aberta", "fechada", "paga"],
      category_kind: ["entrada", "saida"],
      document_type: [
        "nota_fiscal",
        "recibo",
        "contrato",
        "garantia",
        "comprovante",
        "certificado",
        "documento_pessoal",
        "fatura",
        "manual",
        "outro",
      ],
      error_doubt_kind: ["duvida", "erro", "conceito_confundido"],
      flashcard_review_grade: ["errei", "dificil", "bom", "facil"],
      goal_progress_type: [
        "binario",
        "percentual_manual",
        "marcos",
        "numerico",
        "derivado",
      ],
      goal_status: ["planejada", "ativa", "pausada", "concluida", "cancelada"],
      habit_frequency_type: [
        "diaria",
        "dias_especificos",
        "x_vezes_semana",
        "semanal",
        "mensal",
        "personalizada",
      ],
      habit_log_state: ["concluido", "parcial", "pulado"],
      habit_status: ["ativo", "pausado", "arquivado"],
      library_item_status: [
        "quero_consumir",
        "em_andamento",
        "concluido",
        "pausado",
        "abandonado",
      ],
      library_item_type: [
        "book",
        "comic",
        "manga",
        "movie",
        "series",
        "anime",
        "podcast",
        "podcast_episode",
        "video",
        "article",
        "web_content",
        "course",
        "academic_paper",
        "game",
        "other",
      ],
      library_relation_type: [
        "adaptacao",
        "continuacao",
        "prequela",
        "mesma_franquia",
        "baseado_em",
        "relacionado",
      ],
      notebook_status: ["ativo", "pausado", "concluido", "arquivado"],
      notebook_type: [
        "materia",
        "curso",
        "certificacao",
        "preparacao_prova",
        "tema_estudo",
        "outro",
      ],
      page_property_type: [
        "texto",
        "numero",
        "data",
        "checkbox",
        "select",
        "multi_select",
        "url",
        "relacao",
        "favorito",
      ],
      payment_method: [
        "dinheiro",
        "pix",
        "debito",
        "credito",
        "boleto",
        "transferencia",
        "outra",
      ],
      plan_status: ["ativo", "concluido", "arquivado"],
      plan_type: ["mensal", "anual", "quinquenal"],
      pomodoro_status: ["completed", "died"],
      purchase_priority: ["baixa", "media", "alta"],
      recurrence_frequency: [
        "mensal",
        "anual",
        "bimestral",
        "trimestral",
        "semestral",
      ],
      recurring_status: ["ativa", "pausada", "cancelada"],
      task_priority: ["sem_prioridade", "baixa", "media", "alta"],
      task_recurrence_frequency: ["diaria", "semanal", "mensal"],
      task_status: ["nao_iniciado", "em_andamento", "concluido"],
      transaction_status: [
        "concluida",
        "futura",
        "pendente",
        "vencida",
        "cancelada",
      ],
      transaction_type: ["entrada", "saida", "transferencia"],
    },
  },
} as const
