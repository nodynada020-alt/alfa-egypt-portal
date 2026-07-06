(function () {
    const allowedUsername = "frontOffice";
    const defaultPassword = "Alfa1414$$";
    const passwordKey = "alfa-admin-password";

    window.ALFA_AUTH = {
        resetEmail: "Omar.Hamalwy@gmail.com",
        allowedUsername,
        getPassword() {
            return localStorage.getItem(passwordKey) || defaultPassword;
        },
        setPassword(password) {
            localStorage.setItem(passwordKey, password);
        },
        validate(username, password) {
            return String(username || "").trim().toLowerCase() === allowedUsername.toLowerCase()
                && String(password || "").trim() === this.getPassword();
        }
    };
})();
