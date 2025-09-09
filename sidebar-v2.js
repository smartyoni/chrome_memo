document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const memoForm = document.getElementById('memo-form');
    const memoInput = document.getElementById('memo-input');
    const memoList = document.getElementById('memo-list');
    const datetimeElement = document.getElementById('current-datetime');
    const clearBtn = document.getElementById('clear-btn');

    // 모달 관련 DOM 요소
    const viewModal = document.getElementById('view-modal');
    const editModal = document.getElementById('edit-modal');
    const closeModalBtns = document.querySelectorAll('.close-btn');
    const editForm = document.getElementById('edit-form');

    // 앱 상태 변수
    let memos = [];

    // 커스텀 모달 함수들
    const showAlertModal = (title, message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('alert-modal');
            const titleEl = document.getElementById('alert-modal-title');
            const messageEl = document.getElementById('alert-modal-message');
            const okBtn = document.getElementById('alert-modal-ok');
            const closeBtns = modal.querySelectorAll('.close-btn');

            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.style.display = 'flex';

            const cleanup = () => {
                modal.style.display = 'none';
                okBtn.removeEventListener('click', handleOk);
                closeBtns.forEach(btn => btn.removeEventListener('click', handleOk));
            };

            const handleOk = () => {
                cleanup();
                resolve();
            };

            okBtn.addEventListener('click', handleOk);
            closeBtns.forEach(btn => btn.addEventListener('click', handleOk));
        });
    };

    const showConfirmModal = (title, message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-modal-title');
            const messageEl = document.getElementById('confirm-modal-message');
            const confirmBtn = document.getElementById('confirm-modal-confirm');
            const cancelBtn = document.getElementById('confirm-modal-cancel');
            const closeBtns = modal.querySelectorAll('.close-btn');

            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.style.display = 'flex';

            const cleanup = () => {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtns.forEach(btn => btn.removeEventListener('click', handleCancel));
            };

            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtns.forEach(btn => btn.addEventListener('click', handleCancel));
        });
    };

    // --- 데이터 관리 ---
    const loadData = async () => {
        try {
            // 기존 데이터 모두 삭제
            await chrome.storage.local.clear();
            memos = [];
        } catch (error) {
            console.error('데이터 초기화 실패:', error);
            memos = [];
        }
    };

    const saveData = async () => {
        try {
            await chrome.storage.local.set({ memos: memos });
        } catch (error) {
            console.error('데이터 저장 실패:', error);
        }
    };

    // --- 렌더링 ---
    const render = () => {
        memoList.innerHTML = '';

        // 최신 메모가 위로 오도록 정렬
        const sortedMemos = [...memos].sort((a, b) => b.createdAt - a.createdAt);

        sortedMemos.forEach(memo => {
            const memoItem = document.createElement('div');
            memoItem.className = 'memo-item';
            memoItem.dataset.memoId = memo.id;

            memoItem.innerHTML = `
                <span class="memo-title">${memo.title}</span>
                <div class="memo-actions">
                    <button class="edit-btn" data-memo-id="${memo.id}">수정</button>
                    <button class="delete-btn" data-memo-id="${memo.id}">삭제</button>
                </div>
            `;

            memoList.appendChild(memoItem);
        });

        addEventListenersToItems();
    };

    // --- 이벤트 리스너 ---
    const addEventListenersToItems = () => {
        document.querySelectorAll('.memo-item').forEach(item => {
            item.addEventListener('click', handleMemoItemClick);
        });
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', handleEditMemo);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteMemo);
        });
    };

    // --- 이벤트 핸들러 ---
    const handleMemoSubmit = async (e) => {
        e.preventDefault();
        const fullText = memoInput.value.trim();
        if (!fullText) return;

        const lines = fullText.split('\n');
        const title = lines[0];
        
        const newMemo = {
            id: Date.now().toString(),
            title: title,
            content: fullText,
            createdAt: Date.now()
        };

        memos.push(newMemo);
        await saveData();
        render();
        memoForm.reset();
    };

    // 초기화 버튼 핸들러
    const handleClearBtn = async () => {
        if (memoInput.value.trim()) {
            const confirmed = await showConfirmModal('입력 내용 삭제', '현재 입력된 내용을 모두 삭제하시겠습니까?');
            if (confirmed) {
                memoInput.value = '';
                memoInput.focus();
                
                // 시각적 피드백
                clearBtn.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    clearBtn.style.transform = '';
                }, 150);
            }
        }
    };

    const handleMemoItemClick = (e) => {
        if (e.target.closest('button')) return;
        const memoId = e.currentTarget.dataset.memoId;
        const memo = memos.find(m => m.id === memoId);
        if (memo) openViewModal(memo);
    };

    const handleEditMemo = (e) => {
        e.stopPropagation();
        const memoId = e.target.dataset.memoId;
        const memo = memos.find(m => m.id === memoId);
        if (memo) openEditModal(memo);
    };

    const handleDeleteMemo = async (e) => {
        e.stopPropagation();
        const memoId = e.target.dataset.memoId;
        const confirmed = await showConfirmModal('메모 삭제', '정말 이 메모를 삭제하시겠습니까?');
        
        if (confirmed) {
            memos = memos.filter(m => m.id !== memoId);
            await saveData();
            render();
        }
    };

    // --- 모달 관리 ---
    const openViewModal = (memo) => {
        const viewContent = document.getElementById('view-content');
        const modalFooter = document.getElementById('view-modal-footer');

        document.getElementById('view-title').textContent = memo.title;
        
        // 마크다운 렌더링
        try {
            let contentToRender = memo.content;
            
            // 마크다운 링크가 아닌 일반 URL들을 먼저 마크다운 링크로 변환
            contentToRender = contentToRender.replace(
                /(^|[^[\]()])(https?:\/\/[^\s<>"{}|\\^`\[\]]+)(?![^\[]*\])/gim,
                '$1[$2]($2)'
            );
            
            const renderedContent = marked.parse(contentToRender);
            viewContent.innerHTML = renderedContent;
        } catch (error) {
            // 마크다운 파싱 실패 시 일반 텍스트로 표시
            viewContent.innerHTML = memo.content.replace(/\n/g, '<br>');
        }

        // 버튼 렌더링
        modalFooter.innerHTML = '';
        
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '복사';
        copyBtn.className = 'modal-btn';
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(memo.content);
            } catch (err) {
                await showAlertModal('복사 실패', '클립보드 복사에 실패했습니다.');
            }
        };

        const editBtn = document.createElement('button');
        editBtn.textContent = '수정';
        editBtn.className = 'modal-btn';
        editBtn.onclick = () => {
            viewModal.style.display = 'none';
            openEditModal(memo);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.className = 'modal-btn';
        deleteBtn.onclick = async () => {
            const confirmed = await showConfirmModal('메모 삭제', '정말 이 메모를 삭제하시겠습니까?');
            if (confirmed) {
                memos = memos.filter(m => m.id !== memo.id);
                await saveData();
                render();
                closeModal();
            }
        };

        modalFooter.append(copyBtn, editBtn, deleteBtn);
        viewModal.style.display = 'flex';
    };

    const openEditModal = (memo) => {
        document.getElementById('edit-id').value = memo.id;
        document.getElementById('edit-input').value = memo.content;

        setTimeout(() => {
            document.getElementById('edit-input').focus();
        }, 100);

        editModal.style.display = 'flex';
    };

    const handleEditFormSubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const content = document.getElementById('edit-input').value.trim();

        if (!content) return;

        const memo = memos.find(m => m.id === id);
        if (memo) {
            memo.content = content;
            memo.title = content.split('\n')[0];
        }

        await saveData();
        render();
        editModal.style.display = 'none';
    };

    const closeModal = () => {
        viewModal.style.display = 'none';
        editModal.style.display = 'none';
    };

    // --- 시간 업데이트 ---
    const updateTime = () => {
        if (!datetimeElement) return;
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: 'numeric', minute: 'numeric' };
        datetimeElement.textContent = now.toLocaleString('ko-KR', options);
    };

    // --- 초기화 ---
    const initialize = async () => {
        await loadData();
        render();

        memoForm.addEventListener('submit', handleMemoSubmit);
        clearBtn.addEventListener('click', handleClearBtn);
        editForm.addEventListener('submit', handleEditFormSubmit);
        closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
        window.addEventListener('click', (e) => {
            if (e.target == viewModal || e.target == editModal) {
                closeModal();
            }
        });

        updateTime();
        setInterval(updateTime, 1000);
    };

    initialize();

    // === 클립보드 버튼 시스템 ===
    const clipboardContent = document.getElementById('clipboard-content');
    const contextMenu = document.getElementById('clipboard-context-menu');
    const colorPalette = document.getElementById('color-palette');
    let currentBtn = null;
    let draggedBtn = null;
    let lastCopiedText = ''; // 마지막 복사된 텍스트 저장

    // 클립보드 버튼 초기화
    const initClipboardButtons = () => {
        // 각 버튼에 색상 설정
        document.querySelectorAll('.clipboard-btn').forEach(btn => {
            const color = btn.dataset.color;
            if (color) {
                btn.style.setProperty('--btn-color', color);
                btn.style.background = color; // 직접 배경색도 설정
            }
            setupButtonEvents(btn);
        });
    };

    // 버튼 이벤트 설정
    const setupButtonEvents = (btn) => {
        // 클릭 이벤트 (복사)
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const content = btn.dataset.content || btn.dataset.text; // content 우선, 없으면 text 사용
            lastCopiedText = content;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(content).then(() => {
                    showCopyFeedback(btn);
                });
            }
        });

        // 우클릭 컨텍스트 메뉴
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            currentBtn = btn;
            showContextMenu(e.clientX, e.clientY);
        });

        // 드래그 앤 드롭
        btn.draggable = true;
        btn.addEventListener('dragstart', handleDragStart);
        btn.addEventListener('dragover', handleDragOver);
        btn.addEventListener('drop', handleDrop);
        btn.addEventListener('dragend', handleDragEnd);
    };

    // 복사 완료 피드백
    const showCopyFeedback = (btn) => {
        const originalBg = btn.style.getPropertyValue('--btn-color');
        btn.style.setProperty('--btn-color', '#4CAF50');
        btn.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            btn.style.setProperty('--btn-color', originalBg);
            btn.style.transform = '';
        }, 200);
    };

    // 컨텍스트 메뉴 표시
    const showContextMenu = (x, y) => {
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';
    };

    // 컨텍스트 메뉴 숨기기
    const hideContextMenu = () => {
        contextMenu.style.display = 'none';
        currentBtn = null;
    };

    // 색상 팔레트 표시
    const showColorPalette = (x, y) => {
        colorPalette.style.left = x + 'px';
        colorPalette.style.top = y + 'px';
        colorPalette.classList.add('show');
    };

    // 색상 팔레트 숨기기
    const hideColorPalette = () => {
        colorPalette.classList.remove('show');
    };

    // 드래그 앤 드롭 이벤트
    const handleDragStart = (e) => {
        draggedBtn = e.target;
        e.target.classList.add('dragging');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (e.target.classList.contains('clipboard-btn') && e.target !== draggedBtn) {
            e.target.classList.add('drag-over');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.target.classList.contains('clipboard-btn') && e.target !== draggedBtn) {
            // 버튼 순서 바꾸기
            const draggedIndex = Array.from(clipboardContent.children).indexOf(draggedBtn);
            const targetIndex = Array.from(clipboardContent.children).indexOf(e.target);
            
            if (draggedIndex < targetIndex) {
                clipboardContent.insertBefore(draggedBtn, e.target.nextSibling);
            } else {
                clipboardContent.insertBefore(draggedBtn, e.target);
            }
        }
        
        // 드래그 상태 클래스 제거
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        draggedBtn = null;
    };

    // 컨텍스트 메뉴 클릭 이벤트
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('context-item')) {
            const action = e.target.dataset.action;
            
            switch(action) {
                case 'edit':
                    editButtonText();
                    break;
                case 'color':
                    const rect = e.target.getBoundingClientRect();
                    showColorPalette(rect.right + 10, rect.top);
                    break;
                case 'delete':
                    deleteButton();
                    break;
                case 'cancel':
                    break;
            }
            hideContextMenu();
        }
        
        if (e.target.classList.contains('color-item')) {
            const color = e.target.dataset.color;
            if (currentBtn) {
                currentBtn.dataset.color = color;
                currentBtn.style.setProperty('--btn-color', color);
                currentBtn.style.background = color; // 직접 배경색도 설정
            }
            hideColorPalette();
        }
        
        // 클릭이 메뉴 외부일 때 메뉴 숨기기
        if (!contextMenu.contains(e.target) && !colorPalette.contains(e.target)) {
            hideContextMenu();
            hideColorPalette();
        }
    });

    // 버튼 텍스트 편집 (새 모달 방식으로 교체됨)

    // 버튼 삭제
    const deleteButton = async () => {
        if (!currentBtn) return;
        
        const confirmed = await showConfirmModal('삭제 확인', '이 버튼을 삭제하시겠습니까?');
        if (confirmed) {
            currentBtn.remove();
        }
    };

    // === 더블클릭 붙여넣기 시스템 ===
    
    // 입력 가능한 요소인지 확인
    const isInputElement = (element) => {
        const tagName = element.tagName.toLowerCase();
        const inputTypes = ['text', 'textarea', 'email', 'password', 'search', 'url'];
        
        if (tagName === 'textarea') return true;
        if (tagName === 'input' && inputTypes.includes(element.type)) return true;
        if (element.contentEditable === 'true') return true;
        
        return false;
    };

    // 커서 위치에 텍스트 삽입
    const insertTextAtCursor = (element, text) => {
        if (element.tagName.toLowerCase() === 'textarea' || 
            (element.tagName.toLowerCase() === 'input' && element.type === 'text')) {
            
            const startPos = element.selectionStart;
            const endPos = element.selectionEnd;
            const beforeText = element.value.substring(0, startPos);
            const afterText = element.value.substring(endPos);
            
            element.value = beforeText + text + afterText;
            element.selectionStart = element.selectionEnd = startPos + text.length;
            element.focus();
        } else if (element.contentEditable === 'true') {
            // contentEditable 요소의 경우
            element.focus();
            document.execCommand('insertText', false, text);
        }
    };

    // 붙여넣기 피드백 효과
    const showPasteFeedback = (element) => {
        element.classList.add('paste-feedback');
        setTimeout(() => {
            element.classList.remove('paste-feedback');
        }, 600);
    };

    // 입력 가능한 요소에 호버 효과 추가
    const addInputHoverEffects = () => {
        document.addEventListener('mouseover', (e) => {
            if (isInputElement(e.target) && lastCopiedText) {
                e.target.classList.add('input-element');
                if (lastCopiedText) {
                    e.target.classList.add('paste-ready');
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('input-element')) {
                e.target.classList.remove('input-element', 'paste-ready');
            }
        });
    };

    // 더블클릭 붙여넣기 이벤트
    document.addEventListener('dblclick', (e) => {
        if (isInputElement(e.target) && lastCopiedText) {
            e.preventDefault();
            insertTextAtCursor(e.target, lastCopiedText);
            showPasteFeedback(e.target);
            
            // 선택적: 붙여넣기 성공 알림 (조용한 방식)
            const rect = e.target.getBoundingClientRect();
            showQuietNotification('붙여넣기 완료', rect.left, rect.top - 30);
        }
    });

    // 조용한 알림 (작은 툴팁 형태)
    const showQuietNotification = (message, x, y) => {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 애니메이션
        setTimeout(() => notification.style.opacity = '1', 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 200);
        }, 1500);
    };

    // === 클립보드 버튼 생성/편집 시스템 ===
    const addClipboardBtn = document.getElementById('add-clipboard-btn');
    const createModal = document.getElementById('clipboard-create-modal');
    const clipboardEditModal = document.getElementById('clipboard-edit-modal');
    const createForm = document.getElementById('clipboard-create-form');
    const clipboardEditForm = document.getElementById('clipboard-edit-form');

    // DOM 요소 확인
    console.log('DOM elements check:', {
        addClipboardBtn: !!addClipboardBtn,
        createModal: !!createModal,
        clipboardEditModal: !!clipboardEditModal,
        createForm: !!createForm,
        clipboardEditForm: !!clipboardEditForm
    });

    // 새 클립보드 버튼 생성
    const createClipboardButton = (title, content, color = '#4ecdc4') => {
        const btn = document.createElement('div');
        btn.className = 'clipboard-btn';
        btn.dataset.title = title;
        btn.dataset.content = content;
        btn.dataset.color = color;
        btn.textContent = title;
        btn.style.setProperty('--btn-color', color);
        btn.style.background = color; // 직접 배경색도 설정
        
        setupButtonEvents(btn);
        return btn;
    };

    // 클립보드 버튼 추가 이벤트
    if (addClipboardBtn) {
        addClipboardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add button clicked'); // 디버깅용
            createModal.style.display = 'flex';
            setTimeout(() => {
                document.getElementById('clipboard-title').focus();
            }, 100);
        });
    } else {
        console.error('Add clipboard button not found');
    }

    // 생성 폼 제출
    if (createForm) {
        createForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('clipboard-title').value.trim();
            const content = document.getElementById('clipboard-content-input').value.trim();
            
            if (title && content) {
                const newBtn = createClipboardButton(title, content);
                clipboardContent.appendChild(newBtn);
                
                createForm.reset();
                createModal.style.display = 'none';
            }
        });
    }

    // 편집 폼 제출
    if (clipboardEditForm) {
        clipboardEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('edit-clipboard-title').value.trim();
            const content = document.getElementById('edit-clipboard-content').value.trim();
            
            if (title && content && currentBtn) {
                currentBtn.dataset.title = title;
                currentBtn.dataset.content = content;
                currentBtn.textContent = title;
                
                clipboardEditForm.reset();
                clipboardEditModal.style.display = 'none';
            }
        });
    }

    // 수정된 편집 버튼 텍스트 함수
    const editButtonText = () => {
        if (!currentBtn) return;
        
        document.getElementById('edit-clipboard-title').value = currentBtn.dataset.title || currentBtn.textContent;
        document.getElementById('edit-clipboard-content').value = currentBtn.dataset.content || currentBtn.dataset.text || '';
        
        clipboardEditModal.style.display = 'flex';
        document.getElementById('edit-clipboard-title').focus();
    };

    // 모든 모달 닫기 이벤트
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn')) {
            createModal.style.display = 'none';
            clipboardEditModal.style.display = 'none';
            if (createForm) createForm.reset();
            if (clipboardEditForm) clipboardEditForm.reset();
        }
        
        if (e.target === createModal || e.target === clipboardEditModal) {
            createModal.style.display = 'none';
            clipboardEditModal.style.display = 'none';
            if (createForm) createForm.reset();
            if (clipboardEditForm) clipboardEditForm.reset();
        }
    });

    // 클립보드 버튼 시스템 초기화
    initClipboardButtons();
    addInputHoverEffects();
});