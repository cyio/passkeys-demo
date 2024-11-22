// passkey-store.js
class PasskeyStore {
  constructor() {
    this.DB_NAME = 'PasskeysDB';
    this.STORE_NAME = 'passkeys';
    this.db = null;
  }

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => {
        reject(new Error('无法打开数据库'));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // 创建存储对象
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id'
          });
        }
      };
    });
  }

  // 保存 Passkey 凭证
  async saveCredential(credential) {
    // 提取需要的信息
    const credentialData = {
      id: credential.id,
      type: credential.type,
      rawId: Array.from(new Uint8Array(credential.rawId)),
      response: {
        attestationObject: Array.from(new Uint8Array(credential.response.attestationObject)),
        clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
      },
      authenticatorAttachment: credential.authenticatorAttachment,
      timestamp: new Date().getTime()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const request = store.put(credentialData);

      request.onsuccess = () => {
        resolve(credentialData);
      };

      request.onerror = () => {
        reject(new Error('保存凭证失败'));
      };
    });
  }

  // 获取所有保存的 Passkey 凭证
  async getAllCredentials() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('获取凭证失败'));
      };
    });
  }

  // 根据 ID 获取特定的 Passkey 凭证
  async getCredentialById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('获取凭证失败'));
      };
    });
  }

  // 删除凭证
  async deleteCredential(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error('删除凭证失败'));
      };
    });
  }
}

// popup.js 中的使用示例
const passkeyStore = new PasskeyStore();

// 在页面加载时初始化存储
document.addEventListener('DOMContentLoaded', async function () {
  try {
    await passkeyStore.init();
    console.log('Passkey 存储已初始化');
  } catch (err) {
    console.error('初始化 Passkey 存储失败:', err);
  }

  const registerBtn = document.getElementById('registerBtn');
  const authenticateBtn = document.getElementById('authenticateBtn');
  const statusDiv = document.getElementById('status');

  registerBtn.addEventListener('click', async () => {
    try {
      // 注册新的 Passkey
      const credential = await registerPasskey();

      // 保存凭证到本地存储
      await passkeyStore.saveCredential(credential);

      statusDiv.textContent = '注册成功并已保存!';

      // 显示所有保存的凭证
      const allCredentials = await passkeyStore.getAllCredentials();
      console.log('所有保存的凭证:', allCredentials);

    } catch (err) {
      statusDiv.textContent = '注册失败: ' + err.message;
      console.error('注册错误:', err);
    }
  });

  authenticateBtn.addEventListener('click', async () => {
    try {
      // 获取所有保存的凭证
      const savedCredentials = await passkeyStore.getAllCredentials();

      // 如果没有保存的凭证，提示用户
      if (savedCredentials.length === 0) {
        statusDiv.textContent = '没有找到已保存的凭证，请先注册';
        return;
      }

      // 使用保存的凭证进行认证
      const assertion = await authenticateWithPasskey();

      // 验证返回的断言是否匹配已保存的凭证
      const matchedCredential = savedCredentials.find(cred => cred.id === assertion.id);

      if (matchedCredential) {
        statusDiv.textContent = '认证成功!';
        console.log('认证成功的凭证:', matchedCredential);
      } else {
        statusDiv.textContent = '认证失败: 未找到匹配的凭证';
      }

    } catch (err) {
      statusDiv.textContent = '认证失败: ' + err.message;
      console.error('认证错误:', err);
    }
  });
});

// 辅助函数：将 ArrayBuffer 转换为 Base64 字符串
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 辅助函数：将 Base64 字符串转换为 ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// 注册新的 Passkey
async function registerPasskey() {
  // 生成随机挑战
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const createCredentialOptions = {
    publicKey: {
      challenge: challenge,
      rp: {
        name: "示例扩展",
        id: window.location.hostname
      },
      user: {
        id: new Uint8Array([1]), // 实际应用中应该使用唯一的用户ID
        name: "demo@example.com",
        displayName: "Demo User"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      timeout: 60000,
      attestation: "direct",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        requireResidentKey: true,
        userVerification: "required"
      }
    }
  };

  return await navigator.credentials.create(createCredentialOptions);
}

// 使用已有的 Passkey 进行认证
async function authenticateWithPasskey() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const getCredentialOptions = {
    publicKey: {
      challenge: challenge,
      rpId: window.location.hostname,
      timeout: 60000,
      userVerification: "required"
    }
  };

  return await navigator.credentials.get(getCredentialOptions);
}