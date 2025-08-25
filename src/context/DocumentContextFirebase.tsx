import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface WikiDocument {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  tags?: string[];
  category?: string;
}

interface WikiCategory {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface DocumentContextType {
  documents: WikiDocument[];
  currentDocument: WikiDocument | null;
  categories: WikiCategory[];
  loading: boolean;
  error: string | null;
  
  // 문서 관리
  createDocument: (title: string, content: string) => Promise<string>;
  updateDocument: (id: string, updates: Partial<WikiDocument>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  selectDocument: (document: WikiDocument | null) => void;
  searchDocuments: (searchTerm: string) => Promise<WikiDocument[]>;
  
  // 카테고리 관리
  createCategory: (name: string, color: string) => Promise<string>;
  updateCategory: (id: string, updates: Partial<WikiCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategory: (categoryId: string, newOrder: number) => Promise<void>;
  
  // 유틸리티
  getDocumentByTitle: (title: string) => WikiDocument | null;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};

interface DocumentProviderProps {
  children: ReactNode;
  userId?: string;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ 
  children, 
  userId = 'default-user'
}) => {
  const [documents, setDocuments] = useState<WikiDocument[]>([]);
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [currentDocument, setCurrentDocument] = useState<WikiDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firebase에서 문서 목록 실시간 구독
  useEffect(() => {
    const documentsRef = collection(db, 'users', userId, 'documents');
    const q = query(documentsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: WikiDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        docs.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          userId: data.userId,
          tags: data.tags || [],
          category: data.category || 'general'
        });
      });
      setDocuments(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching documents:', err);
      setError('문서를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Firebase에서 카테고리 목록 실시간 구독
  useEffect(() => {
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const q = query(categoriesRef, orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats: WikiCategory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cats.push({
          id: doc.id,
          name: data.name,
          color: data.color,
          order: data.order || 0
        });
      });
      
      // 기본 카테고리가 없으면 추가
      if (cats.length === 0) {
        const defaultCategories: WikiCategory[] = [
          { id: 'general', name: '일반', color: '#6c757d', order: 0 },
          { id: 'personal', name: '개인', color: '#28a745', order: 1 },
          { id: 'work', name: '업무', color: '#007bff', order: 2 }
        ];
        
        // 기본 카테고리들을 Firebase에 저장
        defaultCategories.forEach(async (category) => {
          const categoryRef = doc(db, 'users', userId, 'categories', category.id);
          await setDoc(categoryRef, {
            name: category.name,
            color: category.color,
            order: category.order
          });
        });
        
        setCategories(defaultCategories);
      } else {
        setCategories(cats);
      }
    }, (err) => {
      console.error('Error fetching categories:', err);
      setError('카테고리를 불러오는 중 오류가 발생했습니다.');
    });

    return () => unsubscribe();
  }, [userId]);

  const createDocument = async (title: string, content: string): Promise<string> => {
    try {
      setLoading(true);
      const now = new Date();
      const id = `doc-${Date.now()}`;
      
      const newDoc: WikiDocument = {
        id,
        title,
        content,
        createdAt: now,
        updatedAt: now,
        userId,
        tags: [],
        category: 'general'
      };
      
      const docRef = doc(db, 'users', userId, 'documents', id);
      await setDoc(docRef, {
        title: newDoc.title,
        content: newDoc.content,
        createdAt: now,
        updatedAt: now,
        userId: newDoc.userId,
        tags: newDoc.tags,
        category: newDoc.category
      });
      
      return id;
    } catch (err) {
      console.error('Error creating document:', err);
      setError('문서 생성 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (id: string, updates: Partial<WikiDocument>): Promise<void> => {
    try {
      const docRef = doc(db, 'users', userId, 'documents', id);
      await setDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      }, { merge: true });
      
      // 현재 문서가 업데이트되는 문서라면 로컬 상태도 업데이트
      if (currentDocument && currentDocument.id === id) {
        setCurrentDocument(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
      }
    } catch (err) {
      console.error('Error updating document:', err);
      setError('문서 업데이트 중 오류가 발생했습니다.');
      throw err;
    }
  };

  const deleteDocument = async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'users', userId, 'documents', id);
      await deleteDoc(docRef);
      
      if (currentDocument && currentDocument.id === id) {
        setCurrentDocument(null);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('문서 삭제 중 오류가 발생했습니다.');
      throw err;
    }
  };

  const selectDocument = (document: WikiDocument | null) => {
    setCurrentDocument(document);
  };

  const searchDocuments = async (searchTerm: string): Promise<WikiDocument[]> => {
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // 카테고리 관리 함수들
  const createCategory = async (name: string, color: string): Promise<string> => {
    try {
      const id = `category-${Date.now()}`;
      const order = categories.length;
      
      const categoryRef = doc(db, 'users', userId, 'categories', id);
      await setDoc(categoryRef, {
        name: name.trim(),
        color,
        order
      });
      
      return id;
    } catch (err) {
      console.error('Error creating category:', err);
      setError('카테고리 생성 중 오류가 발생했습니다.');
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<WikiCategory>): Promise<void> => {
    try {
      const categoryRef = doc(db, 'users', userId, 'categories', id);
      await setDoc(categoryRef, updates, { merge: true });
    } catch (err) {
      console.error('Error updating category:', err);
      setError('카테고리 업데이트 중 오류가 발생했습니다.');
      throw err;
    }
  };

  const deleteCategory = async (id: string): Promise<void> => {
    if (id === 'general') {
      throw new Error('기본 카테고리는 삭제할 수 없습니다.');
    }
    
    try {
      // 해당 카테고리의 문서들을 "일반" 카테고리로 이동
      const categoryDocs = documents.filter(doc => doc.category === id);
      for (const doc of categoryDocs) {
        await updateDocument(doc.id, { category: 'general' });
      }
      
      // 카테고리 삭제
      const categoryRef = doc(db, 'users', userId, 'categories', id);
      await deleteDoc(categoryRef);
      
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('카테고리 삭제 중 오류가 발생했습니다.');
      throw err;
    }
  };

  const reorderCategory = async (categoryId: string, newOrder: number): Promise<void> => {
    try {
      await updateCategory(categoryId, { order: newOrder });
    } catch (err) {
      console.error('Error reordering category:', err);
      throw err;
    }
  };

  const getDocumentByTitle = (title: string): WikiDocument | null => {
    return documents.find(doc => doc.title === title) || null;
  };

  const value: DocumentContextType = {
    documents,
    currentDocument,
    categories,
    loading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    selectDocument,
    searchDocuments,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategory,
    getDocumentByTitle
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export type { WikiCategory };