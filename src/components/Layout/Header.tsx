import React, { useState, useEffect } from 'react';
import './Header.css';

// 전역 함수 타입 선언
declare global {
  interface Window {
    setIsCreating?: (value: boolean) => void;
  }
}

interface HeaderProps {
  toggleSidebar: () => void;
  currentDoc?: {id: string, title: string, content: string} | null;
  isEditMode?: boolean;
  onEditDocument?: () => void;
  onDocumentTitleChange?: (newTitle: string) => void;
}

// 전역 함수로 새 문서 버튼 이벤트 처리
const handleGlobalNewDocument = () => {
  console.log('새 문서 버튼 클릭 - 직접 처리');
  if (window.setIsCreating) {
    window.setIsCreating(true);
    console.log('전역 함수 호출 완료');
  } else {
    console.error('전역 setIsCreating 함수를 찾을 수 없습니다');
  }
};

const Header: React.FC<HeaderProps> = ({ 
  toggleSidebar, 
  currentDoc, 
  isEditMode, 
  onEditDocument,
  onDocumentTitleChange 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayOfWeek = days[date.getDay()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}.${month}.${day}(${dayOfWeek}) ${hours}:${minutes}:${seconds}`;
  };

  const handleTitleEdit = () => {
    if (currentDoc && onDocumentTitleChange) {
      setEditTitle(currentDoc.title);
      setIsEditingTitle(true);
    }
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && onDocumentTitleChange) {
      onDocumentTitleChange(editTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setEditTitle('');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button onClick={toggleSidebar} className="sidebar-toggle-btn">목록</button>
        <h1 className="logo">Personal Wiki</h1>
        <span className="datetime">{formatDateTime(currentTime)}</span>
      </div>
      <div className="header-center">
        <input 
          type="text" 
          className="search-input" 
          placeholder="문서 검색..."
        />
        
        {/* 현재 문서 정보 및 편집 버튼 */}
        {currentDoc && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginLeft: '20px',
            gap: '10px',
            padding: '4px 12px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {isEditingTitle ? (
              <>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') handleTitleCancel();
                  }}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '3px',
                    fontSize: '14px',
                    minWidth: '150px'
                  }}
                  autoFocus
                />
                <button
                  onClick={handleTitleSave}
                  style={{
                    padding: '4px 8px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  저장
                </button>
                <button
                  onClick={handleTitleCancel}
                  style={{
                    padding: '4px 8px',
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
              </>
            ) : (
              <>
                <span style={{ 
                  color: 'white', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  📄 {currentDoc.title}
                </span>
                {!isEditMode && (
                  <>
                    <button
                      onClick={handleTitleEdit}
                      style={{
                        padding: '4px 8px',
                        background: '#ffc107',
                        color: '#212529',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      제목수정
                    </button>
                    <button
                      onClick={onEditDocument}
                      style={{
                        padding: '4px 8px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      편집
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className="header-right">
        <button
          onClick={handleGlobalNewDocument}
          style={{
            marginRight: '15px',
            padding: '8px 16px',
            background: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + 새 문서
        </button>
        <span className="production-mode">완성 버전</span>
      </div>
    </header>
  );
};

export default Header;