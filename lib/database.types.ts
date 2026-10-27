
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "course_faculty": {
                  Row: {
                    "course_id": string,"faculty_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"faculty_id": string
                  }
                  Update: {
                    "course_id"?: string,"faculty_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "course_faculty_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "course_faculty_faculty_id_fkey"
      columns: ["faculty_id"]
isOneToOne: false
      referencedRelation: "faculty"
      referencedColumns: ["id"]
    }
                  ]
                },"courses": {
                  Row: {
                    "code": string,"created_at": string,"credit_hours": number | null,"department_id": string,"id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"credit_hours"?: number | null,"department_id": string,"id"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"credit_hours"?: number | null,"department_id"?: string,"id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "courses_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"enrollments": {
                  Row: {
                    "course_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"faculty": {
                  Row: {
                    "created_at": string,"department_id": string | null,"email": string | null,"id": string,"name": string,"short_form": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id"?: string | null,"email"?: string | null,"id"?: string,"name": string,"short_form"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string | null,"email"?: string | null,"id"?: string,"name"?: string,"short_form"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "faculty_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "content_type": string,"course_id": string,"created_at": string,"description": string | null,"faculty_id": string | null,"id": string,"kind": Database["public"]['Enums']["material_kind"],"original_filename": string,"rejection_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"size_bytes": number,"status": Database["public"]['Enums']["material_status"],"storage_path": string,"suggested_faculty": string | null,"title": string,"updated_at": string,"uploader_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content_type": string,"course_id": string,"created_at"?: string,"description"?: string | null,"faculty_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["material_kind"],"original_filename": string,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"size_bytes": number,"status"?: Database["public"]['Enums']["material_status"],"storage_path": string,"suggested_faculty"?: string | null,"title": string,"updated_at"?: string,"uploader_id"?: string | null
                  }
                  Update: {
                    "content_type"?: string,"course_id"?: string,"created_at"?: string,"description"?: string | null,"faculty_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["material_kind"],"original_filename"?: string,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"size_bytes"?: number,"status"?: Database["public"]['Enums']["material_status"],"storage_path"?: string,"suggested_faculty"?: string | null,"title"?: string,"updated_at"?: string,"uploader_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "materials_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_faculty_id_fkey"
      columns: ["faculty_id"]
isOneToOne: false
      referencedRelation: "faculty"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_uploader_id_fkey"
      columns: ["uploader_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"department_id": string | null,"email": string,"full_name": string,"id": string,"onboarded_at": string | null,"role": Database["public"]['Enums']["user_role"],"semester": number | null,"student_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"department_id"?: string | null,"email": string,"full_name"?: string,"id": string,"onboarded_at"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"semester"?: number | null,"student_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"department_id"?: string | null,"email"?: string,"full_name"?: string,"id"?: string,"onboarded_at"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"semester"?: number | null,"student_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "consume_rate_limit":
{ Args: { "p_key": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"department_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "code": string,"course_count": number,"id": string,"material_count": number,"name": string
            }[]
                           },
"get_my_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_path": string,"department_code": string,"department_id": string,"department_name": string,"email": string,"full_name": string,"id": string,"onboarded_at": string,"role": Database["public"]['Enums']["user_role"],"semester": number,"student_id": string
            }[]
                           },
"my_courses":
{ Args: Record<PropertyKey, never>; Returns: {
              "code": string,"credit_hours": number,"department_code": string,"department_name": string,"faculty_count": number,"id": string,"material_count": number,"title": string
            }[]
                           },
"search_courses":
{ Args: { "p_department"?: string,"p_limit"?: number,"p_offset"?: number,"p_query"?: string }; Returns: {
              "code": string,"credit_hours": number,"department_code": string,"department_name": string,"faculty_count": number,"id": string,"material_count": number,"title": string,"total_count": number
            }[]
                           },
"search_faculty":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "course_count": number,"department_code": string,"id": string,"name": string,"short_form": string
            }[]
                           },
"search_materials":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "course_code": string,"course_title": string,"created_at": string,"faculty_name": string,"id": string,"kind": Database["public"]['Enums']["material_kind"],"size_bytes": number,"title": string
            }[]
                           }
          }
          Enums: {
            "material_kind": "pdf"|"document"|"presentation"|"image","material_status": "pending"|"approved"|"rejected","user_role": "student"|"faculty"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "material_kind": ["pdf", "document", "presentation", "image"],"material_status": ["pending", "approved", "rejected"],"user_role": ["student", "faculty", "admin"]
          }
        }
} as const
