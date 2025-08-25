import React, { useState } from 'react';
import Header from './components/Layout/Header';
import { useDocuments } from './context/DocumentContextFirebase';
import './App.css';

function AppFirebase() {
  const {
    documents,
    categories,
    loading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    selectDocument,
    createCategory,
    updateCategory,
    deleteCategory
  } = useDocuments();

  const [content, setContent] = useState(`== Personal Wiki에 오신 것을 환영합니다! ==

**Firebase 연동 완료!** 🔥

== 주요 기능 ==
* **클라우드 저장** - Firebase Firestore
* **실시간 동기화** - 다기기 동기화
* **위키 문법** 지원 (굵게, 기울임, 취소선, 제목)
* **실시간 미리보기** 제공
* **접기/펼치기** 블록: {{{fold:예시|숨겨진 내용이 여기에 들어갑니다}}}
* **실행취소/다시실행** (Ctrl+Z/Ctrl+Y)
* **문법 버튼** 툴바로 쉬운 편집

== 사용 방법 ==
1. 좌측에서 **새 문서** 생성
2. **편집** 버튼으로 내용 수정
3. **자동 클라우드 저장** ☁️
4. **어디서든 접근 가능**

Firebase와 연결되었습니다! 🚀`);

  const [currentDoc, setCurrentDoc] = useState<any>(() => {
    // 새로고침 후에도 현재 문서 상태 유지
    const saved = localStorage.getItem('current-document');
    return saved ? JSON.parse(saved) : null;
  });
  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('general');
  const [isEditMode, setIsEditMode] = useState(() => {
    // 새로고침 후에도 편집 모드 상태 유지
    return localStorage.getItem('edit-mode') === 'true';
  });

  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  
  // UI 상태 관리
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 'all' 또는 카테고리 ID
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all'])); // 펼쳐진 카테고리들
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6c757d');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  // Undo/Redo 상태 관리
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 새로고침 시 content 복원
  React.useEffect(() => {
    if (currentDoc && currentDoc.content !== content) {
      setContent(currentDoc.content);
    }
  }, [currentDoc]);

  // 헤더의 새 문서 버튼을 위한 전역 함수 등록
  React.useEffect(() => {
    window.setIsCreating = (value: boolean) => {
      console.log('전역 setIsCreating 호출됨 (Firebase):', value);
      setIsCreating(value);
    };
    
    return () => {
      delete window.setIsCreating;
    };
  }, []);

  // 모달 외부 클릭 감지
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // 카테고리 메뉴 외부 클릭 시 닫기
      if (categoryMenuOpen && !target.closest('.category-menu-container')) {
        setCategoryMenuOpen(null);
      }
      
      // TOC 외부 클릭 시 닫기
      if (tocOpen && !target.closest('.toc-container')) {
        setTocOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [categoryMenuOpen, tocOpen]);


  // 툴바 버튼 스타일
  const toolbarButtonStyle = {
    padding: '4px 8px',
    fontSize: '12px',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '3px',
    cursor: 'pointer',
    minWidth: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  };

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return;
    
    try {
      const newContent = `== ${newDocTitle} ==\n\n새 문서입니다. 내용을 작성해주세요.`;
      const id = await createDocument(newDocTitle, newContent);
      
      // 선택된 카테고리 또는 newDocCategory로 문서 생성
      const targetCategory = selectedCategory && selectedCategory !== 'all' ? selectedCategory : newDocCategory;
      await updateDocument(id, { category: targetCategory });
      
      const newDoc = {
        id,
        title: newDocTitle,
        content: newContent,
        category: targetCategory,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'default-user'
      };
      
      setCurrentDoc(newDoc);
      setContent(newContent);
      setNewDocTitle('');
      setNewDocCategory('general');
      setIsCreating(false);
      setIsEditMode(true);
      
      // 생성된 문서의 카테고리를 자동으로 펼치기
      if (targetCategory !== 'all') {
        setExpandedCategories(prev => new Set([...prev, targetCategory]));
      }
      
      // 히스토리 초기화
      setHistory([newContent]);
      setHistoryIndex(0);
    } catch (err) {
      console.error('Error creating document:', err);
    }
  };

  // 제목 수정 시작
  const handleStartEditTitle = () => {
    if (currentDoc) {
      setEditingTitle(currentDoc.title);
      setIsEditingTitle(true);
    }
  };

  // 제목 수정 취소
  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditingTitle('');
  };

  // 제목 수정 저장
  const handleSaveTitle = async () => {
    if (!currentDoc || !editingTitle.trim()) return;
    
    try {
      await updateDocument(currentDoc.id, { title: editingTitle.trim() });
      
      const updatedDoc = {
        ...currentDoc,
        title: editingTitle.trim(),
        updatedAt: new Date()
      };
      
      setCurrentDoc(updatedDoc);
      setIsEditingTitle(false);
      setEditingTitle('');
    } catch (err) {
      console.error('Error updating document title:', err);
    }
  };

  // Enter 키로 제목 저장, Escape로 취소
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditTitle();
    }
  };

  // 카테고리/폴더 관리 함수들
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      await createCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('#6c757d');
      setIsCreatingCategory(false);
    } catch (err) {
      console.error('Error creating category:', err);
    }
  };

  // 카테고리 이름 수정 시작
  const handleStartEditCategory = (categoryId: string, currentName: string) => {
    setEditingCategoryId(categoryId);
    setEditingCategoryName(currentName);
    setCategoryMenuOpen(null);
  };

  // 카테고리 이름 수정 취소
  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  // 카테고리 이름 수정 저장
  const handleSaveCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) return;

    try {
      await updateCategory(categoryId, { name: editingCategoryName.trim() });
      setEditingCategoryId(null);
      setEditingCategoryName('');
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  // 카테고리 이름 수정 키 이벤트
  const handleCategoryKeyDown = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === 'Enter') {
      handleSaveCategory(categoryId);
    } else if (e.key === 'Escape') {
      handleCancelEditCategory();
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (categoryId === 'general') {
      alert('기본 카테고리는 삭제할 수 없습니다.');
      return;
    }
    
    if (window.confirm('이 카테고리를 삭제하시겠습니까? 카테고리 내 모든 문서는 "일반" 카테고리로 이동됩니다.')) {
      try {
        await deleteCategory(categoryId);
        
        if (selectedCategory === categoryId) {
          setSelectedCategory('all');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('카테고리 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 카테고리 펼침/접기 토글
  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 카테고리 순서 이동
  const moveCategoryUp = async (categoryId: string) => {
    const currentIndex = categories.findIndex(cat => cat.id === categoryId);
    if (currentIndex <= 0) return; // 이미 맨 위거나 찾을 수 없음
    
    try {
      const currentCategory = categories[currentIndex];
      const previousCategory = categories[currentIndex - 1];
      
      // 순서 교체
      await updateCategory(currentCategory.id, { order: previousCategory.order });
      await updateCategory(previousCategory.id, { order: currentCategory.order });
    } catch (error) {
      console.error('Error moving category up:', error);
    }
  };

  const moveCategoryDown = async (categoryId: string) => {
    const currentIndex = categories.findIndex(cat => cat.id === categoryId);
    if (currentIndex >= categories.length - 1 || currentIndex === -1) return; // 이미 맨 아래거나 찾을 수 없음
    
    try {
      const currentCategory = categories[currentIndex];
      const nextCategory = categories[currentIndex + 1];
      
      // 순서 교체
      await updateCategory(currentCategory.id, { order: nextCategory.order });
      await updateCategory(nextCategory.id, { order: currentCategory.order });
    } catch (error) {
      console.error('Error moving category down:', error);
    }
  };


  const handleSelectDocument = (doc: any) => {
    setCurrentDoc(doc);
    setContent(doc.content);
    setIsEditMode(false);
    selectDocument(doc);
    
    // localStorage에 현재 상태 저장
    localStorage.setItem('current-document', JSON.stringify(doc));
    localStorage.setItem('edit-mode', 'false');
    
    // 히스토리 초기화
    setHistory([doc.content]);
    setHistoryIndex(0);

    if (isSidebarVisible) {
      toggleSidebar();
    }
  };

  const handleEditDocument = () => {
    setIsEditMode(true);
    localStorage.setItem('edit-mode', 'true');
  };

  const handleSaveAndView = async () => {
    if (currentDoc) {
      try {
        await updateDocument(currentDoc.id, { content });
        // 로컬 상태도 즉시 업데이트
        const updatedDoc = { ...currentDoc, content };
        setCurrentDoc(updatedDoc);
        setIsEditMode(false);
        
        // localStorage도 업데이트
        localStorage.setItem('current-document', JSON.stringify(updatedDoc));
        localStorage.setItem('edit-mode', 'false');
      } catch (err) {
        console.error('Error saving document:', err);
      }
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      try {
        await deleteDocument(docId);
        if (currentDoc && currentDoc.id === docId) {
          setCurrentDoc(null);
          setIsEditMode(false);
          // localStorage 정리
          localStorage.removeItem('current-document');
          localStorage.removeItem('edit-mode');
        }
      } catch (err) {
        console.error('Error deleting document:', err);
      }
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Undo 히스토리 추가
    if (newContent !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }
      
      setHistory(newHistory);
    }
  };

  // Undo/Redo 함수들
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousContent = history[newIndex];
      setContent(previousContent);
      setHistoryIndex(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextContent = history[newIndex];
      setContent(nextContent);
      setHistoryIndex(newIndex);
    }
  };

  // 키보드 단축키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    }
  };

  // 텍스트 삽입/제거 토글 함수
  const insertText = (before: string, after: string, placeholder: string) => {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const beforeStart = start - before.length;
    const afterEnd = end + after.length;
    
    const textBefore = content.substring(Math.max(0, beforeStart), start);
    const textAfter = content.substring(end, Math.min(content.length, afterEnd));
    
    const hasMarkup = textBefore === before && textAfter === after;
    
    let newContent: string;
    let newSelectionStart: number;
    let newSelectionEnd: number;
    
    if (hasMarkup && selectedText) {
      newContent = content.substring(0, beforeStart) + selectedText + content.substring(afterEnd);
      newSelectionStart = beforeStart;
      newSelectionEnd = beforeStart + selectedText.length;
    } else {
      const textToInsert = selectedText || placeholder;
      newContent = content.substring(0, start) + before + textToInsert + after + content.substring(end);
      newSelectionStart = start + before.length;
      newSelectionEnd = newSelectionStart + textToInsert.length;
    }
    
    setContent(newContent);
    handleContentChange(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
    }, 0);
  };

  // 아웃라인 구조 생성 (확장된 버전)
  const generateOutlineStructure = (text: string) => {
    interface OutlineItem {
      id: string;
      title: string;
      level: number;
      number: string;
      content?: string;
      children: OutlineItem[];
      startPos: number;
    }

    const outline: OutlineItem[] = [];
    const lines = text.split('\n');
    let h1Count = 0;
    let h2CountPerH1: {[key: number]: number} = {};
    let currentH1: OutlineItem | null = null;

    lines.forEach((line, index) => {
      const h1Match = line.match(/^==\s*(.+?)\s*==$/);
      const h2Match = line.match(/^===\s*(.+?)\s*===$/);

      if (h1Match) {
        h1Count++;
        h2CountPerH1[h1Count] = 0;
        const id = `heading-h1-${h1Count}`;
        
        currentH1 = {
          id,
          title: h1Match[1].trim(),
          level: 1,
          number: `${h1Count}`,
          content: '',
          children: [],
          startPos: index
        };
        outline.push(currentH1);
        
      } else if (h2Match && currentH1) {
        h2CountPerH1[h1Count]++;
        const id = `heading-h2-${h1Count}-${h2CountPerH1[h1Count]}`;
        
        const h2Item: OutlineItem = {
          id,
          title: h2Match[1].trim(),
          level: 2,
          number: `${h1Count}.${h2CountPerH1[h1Count]}`,
          content: '',
          children: [],
          startPos: index
        };
        currentH1.children.push(h2Item);
        
      } else if (line.trim() && currentH1) {
        // 일반 내용 라인
        if (currentH1.children.length > 0) {
          // 마지막 H2에 내용 추가
          const lastH2 = currentH1.children[currentH1.children.length - 1];
          lastH2.content = (lastH2.content || '') + line + '\n';
        } else {
          // H1에 직접 내용 추가
          currentH1.content = (currentH1.content || '') + line + '\n';
        }
      }
    });

    return outline;
  };

  // 기존 목차 (호환성 유지)
  const generateTOC = (text: string) => {
    const outline = generateOutlineStructure(text);
    const toc: Array<{id: string, title: string, level: number, number: string}> = [];

    const flattenOutline = (items: any[]) => {
      items.forEach(item => {
        toc.push({
          id: item.id,
          title: item.title,
          level: item.level,
          number: item.number
        });
        if (item.children) {
          flattenOutline(item.children);
        }
      });
    };

    flattenOutline(outline);
    return toc;
  };

  // Wiki 텍스트 파싱 (앵커 ID 포함)
  const parseWikiText = (text: string): string => {
    let html = text;
    let h1Count = 0;
    let h2Count = 0;
    let currentH1 = 0;
    
    html = html.replace(/\n/g, '<br>');
    
    // H1 제목을 앵커 ID와 함께 변환
    html = html.replace(/==\s*(.+?)\s*==/g, (_, title) => {
      h1Count++;
      currentH1 = h1Count;
      h2Count = 0; // H2 카운터 리셋
      const id = `heading-h1-${h1Count}`;
      return `<h2 id="${id}" style="scroll-margin-top: 80px;">${title.trim()}</h2>`;
    });
    
    // H2 제목을 앵커 ID와 함께 변환
    html = html.replace(/===\s*(.+?)\s*===/g, (_, title) => {
      h2Count++;
      const id = `heading-h2-${currentH1}-${h2Count}`;
      return `<h3 id="${id}" style="scroll-margin-top: 80px;">${title.trim()}</h3>`;
    });
    
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // 접기 블록 처리
    html = html.replace(/\{\{\{fold:([^|]+)\|([^|]+)\|\}\}\}/g, (_, title, content) => {
      return `<details style="border: 1px solid #dee2e6; border-radius: 4px; margin: 10px 0; padding: 0;"><summary style="background: #f8f9fa; padding: 8px 12px; cursor: pointer; font-weight: 500; border-radius: 3px 3px 0 0;">${title.trim()}</summary><div style="padding: 12px;">${content.trim()}</div></details>`;
    });

    
    html = html.replace(/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">$1</a>');
    html = html.replace(/^\*\s(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return html;
  };

  const scrollToTop = () => {
    const contentArea = document.querySelector('.document-content');
    const previewArea = document.querySelector('.preview-content');
    
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (previewArea) {
      previewArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 목차 항목 클릭 시 해당 섹션으로 스크롤
  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTocOpen(false);
    }
  };

  // 아웃라인 섹션 접기/펼치기
  const toggleSection = (sectionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 스크롤 이동 방지
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };


  if (loading) {
    return (
      <div className="app">
        <Header toggleSidebar={toggleSidebar} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div>🔥 Firebase 연결 중...</div>
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>잠시만 기다려주세요</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <Header toggleSidebar={toggleSidebar} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div style={{ textAlign: 'center', color: '#dc3545' }}>
            <div>❌ 오류 발생</div>
            <div style={{ marginTop: '10px', fontSize: '14px' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header toggleSidebar={toggleSidebar} />
      <div className="app-body">
        <div className={`sidebar ${isSidebarVisible ? 'sidebar-visible' : ''}`}>
          <h3>📁 문서 폴더</h3>
          
          {/* 트리 구조 카테고리 뷰 */}
          <div style={{ marginBottom: '15px' }}>
            {/* 전체 문서 카테고리 */}
            <div style={{ marginBottom: '8px' }}>
              <div
                onClick={() => toggleCategoryExpansion('all')}
                style={{
                  padding: '6px 10px',
                  margin: '2px 0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '12px', width: '12px' }}>
                  {expandedCategories.has('all') ? '▼' : '▶'}
                </span>
                📂 모든 문서 ({documents.length})
              </div>
              
              {/* 모든 문서 하위 리스트 */}
              {expandedCategories.has('all') && documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`document-item ${currentDoc?.id === doc.id ? 'active' : ''}`}
                  onClick={() => handleSelectDocument(doc)}
                  style={{ 
                    cursor: 'pointer',
                    marginLeft: '20px',
                    marginBottom: '4px'
                  }}
                >
                  {doc.title}
                </div>
              ))}
            </div>

            {/* 카테고리별 트리 구조 */}
            {categories.map(category => {
              const categoryDocs = documents.filter(doc => doc.category === category.id);
              const isExpanded = expandedCategories.has(category.id);
              const isEditing = editingCategoryId === category.id;
              
              return (
                <div key={category.id} style={{ marginBottom: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    {isEditing ? (
                      // 카테고리 이름 수정 모드
                      <div
                        style={{
                          padding: '6px 10px',
                          margin: '2px 0',
                          borderRadius: '4px',
                          fontSize: '13px',
                          backgroundColor: '#f8f9fa',
                          border: '2px solid #007bff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '12px', width: '12px' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <div 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '50%', 
                            backgroundColor: category.color,
                            flexShrink: 0
                          }}
                        />
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => handleCategoryKeyDown(e, category.id)}
                          style={{
                            flex: 1,
                            padding: '2px 6px',
                            fontSize: '13px',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            minWidth: '60px'
                          }}
                          autoFocus
                          placeholder="카테고리 이름"
                        />
                        <span style={{ fontSize: '11px', color: '#6c757d', flexShrink: 0 }}>
                          ({categoryDocs.length})
                        </span>
                        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                          <button
                            onClick={() => handleSaveCategory(category.id)}
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '2px',
                              cursor: 'pointer'
                            }}
                            title="저장"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEditCategory}
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              background: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '2px',
                              cursor: 'pointer'
                            }}
                            title="취소"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 카테고리 일반 표시 모드
                      <div
                        style={{
                          padding: '6px 10px',
                          margin: '2px 0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          backgroundColor: selectedCategory === category.id ? '#e3f2fd' : 'transparent',
                          border: selectedCategory === category.id ? '2px solid #2196f3' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span 
                          onClick={() => toggleCategoryExpansion(category.id)}
                          style={{ fontSize: '12px', width: '12px', cursor: 'pointer' }}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <div 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '50%', 
                            backgroundColor: category.color 
                          }}
                        />
                        <span
                          onClick={() => setSelectedCategory(category.id)}
                          style={{
                            flex: 1,
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCategory === category.id ? '#e3f2fd' : 'transparent'}
                          title="클릭하여 선택"
                        >
                          {category.name} ({categoryDocs.length})
                        </span>
                      </div>
                    )}
                    
                    {/* 3점 메뉴 버튼 */}
                    {!isEditing && (
                      <div className="category-menu-container" style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoryMenuOpen(categoryMenuOpen === category.id ? null : category.id);
                          }}
                          style={{
                            position: 'absolute',
                            right: '5px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#6c757d',
                            cursor: 'pointer',
                            fontSize: '14px',
                            opacity: 0.7,
                            padding: '4px',
                            borderRadius: '3px',
                            lineHeight: '1'
                          }}
                          title="카테고리 메뉴"
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          ⋮
                        </button>
                        
                        {/* 드롭다운 메뉴 */}
                        {categoryMenuOpen === category.id && (
                          <div
                            className="category-dropdown-menu"
                            style={{
                              position: 'absolute',
                              right: '0',
                              top: '100%',
                              background: 'white',
                              border: '1px solid #dee2e6',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              zIndex: 1000,
                              minWidth: '120px',
                              padding: '4px 0'
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditCategory(category.id, category.name);
                                setCategoryMenuOpen(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#495057'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              ✏️ 이름 수정
                            </button>
                            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveCategoryUp(category.id);
                                setCategoryMenuOpen(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#495057'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              ▲ 위로 이동
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveCategoryDown(category.id);
                                setCategoryMenuOpen(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 12px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#495057'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              ▼ 아래로 이동
                            </button>
                            {category.id !== 'general' && (
                              <>
                                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategory(category.id);
                                    setCategoryMenuOpen(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: '#dc3545'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  🗑️ 삭제
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 카테고리 하위 문서 리스트 */}
                  {isExpanded && (
                    <div style={{ marginLeft: '20px' }}>
                      {categoryDocs.length > 0 ? (
                        categoryDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className={`document-item ${currentDoc?.id === doc.id ? 'active' : ''}`}
                            onClick={() => handleSelectDocument(doc)}
                            style={{ 
                              cursor: 'pointer',
                              marginBottom: '4px'
                            }}
                          >
                            {doc.title}
                          </div>
                        ))
                      ) : (
                        <p style={{ 
                          color: '#6c757d', 
                          fontSize: '11px', 
                          fontStyle: 'italic', 
                          margin: '4px 0', 
                          padding: '4px 8px' 
                        }}>
                          이 카테고리에 문서가 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isCreating ? (
            <div>
              {/* 선택된 카테고리 표시 */}
              {selectedCategory && selectedCategory !== 'all' && (
                <div style={{ 
                  marginBottom: '8px', 
                  padding: '6px 10px', 
                  background: '#e3f2fd', 
                  borderRadius: '4px',
                  border: '1px solid #2196f3',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div 
                    style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      backgroundColor: categories.find(cat => cat.id === selectedCategory)?.color || '#6c757d'
                    }}
                  />
                  선택된 카테고리: {categories.find(cat => cat.id === selectedCategory)?.name || '일반'}
                </div>
              )}
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateDocument();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewDocTitle('');
                    setNewDocCategory('general');
                  }
                }}
                placeholder="문서 제목"
                className="new-doc-input"
                autoFocus
              />
              {/* 카테고리를 수동으로 변경하고 싶을 때만 선택 */}
              {(!selectedCategory || selectedCategory === 'all') && (
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCreateDocument}
                  className="new-doc-btn confirm"
                >
                  생성
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewDocTitle('');
                    setNewDocCategory('general');
                  }}
                  className="new-doc-btn cancel"
                >
                  취소
                </button>
              </div>
            </div>
          ) : null}
          
          {/* 새 카테고리 생성 */}
          {isCreatingCategory ? (
            <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>새 카테고리</h4>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCategory();
                  if (e.key === 'Escape') setIsCreatingCategory(false);
                }}
                placeholder="카테고리 이름"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '3px',
                  fontSize: '13px',
                  marginBottom: '8px'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d' }}>색상:</label>
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  style={{ width: '30px', height: '20px', border: 'none', borderRadius: '3px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={handleCreateCategory}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  생성
                </button>
                <button
                  onClick={() => setIsCreatingCategory(false)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingCategory(true)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              + 새 카테고리
            </button>
          )}
        </div>
        
        {/* 메인 콘텐츠 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {currentDoc ? (
            isEditMode ? (
              // 편집 모드
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="mobile-view-switcher">
                  <button onClick={() => setMobileView('editor')} className={mobileView === 'editor' ? 'active' : ''}>편집</button>
                  <button onClick={() => setMobileView('preview')} className={mobileView === 'preview' ? 'active' : ''}>미리보기</button>
                </div>
                <div style={{ flex: 1, display: 'flex' }} className="editor-preview-container">
                  {/* 편집기 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className={`editor-pane ${mobileView !== 'editor' ? 'hidden-mobile' : ''}`}>
                    <div className="editor-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>편집 모드</span>
                        {/* 카테고리 선택 드롭다운 */}
                        {currentDoc && (
                          <select
                            value={currentDoc.category || 'general'}
                            onChange={async (e) => {
                              const newCategory = e.target.value;
                              try {
                                await updateDocument(currentDoc.id, { category: newCategory });
                                const updatedDoc = { ...currentDoc, category: newCategory };
                                setCurrentDoc(updatedDoc);
                                localStorage.setItem('current-document', JSON.stringify(updatedDoc));
                              } catch (error) {
                                console.error('Error updating document category:', error);
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              border: '1px solid #dee2e6',
                              borderRadius: '3px',
                              background: 'white'
                            }}
                            title="문서 카테고리 변경"
                          >
                            {categories.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isEditingTitle ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={handleTitleKeyDown}
                              style={{
                                padding: '6px 10px',
                                fontSize: '14px',
                                border: '2px solid #007bff',
                                borderRadius: '4px',
                                outline: 'none',
                                minWidth: '200px'
                              }}
                              autoFocus
                              placeholder="문서 제목을 입력하세요"
                            />
                            <button
                              onClick={handleSaveTitle}
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEditTitle}
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                background: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="editor-header-title"
                            onClick={handleStartEditTitle}
                            style={{
                              cursor: 'pointer',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="제목을 클릭하여 수정"
                          >
                            📄 {currentDoc.title}
                            <span style={{ fontSize: '11px', color: '#6c757d' }}>✏️</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(currentDoc.id)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                          title="문서 삭제"
                        >
                          🗑️ 삭제
                        </button>
                        <button
                          onClick={handleSaveAndView}
                          className="editor-header-btn"
                        >
                          저장하고 보기
                        </button>
                      </div>
                    </div>
                    
                    {/* 위키 문법 버튼 툴바 */}
                    <div className="editor-toolbar">
                      <span style={{ fontSize: '11px', color: '#6c757d', marginRight: '8px' }}>실행취소:</span>
                      <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        style={{...toolbarButtonStyle, opacity: historyIndex <= 0 ? 0.5 : 1, cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer'}}
                        title="실행취소 (Ctrl+Z)"
                      >
                        ↶
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        style={{...toolbarButtonStyle, opacity: historyIndex >= history.length - 1 ? 0.5 : 1, cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer'}}
                        title="다시실행 (Ctrl+Y)"
                      >
                        ↷
                      </button>
                      <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 8px' }}></div>
                      <span style={{ fontSize: '11px', color: '#6c757d', marginRight: '8px' }}>문법:</span>
                      <button onClick={() => insertText('**', '**', '굵은 텍스트')} style={toolbarButtonStyle} title="굵게"><b>B</b></button>
                      <button onClick={() => insertText('~~', '~~', '취소선 텍스트')} style={toolbarButtonStyle} title="취소선"><s>S</s></button>
                      <button onClick={() => insertText('== ', ' ==', '제목')} style={toolbarButtonStyle} title="큰 제목">H1</button>
                      <button onClick={() => insertText('=== ', ' ===', '소제목')} style={toolbarButtonStyle} title="작은 제목">H2</button>
                      <button onClick={() => insertText('{{{fold:', '|}}}', '제목|내용')} style={{...toolbarButtonStyle, fontSize: '10px'}} title="접기/펼치기">접기</button>
                    </div>
                    
                    <textarea
                      className="editor-textarea"
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={{
                        flex: 1,
                        padding: '20px',
                        border: 'none',
                        outline: 'none',
                        fontFamily: 'Courier New, monospace',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        resize: 'none'
                      }}
                      placeholder="위키 문서를 작성하세요... (텍스트 전용)"
                    />
                  </div>
                  
                  {/* 미리보기 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #dee2e6' }} className={`preview-pane ${mobileView !== 'preview' ? 'hidden-mobile' : ''}`}>
                    <div className="preview-header">
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>미리보기</span>
                    </div>
                    <div 
                      className="preview-content"
                      style={{
                        flex: 1,
                        overflow: 'auto',
                        overflowY: 'scroll',
                        lineHeight: '1.6',
                        fontSize: '14px',
                        maxHeight: 'calc(100vh - 140px)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ padding: '20px', paddingBottom: '60px' }}>
                        <div dangerouslySetInnerHTML={{ __html: parseWikiText(content) }} />
                        
                        <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #dee2e6'}}>
                          <button onClick={scrollToTop} className="scroll-top-btn">
                            ⬆️ 위로
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 읽기 모드
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="editor-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>읽기 모드</span>
                    {/* 카테고리 선택 드롭다운 */}
                    {currentDoc && (
                      <select
                        value={currentDoc.category || 'general'}
                        onChange={async (e) => {
                          const newCategory = e.target.value;
                          try {
                            await updateDocument(currentDoc.id, { category: newCategory });
                            const updatedDoc = { ...currentDoc, category: newCategory };
                            setCurrentDoc(updatedDoc);
                            localStorage.setItem('current-document', JSON.stringify(updatedDoc));
                          } catch (error) {
                            console.error('Error updating document category:', error);
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          border: '1px solid #dee2e6',
                          borderRadius: '3px',
                          background: 'white'
                        }}
                        title="문서 카테고리 변경"
                      >
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isEditingTitle ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={handleTitleKeyDown}
                          style={{
                            padding: '6px 10px',
                            fontSize: '14px',
                            border: '2px solid #007bff',
                            borderRadius: '4px',
                            outline: 'none',
                            minWidth: '200px'
                          }}
                          autoFocus
                          placeholder="문서 제목을 입력하세요"
                        />
                        <button
                          onClick={handleSaveTitle}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancelEditTitle}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="editor-header-title"
                        onClick={handleStartEditTitle}
                        style={{
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="제목을 클릭하여 수정"
                      >
                        📄 {currentDoc.title}
                        <span style={{ fontSize: '11px', color: '#6c757d' }}>✏️</span>
                      </div>
                    )}
                    <button
                      onClick={handleEditDocument}
                      className="editor-header-btn edit"
                    >
                      편집
                    </button>
                  </div>
                </div>
                <div 
                  className="document-content"
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    overflowY: 'scroll',
                    lineHeight: '1.6',
                    fontSize: '14px',
                    maxHeight: 'calc(100vh - 100px)',
                    position: 'relative'
                  }}
                >
                  <div style={{ padding: '20px', paddingBottom: '60px' }}>
                    <div dangerouslySetInnerHTML={{ __html: parseWikiText(currentDoc.content) }} />
                    
                    <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #dee2e6'}}>
                      <button onClick={scrollToTop} className="scroll-top-btn">
                        ⬆️ 위로
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            // 기본 화면
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>☁️ Firebase 연결됨</span>
              </div>
              <div 
                style={{
                  flex: 1,
                  overflow: 'auto',
                  overflowY: 'scroll',
                  lineHeight: '1.6',
                  fontSize: '14px',
                  maxHeight: 'calc(100vh - 100px)'
                }}
              >
                <div style={{ padding: '20px' }}>
                  <div dangerouslySetInnerHTML={{ __html: parseWikiText(content) }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <button onClick={() => { setIsCreating(true); if (!isSidebarVisible) { toggleSidebar(); } }} className="fab">
        새 문서
      </button>
      
      {/* 플로팅 목차 버튼 */}
      {currentDoc && (
        <div className="toc-container" style={{ position: 'relative' }}>
          <button 
            onClick={() => setTocOpen(!tocOpen)}
            style={{
              position: 'fixed',
              right: '20px',
              bottom: '80px',
              width: '50px',
              height: '50px',
              borderRadius: '25px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="아웃라인"
          >
            🌳
          </button>
          
          {/* 목차 팝업 */}
          {tocOpen && (
            <div
              style={{
                position: 'fixed',
                right: '20px',
                bottom: '140px',
                background: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '280px',
                maxWidth: '400px',
                maxHeight: '400px',
                overflow: 'auto'
              }}
            >
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #dee2e6',
                background: '#f8f9fa',
                borderRadius: '8px 8px 0 0',
                fontWeight: '600',
                fontSize: '14px',
                color: '#495057'
              }}>
                🌳 아웃라인
              </div>
              <div style={{ padding: '4px 0' }}>
                {generateOutlineStructure(currentDoc.content).map((item) => (
                  <div key={item.id}>
                    {/* H1 제목 */}
                    <div
                      onClick={() => scrollToHeading(item.id)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#212529',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '4px',
                        margin: '2px 0'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* 접기/펼치기 버튼 */}
                      {item.children.length > 0 && (
                        <button
                          onClick={(e) => toggleSection(item.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6c757d',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '2px'
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            e.currentTarget.style.backgroundColor = '#e9ecef';
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {collapsedSections.has(item.id) ? '▶' : '▼'}
                        </button>
                      )}
                      {item.children.length === 0 && (
                        <div style={{ width: '18px' }}></div>
                      )}
                      
                      <span style={{ 
                        minWidth: '20px', 
                        fontSize: '11px', 
                        color: '#007bff',
                        fontWeight: '600'
                      }}>
                        {item.number}
                      </span>
                      <span style={{ flex: 1 }}>{item.title}</span>
                      
                      {/* 내용 미리보기 */}
                      {item.content && (
                        <span style={{
                          fontSize: '10px',
                          color: '#6c757d',
                          maxWidth: '100px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.content.replace(/\n/g, ' ').substring(0, 30)}...
                        </span>
                      )}
                    </div>

                    {/* H2 자식 항목들 */}
                    {!collapsedSections.has(item.id) && item.children.map((child) => (
                      <div
                        key={child.id}
                        onClick={() => scrollToHeading(child.id)}
                        style={{
                          padding: '6px 12px',
                          paddingLeft: '44px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#6c757d',
                          fontWeight: '400',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          borderLeft: '2px solid #e9ecef',
                          marginLeft: '16px',
                          borderRadius: '0 4px 4px 0'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span style={{ 
                          minWidth: '24px', 
                          fontSize: '10px', 
                          color: '#007bff',
                          fontWeight: '500'
                        }}>
                          {child.number}
                        </span>
                        <span style={{ flex: 1 }}>{child.title}</span>
                        
                        {/* 내용 미리보기 */}
                        {child.content && (
                          <span style={{
                            fontSize: '9px',
                            color: '#adb5bd',
                            maxWidth: '80px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {child.content.replace(/\n/g, ' ').substring(0, 25)}...
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {generateTOC(currentDoc.content).length === 0 && (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#6c757d',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    제목이 없습니다.<br/>
                    == 제목 == 또는 === 소제목 ===을 사용해보세요.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AppFirebase;