document.addEventListener('DOMContentLoaded', () => {
  if (new URLSearchParams(location.search).has('error')) document.getElementById('error-message').hidden = false;
  const password = document.getElementById('password');
  const toggle = document.getElementById('show-password');
  toggle.addEventListener('click', () => {
    const shown = password.type === 'password';
    password.type = shown ? 'text' : 'password';
    toggle.textContent = shown ? 'Ocultar' : 'Mostrar';
    toggle.setAttribute('aria-pressed',String(shown));
  });
  document.getElementById('login-form').addEventListener('submit',event => {
    const button = event.target.querySelector('[type=submit]');
    button.disabled = true;
    button.textContent = 'Entrando…';
  });
});
