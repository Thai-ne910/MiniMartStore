// ===== Currency Switcher: VND / USD =====

(function () {
    const EXCHANGE_RATE = 25000;

    function parseVndFromText(text) {
        if (!text) return null;

        const cleaned = text
            .replaceAll(",", "")
            .replaceAll(".", "")
            .replaceAll("đ", "")
            .replaceAll("₫", "")
            .replace(/[^\d]/g, "");

        const value = parseInt(cleaned);

        if (isNaN(value)) return null;

        return value;
    }

    function formatVnd(value) {
        return new Intl.NumberFormat("vi-VN").format(value) + " đ";
    }

    function formatUsd(value) {
        const usd = value / EXCHANGE_RATE;

        return "$" + new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(usd);
    }

    function prepareMoneyElements() {
        const candidates = document.querySelectorAll(
            ".smart-product-price strong, " +
            ".smart-product-price small, " +
            ".cart-price, " +
            ".line-total, " +
            ".summary-row strong, " +
            ".summary-total strong, " +
            ".checkout-item span, " +
            ".order-total, " +
            ".text-danger.fw-bold, " +
            ".text-success"
        );

        candidates.forEach(function (element) {
            if (element.dataset.vnd) return;

            const text = element.textContent;

            if (!text || (!text.includes("đ") && !text.includes("₫"))) return;

            const value = parseVndFromText(text);

            if (value === null) return;

            element.dataset.vnd = value;
            element.classList.add("currency-money");
        });
    }

    function applyCurrency(currency) {
        prepareMoneyElements();

        document.querySelectorAll("[data-vnd]").forEach(function (element) {
            const value = parseInt(element.dataset.vnd);

            if (isNaN(value)) return;

            const originalText = element.textContent || "";

            if (currency === "USD") {
                if (originalText.trim().startsWith("-")) {
                    element.textContent = "-" + formatUsd(value);
                } else if (originalText.includes("From")) {
                    element.textContent = "Từ " + formatUsd(value);
                } else if (originalText.includes("Instead of")) {
                    element.textContent = "Giá cũ: " + formatUsd(value);
                } else {
                    element.textContent = formatUsd(value);
                }
            } else {
                if (originalText.trim().startsWith("-")) {
                    element.textContent = "-" + formatVnd(value);
                } else if (originalText.includes("From") || originalText.includes("Từ")) {
                    element.textContent = "Từ " + formatVnd(value);
                } else if (originalText.includes("Instead of") || originalText.includes("Giá cũ")) {
                    element.textContent = "Giá cũ: " + formatVnd(value);
                } else {
                    element.textContent = formatVnd(value);
                }
            }
        });

        const currentCurrencyText = document.getElementById("currentCurrencyText");

        if (currentCurrencyText) {
            currentCurrencyText.textContent = currency === "USD" ? "USD ($)" : "VND (₫)";
        }

        localStorage.setItem("mini_currency", currency);
    }

    document.addEventListener("DOMContentLoaded", function () {
        const savedCurrency = localStorage.getItem("mini_currency") || "VND";

        applyCurrency(savedCurrency);

        document.querySelectorAll(".currency-option").forEach(function (button) {
            button.addEventListener("click", function () {
                const currency = button.dataset.currency || "VND";
                applyCurrency(currency);
            });
        });
    });
})();
// ===== SHOP RIGHT DRAWER: CART / WISHLIST / COMPARE =====

(function () {
    function openDrawer(tabName) {
        const drawer = document.getElementById("shopDrawer");
        const overlay = document.getElementById("shopDrawerOverlay");

        if (!drawer || !overlay) return;

        activateDrawerTab(tabName || "cart");

        drawer.classList.add("show");
        overlay.classList.add("show");
        document.body.classList.add("drawer-open");
    }

    function closeDrawer() {
        const drawer = document.getElementById("shopDrawer");
        const overlay = document.getElementById("shopDrawerOverlay");

        if (!drawer || !overlay) return;

        drawer.classList.remove("show");
        overlay.classList.remove("show");
        document.body.classList.remove("drawer-open");
    }

    function activateDrawerTab(tabName) {
        document.querySelectorAll(".shop-drawer-tab").forEach(function (button) {
            button.classList.toggle("active", button.dataset.tab === tabName);
        });

        document.querySelectorAll(".shop-drawer-panel").forEach(function (panel) {
            panel.classList.toggle("active", panel.dataset.panel === tabName);
        });

        const footer = document.querySelector(".shop-drawer-footer");

        if (footer) {
            footer.style.display = tabName === "cart" ? "block" : "none";
        }
    }

    document.addEventListener("click", function (event) {
        const openButton = event.target.closest(".drawer-open-btn");

        if (openButton) {
            event.preventDefault();

            const tabName = openButton.dataset.drawerTab || "cart";
            openDrawer(tabName);
            return;
        }

        const tabButton = event.target.closest(".shop-drawer-tab");

        if (tabButton) {
            activateDrawerTab(tabButton.dataset.tab || "cart");
            return;
        }

        if (event.target.closest("#shopDrawerClose")) {
            closeDrawer();
            return;
        }

        if (event.target.id === "shopDrawerOverlay") {
            closeDrawer();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeDrawer();
        }
    });
})();