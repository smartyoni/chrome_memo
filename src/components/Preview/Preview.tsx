import React from 'react';
import './Preview.css';

interface PreviewProps {
  content: string;
}

const Preview: React.FC<PreviewProps> = ({ content }) => {
  const parseWikiText = (text: string): string => {
    let html = text;
    
    // 제목 (== 제목 ==)
    html = html.replace(/==\s*(.+?)\s*==/g, '<h2>$1</h2>');
    
    // 굵은 글씨 (**text**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // 기울임 (''text'')
    html = html.replace(/''(.+?)''/g, '<em>$1</em>');
    
    // 취소선 (~~text~~)
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // 내부 링크 ([[문서명]])
    html = html.replace(/\[\[(.+?)\]\]/g, '<a href="#" class="wiki-link">$1</a>');
    
    // 목록 (* 항목)
    html = html.replace(/^\*\s(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // 줄바꿈
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  return (
    <div className="preview">
      <div className="preview-header">
        <h3>미리보기</h3>
      </div>
      <div 
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: parseWikiText(content) }}
      />
    </div>
  );
};

export default Preview;