import React, { useState } from 'react';
import Header from './components/Layout/Header';
import './App.css';

function App() {
  const [content, setContent] = useState(`== Personal Wiki에 오신 것을 환영합니다! ==

**완성된 개인 위키 시스템**입니다!

== 주요 기능 ==
* **위키 문법** 지원 (굵게, 기울임, 취소선, 제목)
* **실시간 미리보기** 제공
* **이미지 첨부** 및 크기 조정
* **접기/펼치기** 블록: {{{fold:예시|숨겨진 내용이 여기에 들어갑니다}}}
* **실행취소/다시실행** (Ctrl+Z/Ctrl+Y)
* **문법 버튼** 툴바로 쉬운 편집

== 사용 방법 ==
1. 좌측에서 **새 문서** 생성
2. **편집** 버튼으로 내용 수정
3. **툴바 버튼**으로 문법 적용
4. **실시간 미리보기**로 결과 확인

시작해보세요! 🚀`);

  // LocalStorage에서 문서 불러오기
  const [documents, setDocuments] = useState<Array<{id: string, title: string, content: string}>>(() => {
    const saved = localStorage.getItem('wiki-documents');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentDoc, setCurrentDoc] = useState<{id: string, title: string, content: string} | null>(() => {
    const savedDocId = localStorage.getItem('wiki-last-viewed-doc');
    if (savedDocId) {
      const saved = localStorage.getItem('wiki-documents');
      if (saved) {
        const docs = JSON.parse(saved);
        return docs.find((doc: any) => doc.id === savedDocId) || null;
      }
    }
    return null;
  });
  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [webView, setWebView] = useState<'edit' | 'preview'>('edit');
  const [images, setImages] = useState<{[key: string]: string}>(() => {
    const saved = localStorage.getItem('wiki-images');
    return saved ? JSON.parse(saved) : {};
  }); // 이미지 저장소

  // 모바일 환경 감지
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 모바일에서 사이드바 외부 클릭시 닫기
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isSidebarVisible) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setIsSidebarVisible(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isSidebarVisible]);

  // 헤더의 새 문서 버튼을 위한 전역 함수 등록
  React.useEffect(() => {
    window.setIsCreating = (value: boolean) => {
      console.log('전역 setIsCreating 호출됨:', value);
      setIsCreating(value);
    };
    
    return () => {
      delete window.setIsCreating;
    };
  }, []);

  // 마지막으로 본 문서의 content도 초기화
  React.useEffect(() => {
    if (currentDoc) {
      setContent(currentDoc.content);
      setHistory([currentDoc.content]);
      setHistoryIndex(0);
    }
  }, [currentDoc]);

  // Undo/Redo 상태 관리
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);

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

  // 문서 목록이 변경될 때마다 LocalStorage에 저장
  React.useEffect(() => {
    localStorage.setItem('wiki-documents', JSON.stringify(documents));
    setLastSaved(new Date());
  }, [documents]);

  const handleCreateDocument = () => {
    if (!newDocTitle.trim()) return;
    
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: newDocTitle,
      content: `== ${newDocTitle} ==\n\n새 문서입니다. 내용을 작성해주세요.`
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    setCurrentDoc(newDoc);
    setContent(newDoc.content);
    setNewDocTitle('');
    setIsCreating(false);
    setIsEditMode(true); // 새 문서는 편집 모드로 시작
    
    // 히스토리 초기화
    setHistory([newDoc.content]);
    setHistoryIndex(0);
  };

  const handleSelectDocument = (doc: {id: string, title: string, content: string}) => {
    setCurrentDoc(doc);
    setContent(doc.content);
    setIsEditMode(false); // 문서 선택시는 읽기 모드
    
    // 마지막으로 본 문서 저장
    localStorage.setItem('wiki-last-viewed-doc', doc.id);
    
    // 히스토리 초기화
    setHistory([doc.content]);
    setHistoryIndex(0);
  };

  const handleEditDocument = () => {
    setIsEditMode(true);
    // 편집모드 진입시 기본적으로 편집 탭 선택
    if (isMobile) {
      setMobileView('edit');
    } else {
      setWebView('edit');
    }
  };

  const handleSaveAndView = () => {
    setIsEditMode(false);
  };

  const handleDeleteDocument = (docId: string) => {
    if (window.confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      // 현재 보고 있는 문서가 삭제되면 선택 해제
      if (currentDoc && currentDoc.id === docId) {
        setCurrentDoc(null);
        setIsEditMode(false);
      }
    }
  };

  const handleDocumentTitleChange = (newTitle: string) => {
    if (currentDoc) {
      const updatedDoc = { ...currentDoc, title: newTitle };
      setCurrentDoc(updatedDoc);
      setDocuments(prev => prev.map(doc => 
        doc.id === currentDoc.id ? updatedDoc : doc
      ));
    }
  };

  // 문서 상단으로 스크롤
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

  // 이미지 크기 조정
  const handleImageResize = (imageId: string, newWidth: number) => {
    const regex = new RegExp(`!\\[${imageId}\\|(\\d*)px?\\]`, 'g');
    const updatedContent = content.replace(regex, `![${imageId}|${newWidth}px]`);
    handleContentChange(updatedContent);
  };

  // Undo/Redo 함수들
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousContent = history[newIndex];
      setContent(previousContent);
      setHistoryIndex(newIndex);
      
      // 문서도 업데이트 (히스토리 추가 없이)
      if (currentDoc) {
        setDocuments(prev => prev.map(doc => 
          doc.id === currentDoc.id ? { ...doc, content: previousContent } : doc
        ));
        setCurrentDoc(prev => prev ? { ...prev, content: previousContent } : null);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextContent = history[newIndex];
      setContent(nextContent);
      setHistoryIndex(newIndex);
      
      // 문서도 업데이트 (히스토리 추가 없이)
      if (currentDoc) {
        setDocuments(prev => prev.map(doc => 
          doc.id === currentDoc.id ? { ...doc, content: nextContent } : doc
        ));
        setCurrentDoc(prev => prev ? { ...prev, content: nextContent } : null);
      }
    }
  };

  // 텍스트 삽입/제거 토글 함수 (툴바 버튼용)
  const insertText = (before: string, after: string, placeholder: string) => {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    // 이미 해당 문법이 적용되어 있는지 확인
    const beforeStart = start - before.length;
    const afterEnd = end + after.length;
    
    const textBefore = content.substring(Math.max(0, beforeStart), start);
    const textAfter = content.substring(end, Math.min(content.length, afterEnd));
    
    const hasMarkup = textBefore === before && textAfter === after;
    
    let newContent: string;
    let newSelectionStart: number;
    let newSelectionEnd: number;
    
    if (hasMarkup && selectedText) {
      // 문법 제거
      newContent = content.substring(0, beforeStart) + selectedText + content.substring(afterEnd);
      newSelectionStart = beforeStart;
      newSelectionEnd = beforeStart + selectedText.length;
    } else {
      // 문법 추가
      const textToInsert = selectedText || placeholder;
      newContent = content.substring(0, start) + before + textToInsert + after + content.substring(end);
      newSelectionStart = start + before.length;
      newSelectionEnd = newSelectionStart + textToInsert.length;
    }
    
    setContent(newContent);
    handleContentChange(newContent);
    
    // 커서 위치 조정
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
    }, 0);
  };

  // 접기 블록 전용 토글 함수
  const insertFoldBlock = () => {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    // 접기 블록 패턴 확인
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);
    const foldPattern = /\{\{\{fold:([^|]*)\|$/;
    const endPattern = /^\}\}\}/;
    
    const hasFoldStart = foldPattern.test(beforeText);
    const hasFoldEnd = endPattern.test(afterText);
    
    let newContent: string;
    let newSelectionStart: number;
    let newSelectionEnd: number;
    
    if (hasFoldStart && hasFoldEnd) {
      // 접기 블록 제거
      const foldMatch = beforeText.match(/\{\{\{fold:([^|]*)\|(.*)$/);
      if (foldMatch) {
        const contentPart = foldMatch[2] + selectedText;
        newContent = beforeText.replace(/\{\{\{fold:([^|]*)\|(.*)$/, contentPart) + afterText.replace(/^\}\}\}/, '');
        newSelectionStart = beforeText.length - foldMatch[0].length + contentPart.length - selectedText.length;
        newSelectionEnd = newSelectionStart + selectedText.length;
      } else {
        return;
      }
    } else {
      // 접기 블록 추가
      const textToInsert = selectedText || '내용';
      const title = '접기 제목';
      newContent = content.substring(0, start) + `{{{fold:${title}|${textToInsert}}}}` + content.substring(end);
      newSelectionStart = start + 10; // '{{{fold:' 길이
      newSelectionEnd = newSelectionStart + title.length;
    }
    
    setContent(newContent);
    handleContentChange(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
    }, 0);
  };

  // 목록 전용 토글 함수
  const insertListItem = () => {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // 현재 줄의 시작 위치 찾기
    const beforeCursor = content.substring(0, start);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline + 1;
    const currentLine = content.substring(lineStart, end);
    
    let newContent: string;
    let newSelectionStart: number;
    
    if (currentLine.startsWith('* ')) {
      // 목록 제거
      const newLine = currentLine.substring(2);
      newContent = content.substring(0, lineStart) + newLine + content.substring(end);
      newSelectionStart = start - 2;
    } else {
      // 목록 추가
      const textToInsert = currentLine || '목록 항목';
      newContent = content.substring(0, lineStart) + '* ' + textToInsert + content.substring(end);
      newSelectionStart = lineStart + 2;
    }
    
    setContent(newContent);
    handleContentChange(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newSelectionStart + (currentLine ? 0 : 4); // '목록 항목' 길이
    }, 0);
  };

  // 이미지 클릭 핸들러
  React.useEffect(() => {
    const handleImageClick = (e: Event) => {
      const target = e.target as HTMLImageElement;
      if (target.classList.contains('wiki-image')) {
        const imageId = target.getAttribute('data-image-id');
        const currentWidth = parseInt(target.style.width) || 300;
        
        const newWidth = prompt(`이미지 크기를 입력하세요 (현재: ${currentWidth}px):`, currentWidth.toString());
        if (newWidth && !isNaN(parseInt(newWidth)) && imageId) {
          handleImageResize(imageId, parseInt(newWidth));
        }
      }
    };

    document.addEventListener('click', handleImageClick);
    return () => document.removeEventListener('click', handleImageClick);
  }, [content]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Undo 히스토리 추가 (마지막 변경과 다른 경우만)
    if (newContent !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      
      // 히스토리 크기 제한 (50개)
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }
      
      setHistory(newHistory);
    }
    
    if (currentDoc) {
      // 현재 문서 내용 업데이트
      setDocuments(prev => prev.map(doc => 
        doc.id === currentDoc.id ? { ...doc, content: newContent } : doc
      ));
      setCurrentDoc(prev => prev ? { ...prev, content: newContent } : null);
    }
  };

  // 수동 저장 (이미 자동저장되지만 사용자 피드백용)
  const handleManualSave = () => {
    if (currentDoc) {
      localStorage.setItem('wiki-documents', JSON.stringify(documents));
      setLastSaved(new Date());
      alert('저장되었습니다!');
    }
  };

  // 클립보드 이미지 처리
  const handleImagePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const imageId = `img-${Date.now()}`;
            
            // 이미지 저장
            setImages(prev => ({ ...prev, [imageId]: base64 }));
            localStorage.setItem('wiki-images', JSON.stringify({ ...images, [imageId]: base64 }));
            
            // 텍스트에 이미지 마크업 추가
            const imageMarkup = `\n![${imageId}|300px]\n`;
            const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newContent = content.substring(0, start) + imageMarkup + content.substring(end);
              handleContentChange(newContent);
              
              // 커서 위치 조정
              setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + imageMarkup.length;
                textarea.focus();
              }, 10);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // 키보드 단축키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey) {
      if (e.key === 's') {
        e.preventDefault();
        handleManualSave();
      } else if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    }
  };

  const parseWikiText = (text: string): string => {
    let html = text;
    
    // 줄바꿈을 먼저 처리
    html = html.replace(/\n/g, '<br>');
    
    // 제목 (== 제목 ==)
    html = html.replace(/==\s*(.+?)\s*==/g, '<h2>$1</h2>');
    
    // 굵은 글씨 (**text**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // 기울임 (''text'')
    html = html.replace(/''(.+?)''/g, '<em>$1</em>');
    
    // 취소선 (~~text~~)
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // URL 자동 링크 변환 (http://, https:// 지원)
    html = html.replace(
      /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">$1</a>'
    );
    
    // www로 시작하는 URL (앞에 프로토콜이 없는 경우)
    html = html.replace(
      /(\s|^)(www\.[^\s<>"{}|\\^`\[\]]+)/g,
      '$1<a href="https://$2" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">$2</a>'
    );
    
    // 이메일 주소 링크 변환
    html = html.replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '<a href="mailto:$1" style="color: #007bff; text-decoration: underline;">$1</a>'
    );
    
    // 이미지 처리 ![imageId|width] - 더 안전한 처리
    html = html.replace(/!\[([^|\]]+)\|?(\d*)(px)?\]/g, (_, imageId, width) => {
      const imageData = images[imageId];
      if (imageData) {
        const imageWidth = width ? `${width}px` : '300px';
        return `<div class="image-container" style="margin: 10px 0; text-align: center; position: relative;"><img src="${imageData}" alt="${imageId}" data-image-id="${imageId}" title="클릭하여 크기 조정 (현재: ${imageWidth})" style="max-width: 100%; width: ${imageWidth}; height: auto; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;" class="wiki-image" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" /><div style="font-size: 11px; color: #6c757d; margin-top: 4px;">📐 클릭하여 크기 조정</div></div>`;
      }
      return `<span style="color: #dc3545;">[이미지 없음: ${imageId}]</span>`;
    });
    
    // 접기 블록 처리 {{{fold:제목|내용}}}
    html = html.replace(/\{\{\{fold:([^|]+)\|([^}]+)\}\}\}/g, (_, title, content) => {
      return `<details style="border: 1px solid #dee2e6; border-radius: 4px; margin: 10px 0; padding: 0;">
        <summary style="background: #f8f9fa; padding: 8px 12px; cursor: pointer; font-weight: 500; border-radius: 3px 3px 0 0;">${title.trim()}</summary>
        <div style="padding: 12px;">${content.trim()}</div>
      </details>`;
    });
    
    // 내부 링크 ([[문서명]])
    html = html.replace(/\[\[(.+?)\]\]/g, '<a href="#" style="color: #007bff; border-bottom: 1px dotted #007bff;">$1</a>');
    
    // 목록 (* 항목) - 간단한 처리
    html = html.replace(/^\*\s(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return html;
  };

  return (
    <div className="app">
      <Header 
        toggleSidebar={() => setIsSidebarVisible(true)} 
        currentDoc={currentDoc}
        isEditMode={isEditMode}
        onEditDocument={handleEditDocument}
        onDocumentTitleChange={handleDocumentTitleChange}
      />
      <div className="app-body">
        <div 
          className={`sidebar ${(isMobile && isSidebarVisible) || !isMobile ? 'sidebar-visible' : ''}`}
          style={!isMobile ? { width: '250px', background: '#f8f9fa', padding: '20px' } : {}}
        >
          
          {documents.length > 0 ? (
            <div style={{ marginBottom: '20px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    background: currentDoc?.id === doc.id ? '#007bff' : 'white',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    onClick={() => handleSelectDocument(doc)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      color: currentDoc?.id === doc.id ? 'white' : '#495057',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {doc.title}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 문서 선택 이벤트 방지
                      handleDeleteDocument(doc.id);
                    }}
                    style={{
                      padding: '6px 8px',
                      background: 'transparent',
                      color: currentDoc?.id === doc.id ? 'white' : '#dc3545',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      borderLeft: currentDoc?.id === doc.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid #dee2e6'
                    }}
                    title="문서 삭제"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6c757d', fontSize: '14px', fontStyle: 'italic', marginBottom: '20px' }}>
              아직 문서가 없습니다.<br />
              첫 문서를 만들어보세요!
            </p>
          )}

          {isCreating ? (
            <div>
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateDocument();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewDocTitle('');
                  }
                }}
                placeholder="문서 제목"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCreateDocument}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  생성
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewDocTitle('');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
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
              onClick={() => setIsCreating(true)}
              style={{ 
                width: '100%',
                padding: '12px', 
                background: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              + 새 문서
            </button>
          )}
          
          {/* 모바일에서 사이드바 닫기 버튼 */}
          {isMobile && (
            <button
              onClick={() => setIsSidebarVisible(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6c757d'
              }}
            >
              ✕
            </button>
          )}
        </div>
        
        {/* 모바일 햄버거 메뉴 + FAB */}
        {isMobile && (
          <>
            <button
              onClick={() => setIsSidebarVisible(true)}
              style={{
                position: 'fixed',
                top: '70px',
                left: '15px',
                width: '50px',
                height: '50px',
                borderRadius: '25px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                zIndex: 999,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              ☰
            </button>
            
            {!currentDoc && (
              <button
                onClick={() => setIsCreating(true)}
                className="fab"
                style={{
                  position: 'fixed',
                  bottom: '20px',
                  right: '20px',
                  width: 'auto',
                  height: 'auto',
                  padding: '16px 24px',
                  borderRadius: '30px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  zIndex: 999,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                + 새 문서
              </button>
            )}
          </>
        )}
        
        {/* 메인 콘텐츠 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {currentDoc ? (
            isEditMode ? (
              // 편집 모드: 탭으로 편집/미리보기 전환
              <div className="editor-preview-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* 뷰 전환 탭 버튼 */}
                <div className="view-switcher" style={{
                  display: 'flex',
                  borderBottom: '1px solid #dee2e6',
                  background: '#f8f9fa'
                }}>
                  <button
                    className={`tab-button ${(isMobile ? mobileView : webView) === 'edit' ? 'active' : ''}`}
                    onClick={() => isMobile ? setMobileView('edit') : setWebView('edit')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      background: (isMobile ? mobileView : webView) === 'edit' ? 'white' : 'transparent',
                      border: 'none',
                      borderBottom: (isMobile ? mobileView : webView) === 'edit' ? '2px solid #007bff' : '2px solid transparent',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      color: (isMobile ? mobileView : webView) === 'edit' ? '#007bff' : '#6c757d'
                    }}
                  >
                    ✏️ 편집
                  </button>
                  <button
                    className={`tab-button ${(isMobile ? mobileView : webView) === 'preview' ? 'active' : ''}`}
                    onClick={() => isMobile ? setMobileView('preview') : setWebView('preview')}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      background: (isMobile ? mobileView : webView) === 'preview' ? 'white' : 'transparent',
                      border: 'none',
                      borderBottom: (isMobile ? mobileView : webView) === 'preview' ? '2px solid #007bff' : '2px solid transparent',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      color: (isMobile ? mobileView : webView) === 'preview' ? '#007bff' : '#6c757d'
                    }}
                  >
                    👁️ 미리보기
                  </button>
                </div>
                {/* 편집기 */}
                <div 
                  className={`editor-pane ${(isMobile ? mobileView : webView) !== 'edit' ? 'hidden' : ''}`}
                  style={{ 
                    flex: 1, 
                    display: (isMobile ? mobileView : webView) === 'edit' ? 'flex' : 'none', 
                    flexDirection: 'column' 
                  }}
                >
                  {/* 편집 헤더 */}
                  <div style={{ padding: '12px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>편집 모드</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {lastSaved && (
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>
                          💾 자동저장: {lastSaved.toLocaleTimeString()}
                        </span>
                      )}
                      <button
                        onClick={handleSaveAndView}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                  
                  {/* 위키 문법 버튼 툴바 */}
                  <div style={{ 
                    padding: '8px 12px', 
                    background: '#fff', 
                    borderBottom: '1px solid #dee2e6', 
                    display: 'flex', 
                    gap: '6px', 
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '11px', color: '#6c757d', marginRight: '8px' }}>실행취소:</span>
                    <button
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      style={{
                        ...toolbarButtonStyle,
                        opacity: historyIndex <= 0 ? 0.5 : 1,
                        cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {if (historyIndex > 0) (e.target as any).style.background = '#e9ecef'}}
                      onMouseLeave={(e) => {(e.target as any).style.background = '#f8f9fa'}}
                      title="실행취소 (Ctrl+Z)"
                    >
                      ↶
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                      style={{
                        ...toolbarButtonStyle,
                        opacity: historyIndex >= history.length - 1 ? 0.5 : 1,
                        cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {if (historyIndex < history.length - 1) (e.target as any).style.background = '#e9ecef'}}
                      onMouseLeave={(e) => {(e.target as any).style.background = '#f8f9fa'}}
                      title="다시실행 (Ctrl+Y)"
                    >
                      ↷
                    </button>
                    <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 8px' }}></div>
                    <span style={{ fontSize: '11px', color: '#6c757d', marginRight: '8px' }}>문법:</span>
                    <button
                      onClick={() => insertText('**', '**', '굵은 텍스트')}
                      style={toolbarButtonStyle}
                      onMouseEnter={(e) => {(e.target as any).style.background = '#e9ecef'}}
                      onMouseLeave={(e) => {(e.target as any).style.background = '#f8f9fa'}}
                      title="굵게 (Ctrl+B)"
                    >
                      <b>B</b>
                    </button>
                    <button
                      onClick={() => insertText('*', '*', '기울인 텍스트')}
                      style={toolbarButtonStyle}
                      onMouseEnter={(e) => {(e.target as any).style.background = '#e9ecef'}}
                      onMouseLeave={(e) => {(e.target as any).style.background = '#f8f9fa'}}
                      title="기울임 (Ctrl+I)"
                    >
                      <i>I</i>
                    </button>
                    <button
                      onClick={() => insertText('~~', '~~', '취소선 텍스트')}
                      style={toolbarButtonStyle}
                      onMouseEnter={(e) => {(e.target as any).style.background = '#e9ecef'}}
                      onMouseLeave={(e) => {(e.target as any).style.background = '#f8f9fa'}}
                      title="취소선"
                    >
                      <s>S</s>
                    </button>
                    <button
                      onClick={() => insertText('== ', ' ==', '제목')}
                      style={toolbarButtonStyle}
                      onMouseEnter={(e) => {(e.target as any).style.background = '#e9ecef'}}
                      onMouseLeave={(e) => {(e.target as any).style.background = '#f8f9fa'}}
                      title="제목"
                    >
                      H
                    </button>
                    <button
                      onClick={insertListItem}
                      style={toolbarButtonStyle}
                      onMouseEnter={(e) => {(e.target as any).style.background = '#e9ecef'}}
                      onMouseLeave={(e) => {(e.target as any).style.background = '#f8f9fa'}}
                      title="목록 (토글)"
                    >
                      •
                    </button>
                    <button
                      onClick={insertFoldBlock}
                      style={toolbarButtonStyle}
                      onMouseEnter={(e) => {(e.target as any).style.background = '#e9ecef'}}
                      onMouseLeave={(e) => {(e.target as any).style.background = '#f8f9fa'}}
                      title="접기 블록 (토글)"
                    >
                      📁
                    </button>
                  </div>
                  <textarea
                    className="editor-textarea"
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handleImagePaste as any}
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
                    placeholder="위키 문서를 작성하세요... (이미지 붙여넣기: Ctrl+V)"
                  />
                </div>
                
                {/* 미리보기 */}
                <div 
                  className={`preview-pane ${(isMobile ? mobileView : webView) !== 'preview' ? 'hidden' : ''}`}
                  style={{ 
                    flex: 1, 
                    display: (isMobile ? mobileView : webView) === 'preview' ? 'flex' : 'none', 
                    flexDirection: 'column'
                  }}
                >
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
                      maxHeight: 'calc(100vh - 140px)', // 스크롤 가능한 최대 높이 설정
                      position: 'relative'
                    }}
                  >
                    <div style={{ padding: '20px', paddingBottom: '60px' }}>
                      <div dangerouslySetInnerHTML={{ __html: parseWikiText(content) }} />
                      
                      {/* 미리보기용 위로 이동 버튼 */}
                      <div style={{ 
                        textAlign: 'center', 
                        marginTop: '30px',
                        paddingTop: '15px',
                        borderTop: '1px solid #dee2e6'
                      }}>
                        <button
                          onClick={scrollToTop}
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '15px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ⬆️ 위로
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 읽기 모드: 완전한 문서 보기
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div 
                  className="document-content"
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    overflowY: 'scroll',
                    lineHeight: '1.8',
                    fontSize: '15px',
                    backgroundColor: 'white',
                    maxHeight: 'calc(100vh - 140px)', // 헤더와 제목바 높이를 제외한 최대 높이
                    position: 'relative'
                  }}
                >
                  <div style={{ padding: '30px', paddingBottom: '80px' }}>
                    <div dangerouslySetInnerHTML={{ __html: parseWikiText(currentDoc.content) }} />
                    
                    {/* 위로 이동 버튼 */}
                    <div style={{ 
                      textAlign: 'center', 
                      marginTop: '40px',
                      paddingTop: '20px',
                      borderTop: '1px solid #dee2e6'
                    }}>
                      <button
                        onClick={scrollToTop}
                        style={{
                          padding: '10px 20px',
                          fontSize: '14px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#5a6268';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#6c757d';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        ⬆️ 위로 이동
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            // 문서가 선택되지 않은 상태
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
              <div style={{ textAlign: 'center', color: '#6c757d' }}>
                <h2>My Wiki</h2>
                <p>왼쪽에서 문서를 선택하거나 새 문서를 만들어보세요.</p>
                <div 
                  style={{
                    marginTop: '30px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  dangerouslySetInnerHTML={{ __html: parseWikiText(content) }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
