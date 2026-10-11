document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    setupMobileNavigation();
    setupDismissibleAlerts();
    setupSmoothScrolling();
    setupBackToTop();
});

function setCurrentYear() {
    const yearElements = document.querySelectorAll("[data-current-year]");

    yearElements.forEach((element) => {
        element.textContent = new Date().getFullYear();
    });
}

function setupMobileNavigation() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-menu]");

    if (!toggle || !menu) return;

    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";

        toggle.setAttribute("aria-expanded", String(!isOpen));
        menu.classList.toggle("is-open", !isOpen);
    });

    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            toggle.setAttribute("aria-expanded", "false");
            menu.classList.remove("is-open");
        });
    });

    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target) && !toggle.contains(event.target)) {
            toggle.setAttribute("aria-expanded", "false");
            menu.classList.remove("is-open");
        }
    });
}

function setupDismissibleAlerts() {
    document.querySelectorAll("[data-dismiss-alert]").forEach((button) => {
        button.addEventListener("click", () => {
            const alert = button.closest("[data-alert]");

            if (alert) {
                alert.remove();
            }
        });
    });
}

function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") return;

            const target = document.querySelector(targetId);

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "auto"
                    : "smooth",
                block: "start"
            });
        });
    });
}

function setupBackToTop() {
    document.querySelectorAll("[data-back-to-top]").forEach((button) => {
        button.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "auto"
                    : "smooth"
            });
        });
    });
}

function showMessage(message, type = "info", container = null) {
    const target = container || document.querySelector("[data-message-container]");

    if (!target) {
        window.alert(message);
        return;
    }

    const alert = document.createElement("div");
    alert.className = `notice notice-${type}`;
    alert.setAttribute("role", type === "error" ? "alert" : "status");
    alert.setAttribute("data-alert", "");
    alert.textContent = message;

    target.replaceChildren(alert);
}

function clearMessage(container = null) {
    const target = container || document.querySelector("[data-message-container]");

    if (target) {
        target.replaceChildren();
    }
}

function formatPhoneNumber(phone) {
    return String(phone || "").replace(/[^\d+]/g, "");
}

function isValidPhoneNumber(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}