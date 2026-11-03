export interface KnowledgeBaseRecord {
  id: string;
  owner_id: string;
  category: string;
  title: string;
  content: string;
  is_internal: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKnowledgeBaseInput {
  category: string;
  title: string;
  content: string;
  is_internal?: boolean;
}

export interface UpdateKnowledgeBaseInput {
  category?: string;
  title?: string;
  content?: string;
  is_internal?: boolean;
}
