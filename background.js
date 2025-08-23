// 확장 프로그램 설치 시 실행됩니다.
chrome.runtime.onInstalled.addListener(() => {
  // 사이드 패널 활성화
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

// 툴바의 확장 프로그램 아이콘을 클릭했을 때 사이드 패널을 엽니다.
chrome.action.onClicked.addListener(async (tab) => {
  // 사이드 패널 열기
  await chrome.sidePanel.open({ tabId: tab.id });
});