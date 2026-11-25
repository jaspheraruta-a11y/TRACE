export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: Database['public']['Enums']['app_role']
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          archive_id: string
          archived_at: string | null
          archived_by: string | null
          birth_barangay: string | null
          birth_province: string | null
          birth_town: string | null
          created_at: string
          date_of_birth: string | null
          elementary_years: number | null
          encoded_by: string | null
          extension_name: string | null
          first_name: string
          full_name: string
          id: string
          intermediate_general_average: number | null
          intermediate_school: string | null
          intermediate_year_completed: number | null
          is_archived: boolean
          last_name: string
          location_id: string | null
          middle_name: string | null
          parent_guardian_address: string | null
          parent_guardian_name: string | null
          parent_guardian_occupation: string | null
          physical_locator_code: string | null
          remarks: string | null
          search_vector: string | null
          updated_at: string
          updated_by: string | null
          verification_status: Database['public']['Enums']['record_verification_status']
        }
        Insert: {
          archive_id?: string
          archived_at?: string | null
          archived_by?: string | null
          birth_barangay?: string | null
          birth_province?: string | null
          birth_town?: string | null
          created_at?: string
          date_of_birth?: string | null
          elementary_years?: number | null
          encoded_by?: string | null
          extension_name?: string | null
          first_name: string
          full_name?: string
          id?: string
          intermediate_general_average?: number | null
          intermediate_school?: string | null
          intermediate_year_completed?: number | null
          is_archived?: boolean
          last_name: string
          location_id?: string | null
          middle_name?: string | null
          parent_guardian_address?: string | null
          parent_guardian_name?: string | null
          parent_guardian_occupation?: string | null
          physical_locator_code?: string | null
          remarks?: string | null
          search_vector?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database['public']['Enums']['record_verification_status']
        }
        Update: {
          archive_id?: string
          archived_at?: string | null
          archived_by?: string | null
          birth_barangay?: string | null
          birth_province?: string | null
          birth_town?: string | null
          created_at?: string
          date_of_birth?: string | null
          elementary_years?: number | null
          encoded_by?: string | null
          extension_name?: string | null
          first_name?: string
          full_name?: string
          id?: string
          intermediate_general_average?: number | null
          intermediate_school?: string | null
          intermediate_year_completed?: number | null
          is_archived?: boolean
          last_name?: string
          location_id?: string | null
          middle_name?: string | null
          parent_guardian_address?: string | null
          parent_guardian_name?: string | null
          parent_guardian_occupation?: string | null
          physical_locator_code?: string | null
          remarks?: string | null
          search_vector?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database['public']['Enums']['record_verification_status']
        }
        Relationships: [
          {
            foreignKeyName: 'students_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'archive_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'students_encoded_by_fkey'
            columns: ['encoded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'students_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'students_archived_by_fkey'
            columns: ['archived_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      student_school_years: {
        Row: {
          created_at: string
          created_by: string | null
          curriculum_year: string | null
          id: string
          remarks: string | null
          school_attended: string | null
          school_year: string | null
          sort_order: number
          student_id: string
          total_days_present: number | null
          total_days_school: number | null
          updated_at: string
          updated_by: string | null
          year_level: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          curriculum_year?: string | null
          id?: string
          remarks?: string | null
          school_attended?: string | null
          school_year?: string | null
          sort_order?: number
          student_id: string
          total_days_present?: number | null
          total_days_school?: number | null
          updated_at?: string
          updated_by?: string | null
          year_level: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          curriculum_year?: string | null
          id?: string
          remarks?: string | null
          school_attended?: string | null
          school_year?: string | null
          sort_order?: number
          student_id?: string
          total_days_present?: number | null
          total_days_school?: number | null
          updated_at?: string
          updated_by?: string | null
          year_level?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_school_years_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }
      student_subjects: {
        Row: {
          action_taken: string | null
          created_at: string
          credits_earned: number | null
          cs_average: number | null
          id: string
          school_year_id: string
          sort_order: number
          subject_name: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          credits_earned?: number | null
          cs_average?: number | null
          id?: string
          school_year_id: string
          sort_order?: number
          subject_name: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          credits_earned?: number | null
          cs_average?: number | null
          id?: string
          school_year_id?: string
          sort_order?: number
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_subjects_school_year_id_fkey'
            columns: ['school_year_id']
            isOneToOne: false
            referencedRelation: 'student_school_years'
            referencedColumns: ['id']
          },
        ]
      }
      documents: {
        Row: {
          document_type: string
          file_name: string
          file_size: number | null
          id: string
          is_current: boolean
          mime_type: string | null
          replaces_document_id: string | null
          storage_path: string
          student_id: string
          uploaded_at: string
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
          verification_status: Database['public']['Enums']['document_verification_status']
        }
        Insert: {
          document_type: string
          file_name: string
          file_size?: number | null
          id?: string
          is_current?: boolean
          mime_type?: string | null
          replaces_document_id?: string | null
          storage_path: string
          student_id: string
          uploaded_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verification_status?: Database['public']['Enums']['document_verification_status']
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          is_current?: boolean
          mime_type?: string | null
          replaces_document_id?: string | null
          storage_path?: string
          student_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verification_status?: Database['public']['Enums']['document_verification_status']
        }
        Relationships: [
          {
            foreignKeyName: 'documents_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documents_replaces_document_id_fkey'
            columns: ['replaces_document_id']
            isOneToOne: false
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      archive_locations: {
        Row: {
          archive_category: string
          box_code: string | null
          cabinet: string | null
          condition_notes: string | null
          created_at: string
          created_by: string | null
          digitization_status: Database['public']['Enums']['digitization_status']
          folder_code: string | null
          id: string
          locator_code: string
          room: string | null
          shelf: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_category: string
          box_code?: string | null
          cabinet?: string | null
          condition_notes?: string | null
          created_at?: string
          created_by?: string | null
          digitization_status?: Database['public']['Enums']['digitization_status']
          folder_code?: string | null
          id?: string
          locator_code: string
          room?: string | null
          shelf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_category?: string
          box_code?: string | null
          cabinet?: string | null
          condition_notes?: string | null
          created_at?: string
          created_by?: string | null
          digitization_status?: Database['public']['Enums']['digitization_status']
          folder_code?: string | null
          id?: string
          locator_code?: string
          room?: string | null
          shelf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      retrieval_requests: {
        Row: {
          assigned_to: string | null
          contact_info: string | null
          created_at: string
          created_by: string | null
          id: string
          purpose: string | null
          relationship: string | null
          release_date: string | null
          release_details: string | null
          remarks: string | null
          request_code: string
          request_date: string
          requester_name: string
          requester_type: string
          status: Database['public']['Enums']['request_status']
          student_id: string | null
          updated_at: string
          updated_by: string | null
          verification_status: Database['public']['Enums']['request_verification_status']
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          purpose?: string | null
          relationship?: string | null
          release_date?: string | null
          release_details?: string | null
          remarks?: string | null
          request_code?: string
          request_date?: string
          requester_name: string
          requester_type: string
          status?: Database['public']['Enums']['request_status']
          student_id?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database['public']['Enums']['request_verification_status']
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          purpose?: string | null
          relationship?: string | null
          release_date?: string | null
          release_details?: string | null
          remarks?: string | null
          request_code?: string
          request_date?: string
          requester_name?: string
          requester_type?: string
          status?: Database['public']['Enums']['request_status']
          student_id?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database['public']['Enums']['request_verification_status']
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'retrieval_requests_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'retrieval_requests_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      request_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: Database['public']['Enums']['request_status'] | null
          id: number
          note: string | null
          request_id: string
          to_status: Database['public']['Enums']['request_status'] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database['public']['Enums']['request_status'] | null
          id?: never
          note?: string | null
          request_id: string
          to_status?: Database['public']['Enums']['request_status'] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database['public']['Enums']['request_status'] | null
          id?: never
          note?: string | null
          request_id?: string
          to_status?: Database['public']['Enums']['request_status'] | null
        }
        Relationships: [
          {
            foreignKeyName: 'request_events_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'retrieval_requests'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          summary: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          summary?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'system_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_report: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_retrieval_request: {
        Args: {
          p_assigned_to?: string | null
          p_contact_info?: string | null
          p_purpose?: string | null
          p_relationship?: string | null
          p_requester_name: string
          p_requester_type: string
          p_student_id?: string | null
        }
        Returns: string
      }
      export_requests: {
        Args: {
          p_limit?: number
        }
        Returns: {
          assigned_to_name: string | null
          release_date: string | null
          request_code: string
          request_date: string
          requester_name: string
          requester_type: string
          status: Database['public']['Enums']['request_status']
          student_archive_id: string | null
          student_name: string | null
          verification_status: Database['public']['Enums']['request_verification_status']
        }[]
      }
      export_students: {
        Args: {
          p_include_archived?: boolean
          p_limit?: number
        }
        Returns: {
          archive_id: string
          date_of_birth: string | null
          document_count: number
          full_name: string
          is_archived: boolean
          physical_locator_code: string | null
          school_years: string | null
          verification_status: Database['public']['Enums']['record_verification_status']
        }[]
      }
      assign_student_location: {
        Args: {
          p_location_id: string | null
          p_student_id: string
        }
        Returns: undefined
      }
      create_staff_account: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role: Database['public']['Enums']['app_role']
        }
        Returns: string
      }
      find_student_duplicates: {
        Args: {
          p_date_of_birth?: string | null
          p_exclude_id?: string | null
          p_first_name: string
          p_last_name: string
        }
        Returns: {
          archive_id: string
          date_of_birth: string | null
          full_name: string
          id: string
          is_archived: boolean
          similarity: number
        }[]
      }
      list_active_staff: {
        Args: Record<PropertyKey, never>
        Returns: {
          full_name: string
          id: string
          role: Database['public']['Enums']['app_role']
        }[]
      }
      location_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          archive_category: string
          box_code: string | null
          cabinet: string | null
          condition_notes: string | null
          digitization_status: Database['public']['Enums']['digitization_status']
          document_count: number
          folder_code: string | null
          id: string
          locator_code: string
          room: string | null
          shelf: string | null
          student_count: number
          updated_at: string
        }[]
      }
      log_document_access: {
        Args: {
          p_document_id: string
        }
        Returns: undefined
      }
      record_audit_event: {
        Args: {
          p_action: string
          p_entity_id?: string | null
          p_entity_type: string
          p_metadata?: Json
          p_summary?: string | null
        }
        Returns: undefined
      }
      record_sign_in: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      report_gaps: {
        Args: {
          p_limit?: number
        }
        Returns: {
          archive_id: string
          detail: string
          full_name: string
          gap_type: string
          student_id: string
        }[]
      }
      search_students: {
        Args: {
          p_include_archived?: boolean
          p_limit?: number
          p_locator?: string | null
          p_offset?: number
          p_query?: string
          p_school?: string | null
          p_school_year?: string | null
          p_subject?: string | null
          p_year_level?: string | null
        }
        Returns: {
          archive_id: string
          date_of_birth: string | null
          document_count: number
          first_name: string
          full_name: string
          id: string
          is_archived: boolean
          last_name: string
          physical_locator_code: string | null
          rank: number
          school_years: string | null
          total_count: number
          verification_status: Database['public']['Enums']['record_verification_status']
        }[]
      }
      set_request_status: {
        Args: {
          p_note?: string | null
          p_request_id: string
          p_status: Database['public']['Enums']['request_status']
        }
        Returns: undefined
      }
      set_request_verification: {
        Args: {
          p_note?: string | null
          p_request_id: string
          p_status: Database['public']['Enums']['request_verification_status']
        }
        Returns: undefined
      }
      update_retrieval_request: {
        Args: {
          p_assigned_to?: string | null
          p_contact_info?: string | null
          p_purpose?: string | null
          p_relationship?: string | null
          p_remarks?: string | null
          p_request_id: string
          p_requester_name: string
          p_requester_type: string
          p_student_id?: string | null
        }
        Returns: undefined
      }
      set_staff_active: {
        Args: {
          p_is_active: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      set_staff_role: {
        Args: {
          p_role: Database['public']['Enums']['app_role']
          p_user_id: string
        }
        Returns: undefined
      }
      repair_staff_auth_role: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: 'administrator' | 'registrar' | 'digitization_staff'
      digitization_status: 'not_started' | 'partial' | 'complete'
      document_verification_status: 'pending' | 'verified' | 'rejected'
      record_verification_status: 'unverified' | 'verified' | 'needs_review'
      request_status:
        | 'pending'
        | 'searching'
        | 'record_found'
        | 'verification_required'
        | 'ready_for_release'
        | 'released'
        | 'completed'
        | 'unavailable'
        | 'cancelled'
      request_verification_status: 'unverified' | 'verified' | 'rejected'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type AppRole = Database['public']['Enums']['app_role']
export type StaffProfileRow = Database['public']['Tables']['profiles']['Row']
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row']
export type SystemSettingRow =
  Database['public']['Tables']['system_settings']['Row']
export type StudentRow = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']
export type SchoolYearRow =
  Database['public']['Tables']['student_school_years']['Row']
export type SchoolYearInsert =
  Database['public']['Tables']['student_school_years']['Insert']
export type SchoolYearUpdate =
  Database['public']['Tables']['student_school_years']['Update']
export type SubjectRow = Database['public']['Tables']['student_subjects']['Row']
export type SubjectInsert =
  Database['public']['Tables']['student_subjects']['Insert']
export type SubjectUpdate =
  Database['public']['Tables']['student_subjects']['Update']
export type DocumentRow = Database['public']['Tables']['documents']['Row']
export type DocumentInsert =
  Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate =
  Database['public']['Tables']['documents']['Update']
export type ArchiveLocationRow =
  Database['public']['Tables']['archive_locations']['Row']
export type ArchiveLocationInsert =
  Database['public']['Tables']['archive_locations']['Insert']
export type ArchiveLocationUpdate =
  Database['public']['Tables']['archive_locations']['Update']
export type RetrievalRequestRow =
  Database['public']['Tables']['retrieval_requests']['Row']
export type RetrievalRequestInsert =
  Database['public']['Tables']['retrieval_requests']['Insert']
export type RetrievalRequestUpdate =
  Database['public']['Tables']['retrieval_requests']['Update']
export type RequestEventRow =
  Database['public']['Tables']['request_events']['Row']
export type RecordVerificationStatus =
  Database['public']['Enums']['record_verification_status']
export type DocumentVerificationStatus =
  Database['public']['Enums']['document_verification_status']
export type DigitizationStatus =
  Database['public']['Enums']['digitization_status']
export type RequestStatus = Database['public']['Enums']['request_status']
export type RequestVerificationStatus =
  Database['public']['Enums']['request_verification_status']
