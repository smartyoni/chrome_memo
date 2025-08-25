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