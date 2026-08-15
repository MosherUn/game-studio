import './style.css';
import { auth } from './modules/auth';
import { github } from './api/github';
import { showToast } from './utils/helpers';

const loginId = document.getElementById('loginId') as HTMLInputElement;
const loginPwd = document.getElementById('loginPwd') as HTMLInputElement;
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginMessage = document.getElementById('loginMessage');

function showMessage(msg: string, type: 'success' | 'error' = 'success') {
  if (loginMessage) {
    loginMessage.textContent = msg;
    loginMessage.className = 'login-message ' + type;
    loginMessage.style.display = 'block';
    setTimeout(() => {
      loginMessage.style.display = 'none';
    }, 3000);
  }
}

loginBtn?.addEventListener('click', async () => {
  const id = loginId.value.trim();
  const pwd = loginPwd.value.trim();
  if (!id || !pwd) {
    showMessage('请输入ID和密码', 'error');
    return;
  }
  const result = await auth.login(id, pwd);
  showMessage(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    setTimeout(() => {
      window.location.href = 'studio.html';
    }, 500);
  }
});

registerBtn?.addEventListener('click', async () => {
  const id = loginId.value.trim();
  const pwd = loginPwd.value.trim();
  if (!id || !pwd) {
    showMessage('请输入ID和密码', 'error');
    return;
  }
  const result = await auth.register(id, pwd);
  showMessage(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    setTimeout(() => {
      window.location.href = 'studio.html';
    }, 500);
  }
});

auth.init().then((user) => {
  if (user) {
    window.location.href = 'studio.html';
  }
});

if (github.isConfigured()) {
  github.testConnection().then(ok => {
    if (!ok) {
      showMessage('⚠️ GitHub连接失败，请检查配置', 'error');
    }
  });
}