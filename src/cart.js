(() => {
  const storageKey = "nike-boutique-cart-v1";
  const maxQuantity = 99;
  const products = Array.isArray(window.NikeProducts) ? window.NikeProducts : [];
  const productById = new Map(products.map((product) => [product.id, product]));
  const addButtons = [...document.querySelectorAll("[data-cart-add]")];
  const productIds = new Set(addButtons.map((button) => button.dataset.cartAdd));
  const cartDialog = document.getElementById("shopping-cart");
  const cartOpenButton = document.getElementById("cart-open");
  const cartCloseButton = document.getElementById("cart-close");
  const cartCount = document.getElementById("cart-count");
  const cartStatus = document.getElementById("cart-status");
  const emptyCart = document.getElementById("cart-empty");
  const cartItems = document.getElementById("cart-items");
  const cartSummary = document.getElementById("cart-summary");
  const cartSubtotal = document.getElementById("cart-subtotal");
  const cartDelivery = document.getElementById("cart-delivery");
  const cartTotal = document.getElementById("cart-total");
  const cartView = document.getElementById("cart-view");
  const checkoutDetails = document.getElementById("checkout-details");
  const checkoutSummary = document.getElementById("checkout-summary");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutStatus = document.getElementById("checkout-status");
  const checkoutTotal = document.getElementById("checkout-total");
  const checkoutPayButton = document.getElementById("checkout-pay");
  const checkoutPayLabel = document.getElementById("checkout-pay-label");
  const checkoutConfirmation = document.getElementById("checkout-confirmation");
  const demoReference = document.getElementById("demo-reference");
  const demoTotal = document.getElementById("demo-total");
  const money = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  });
  const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000;
  let deliveryFeeNgn = null;
  let checkoutReady = false;

  if (
    !cartDialog || !cartOpenButton || !cartCloseButton || !cartCount ||
    !cartStatus || !emptyCart || !cartItems || !cartSummary || !cartSubtotal ||
    !cartDelivery || !cartTotal || !cartView || !checkoutDetails ||
    !checkoutSummary || !checkoutForm || !checkoutStatus || !checkoutTotal ||
    !checkoutPayButton || !checkoutPayLabel || !checkoutConfirmation || !demoReference || !demoTotal || !productById.size
  ) {
    return;
  }

  function loadCart() {
    try {
      const savedCart = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(savedCart)) return [];

      const quantities = new Map();
      for (const item of savedCart) {
        const id = item && (item.id || item.name);
        if (
          id && productIds.has(id) && productById.has(id) &&
          Number.isSafeInteger(item.quantity) && item.quantity > 0
        ) {
          quantities.set(
            id,
            Math.min(maxQuantity, (quantities.get(id) || 0) + item.quantity)
          );
        }
      }

      return [...quantities].map(([id, quantity]) => ({
        id,
        name: productById.get(id).name,
        quantity
      }));
    } catch {
      return [];
    }
  }

  let cart = loadCart();
  let closeTimer = null;
  let afterClose = null;
  let isCheckoutStep = false;
  let isOrderConfirmed = false;

  function saveCart() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(
        cart.map(({ id, quantity }) => ({ id, quantity }))
      ));
    } catch {
      // The cart still works for this page view if browser storage is unavailable.
    }
  }

  function makeButton({ label, text, action, id, className }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.dataset.cartAction = action;
    button.dataset.cartId = id;
    button.textContent = text;
    return button;
  }

  function renderCart() {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const isEmpty = cart.length === 0;
    const subtotalNgn = cart.reduce(
      (total, item) => total + productById.get(item.id).priceNgn * item.quantity,
      0
    );
    const totalNgn = deliveryFeeNgn === null ? null : subtotalNgn + deliveryFeeNgn;

    cartCount.textContent = String(itemCount);
    cartCount.hidden = isEmpty;
    cartOpenButton.setAttribute(
      "aria-label",
      `Open shopping cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
    );
    emptyCart.hidden = !isEmpty;
    cartItems.hidden = isEmpty;
    cartView.hidden = isCheckoutStep;
    checkoutDetails.hidden = !isCheckoutStep;
    checkoutForm.hidden = isOrderConfirmed;
    checkoutConfirmation.hidden = !isOrderConfirmed;
    cartSummary.hidden = isEmpty || isCheckoutStep;
    checkoutSummary.hidden = isEmpty || !isCheckoutStep;
    cartSubtotal.textContent = money.format(subtotalNgn);
    cartDelivery.textContent = deliveryFeeNgn === null
      ? "Unavailable"
      : money.format(deliveryFeeNgn);
    cartTotal.textContent = totalNgn === null ? "Unavailable" : money.format(totalNgn);
    checkoutTotal.textContent = totalNgn === null ? "Unavailable" : money.format(totalNgn);
    checkoutPayButton.disabled = !checkoutReady || isOrderConfirmed;
    cartItems.replaceChildren();

    for (const item of cart) {
      const product = productById.get(item.id);
      const row = document.createElement("li");
      row.className = "flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0";

      const details = document.createElement("div");
      details.className = "min-w-0 flex-1";

      const name = document.createElement("p");
      name.className = "font-bold text-gray-800";
      name.textContent = product.name;

      const priceNote = document.createElement("p");
      priceNote.className = "mt-1 text-sm text-gray-500";
      priceNote.textContent = `${money.format(product.priceNgn)} each`;
      details.append(name, priceNote);

      const controls = document.createElement("div");
      controls.className = "flex items-center gap-2";
      controls.append(
        makeButton({
          label: `Decrease ${product.name} quantity`,
          text: "-",
          action: "decrease",
          id: item.id,
          className: "flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg font-semibold text-gray-700 transition-colors hover:border-pink-600 hover:text-pink-700"
        })
      );

      const quantity = document.createElement("span");
      quantity.className = "min-w-12 text-center text-sm font-semibold text-gray-700";
      quantity.textContent = `${item.quantity}`;
      controls.append(quantity);

      controls.append(
        makeButton({
          label: `Increase ${product.name} quantity`,
          text: "+",
          action: "increase",
          id: item.id,
          className: "flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg font-semibold text-gray-700 transition-colors hover:border-pink-600 hover:text-pink-700"
        }),
        makeButton({
          label: `Remove ${product.name} from cart`,
          text: "Remove",
          action: "remove",
          id: item.id,
          className: "ml-1 rounded-full px-2 py-2 text-sm font-semibold text-pink-700 transition-colors hover:bg-pink-50"
        })
      );

      row.append(details, controls);
      cartItems.append(row);
    }
  }

  function renderProductPrices() {
    document.querySelectorAll("[data-product-price]").forEach((element) => {
      const product = productById.get(element.dataset.productPrice);
      if (product) element.textContent = money.format(product.priceNgn);
    });
  }

  function showCartStep() {
    isCheckoutStep = false;
    isOrderConfirmed = false;
    renderCart();
    checkoutStatus.textContent = "";
  }

  function showCheckoutStep() {
    if (cart.length === 0) return;
    isCheckoutStep = true;
    isOrderConfirmed = false;
    renderCart();
    checkoutStatus.textContent = checkoutReady
      ? ""
      : "Order placement needs the Node server; it is unavailable on GitHub Pages.";
    document.getElementById("checkout-name").focus();
  }

  async function loadCheckoutConfig() {
    try {
      const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
      const config = await response.json();
      if (!response.ok) throw new Error(config.error || "Demo checkout settings could not be loaded.");
      deliveryFeeNgn = Number.isSafeInteger(config.deliveryFeeNgn) && config.deliveryFeeNgn >= 0
        ? config.deliveryFeeNgn
        : null;
      checkoutReady = config.checkoutReady === true && deliveryFeeNgn !== null;
      checkoutPayButton.disabled = !checkoutReady;
      renderCart();
      if (!checkoutReady) {
        checkoutStatus.textContent = "Order placement needs the Node server; it is unavailable on GitHub Pages.";
      }
    } catch {
      checkoutReady = false;
      checkoutPayButton.disabled = true;
      checkoutStatus.textContent = "Order placement needs the Node server; it is unavailable on GitHub Pages.";
    }
  }

  function commitCart(message) {
    saveCart();
    renderCart();
    cartStatus.textContent = message;
  }

  function openCart() {
    afterClose = null;
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    if (!cartDialog.open) {
      cartDialog.showModal();
      cartDialog.getBoundingClientRect();
    }
    cartDialog.classList.add("is-visible");
    cartOpenButton.setAttribute("aria-expanded", "true");
  }

  function closeCart(onClosed) {
    if (typeof onClosed === "function") afterClose = onClosed;
    if (!cartDialog.open) {
      afterClose?.();
      afterClose = null;
      return;
    }

    cartDialog.classList.remove("is-visible");
    if (closeTimer !== null) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      closeTimer = null;
      if (cartDialog.open && !cartDialog.classList.contains("is-visible")) {
        cartDialog.close();
      }
    }, transitionDuration);
  }

  addButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.cartAdd;
      const product = productById.get(id);
      if (!product) return;
      isOrderConfirmed = false;
      isCheckoutStep = false;
      const existingItem = cart.find((item) => item.id === id);

      if (existingItem) {
        existingItem.quantity = Math.min(maxQuantity, existingItem.quantity + 1);
      } else {
        cart.push({ id, name: product.name, quantity: 1 });
      }

      commitCart(`${product.name} added to your cart.`);
      openCart();
    });
  });

  cartOpenButton.addEventListener("click", openCart);
  cartCloseButton.addEventListener("click", closeCart);
  document.getElementById("checkout-start")?.addEventListener("click", showCheckoutStep);
  document.getElementById("checkout-back")?.addEventListener("click", showCartStep);
  cartDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCart();
  });
  cartDialog.addEventListener("click", (event) => {
    if (event.target === cartDialog) closeCart();
  });
  cartDialog.addEventListener("close", () => {
    cartDialog.classList.remove("is-visible");
    cartOpenButton.setAttribute("aria-expanded", "false");
    if (isOrderConfirmed) {
      isOrderConfirmed = false;
      isCheckoutStep = false;
      renderCart();
    }
    const callback = afterClose;
    afterClose = null;
    callback?.();
  });

  cartItems.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-cart-action]");
    if (!actionButton) return;

    const { cartAction, cartId } = actionButton.dataset;
    const item = cart.find((entry) => entry.id === cartId);
    if (!item) return;
    const product = productById.get(cartId);

    if (cartAction === "increase") {
      item.quantity = Math.min(maxQuantity, item.quantity + 1);
      commitCart(`${product.name} quantity increased to ${item.quantity}.`);
    } else if (cartAction === "decrease") {
      if (item.quantity === 1) {
        cart = cart.filter((entry) => entry.id !== cartId);
        commitCart(`${product.name} removed from your cart.`);
      } else {
        item.quantity -= 1;
        commitCart(`${product.name} quantity decreased to ${item.quantity}.`);
      }
    } else if (cartAction === "remove") {
      cart = cart.filter((entry) => entry.id !== cartId);
      commitCart(`${product.name} removed from your cart.`);
    }
  });

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!checkoutReady || cart.length === 0) return;

    const payButtonText = checkoutPayLabel.textContent;
    checkoutPayButton.disabled = true;
    checkoutPayLabel.textContent = "Creating demo order...";
    checkoutStatus.textContent = "Preparing your demo order...";

    const formData = new FormData(checkoutForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      items: cart.map(({ id, quantity }) => ({ id, quantity }))
    };

    try {
      const response = await fetch("/api/orders/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Demo order could not be created.");
      if (result.demo !== true || typeof result.reference !== "string") {
        throw new Error("The demo order response was incomplete. Please try again.");
      }

      demoReference.textContent = result.reference;
      demoTotal.textContent = money.format(result.totalNgn);
      cart = [];
      saveCart();
      checkoutForm.reset();
      isCheckoutStep = true;
      isOrderConfirmed = true;
      renderCart();
      checkoutStatus.textContent = "";
    } catch (error) {
      checkoutStatus.textContent = error instanceof Error
        ? error.message
        : "Demo order could not be created. Please try again.";
      checkoutPayButton.disabled = !checkoutReady;
      checkoutPayLabel.textContent = payButtonText;
    }
  });

  document.getElementById("cart-continue")?.addEventListener("click", closeCart);
  document.getElementById("cart-continue-empty")?.addEventListener("click", () => {
    closeCart(() => document.getElementById("Collections")?.scrollIntoView({ behavior: "smooth" }));
  });

  renderCart();
  renderProductPrices();
  loadCheckoutConfig();
})();
