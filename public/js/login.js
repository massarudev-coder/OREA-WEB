const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const submitButton = document.querySelector("#submitButton");

function showLoginError(message) {
  loginMessage.textContent = message;
  loginMessage.classList.remove("success");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  loginMessage.textContent = "";

  try {
    const configResponse = await fetch("/api/config");
    const config = await configResponse.json();
    if (!configResponse.ok || !config.firebaseWebApiKey) {
      throw new Error("O login do Firebase ainda não está configurado. Configure FIREBASE_WEB_API_KEY e reinicie o servidor.");
    }

    const credentialsResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.firebaseWebApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OREA-Request": "1",
        },
        body: JSON.stringify({
          email: loginForm.elements.email.value.trim(),
          password: loginForm.elements.password.value,
          returnSecureToken: true,
        }),
      },
    );
    const credentials = await credentialsResponse.json();
    if (!credentialsResponse.ok) {
      const code = credentials.error?.message;
      if (code === "EMAIL_NOT_FOUND" || code === "INVALID_PASSWORD" || code === "INVALID_LOGIN_CREDENTIALS") {
        throw new Error("E-mail ou senha inválidos.");
      }
      if (code === "USER_DISABLED") throw new Error("Esta conta está desativada.");
      if (code === "OPERATION_NOT_ALLOWED") throw new Error("Ative o método E-mail/senha no Firebase Authentication.");
      throw new Error("Não foi possível autenticar. Verifique a configuração do Firebase e tente novamente.");
    }

    const sessionResponse = await fetch("/api/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: credentials.idToken }),
    });
    const session = await sessionResponse.json();
    if (!sessionResponse.ok) {
      throw new Error(session.erro || "Esta conta não tem permissão de administrador.");
    }

    window.location.assign("/admin.html");
  } catch (error) {
    showLoginError(error instanceof Error ? error.message : "Não foi possível entrar.");
  } finally {
    submitButton.disabled = false;
  }
});
