export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      class_enrolments: {
        Row: {
          class_id: string;
          created_at: string;
          end_date: string | null;
          id: string;
          notes: string | null;
          start_date: string | null;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          start_date?: string | null;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          start_date?: string | null;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_enrolments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_enrolments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          active: boolean;
          age_group: string | null;
          capacity: number;
          created_at: string;
          delivery_mode: string;
          end_time: string | null;
          goprogress_course_url: string | null;
          id: string;
          level: string | null;
          name: string;
          notes: string | null;
          price_per_session: number | null;
          programme_id: string | null;
          room: string | null;
          schedule_block_id: string | null;
          session_rate: number | null;
          site_id: string | null;
          start_time: string | null;
          subject: string | null;
          tutor_id: string | null;
          updated_at: string;
          weekday: string | null;
        };
        Insert: {
          active?: boolean;
          age_group?: string | null;
          capacity?: number;
          created_at?: string;
          delivery_mode?: string;
          end_time?: string | null;
          goprogress_course_url?: string | null;
          id?: string;
          level?: string | null;
          name: string;
          notes?: string | null;
          price_per_session?: number | null;
          programme_id?: string | null;
          room?: string | null;
          schedule_block_id?: string | null;
          session_rate?: number | null;
          site_id?: string | null;
          start_time?: string | null;
          subject?: string | null;
          tutor_id?: string | null;
          updated_at?: string;
          weekday?: string | null;
        };
        Update: {
          active?: boolean;
          age_group?: string | null;
          capacity?: number;
          created_at?: string;
          delivery_mode?: string;
          end_time?: string | null;
          goprogress_course_url?: string | null;
          id?: string;
          level?: string | null;
          name?: string;
          notes?: string | null;
          price_per_session?: number | null;
          programme_id?: string | null;
          room?: string | null;
          schedule_block_id?: string | null;
          session_rate?: number | null;
          site_id?: string | null;
          start_time?: string | null;
          subject?: string | null;
          tutor_id?: string | null;
          updated_at?: string;
          weekday?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "classes_programme_id_fkey";
            columns: ["programme_id"];
            isOneToOne: false;
            referencedRelation: "programmes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_schedule_block_id_fkey";
            columns: ["schedule_block_id"];
            isOneToOne: false;
            referencedRelation: "recurring_schedule_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      client_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: string | null;
          note: string | null;
          parent_id: string | null;
          payment_date: string;
          reference: string | null;
          status: string;
          student_id: string | null;
          subscription_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          note?: string | null;
          parent_id?: string | null;
          payment_date?: string;
          reference?: string | null;
          status?: string;
          student_id?: string | null;
          subscription_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          note?: string | null;
          parent_id?: string | null;
          payment_date?: string;
          reference?: string | null;
          status?: string;
          student_id?: string | null;
          subscription_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_payments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "parents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_payments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "client_subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      client_subscriptions: {
        Row: {
          amount: number;
          cadence: string;
          class_id: string | null;
          created_at: string;
          id: string;
          method_notes: string | null;
          next_due_date: string | null;
          notes: string | null;
          parent_id: string | null;
          plan_name: string | null;
          pricing_plan_id: string | null;
          programme_id: string | null;
          status: string;
          student_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          cadence?: string;
          class_id?: string | null;
          created_at?: string;
          id?: string;
          method_notes?: string | null;
          next_due_date?: string | null;
          notes?: string | null;
          parent_id?: string | null;
          plan_name?: string | null;
          pricing_plan_id?: string | null;
          programme_id?: string | null;
          status?: string;
          student_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          cadence?: string;
          class_id?: string | null;
          created_at?: string;
          id?: string;
          method_notes?: string | null;
          next_due_date?: string | null;
          notes?: string | null;
          parent_id?: string | null;
          plan_name?: string | null;
          pricing_plan_id?: string | null;
          programme_id?: string | null;
          status?: string;
          student_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_subscriptions_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "parents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_subscriptions_pricing_plan_id_fkey";
            columns: ["pricing_plan_id"];
            isOneToOne: false;
            referencedRelation: "pricing_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_subscriptions_programme_id_fkey";
            columns: ["programme_id"];
            isOneToOne: false;
            referencedRelation: "programmes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_subscriptions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      homework_items: {
        Row: {
          class_id: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          goprogress_linked: boolean;
          goprogress_url: string | null;
          id: string;
          status: string;
          student_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          class_id?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          goprogress_linked?: boolean;
          goprogress_url?: string | null;
          id?: string;
          status?: string;
          student_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          goprogress_linked?: boolean;
          goprogress_url?: string | null;
          id?: string;
          status?: string;
          student_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "homework_items_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "homework_items_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_reviews: {
        Row: {
          concerns: string | null;
          covered: string | null;
          created_at: string;
          id: string;
          next_steps: string | null;
          progress_note: string | null;
          session_id: string;
          submitted_at: string;
          tutor_id: string | null;
          updated_at: string;
        };
        Insert: {
          concerns?: string | null;
          covered?: string | null;
          created_at?: string;
          id?: string;
          next_steps?: string | null;
          progress_note?: string | null;
          session_id: string;
          submitted_at?: string;
          tutor_id?: string | null;
          updated_at?: string;
        };
        Update: {
          concerns?: string | null;
          covered?: string | null;
          created_at?: string;
          id?: string;
          next_steps?: string | null;
          progress_note?: string | null;
          session_id?: string;
          submitted_at?: string;
          tutor_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_reviews_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_reviews_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_students: {
        Row: {
          created_at: string;
          id: string;
          is_primary: boolean;
          parent_id: string;
          relationship: string | null;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          parent_id: string;
          relationship?: string | null;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          parent_id?: string;
          relationship?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "parents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_students_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      parents: {
        Row: {
          billing_status: string;
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          last_name: string | null;
          notes: string | null;
          phone: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          billing_status?: string;
          created_at?: string;
          email?: string | null;
          first_name: string;
          id?: string;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          billing_status?: string;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_request_items: {
        Row: {
          amount: number;
          created_at: string;
          description: string | null;
          hours: number;
          id: string;
          payment_request_id: string;
          session_id: string | null;
          tutor_earning_id: string | null;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          description?: string | null;
          hours?: number;
          id?: string;
          payment_request_id: string;
          session_id?: string | null;
          tutor_earning_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string | null;
          hours?: number;
          id?: string;
          payment_request_id?: string;
          session_id?: string | null;
          tutor_earning_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_request_items_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_request_items_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_request_items_tutor_earning_id_fkey";
            columns: ["tutor_earning_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_requests: {
        Row: {
          admin_note: string | null;
          created_at: string;
          decided_at: string | null;
          id: string;
          reference: string | null;
          status: string;
          submitted_at: string;
          total_amount: number;
          total_hours: number;
          tutor_id: string | null;
          updated_at: string;
        };
        Insert: {
          admin_note?: string | null;
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          reference?: string | null;
          status?: string;
          submitted_at?: string;
          total_amount?: number;
          total_hours?: number;
          tutor_id?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_note?: string | null;
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          reference?: string | null;
          status?: string;
          submitted_at?: string;
          total_amount?: number;
          total_hours?: number;
          tutor_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_requests_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      pricing_plans: {
        Row: {
          active: boolean;
          amount: number;
          availability_note: string | null;
          created_at: string;
          currency: string;
          id: string;
          inclusion_notes: string | null;
          name: string;
          pricing_unit: string;
          programme_id: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          amount: number;
          availability_note?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          inclusion_notes?: string | null;
          name: string;
          pricing_unit?: string;
          programme_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          amount?: number;
          availability_note?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          inclusion_notes?: string | null;
          name?: string;
          pricing_unit?: string;
          programme_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pricing_plans_programme_id_fkey";
            columns: ["programme_id"];
            isOneToOne: false;
            referencedRelation: "programmes";
            referencedColumns: ["id"];
          },
        ];
      };
      programmes: {
        Row: {
          active: boolean;
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          programme_type: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          programme_type?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          programme_type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      progress_records: {
        Row: {
          class_id: string | null;
          created_at: string;
          id: string;
          note: string | null;
          record_date: string;
          score: number | null;
          status: string;
          student_id: string;
          subject: string | null;
          target: string | null;
          updated_at: string;
        };
        Insert: {
          class_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          record_date?: string;
          score?: number | null;
          status?: string;
          student_id: string;
          subject?: string | null;
          target?: string | null;
          updated_at?: string;
        };
        Update: {
          class_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          record_date?: string;
          score?: number | null;
          status?: string;
          student_id?: string;
          subject?: string | null;
          target?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_records_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      recurring_schedule_blocks: {
        Row: {
          created_at: string;
          end_date: string | null;
          end_time: string;
          id: string;
          notes: string | null;
          owner_user_id: string;
          programme_id: string | null;
          recurrence: string;
          site_id: string | null;
          start_date: string | null;
          start_time: string;
          status: string;
          title: string;
          updated_at: string;
          venue_name: string | null;
          weekday: string;
        };
        Insert: {
          created_at?: string;
          end_date?: string | null;
          end_time: string;
          id?: string;
          notes?: string | null;
          owner_user_id?: string;
          programme_id?: string | null;
          recurrence?: string;
          site_id?: string | null;
          start_date?: string | null;
          start_time: string;
          status?: string;
          title: string;
          updated_at?: string;
          venue_name?: string | null;
          weekday: string;
        };
        Update: {
          created_at?: string;
          end_date?: string | null;
          end_time?: string;
          id?: string;
          notes?: string | null;
          owner_user_id?: string;
          programme_id?: string | null;
          recurrence?: string;
          site_id?: string | null;
          start_date?: string | null;
          start_time?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          venue_name?: string | null;
          weekday?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_schedule_blocks_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_schedule_blocks_programme_id_fkey";
            columns: ["programme_id"];
            isOneToOne: false;
            referencedRelation: "programmes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_schedule_blocks_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          agreed_amount: number | null;
          class_id: string | null;
          created_at: string;
          end_time: string | null;
          id: string;
          notes: string | null;
          schedule_block_id: string | null;
          session_date: string;
          site_id: string | null;
          start_time: string | null;
          status: string;
          tutor_id: string | null;
          updated_at: string;
        };
        Insert: {
          agreed_amount?: number | null;
          class_id?: string | null;
          created_at?: string;
          end_time?: string | null;
          id?: string;
          notes?: string | null;
          schedule_block_id?: string | null;
          session_date: string;
          site_id?: string | null;
          start_time?: string | null;
          status?: string;
          tutor_id?: string | null;
          updated_at?: string;
        };
        Update: {
          agreed_amount?: number | null;
          class_id?: string | null;
          created_at?: string;
          end_time?: string | null;
          id?: string;
          notes?: string | null;
          schedule_block_id?: string | null;
          session_date?: string;
          site_id?: string | null;
          start_time?: string | null;
          status?: string;
          tutor_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_schedule_block_id_fkey";
            columns: ["schedule_block_id"];
            isOneToOne: false;
            referencedRelation: "recurring_schedule_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      sites: {
        Row: {
          active: boolean;
          address: string | null;
          city: string | null;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          city?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          city?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_attendance: {
        Row: {
          created_at: string;
          id: string;
          minutes_late: number | null;
          note: string | null;
          recorded_at: string;
          session_id: string;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          minutes_late?: number | null;
          note?: string | null;
          recorded_at?: string;
          session_id: string;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          minutes_late?: number | null;
          note?: string | null;
          recorded_at?: string;
          session_id?: string;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_attendance_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          allergy_notes: string | null;
          courses_note: string | null;
          created_at: string;
          date_of_birth: string | null;
          ehcp_flag: boolean;
          email: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          first_name: string;
          id: string;
          last_name: string | null;
          medical_notes: string | null;
          notes: string | null;
          phone: string | null;
          school: string | null;
          send_flag: boolean;
          status: string;
          updated_at: string;
          year_group: string | null;
        };
        Insert: {
          allergy_notes?: string | null;
          courses_note?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          ehcp_flag?: boolean;
          email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          first_name: string;
          id?: string;
          last_name?: string | null;
          medical_notes?: string | null;
          notes?: string | null;
          phone?: string | null;
          school?: string | null;
          send_flag?: boolean;
          status?: string;
          updated_at?: string;
          year_group?: string | null;
        };
        Update: {
          allergy_notes?: string | null;
          courses_note?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          ehcp_flag?: boolean;
          email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string | null;
          medical_notes?: string | null;
          notes?: string | null;
          phone?: string | null;
          school?: string | null;
          send_flag?: boolean;
          status?: string;
          updated_at?: string;
          year_group?: string | null;
        };
        Relationships: [];
      };
      tutor_assignments: {
        Row: {
          agreed_amount: number | null;
          agreed_rate: number | null;
          class_id: string | null;
          created_at: string;
          id: string;
          role: string;
          session_id: string | null;
          status: string;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          agreed_amount?: number | null;
          agreed_rate?: number | null;
          class_id?: string | null;
          created_at?: string;
          id?: string;
          role?: string;
          session_id?: string | null;
          status?: string;
          tutor_id: string;
          updated_at?: string;
        };
        Update: {
          agreed_amount?: number | null;
          agreed_rate?: number | null;
          class_id?: string | null;
          created_at?: string;
          id?: string;
          role?: string;
          session_id?: string | null;
          status?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_assignments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_assignments_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_assignments_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      tutor_earnings: {
        Row: {
          agreed_rate: number | null;
          amount: number;
          class_id: string | null;
          created_at: string;
          earning_date: string;
          hours: number;
          id: string;
          note: string | null;
          payment_request_id: string | null;
          session_id: string | null;
          status: string;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          agreed_rate?: number | null;
          amount?: number;
          class_id?: string | null;
          created_at?: string;
          earning_date?: string;
          hours?: number;
          id?: string;
          note?: string | null;
          payment_request_id?: string | null;
          session_id?: string | null;
          status?: string;
          tutor_id: string;
          updated_at?: string;
        };
        Update: {
          agreed_rate?: number | null;
          amount?: number;
          class_id?: string | null;
          created_at?: string;
          earning_date?: string;
          hours?: number;
          id?: string;
          note?: string | null;
          payment_request_id?: string | null;
          session_id?: string | null;
          status?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_earnings_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_earnings_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_earnings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_earnings_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      tutor_signins: {
        Row: {
          created_at: string;
          id: string;
          method: string;
          session_id: string;
          signed_in_at: string;
          signed_out_at: string | null;
          tutor_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          method?: string;
          session_id: string;
          signed_in_at?: string;
          signed_out_at?: string | null;
          tutor_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          method?: string;
          session_id?: string;
          signed_in_at?: string;
          signed_out_at?: string | null;
          tutor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_signins_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_signins_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutors";
            referencedColumns: ["id"];
          },
        ];
      };
      tutors: {
        Row: {
          created_at: string;
          email: string | null;
          first_name: string;
          hourly_rate: number | null;
          id: string;
          last_name: string | null;
          levels: string[];
          notes: string | null;
          pay_notes: string | null;
          phone: string | null;
          status: string;
          subjects: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          first_name: string;
          hourly_rate?: number | null;
          id?: string;
          last_name?: string | null;
          levels?: string[];
          notes?: string | null;
          pay_notes?: string | null;
          phone?: string | null;
          status?: string;
          subjects?: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          first_name?: string;
          hourly_rate?: number | null;
          id?: string;
          last_name?: string | null;
          levels?: string[];
          notes?: string | null;
          pay_notes?: string | null;
          phone?: string | null;
          status?: string;
          subjects?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
