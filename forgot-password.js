(function () {
    const form = document.getElementById("forgotPasswordForm");
    const emailStep = document.getElementById("emailStep");
    const resetStep = document.getElementById("resetStep");
    const resetNotice = document.getElementById("resetNotice");
    const submitButton = document.getElementById("resetSubmit");
    const emailInput = form.elements.email;
    const codeInput = form.elements.code;
    const passwordInput = form.elements.password;
    const passwordConfirmInput = form.elements.password_confirmation;
    let sentCode = "";
    let sentAt = 0;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (resetStep.style.display === "none") {
            await sendCode();
            return;
        }
        resetPassword();
    });

    async function sendCode() {
        const email = String(emailInput.value || "").trim();
        if (email.toLowerCase() !== window.ALFA_AUTH.resetEmail.toLowerCase()) {
            showNotice("This email is not registered for this account.", "danger");
            return;
        }

        sentCode = String(Math.floor(100000 + Math.random() * 900000));
        sentAt = Date.now();
        setLoading(true, "Sending...");

        try {
            const response = await fetch("/api/send-reset-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: sentCode })
            });

            if (!response.ok) {
                throw new Error("Email API failed");
            }

            emailStep.style.display = "none";
            resetStep.style.display = "block";
            showNotice(`Reset code sent to ${window.ALFA_AUTH.resetEmail}.`, "success");
            submitButton.querySelector(".indicator-label").textContent = "Change Password";
            codeInput.focus();
        } catch (error) {
            showNotice("Email could not be sent. On Vercel, add Gmail env vars then try again.", "danger");
        } finally {
            setLoading(false);
        }
    }

    function resetPassword() {
        const expired = Date.now() - sentAt > 10 * 60 * 1000;
        const password = String(passwordInput.value || "");
        const confirmPassword = String(passwordConfirmInput.value || "");

        if (expired) {
            showNotice("Code expired. Please request a new code.", "danger");
            return;
        }
        if (String(codeInput.value || "").trim() !== sentCode) {
            showNotice("Invalid reset code.", "danger");
            return;
        }
        if (password.length < 8) {
            showNotice("Password must be at least 8 characters.", "danger");
            return;
        }
        if (password !== confirmPassword) {
            showNotice("Passwords do not match.", "danger");
            return;
        }

        window.ALFA_AUTH.setPassword(password);
        showNotice("Password changed successfully. Redirecting to login...", "success");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1200);
    }

    function setLoading(isLoading, text) {
        submitButton.disabled = isLoading;
        if (text) {
            submitButton.querySelector(".indicator-label").textContent = text;
        } else {
            submitButton.querySelector(".indicator-label").textContent = resetStep.style.display === "none" ? "Send Code" : "Change Password";
        }
    }

    function showNotice(message, type) {
        resetNotice.textContent = message;
        resetNotice.style.display = "block";
        resetNotice.style.color = type === "danger" ? "#d9214e" : "#24a148";
    }
})();
