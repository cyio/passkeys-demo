// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log('扩展已安装，准备使用 Passkeys');
  });
  
  // 可以在这里处理来自 popup 或 content script 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PASSKEY_REGISTER') {
      // 处理注册请求
      handlePasskeyRegistration(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
    
    if (message.type === 'PASSKEY_AUTH') {
      // 处理认证请求
      handlePasskeyAuthentication(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });
  
  async function handlePasskeyRegistration(data) {
    // 实现与后端服务器的通信逻辑
    // 处理注册流程
  }
  
  async function handlePasskeyAuthentication(data) {
    // 实现与后端服务器的通信逻辑
    // 处理认证流程
  }