(function () {
    function closeDrawerImmediately() {
        document.body.classList.remove("shop-drawer-open");
        document.body.classList.remove("drawer-open");
        document.body.classList.remove("shop-drawer-active");

        document.documentElement.classList.remove("shop-drawer-open");
        document.documentElement.classList.remove("drawer-open");

        const container = document.getElementById("shopDrawerContainer");

        if (container) {
            container.innerHTML = "";
        }
    }

    function getAntiForgeryToken() {
        const drawerToken = document.querySelector("#drawerAntiForgeryForm input[name='__RequestVerificationToken']");
        if (drawerToken) return drawerToken.value;

        const layoutToken = document.querySelector("#ajaxAntiForgeryForm input[name='__RequestVerificationToken']");
        if (layoutToken) return layoutToken.value;

        const anyToken = document.querySelector("input[name='__RequestVerificationToken']");
        return anyToken ? anyToken.value : "";
    }

    async function postDrawerAction(url, data) {
        const formData = new FormData();

        Object.keys(data || {}).forEach(function (key) {
            formData.append(key, data[key]);
        });

        const response = await fetch(url, {
            method: "POST",
            body: formData,
            credentials: "same-origin",
            headers: {
                "RequestVerificationToken": getAntiForgeryToken()
            }
        });

        if (!response.ok) {
            return {
                success: false,
                message: "Không thể thực hiện thao tác."
            };
        }

        return await response.json();
    }

    async function reloadDrawer(tab, message) {
        const container = document.getElementById("shopDrawerContainer");

        if (!container) {
            return;
        }

        const url = "/ShopDrawer/Panel?tab="
            + encodeURIComponent(tab || "cart")
            + "&message="
            + encodeURIComponent(message || "");

        const response = await fetch(url, {
            method: "GET",
            credentials: "same-origin"
        });

        const html = await response.text();

        container.innerHTML = html;
        document.body.classList.add("shop-drawer-open");
    }

    document.addEventListener("click", async function (event) {
        const closeTarget = event.target.closest(
            "[data-drawer-close], .shop-drawer-close, .js-shop-drawer-close"
        );

        if (closeTarget) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            closeDrawerImmediately();
            return;
        }

        const removeButton = event.target.closest(".js-drawer-remove");

        if (removeButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const url = removeButton.dataset.url;
            const id = removeButton.dataset.id || removeButton.dataset.productId;
            const tab = removeButton.dataset.tab || "wishlist";

            if (!url || !id) {
                return;
            }

            removeButton.disabled = true;

            const result = await postDrawerAction(url, {
                id: id
            });

            await reloadDrawer(
                result.tab || tab,
                result.message || "Đã xóa sản phẩm."
            );

            return;
        }

        const removeWishlistButton = event.target.closest(".js-remove-wishlist");

        if (removeWishlistButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const productId = removeWishlistButton.dataset.productId;

            if (!productId) {
                return;
            }

            removeWishlistButton.disabled = true;

            const result = await postDrawerAction("/ShopDrawer/RemoveWishlist", {
                id: productId
            });

            await reloadDrawer(
                result.tab || "wishlist",
                result.message || "Đã xóa sản phẩm khỏi danh sách yêu thích."
            );

            return;
        }

        const removeCompareButton = event.target.closest(".js-remove-compare");

        if (removeCompareButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const productId = removeCompareButton.dataset.productId;

            if (!productId) {
                return;
            }

            removeCompareButton.disabled = true;

            const result = await postDrawerAction("/ShopDrawer/RemoveCompare", {
                id: productId
            });

            await reloadDrawer(
                result.tab || "compare",
                result.message || "Đã xóa sản phẩm khỏi danh sách so sánh."
            );

            return;
        }

        const clearCompareButton = event.target.closest(".js-clear-compare");

        if (clearCompareButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            clearCompareButton.disabled = true;

            const result = await postDrawerAction("/ShopDrawer/ClearCompare", {});

            await reloadDrawer(
                result.tab || "compare",
                result.message || "Đã làm sạch danh sách so sánh."
            );

            return;
        }
    }, true);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeDrawerImmediately();
        }
    });
})();