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

    // 색상 팔레트
    const PRETTY_COLORS = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#E0BBE4', '#957DAD', '#FFC72C', '#2ECC71'
    ];

    // --- 데이터 관리 ---
    const loadData = async () => {
        try {
            const result = await chrome.storage.local.get(['categories', 'memos']);
            let loadedCategories = result.categories || [];
            const loadedMemos = result.memos || [];
            
            // 데이터 마이그레이션: 기존 카테고리에 색상 속성 추가
            loadedCategories.forEach((cat, index) => {
                if (!cat.color) {
                    cat.color = PRETTY_COLORS[index % PRETTY_COLORS.length];
                }
            });

            // 기본 IN-BOX 카테고리 처리
            let inBox = loadedCategories.find(c => c.id === 'in-box');
            if (!inBox) {
                // IN-BOX가 없으면 새로 생성
                inBox = { id: 'in-box', name: 'IN-BOX', createdAt: Date.now(), color: '#FF69B4' };
                categories = [inBox, ...loadedCategories];
            } else {
                // IN-BOX가 있으면 색상만 업데이트
                inBox.color = '#FF69B4'; // 강제로 핑크색으로 설정
                categories = loadedCategories;
            }
            
            memos = loadedMemos;
            await saveData(); // 마이그레이션 및 업데이트된 데이터 저장
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            // 기본값으로 초기화
            categories = [{ id: 'in-box', name: 'IN-BOX', createdAt: Date.now(), color: '#FF69B4' }];
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
            return b.createdAt - a.createdAt; // 최신순 정렬
        });

        sortedCategories.forEach(category => {
            const categoryMemos = memos.filter(memo => memo.categoryId === category.id);
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
                        <button class="edit-category-btn">수정</button>
                        ${category.id !== 'in-box' ? '<button class="delete-category-btn">삭제</button>' : ''}
                    </div>
                </div>
                <div class="memo-list-inner">
                    ${categoryMemos.map(memo => `
                        <div class="memo-item" data-memo-id="${memo.id}">
                            <span class="memo-title">${memo.title}</span>
                        </div>
                    `).join('')}
                </div>
            `;

            categoryAccordion.appendChild(categoryItem);
        });

        addEventListenersToItems();
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
    };

    // --- 이벤트 핸들러 ---
    const handleQuickMemoSubmit = async (e) => {
        e.preventDefault();
        const fullText = memoInput.value.trim();
        if (!fullText) return;

        const lines = fullText.split('\n');
        const title = lines[0];
        const newMemo = {
            id: Date.now().toString(),
            title: title,
            content: fullText,
            categoryId: activeCategoryId || 'in-box',
            createdAt: Date.now()
        };

        memos.push(newMemo);
        await saveData();
        render();
        memoForm.reset();
    };

    const handleAddCategory = async () => {
        const name = prompt('새 카테고리 이름을 입력하세요:');
        if (name && name.trim()) {
            const newCategory = {
                id: Date.now().toString(),
                name: name.trim(),
                createdAt: Date.now(),
                color: PRETTY_COLORS[categories.length % PRETTY_COLORS.length]
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

        const newName = prompt('카테고리 새 이름을 입력하세요:', category.name);
        if (newName && newName.trim()) {
            category.name = newName.trim();
            await saveData();
            render();
        }
    };

    const handleDeleteCategory = async (e) => {
        e.stopPropagation();
        const categoryId = e.target.closest('.category-item').dataset.id;
        if (categoryId === 'in-box') return;

        const category = categories.find(c => c.id === categoryId);
        if (confirm(`정말 '${category.name}' 카테고리를 삭제하시겠습니까?\n\n경고: 이 카테고리에 포함된 모든 메모가 영구적으로 삭제됩니다.`)) {
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
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(memo.content).then(() => alert('복사되었습니다.'));
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
                if (confirm('정말 이 메모를 삭제하시겠습니까?')) {
                    memos = memos.filter(m => m.id !== memo.id);
                    await saveData();
                    render();
                    closeModal();
                }
            };

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