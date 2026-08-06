document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("authContainer");

    const signUpButton = document.getElementById("signUp");
    const signInButton = document.getElementById("signIn");

    const mobileSignUpButton = document.getElementById("mobileSignUp");
    const mobileSignInButton = document.getElementById("mobileSignIn");

    if (!container) {
        return;
    }

    if (signUpButton) {
        signUpButton.addEventListener("click", function () {
            container.classList.add("right-panel-active");
        });
    }

    if (signInButton) {
        signInButton.addEventListener("click", function () {
            container.classList.remove("right-panel-active");
        });
    }

    if (mobileSignUpButton) {
        mobileSignUpButton.addEventListener("click", function () {
            container.classList.add("right-panel-active");
        });
    }

    if (mobileSignInButton) {
        mobileSignInButton.addEventListener("click", function () {
            container.classList.remove("right-panel-active");
        });
    }
});