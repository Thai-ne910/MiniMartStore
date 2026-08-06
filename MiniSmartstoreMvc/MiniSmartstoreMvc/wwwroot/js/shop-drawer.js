(function () {
    if (window.__miniShopDrawerBound) {
        return;
    }

    window.__miniShopDrawerBound = true;

    function getDrawerHost() {
        return document.getElementById("shopDrawerHost")
            || document.getElementById("shopDrawerContainer");
    }

    function getAntiForgeryToken() {
        const tokenInput =
            document.querySelector("#drawerAntiForgeryForm input[name='__RequestVerificationToken']") ||
            document.querySelector("#ajaxAntiForgeryForm input[name='__RequestVerificationToken']") ||
            document.querySelector("#detailAddCartForm input[name='__RequestVerificationToken']") ||
            document.querySelector("input[name='__RequestVerificationToken']");

        return tokenInput ? tokenInput.value : "";
    }

    function showToast(message, type = "success") {
        if (!message) {
            return;
        }

        let toast = document.createElement("div");

        toast.className = "mini-toast-notification";
        toast.innerHTML = `
            <span>${type === "success" ? "✓" : "!"}</span>
            <p>${message}</p>
            <button type="button">×</button>
        `;

        document.body.appendChild(toast);

        const closeButton = toast.querySelector("button");

        if (closeButton) {
            closeButton.addEventListener("click", function () {
                toast.remove();
            });
        }

        setTimeout(function () {
            toast.classList.add("show");
        }, 20);

        setTimeout(function () {
            toast.classList.remove("show");

            setTimeout(function () {
                toast.remove();
            }, 250);
        }, 2800);
    }

    function clearDrawerDom() {
        document.querySelectorAll(".shop-drawer-overlay, .shop-drawer-panel, .shop-drawer-backdrop").forEach(function (element) {
            element.remove();
        });

        const host = getDrawerHost();

        if (host) {
            host.innerHTML = "";
        }

        document.body.classList.remove("drawer-open");
        document.body.classList.remove("shop-drawer-open");

        document.documentElement.classList.remove("drawer-open");
        document.documentElement.classList.remove("shop-drawer-open");
    }

    async function openDrawer(tab = "cart", message = "") {
        const host = getDrawerHost();

        if (!host) {
            console.error("Thiếu div id='shopDrawerHost' hoặc id='shopDrawerContainer' trong _Layout.cshtml");
            return;
        }

        const url =
            "/ShopDrawer/Panel?tab=" +
            encodeURIComponent(tab || "cart") +
            "&message=" +
            encodeURIComponent(message || "");

        const response = await fetch(url, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        });

        const html = await response.text();

        clearDrawerDom();

        host.innerHTML = html;

        document.body.classList.add("drawer-open");
        document.body.classList.add("shop-drawer-open");
    }

    async function postAction(url, data = {}) {
        const formData = new FormData();

        formData.append("__RequestVerificationToken", getAntiForgeryToken());

        Object.keys(data).forEach(function (key) {
            if (data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        });

        const response = await fetch(url, {
            method: "POST",
            body: formData,
            credentials: "same-origin",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
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

    document.addEventListener("submit", async function (event) {
        const form = event.target;

        const isAjaxAddCartForm =
            form &&
            (
                form.classList.contains("js-ajax-add-cart") ||
                form.id === "detailAddCartForm"
            );

        if (!isAjaxAddCartForm) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                credentials: "same-origin",
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            const result = await response.json();

            if (!result.success) {
                showToast(result.message || "Không thể thêm sản phẩm vào giỏ hàng.", "error");
                return;
            }

            showToast(result.message || "Đã thêm sản phẩm vào giỏ hàng.", "success");
            await openDrawer(result.tab || "cart", result.message || "Đã thêm sản phẩm vào giỏ hàng.");
        } catch (error) {
            console.error(error);
            showToast("Có lỗi khi thêm sản phẩm vào giỏ hàng.", "error");
        }
    }, true);

    document.addEventListener("click", async function (event) {
        const closeButton = event.target.closest("[data-drawer-close], .shop-drawer-close, .js-shop-drawer-close");

        if (closeButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            clearDrawerDom();
            return;
        }

        const openButton = event.target.closest("[data-open-drawer], .js-open-shop-drawer");

        if (openButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const tab = openButton.dataset.tab || openButton.dataset.openDrawer || "cart";

            await openDrawer(tab);
            return;
        }

        const tabButton = event.target.closest("[data-drawer-tab]");

        if (tabButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            await openDrawer(tabButton.dataset.drawerTab || "cart");
            return;
        }

        const addCartButton = event.target.closest(".js-drawer-add-cart");

        if (addCartButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const productId = addCartButton.dataset.productId;

            if (!productId) {
                showToast("Không tìm thấy mã sản phẩm.", "error");
                return;
            }

            const result = await postAction("/Cart/AddToCartAjax", {
                id: productId,
                quantity: addCartButton.dataset.quantity || 1,
                selectedColor: addCartButton.dataset.selectedColor || ""
            });

            if (!result.success) {
                showToast(result.message || "Không thể thêm vào giỏ hàng.", "error");
                return;
            }

            showToast(result.message || "Đã thêm sản phẩm vào giỏ hàng.", "success");
            await openDrawer(result.tab || "cart", result.message || "Đã thêm sản phẩm vào giỏ hàng.");
            return;
        }

        const wishlistButton = event.target.closest(".js-add-wishlist");

        if (wishlistButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const productId = wishlistButton.dataset.productId;

            if (!productId) {
                showToast("Không tìm thấy mã sản phẩm.", "error");
                return;
            }

            const result = await postAction("/ShopDrawer/AddToWishlist", {
                id: productId
            });

            if (!result.success) {
                showToast(result.message || "Không thể thêm vào yêu thích.", "error");
                return;
            }

            showToast(result.message || "Đã thêm vào danh sách yêu thích.", "success");
            await openDrawer(result.tab || "wishlist", result.message || "Đã thêm vào danh sách yêu thích.");
            return;
        }

        const compareButton = event.target.closest(".js-add-compare");

        if (compareButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const productId = compareButton.dataset.productId;

            if (!productId) {
                showToast("Không tìm thấy mã sản phẩm.", "error");
                return;
            }

            const result = await postAction("/ShopDrawer/AddToCompare", {
                id: productId
            });

            if (!result.success) {
                showToast(result.message || "Không thể thêm vào so sánh.", "error");
                return;
            }

            showToast(result.message || "Đã thêm vào danh sách so sánh.", "success");
            await openDrawer(result.tab || "compare", result.message || "Đã thêm vào danh sách so sánh.");
            return;
        }

        const qtyButton = event.target.closest(".js-cart-qty");

        if (qtyButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const productId = qtyButton.dataset.productId;
            const quantity = qtyButton.dataset.quantity;
            const selectedColor = qtyButton.dataset.selectedColor || "";

            if (!productId) {
                return;
            }

            const result = await postAction("/Cart/UpdateQuantityAjax", {
                productId: productId,
                quantity: quantity,
                selectedColor: selectedColor
            });

            if (!result.success) {
                showToast(result.message || "Không thể cập nhật số lượng.", "error");
                return;
            }

            showToast(result.message || "Đã cập nhật giỏ hàng.", "success");
            await openDrawer(result.tab || "cart", result.message || "Đã cập nhật giỏ hàng.");
            return;
        }

        const removeCartButton = event.target.closest(".js-cart-remove");

        if (removeCartButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const productId = removeCartButton.dataset.productId;
            const selectedColor = removeCartButton.dataset.selectedColor || "";

            if (!productId) {
                return;
            }

            removeCartButton.disabled = true;

            const result = await postAction("/Cart/RemoveAjax", {
                productId: productId,
                selectedColor: selectedColor
            });

            if (!result.success) {
                removeCartButton.disabled = false;
                showToast(result.message || "Không thể xóa sản phẩm.", "error");
                return;
            }

            showToast(result.message || "Đã xóa sản phẩm khỏi giỏ hàng.", "success");
            await openDrawer(result.tab || "cart", result.message || "Đã xóa sản phẩm khỏi giỏ hàng.");
            return;
        }

        const removeDrawerButton = event.target.closest(".js-drawer-remove");

        if (removeDrawerButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const url = removeDrawerButton.dataset.url;
            const id = removeDrawerButton.dataset.id || removeDrawerButton.dataset.productId;
            const tab = removeDrawerButton.dataset.tab || "cart";

            if (!url || !id) {
                return;
            }

            removeDrawerButton.disabled = true;

            const result = await postAction(url, {
                id: id
            });

            if (!result.success) {
                removeDrawerButton.disabled = false;
                showToast(result.message || "Không thể xóa.", "error");
                return;
            }

            showToast(result.message || "Đã xóa sản phẩm.", "success");
            await openDrawer(result.tab || tab, result.message || "Đã xóa sản phẩm.");
            return;
        }

        const clearCompareButton = event.target.closest(".js-clear-compare");

        if (clearCompareButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            clearCompareButton.disabled = true;

            const result = await postAction("/ShopDrawer/ClearCompare", {});

            if (!result.success) {
                clearCompareButton.disabled = false;
                showToast(result.message || "Không thể làm sạch danh sách so sánh.", "error");
                return;
            }

            showToast(result.message || "Đã làm sạch danh sách so sánh.", "success");
            await openDrawer(result.tab || "compare", result.message || "Đã làm sạch danh sách so sánh.");
            return;
        }

        const shareButton = event.target.closest(".js-share-product");

        if (shareButton) {
            event.preventDefault();
            event.stopPropagation();

            if (navigator.clipboard) {
                await navigator.clipboard.writeText(window.location.href);
                showToast("Đã sao chép link sản phẩm.", "success");
            } else {
                alert(window.location.href);
            }

            return;
        }
    }, true);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            clearDrawerDom();
        }
    });
})();