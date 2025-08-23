document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const memoForm = document.getElementById('memo-form');
    const memoInput = document.getElementById('memo-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoryAccordion = document.getElementById('category-accordion');
    const datetimeElement = document.getElementById('current-datetime');

    // 모달 관련 DOM 요소
    const viewModal = document.getElementById('view-modal');
    const editModal = document.getElementById('edit-modal');
    const closeModalBtns = document.querySelectorAll('.close-btn');
    const editForm = document.getElementById('edit-form');

    // 앱 상태 변수
    let categories = [];
    let memos = [];
    let activeCategoryId = null;
    let expandedCategoryId = null;

    // 커스텀 모달 함수들
    const showInputModal = (title, placeholder = '', defaultValue = '') => {
        return new Promise((resolve) => {
            const modal = document.getElementById('input-modal');
            const titleEl = document.getElementById('input-modal-title');
            const input = document.getElementById('input-modal-input');
            const confirmBtn = document.getElementById('input-modal-confirm');
            const cancelBtn = document.getElementById('input-modal-cancel');
            const closeBtns = modal.querySelectorAll('.close-btn');

            titleEl.textContent = title;
            input.placeholder = placeholder;
            input.value = defaultValue;
            modal.style.display = 'flex';
            input.focus();

            const cleanup = () => {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtns.forEach(btn => btn.removeEventListener('click', handleCancel));
                input.removeEventListener('keypress', handleKeypress);
            };

            const handleConfirm = () => {
                const value = input.value.trim();
                cleanup();
                resolve(value || null);
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            const handleKeypress = (e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') handleCancel();
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtns.forEach(btn => btn.addEventListener('click', handleCancel));
            input.addEventListener('keypress', handleKeypress);
        });
    };

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

    // 더 예쁜 파스텔 색상 팔레트
    const PRETTY_COLORS = [
        '#FFE1E6', // 파스텔 핑크
        '#E1F0FF', // 파스텔 블루
        '#F0E1FF', // 파스텔 퍼플
        '#FFE8D1', // 파스텔 오렌지
        '#E1FFE1', // 파스텔 그린
        '#FFE1F0', // 파스텔 로즈
        '#D1F5FF', // 파스텔 사이안
        '#F5E1FF', // 파스텔 바이올렛
        '#FFE1D1', // 파스텔 레드
        '#F0FFD1', // 파스텔 라임
        '#FFF0D1', // 파스텔 앰버
        '#D1FFF0', // 파스텔 틸
        '#FFD1F5', // 파스텔 퓨샤
        '#FFFFD1', // 파스텔 옐로우
        '#D1FFEE'  // 파스텔 에메랄드
    ];

    // --- 데이터 관리 ---
    const loadData = async () => {
        try {
            const result = await chrome.storage.local.get(['categories', 'memos']);
            let loadedCategories = result.categories || [];
            const loadedMemos = result.memos || [];
            
            // 데이터 마이그레이션: 기존 카테고리에 색상 및 order 속성 추가
            loadedCategories.forEach((cat, index) => {
                if (!cat.color) {
                    cat.color = PRETTY_COLORS[index % PRETTY_COLORS.length];
                }
                if (cat.order === undefined) {
                    cat.order = cat.createdAt || index; // 기존 카테고리는 생성시간을 order로 사용
                }
            });

            // 기본 IN-BOX 카테고리 처리
            let inBox = loadedCategories.find(c => c.id === 'in-box');
            if (!inBox) {
                // IN-BOX가 없으면 새로 생성
                inBox = { id: 'in-box', name: 'IN-BOX', createdAt: Date.now(), color: '#FFE1E6', order: 0 };
                categories = [inBox, ...loadedCategories];
            } else {
                // IN-BOX가 있으면 색상과 order 업데이트
                inBox.color = '#FFE1E6'; // 파스텔 핑크
                if (inBox.order === undefined) {
                    inBox.order = 0; // IN-BOX는 항상 첫 번째
                }
                categories = loadedCategories;
            }
            
            // 메모 데이터 마이그레이션: order 및 pinnedAt 속성 추가
            loadedMemos.forEach(memo => {
                if (memo.order === undefined) {
                    memo.order = memo.createdAt; // 기존 메모는 생성 시간을 order로 사용
                }
                // 고정된 메모인데 pinnedAt이 없는 경우 createdAt을 사용
                if (memo.pinned && !memo.pinnedAt) {
                    memo.pinnedAt = memo.createdAt;
                }
            });
            
            memos = loadedMemos;
            await saveData(); // 마이그레이션 및 업데이트된 데이터 저장
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            // 기본값으로 초기화
            categories = [{ id: 'in-box', name: 'IN-BOX', createdAt: Date.now(), color: '#FFE1E6', order: 0 }];
            memos = [];
        }
    };

    const saveData = async () => {
        try {
            await chrome.storage.local.set({
                categories: categories,
                memos: memos
            });
        } catch (error) {
            console.error('데이터 저장 실패:', error);
        }
    };

    // --- 렌더링 ---
    const render = () => {
        categoryAccordion.innerHTML = ''; // 아코디언 비우기

        const sortedCategories = [...categories].sort((a, b) => {
            if (a.id === expandedCategoryId) return -1;
            if (b.id === expandedCategoryId) return 1;
            if (a.id === 'in-box') return -1; // IN-BOX는 항상 위로
            if (b.id === 'in-box') return 1;
            return (a.order || 0) - (b.order || 0); // order로 정렬
        });

        sortedCategories.forEach(category => {
            const categoryMemos = memos.filter(memo => memo.categoryId === category.id)
                .sort((a, b) => {
                    // 고정된 메모를 먼저 정렬
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    
                    // 둘 다 고정된 메모인 경우, pinnedAt 시간 순으로 정렬 (먼저 고정된 것이 위로)
                    if (a.pinned && b.pinned) {
                        return (a.pinnedAt || 0) - (b.pinnedAt || 0);
                    }
                    
                    // 일반 메모들은 order로 정렬
                    return (a.order || 0) - (b.order || 0);
                });
            const isExpanded = category.id === expandedCategoryId;
            const isSelected = category.id === activeCategoryId;

            const categoryItem = document.createElement('div');
            categoryItem.className = `category-item ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`;
            categoryItem.dataset.id = category.id;
            categoryItem.style.setProperty('--category-bg-color', category.color);

            categoryItem.innerHTML = `
                <div class="category-header">
                    <h3>${category.name} (${categoryMemos.length})</h3>
                    <div class="category-controls-buttons">
                        ${category.id !== 'in-box' ? `
                            <button class="move-category-up-btn" data-category-id="${category.id}" title="위로 이동">🔺</button>
                            <button class="move-category-down-btn" data-category-id="${category.id}" title="아래로 이동">🔻</button>
                        ` : ''}
                        <button class="edit-category-btn">수정</button>
                        ${category.id !== 'in-box' ? '<button class="delete-category-btn">삭제</button>' : ''}
                    </div>
                </div>
                <div class="memo-list-inner sortable-list" data-category-id="${category.id}">
                    ${categoryMemos.map(memo => `
                        <div class="memo-item ${memo.pinned ? 'pinned' : ''}" data-memo-id="${memo.id}">
                            <span class="memo-title">${memo.title}</span>
                            <div class="memo-actions">
                                <button class="pin-btn ${memo.pinned ? 'pinned' : ''}" data-memo-id="${memo.id}" title="${memo.pinned ? '고정 해제' : '상단 고정'}">
                                    ${memo.pinned ? '📌' : '📍'}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            categoryAccordion.appendChild(categoryItem);
        });

        addEventListenersToItems();
        initializeSortable();
    };

    // --- 드래그 앤 드롭 ---
    const initializeSortable = () => {
        document.querySelectorAll('.sortable-list').forEach(list => {
            new Sortable(list, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                // 고정된 메모는 드래그할 수 없도록 설정
                filter: '.pinned',
                preventOnFilter: true,
                onStart: function(evt) {
                    const memoId = evt.item.dataset.memoId;
                    const memo = memos.find(m => m.id === memoId);
                    // 고정된 메모인 경우 드래그 중단
                    if (memo && memo.pinned) {
                        return false;
                    }
                },
                onEnd: async function(evt) {
                    const categoryId = evt.from.dataset.categoryId;
                    const memoElements = Array.from(evt.from.children);
                    
                    // 고정되지 않은 메모들만 order 재계산
                    const categoryMemos = memos.filter(memo => memo.categoryId === categoryId && !memo.pinned);
                    let orderIndex = 1;
                    
                    memoElements.forEach((element) => {
                        const memoId = element.dataset.memoId;
                        const memo = memos.find(m => m.id === memoId);
                        if (memo && !memo.pinned) {
                            memo.order = orderIndex++;
                        }
                    });
                    
                    await saveData();
                }
            });
        });
    };

    // --- 이벤트 리스너 ---
    const addEventListenersToItems = () => {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', handleCategoryHeaderClick);
        });
        document.querySelectorAll('.memo-item').forEach(item => {
            item.addEventListener('click', handleMemoItemClick);
        });
        document.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.addEventListener('click', handleEditCategory);
        });
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteCategory);
        });
        document.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', handlePinMemo);
        });
        document.querySelectorAll('.move-category-up-btn').forEach(btn => {
            btn.addEventListener('click', handleMoveCategoryUp);
        });
        document.querySelectorAll('.move-category-down-btn').forEach(btn => {
            btn.addEventListener('click', handleMoveCategoryDown);
        });
    };

    // --- 이벤트 핸들러 ---
    const handleQuickMemoSubmit = async (e) => {
        e.preventDefault();
        const fullText = memoInput.value.trim();
        if (!fullText) return;

        const lines = fullText.split('\n');
        const title = lines[0];
        // 해당 카테고리의 메모 개수를 구해서 order 설정
        const categoryMemos = memos.filter(memo => memo.categoryId === (activeCategoryId || 'in-box'));
        const maxOrder = categoryMemos.length > 0 ? Math.max(...categoryMemos.map(m => m.order || 0)) : 0;
        
        const newMemo = {
            id: Date.now().toString(),
            title: title,
            content: fullText,
            categoryId: activeCategoryId || 'in-box',
            createdAt: Date.now(),
            order: maxOrder + 1
        };

        memos.push(newMemo);
        await saveData();
        render();
        memoForm.reset();
    };

    const handleAddCategory = async () => {
        const name = await showInputModal('새 카테고리', '카테고리 이름을 입력하세요');
        if (name) {
            // 현재 카테고리들 중 가장 큰 order 값을 찾아서 +1
            const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order || 0)) : 0;
            const newCategory = {
                id: Date.now().toString(),
                name: name,
                createdAt: Date.now(),
                color: PRETTY_COLORS[categories.length % PRETTY_COLORS.length],
                order: maxOrder + 1
            };
            categories.push(newCategory);
            await saveData();
            render();
        }
    };

    const handleCategoryHeaderClick = (e) => {
        if (e.target.closest('button')) return;
        const categoryItem = e.target.closest('.category-item');
        const categoryId = categoryItem.dataset.id;

        if (expandedCategoryId === categoryId) {
            expandedCategoryId = null;
        } else {
            expandedCategoryId = categoryId;
        }

        if (activeCategoryId === categoryId) {
            activeCategoryId = null;
        } else {
            activeCategoryId = categoryId;
        }

        render();
    };

    const handleMemoItemClick = (e) => {
        const memoId = e.currentTarget.dataset.memoId;
        const memo = memos.find(m => m.id === memoId);
        if (memo) openViewModal(memo);
    };

    const handleEditCategory = async (e) => {
        e.stopPropagation();
        const categoryId = e.target.closest('.category-item').dataset.id;
        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        const newName = await showInputModal('카테고리 수정', '새 이름을 입력하세요', category.name);
        if (newName) {
            category.name = newName;
            await saveData();
            render();
        }
    };

    const handleDeleteCategory = async (e) => {
        e.stopPropagation();
        const categoryId = e.target.closest('.category-item').dataset.id;
        if (categoryId === 'in-box') return;

        const category = categories.find(c => c.id === categoryId);
        const confirmed = await showConfirmModal('카테고리 삭제', `정말 '${category.name}' 카테고리를 삭제하시겠습니까?\n\n경고: 이 카테고리에 포함된 모든 메모가 영구적으로 삭제됩니다.`);
        
        if (confirmed) {
            // 카테고리에 속한 메모들을 삭제
            memos = memos.filter(memo => memo.categoryId !== categoryId);
            // 카테고리 삭제
            categories = categories.filter(c => c.id !== categoryId);
            
            if (activeCategoryId === categoryId) activeCategoryId = null;
            if (expandedCategoryId === categoryId) expandedCategoryId = null;

            await saveData();
            render();
        }
    };

    const handlePinMemo = async (e) => {
        e.stopPropagation();
        const memoId = e.target.dataset.memoId;
        const memo = memos.find(m => m.id === memoId);
        if (!memo) return;

        // 고정 상태 토글
        memo.pinned = !memo.pinned;
        
        if (memo.pinned) {
            // 고정될 때 현재 시간을 pinnedAt에 저장
            memo.pinnedAt = Date.now();
        } else {
            // 고정 해제될 때 pinnedAt 제거
            delete memo.pinnedAt;
            
            // 고정 해제된 메모는 일반 메모들 중 가장 큰 order 값보다 크게 설정
            const categoryMemos = memos.filter(m => m.categoryId === memo.categoryId);
            const unpinnedMemos = categoryMemos.filter(m => !m.pinned);
            const maxUnpinnedOrder = unpinnedMemos.length > 0 ? Math.max(...unpinnedMemos.map(m => m.order || 0)) : 0;
            memo.order = maxUnpinnedOrder + 1;
        }

        await saveData();
        render();
    };

    const handleMoveCategoryUp = async (e) => {
        e.stopPropagation();
        const categoryId = e.target.dataset.categoryId;
        const category = categories.find(c => c.id === categoryId);
        if (!category || category.id === 'in-box') return;

        // IN-BOX를 제외한 카테고리들을 order로 정렬
        const otherCategories = categories.filter(c => c.id !== 'in-box').sort((a, b) => (a.order || 0) - (b.order || 0));
        const currentIndex = otherCategories.findIndex(c => c.id === categoryId);
        
        if (currentIndex > 0) {
            // 현재 카테고리와 바로 위 카테고리의 order를 교환
            const prevCategory = otherCategories[currentIndex - 1];
            const tempOrder = category.order;
            category.order = prevCategory.order;
            prevCategory.order = tempOrder;
            
            await saveData();
            render();
        }
    };

    const handleMoveCategoryDown = async (e) => {
        e.stopPropagation();
        const categoryId = e.target.dataset.categoryId;
        const category = categories.find(c => c.id === categoryId);
        if (!category || category.id === 'in-box') return;

        // IN-BOX를 제외한 카테고리들을 order로 정렬
        const otherCategories = categories.filter(c => c.id !== 'in-box').sort((a, b) => (a.order || 0) - (b.order || 0));
        const currentIndex = otherCategories.findIndex(c => c.id === categoryId);
        
        if (currentIndex < otherCategories.length - 1) {
            // 현재 카테고리와 바로 아래 카테고리의 order를 교환
            const nextCategory = otherCategories[currentIndex + 1];
            const tempOrder = category.order;
            category.order = nextCategory.order;
            nextCategory.order = tempOrder;
            
            await saveData();
            render();
        }
    };

    // --- 모달 관리 ---
    const openViewModal = (memo) => {
        const viewModalContent = viewModal.querySelector('.modal-content');
        const modalBody = viewModal.querySelector('.modal-body');
        const viewContent = document.getElementById('view-content');
        const modalFooter = document.getElementById('view-modal-footer');

        // 상태 초기화
        viewModalContent.style.top = '8%';
        viewModalContent.style.transform = 'translateX(-50%)';
        modalBody.style.position = 'relative'; // 책갈피 마커를 위한 기준점

        const renderBookmarkUI = () => {
            // 기존 UI 초기화
            modalFooter.innerHTML = '';
            const existingMarker = modalBody.querySelector('.bookmark-marker');
            if (existingMarker) existingMarker.remove();

            document.getElementById('view-title').textContent = memo.title;
            
            // URL을 하이퍼링크로 변환하는 함수
            const convertUrlsToLinks = (text) => {
                const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
                return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
            };

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
                // 마크다운 파싱 실패 시 일반 텍스트로 표시하되 URL은 링크로 변환
                const textWithLinks = convertUrlsToLinks(memo.content);
                viewContent.innerHTML = textWithLinks.replace(/\n/g, '<br>');
            }

            // 책갈피 마커 렌더링
            if (memo.bookmarkPosition > 0) {
                const marker = document.createElement('div');
                marker.className = 'bookmark-marker';
                marker.innerHTML = '🔖';
                marker.style.top = `${memo.bookmarkPosition}px`; 
                modalBody.appendChild(marker);
            }

            // 버튼 렌더링
            const setBookmarkBtn = document.createElement('button');
            setBookmarkBtn.id = 'set-bookmark-btn';
            setBookmarkBtn.className = 'modal-btn';
            setBookmarkBtn.textContent = '책갈피';
            setBookmarkBtn.onclick = async () => {
                if (memo.bookmarkPosition > 0) {
                    // 이미 책갈피가 설정되어 있으면 초기화
                    memo.bookmarkPosition = 0;
                } else {
                    // 책갈피 설정
                    memo.bookmarkPosition = modalBody.scrollTop;
                }
                await saveData();
                renderBookmarkUI(); // UI 즉시 업데이트
            };

            const gotoBookmarkBtn = document.createElement('button');
            gotoBookmarkBtn.id = 'goto-bookmark-btn';
            gotoBookmarkBtn.className = 'modal-btn';
            gotoBookmarkBtn.textContent = '이동';
            gotoBookmarkBtn.style.display = memo.bookmarkPosition > 0 ? 'inline-block' : 'none';
            gotoBookmarkBtn.onclick = () => {
                modalBody.scrollTo({ top: memo.bookmarkPosition, behavior: 'smooth' });
            };
            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = '복사';
            copyBtn.className = 'modal-btn';
            copyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(memo.content);
                    await showAlertModal('복사 완료', '메모가 클립보드에 복사되었습니다.');
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
            
            // 고정된 메모는 삭제 버튼을 비활성화
            if (memo.pinned) {
                deleteBtn.disabled = true;
                deleteBtn.title = '고정된 메모는 삭제할 수 없습니다. 먼저 고정을 해제하세요.';
                deleteBtn.style.opacity = '0.5';
                deleteBtn.style.cursor = 'not-allowed';
            } else {
                deleteBtn.onclick = async () => {
                    const confirmed = await showConfirmModal('메모 삭제', '정말 이 메모를 삭제하시겠습니까?');
                    if (confirmed) {
                        memos = memos.filter(m => m.id !== memo.id);
                        await saveData();
                        render();
                        closeModal();
                    }
                };
            }

            modalFooter.append(setBookmarkBtn, gotoBookmarkBtn, copyBtn, editBtn, deleteBtn);
        }

        renderBookmarkUI();
        viewModal.style.display = 'flex';
        // 모달이 열린 직후 스크롤 위치를 0으로 초기화
        setTimeout(() => { modalBody.scrollTop = 0; }, 0);
    };

    const openEditModal = (memo) => {
        document.getElementById('edit-id').value = memo.id;
        document.getElementById('edit-input').value = memo.content;
        
        const categorySelect = document.getElementById('edit-category');
        categorySelect.innerHTML = categories.map(c => 
            `<option value="${c.id}" ${c.id === memo.categoryId ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        const editModalContent = editModal.querySelector('.modal-content');
        editModalContent.style.top = '5%';
        editModalContent.style.left = '50%';
        editModalContent.style.transform = 'translateX(-50%)';

        setTimeout(() => {
            document.getElementById('edit-input').focus();
            document.getElementById('edit-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        editModal.style.display = 'flex';
    };

    const handleEditFormSubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const content = document.getElementById('edit-input').value.trim();
        const categoryId = document.getElementById('edit-category').value;

        if (!content) return;

        const memo = memos.find(m => m.id === id);
        if (memo) {
            memo.content = content;
            memo.title = content.split('\n')[0];
            memo.categoryId = categoryId;
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

        memoForm.addEventListener('submit', handleQuickMemoSubmit);
        addCategoryBtn.addEventListener('click', handleAddCategory);
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
});