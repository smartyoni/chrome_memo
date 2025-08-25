export interface WikiDocument {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  tags?: string[];
  category?: string;
}

export interface DocumentHistory {
  id: string;
  documentId: string;
  content: string;
  changedAt: Date;
  userId: string;
}

export interface WikiLink {
  from: string; // 출발 문서 ID
  to: string;   // 도착 문서 제목
  documentId: string; // 출발 문서 ID (중복이지만 쿼리 최적화용)
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
}