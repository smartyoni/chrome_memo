document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const memoForm = document.getElementById('memo-form');
    const memoInput = document.getElementById('memo-input');
    const memoList = document.getElementById('memo-list');
    const datetimeElement = document.getElementById('current-datetime');
    const clearBtn = document.getElementById('clear-btn');
    const backupBtn = document.getElementById('backup-btn');
    const restoreBtn = document.getElementById('restore-btn');
    const restoreFileInput = document.getElementById('restore-file-input');

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

    // --- 백업/복원 관리 ---
    const backupData = async () => {
        try {
            // 모든 데이터 수집
            const result = await chrome.storage.local.get(['memos', 'clipboardButtons']);
            const backupData = {
                memos: result.memos || [],
                clipboardButtons: result.clipboardButtons || [],
                exportDate: new Date().toISOString(),
                appVersion: '1.0'
            };

            // 파일 다운로드
            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `메모장_백업_${dateStr}.json`;
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            
            URL.revokeObjectURL(url);
            
            await showAlertModal('백업 완료', `데이터가 "${filename}" 파일로 백업되었습니다.`);
        } catch (error) {
            console.error('백업 실패:', error);
            await showAlertModal('백업 실패', '데이터 백업 중 오류가 발생했습니다.');
        }
    };

    const restoreData = async (file) => {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            // 데이터 유효성 검사
            if (!backupData.memos || !Array.isArray(backupData.memos)) {
                throw new Error('유효하지 않은 백업 파일입니다.');
            }
            
            const confirmed = await showConfirmModal(
                '데이터 복원', 
                `백업 파일의 데이터로 복원하시겠습니까?\n\n` +
                `메모: ${backupData.memos.length}개\n` +
                `클립보드 버튼: ${(backupData.clipboardButtons || []).length}개\n` +
                `백업 날짜: ${new Date(backupData.exportDate).toLocaleString('ko-KR')}\n\n` +
                `⚠️ 현재 데이터는 모두 대체됩니다.`
            );
            
            if (confirmed) {
                // 데이터 복원
                await chrome.storage.local.clear();
                await chrome.storage.local.set({
                    memos: backupData.memos,
                    clipboardButtons: backupData.clipboardButtons || []
                });
                
                // 현재 앱 상태 업데이트
                memos = backupData.memos;
                clipboardButtons = backupData.clipboardButtons || [];
                
                // 화면 업데이트
                render();
                renderClipboardButtons();
                
                await showAlertModal('복원 완료', '백업 데이터가 성공적으로 복원되었습니다.');
            }
        } catch (error) {
            console.error('복원 실패:', error);
            await showAlertModal('복원 실패', '백업 파일을 읽는 중 오류가 발생했습니다.\n파일이 손상되었거나 올바른 형식이 아닙니다.');
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
        
        // 백업/복원 이벤트 리스너
        backupBtn.addEventListener('click', backupData);
        restoreBtn.addEventListener('click', () => restoreFileInput.click());
        restoreFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                restoreData(file);
                // 파일 입력 리셋
                e.target.value = '';
            }
        });
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
    const clipboardTooltip = document.getElementById('clipboard-tooltip');
    let currentBtn = null;
    let draggedBtn = null;
    let lastCopiedText = ''; // 마지막 복사된 텍스트 저장
    let clipboardButtons = []; // 클립보드 버튼 데이터 배열
    let tooltipTimeout = null;

    // 클립보드 데이터 저장
    const saveClipboardData = async () => {
        try {
            await chrome.storage.local.set({ clipboardButtons: clipboardButtons });
        } catch (error) {
            console.error('클립보드 데이터 저장 실패:', error);
        }
    };

    // 클립보드 데이터 로드
    const loadClipboardData = async () => {
        try {
            const result = await chrome.storage.local.get(['clipboardButtons']);
            if (result.clipboardButtons && Array.isArray(result.clipboardButtons)) {
                clipboardButtons = result.clipboardButtons;
            } else {
                // 기본 클립보드 버튼 데이터
                clipboardButtons = [
                    { id: '1', title: '안녕하세요', content: '안녕하세요. 반갑습니다!', color: '#ff6b6b' },
                    { id: '2', title: '감사합니다', content: '감사합니다. 좋은 하루 되세요!', color: '#4ecdc4' },
                    { id: '3', title: '확인했습니다', content: '네, 확인했습니다. 검토 후 회신드리겠습니다.', color: '#45b7d1' },
                    { id: '4', title: '완료', content: '작업이 완료되었습니다.', color: '#96ceb4' },
                    { id: '5', title: '진행중', content: '현재 작업을 진행 중입니다.', color: '#ffeaa7' },
                    { id: '6', title: '검토', content: '검토가 필요한 사항입니다.', color: '#dda0dd' }
                ];
                await saveClipboardData();
            }
        } catch (error) {
            console.error('클립보드 데이터 로드 실패:', error);
            clipboardButtons = [];
        }
    };

    // 클립보드 버튼 렌더링 (저장된 데이터 기반)
    const renderClipboardButtons = () => {
        clipboardContent.innerHTML = '';
        clipboardButtons.forEach(btnData => {
            const btn = document.createElement('div');
            btn.className = 'clipboard-btn';
            btn.dataset.title = btnData.title;
            btn.dataset.content = btnData.content;
            btn.dataset.color = btnData.color;
            btn.dataset.id = btnData.id;
            btn.textContent = btnData.title;
            btn.style.setProperty('--btn-color', btnData.color);
            btn.style.background = btnData.color;
            
            setupButtonEvents(btn);
            clipboardContent.appendChild(btn);
        });
    };

    // 클립보드 버튼 초기화 (기존 HTML 버튼들을 데이터로 변환)
    const initClipboardButtons = () => {
        // 기존 HTML에서 버튼 데이터 추출 (초기 로드 시에만)
        if (clipboardButtons.length === 0) {
            document.querySelectorAll('.clipboard-btn').forEach((btn, index) => {
                const btnData = {
                    id: (index + 1).toString(),
                    title: btn.dataset.title || btn.textContent,
                    content: btn.dataset.content || btn.dataset.text || btn.textContent,
                    color: btn.dataset.color || '#ff6b6b'
                };
                clipboardButtons.push(btnData);
            });
        }
        
        // 저장된 데이터로 버튼 렌더링
        renderClipboardButtons();
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
            hideTooltip(); // 컨텍스트 메뉴 열 때 툴팁 숨김
            currentBtn = btn;
            showContextMenu(e.clientX, e.clientY);
        });

        // 호버 이벤트 (툴팁)
        btn.addEventListener('mouseenter', (e) => {
            const content = btn.dataset.content || btn.dataset.text;
            if (content && content.trim()) {
                tooltipTimeout = setTimeout(() => {
                    showTooltip(btn, content);
                }, 500); // 0.5초 지연 후 표시
            }
        });

        btn.addEventListener('mouseleave', () => {
            hideTooltip();
        });

        // 드래그 앤 드롭
        btn.draggable = true;
        btn.addEventListener('dragstart', (e) => {
            hideTooltip(); // 드래그 시작할 때 툴팁 숨김
            handleDragStart(e);
        });
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

    // 컨텍스트 메뉴 표시 (화면 경계 고려)
    const showContextMenu = (x, y) => {
        // 먼저 메뉴를 표시해서 크기를 측정할 수 있도록 함
        contextMenu.style.display = 'block';
        contextMenu.style.left = '0px';
        contextMenu.style.top = '0px';
        
        // 메뉴와 화면 크기 측정
        const menuRect = contextMenu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let adjustedX = x;
        let adjustedY = y;
        
        // 우측 경계 확인 및 조정
        if (x + menuRect.width > windowWidth) {
            adjustedX = x - menuRect.width;
        }
        
        // 하단 경계 확인 및 조정
        if (y + menuRect.height > windowHeight) {
            adjustedY = y - menuRect.height;
        }
        
        // 좌측 경계 확인 (우측 조정 후에도 화면을 벗어나는 경우)
        if (adjustedX < 0) {
            adjustedX = 10; // 최소 여백
        }
        
        // 상단 경계 확인 (하단 조정 후에도 화면을 벗어나는 경우)
        if (adjustedY < 0) {
            adjustedY = 10; // 최소 여백
        }
        
        contextMenu.style.left = adjustedX + 'px';
        contextMenu.style.top = adjustedY + 'px';
    };

    // 컨텍스트 메뉴 숨기기
    const hideContextMenu = () => {
        contextMenu.style.display = 'none';
        // currentBtn은 여기서 null로 설정하지 않음 (동작 완료 후에만 null 설정)
    };

    // 색상 팔레트 표시 (화면 경계 고려)
    const showColorPalette = (x, y) => {
        // 먼저 팔레트를 표시해서 크기를 측정할 수 있도록 함
        colorPalette.classList.add('show');
        colorPalette.style.left = '0px';
        colorPalette.style.top = '0px';
        
        // 팔레트와 화면 크기 측정
        const paletteRect = colorPalette.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let adjustedX = x;
        let adjustedY = y;
        
        // 우측 경계 확인 및 조정
        if (x + paletteRect.width > windowWidth) {
            adjustedX = x - paletteRect.width;
        }
        
        // 하단 경계 확인 및 조정
        if (y + paletteRect.height > windowHeight) {
            adjustedY = y - paletteRect.height;
        }
        
        // 좌측 경계 확인
        if (adjustedX < 0) {
            adjustedX = 10;
        }
        
        // 상단 경계 확인
        if (adjustedY < 0) {
            adjustedY = 10;
        }
        
        colorPalette.style.left = adjustedX + 'px';
        colorPalette.style.top = adjustedY + 'px';
    };

    // 색상 팔레트 숨기기
    const hideColorPalette = () => {
        colorPalette.classList.remove('show');
    };

    // 툴팁 표시 (화면 경계 고려)
    const showTooltip = (btn, content) => {
        if (!content) return;
        
        clipboardTooltip.querySelector('.tooltip-content').textContent = content;
        clipboardTooltip.classList.add('show');
        
        // 버튼 위치 측정
        const btnRect = btn.getBoundingClientRect();
        const tooltipRect = clipboardTooltip.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let x, y, position = 'top';
        
        // 기본적으로 버튼 위쪽에 표시
        x = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);
        y = btnRect.top - tooltipRect.height - 8;
        
        // 상단 공간이 부족하면 아래쪽에 표시
        if (y < 10) {
            y = btnRect.bottom + 8;
            position = 'bottom';
        }
        
        // 좌측 경계 확인
        if (x < 10) {
            x = btnRect.right + 8;
            y = btnRect.top + (btnRect.height / 2) - (tooltipRect.height / 2);
            position = 'right';
        }
        
        // 우측 경계 확인
        if (x + tooltipRect.width > windowWidth - 10) {
            x = btnRect.left - tooltipRect.width - 8;
            y = btnRect.top + (btnRect.height / 2) - (tooltipRect.height / 2);
            position = 'left';
        }
        
        // 하단 경계 확인 (측면 배치 후)
        if (position === 'left' || position === 'right') {
            if (y < 10) {
                y = 10;
            } else if (y + tooltipRect.height > windowHeight - 10) {
                y = windowHeight - tooltipRect.height - 10;
            }
        }
        
        // 클래스 초기화 후 위치별 클래스 추가
        clipboardTooltip.className = 'clipboard-tooltip show ' + position;
        clipboardTooltip.style.left = x + 'px';
        clipboardTooltip.style.top = y + 'px';
    };

    // 툴팁 숨기기
    const hideTooltip = () => {
        clipboardTooltip.classList.remove('show');
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }
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

    const handleDrop = async (e) => {
        e.preventDefault();
        if (e.target.classList.contains('clipboard-btn') && e.target !== draggedBtn) {
            // 데이터 배열에서 순서 변경
            const draggedId = draggedBtn.dataset.id;
            const targetId = e.target.dataset.id;
            
            const draggedIndex = clipboardButtons.findIndex(btn => btn.id === draggedId);
            const targetIndex = clipboardButtons.findIndex(btn => btn.id === targetId);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                // 배열에서 요소 이동
                const [draggedItem] = clipboardButtons.splice(draggedIndex, 1);
                clipboardButtons.splice(targetIndex, 0, draggedItem);
                
                await saveClipboardData();
                renderClipboardButtons();
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
                    if (currentBtn) {
                        const btnRect = currentBtn.getBoundingClientRect();
                        showColorPalette(btnRect.right + 10, btnRect.top);
                    }
                    return; // 색상 선택 중에는 currentBtn 유지
                case 'delete':
                    deleteButton();
                    break;
                case 'cancel':
                    currentBtn = null; // 취소 시에만 즉시 null 설정
                    break;
            }
            hideContextMenu();
        }
        
        if (e.target.classList.contains('color-item')) {
            const color = e.target.dataset.color;
            if (currentBtn) {
                const btnId = currentBtn.dataset.id;
                const btnData = clipboardButtons.find(btn => btn.id === btnId);
                
                if (btnData) {
                    btnData.color = color;
                    saveClipboardData();
                    renderClipboardButtons();
                }
            }
            hideColorPalette();
            currentBtn = null; // 색상 변경 완료 후 null 설정
        }
        
        // 클릭이 메뉴 외부일 때 메뉴 숨기기
        if (!contextMenu.contains(e.target) && !colorPalette.contains(e.target)) {
            hideContextMenu();
            hideColorPalette();
            hideTooltip(); // 외부 클릭 시 툴팁도 숨김
            currentBtn = null; // 메뉴 외부 클릭 시 null 설정
        }
    });

    // 버튼 텍스트 편집 (새 모달 방식으로 교체됨)

    // 버튼 삭제
    const deleteButton = async () => {
        if (!currentBtn) return;
        
        const confirmed = await showConfirmModal('삭제 확인', '이 버튼을 삭제하시겠습니까?');
        if (confirmed && currentBtn) {
            const btnId = currentBtn.dataset.id;
            clipboardButtons = clipboardButtons.filter(btn => btn.id !== btnId);
            await saveClipboardData();
            renderClipboardButtons();
            currentBtn = null; // 삭제 후 null로 설정
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

    // 새 클립보드 버튼 데이터 생성 및 저장
    const createClipboardButtonData = async (title, content, color = '#4ecdc4') => {
        const newBtnData = {
            id: Date.now().toString(),
            title: title,
            content: content,
            color: color
        };
        
        clipboardButtons.push(newBtnData);
        await saveClipboardData();
        renderClipboardButtons();
        return newBtnData;
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
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('clipboard-title').value.trim();
            const content = document.getElementById('clipboard-content-input').value.trim();
            
            if (title && content) {
                await createClipboardButtonData(title, content);
                
                createForm.reset();
                createModal.style.display = 'none';
            }
        });
    }

    // 편집 폼 제출
    if (clipboardEditForm) {
        clipboardEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('edit-clipboard-title').value.trim();
            const content = document.getElementById('edit-clipboard-content').value.trim();
            const btnId = document.getElementById('edit-clipboard-id').value; // 숨은 필드에서 ID 가져오기
            
            console.log('편집 폼 제출:', { title, content, btnId });
            
            if (title && content && btnId) {
                const btnData = clipboardButtons.find(btn => btn.id === btnId);
                
                console.log('편집 대상:', { btnId, btnData });
                
                if (btnData) {
                    btnData.title = title;
                    btnData.content = content;
                    await saveClipboardData();
                    renderClipboardButtons();
                    console.log('편집 완료 및 저장됨');
                } else {
                    console.error('버튼 데이터를 찾을 수 없습니다:', btnId);
                }
                
                clipboardEditForm.reset();
                clipboardEditModal.style.display = 'none';
                currentBtn = null; // 편집 완료 후 null 설정
            } else {
                console.error('편집 폼 검증 실패:', { title, content, btnId });
            }
        });
    }

    // 수정된 편집 버튼 텍스트 함수
    const editButtonText = () => {
        if (!currentBtn) return;
        
        const btnId = currentBtn.dataset.id;
        const btnData = clipboardButtons.find(btn => btn.id === btnId);
        
        console.log('편집 모달 열기:', { btnId, btnData, currentBtn: currentBtn });
        
        if (btnData) {
            document.getElementById('edit-clipboard-id').value = btnData.id; // ID를 숨은 필드에 저장
            document.getElementById('edit-clipboard-title').value = btnData.title;
            document.getElementById('edit-clipboard-content').value = btnData.content;
        } else {
            // 폴백: HTML 데이터 사용
            document.getElementById('edit-clipboard-id').value = btnId || '';
            document.getElementById('edit-clipboard-title').value = currentBtn.dataset.title || currentBtn.textContent;
            document.getElementById('edit-clipboard-content').value = currentBtn.dataset.content || currentBtn.dataset.text || '';
        }
        
        clipboardEditModal.style.display = 'flex';
        setTimeout(() => {
            document.getElementById('edit-clipboard-title').focus();
        }, 100);
    };

    // 모든 모달 닫기 이벤트
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn')) {
            createModal.style.display = 'none';
            clipboardEditModal.style.display = 'none';
            if (createForm) createForm.reset();
            if (clipboardEditForm) clipboardEditForm.reset();
            currentBtn = null; // 모달 닫기 시 null 설정
        }
        
        if (e.target === createModal || e.target === clipboardEditModal) {
            createModal.style.display = 'none';
            clipboardEditModal.style.display = 'none';
            if (createForm) createForm.reset();
            if (clipboardEditForm) clipboardEditForm.reset();
            currentBtn = null; // 모달 닫기 시 null 설정
        }
    });

    // 클립보드 시스템 초기화
    const initClipboardSystem = async () => {
        await loadClipboardData();
        renderClipboardButtons();
        addInputHoverEffects();
    };
    
    initClipboardSystem();
});