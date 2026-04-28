(() => {
  const CART_KEY = 'rollsExpressCart';
  const AUTH_TOKEN_KEY = 'rollsExpressAuthToken';
  const USER_KEY = 'rollsExpressCurrentUser';
  const ORDER_PREFS_KEY = 'rollsExpressOrderPrefs';
  const ORDER_CONFIRMATION_KEY = 'rollsExpressLastOrderConfirmation';

  const state = {
    menu: [],
    cart: loadCart(),
    currentUser: loadUser(),
  };

  const categoryTitles = {
    rolls: 'Rolls',
    bowls: 'Bowls',
    extras: 'Sauces, Drinks, Add-Ons'
  };

  function loadCart() {
    const fallback = { items: [], subtotal: 0, tax: 0, total: 0 };
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function loadUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch (error) {
      return null;
    }
  }

  function loadOrderPrefs() {
    try {
      return JSON.parse(localStorage.getItem(ORDER_PREFS_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveOrderPrefs(prefs) {
    localStorage.setItem(ORDER_PREFS_KEY, JSON.stringify({ ...loadOrderPrefs(), ...prefs }));
  }

  function saveOrderConfirmation(data) {
    localStorage.setItem(ORDER_CONFIRMATION_KEY, JSON.stringify(data));
  }

  function getOrderConfirmation() {
    try {
      return JSON.parse(localStorage.getItem(ORDER_CONFIRMATION_KEY)) || null;
    } catch (error) {
      return null;
    }
  }

  function clearOrderConfirmation() {
    localStorage.removeItem(ORDER_CONFIRMATION_KEY);
  }

  function saveCart() {
    recalculateCart();
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    updateCartBadges();
  }

  function saveUserSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    state.currentUser = user;
    updateAuthUi();
  }

  function clearUserSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    state.currentUser = null;
    updateAuthUi();
  }

  function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(path, { ...options, headers });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : null;
    if (!response.ok) {
      const message = payload?.error || 'Request failed.';
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function currency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function recalculateCart() {
    state.cart.items = state.cart.items.filter((item) => item.quantity > 0);
    state.cart.subtotal = state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    state.cart.tax = Number((state.cart.subtotal * 0.06).toFixed(2));
    state.cart.total = Number((state.cart.subtotal + state.cart.tax).toFixed(2));
  }

  function updateCartBadges() {
    const count = state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.re-cart-count').forEach((node) => {
      node.textContent = `(${count})`;
    });
  }

  function getCartQuantity(itemId) {
    const item = state.cart.items.find((entry) => entry.id === itemId);
    return item ? item.quantity : 0;
  }

  function updateMenuItemQuantities() {
    document.querySelectorAll('[data-item-quantity]').forEach((badge) => {
      const quantity = getCartQuantity(badge.dataset.itemQuantity);
      badge.textContent = quantity ? `Qty: ${quantity}` : '';
      badge.classList.toggle('d-none', quantity === 0);
    });
  }

  function updateAuthUi() {
    document.querySelectorAll('.re-cta').forEach((button) => {
      let logoutButton = null;
      const authArea = button.parentElement;
      if (authArea) {
        logoutButton = authArea.querySelector('.re-logout-btn');
        if (!logoutButton) {
          logoutButton = document.createElement('button');
          logoutButton.type = 'button';
          logoutButton.className = 'btn re-logout-btn d-none';
          logoutButton.textContent = 'Log Out';
          authArea.appendChild(logoutButton);
        }
      }

      if (state.currentUser) {
        button.textContent = `Hi, ${state.currentUser.name.split(' ')[0]}`;
        if (button.tagName === 'A') {
          button.removeAttribute('href');
          button.style.cursor = 'default';
          button.addEventListener('click', (e) => e.preventDefault());
        }
        button.setAttribute('title', 'You are signed in');
        button.setAttribute('aria-label', `Signed in as ${state.currentUser.name}`);
        if (logoutButton) {
          logoutButton.classList.remove('d-none');
        }
      } else {
        button.textContent = 'Log In/Sign Up';
        button.removeAttribute('title');
        button.setAttribute('aria-label', 'Log in or sign up');
        if (logoutButton) {
          logoutButton.classList.add('d-none');
        }
      }
    });

    const loyaltyPanel = document.querySelector('[data-loyalty-summary]');
    if (loyaltyPanel) {
      loyaltyPanel.innerHTML = state.currentUser
        ? `<strong>${escapeHtml(state.currentUser.name)}</strong><br>Points: ${Number(state.currentUser.loyaltyPoints || 0)}<br>Tier: ${escapeHtml(state.currentUser.loyaltyTier || 'Member')}`
        : 'Sign in to view saved loyalty points and prefill checkout faster.';
    }
  }

  function addToCart(menuItem) {
    const existing = state.cart.items.find((item) => item.id === menuItem.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      state.cart.items.push({
        id: menuItem.id,
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        image: menuItem.image,
        quantity: 1
      });
    }
    saveCart();
    renderOrderSummary();
    renderCartPage();
    updateMenuItemQuantities();
  }

  function removeFromCart(itemId) {
    state.cart.items = state.cart.items.filter((item) => item.id !== itemId);
    saveCart();
    renderOrderSummary();
    renderCartPage();
    updateMenuItemQuantities();
  }

  function setCartQuantity(itemId, quantity) {
    const item = state.cart.items.find((entry) => entry.id === itemId);
    if (!item) return;
    item.quantity = Math.max(0, Number(quantity) || 0);
    saveCart();
    renderOrderSummary();
    renderCartPage();
    updateMenuItemQuantities();
  }

  async function loadMenu() {
    if (state.menu.length) return state.menu;
    state.menu = await api('/api/menu', { method: 'GET' });
    return state.menu;
  }

  function setStatus(target, text, type = 'info') {
    if (!target) return;
    target.className = `alert alert-${type}`;
    target.textContent = text;
    target.classList.remove('d-none');
  }

  function hideStatus(target) {
    if (!target) return;
    target.className = 'alert d-none';
    target.textContent = '';
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[0-9()\-\s+.]{7,}$/.test(phone);
  }

  function validateZip(zip) {
    return /^\d{5}(-\d{4})?$/.test(zip);
  }

  function formatDisplayDate(dateValue) {
    if (!dateValue) return 'your selected';
    const [year, month, day] = String(dateValue).split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatDisplayTime(timeValue) {
    if (!timeValue) return 'selected';
    const [hoursStr = '0', minutesStr = '00'] = String(timeValue).split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function ensureModalRoot() {
    let root = document.getElementById('re-modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 're-modal-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function closeModal() {
    const overlay = document.querySelector('.re-modal-overlay');
    overlay?.remove();
  }

  function showModal({ title, subtitle = '', variant = 'success', actions = [], supportHtml = '' }) {
    closeModal();
    const root = ensureModalRoot();
    const overlay = document.createElement('div');
    overlay.className = 're-modal-overlay';
    overlay.innerHTML = `
      <div class="re-modal-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="re-modal-band"></div>
        <button class="re-modal-close" type="button" aria-label="Close">×</button>
        <div class="re-modal-inner">
          <div class="re-modal-message">
            <h2 class="re-modal-title re-modal-title--${variant}">${escapeHtml(title)}</h2>
            ${subtitle ? `<p class="re-modal-text">${escapeHtml(subtitle)}</p>` : ''}
          </div>
          ${actions.length ? `<div class="re-modal-actions">${actions.map((action) => `
            <section class="re-modal-action">
              <h3>${escapeHtml(action.heading)}</h3>
              <button class="re-modal-btn" type="button" data-modal-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>
            </section>
          `).join('')}</div>` : ''}
          ${supportHtml ? `<div class="re-modal-support">${supportHtml}</div>` : ''}
        </div>
        <div class="re-modal-footerband"></div>
      </div>`;
    root.appendChild(overlay);
    overlay.querySelector('.re-modal-close')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal();
    });
    overlay.querySelectorAll('[data-modal-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = actions.find((entry) => entry.id === button.dataset.modalAction);
        action?.onClick?.(overlay);
      });
    });
    return overlay;
  }

  function renderSupportForm(overlay, html, onSubmit) {
    const support = overlay.querySelector('.re-modal-support');
    if (!support) return;
    support.innerHTML = html;
    const form = support.querySelector('form');
    form?.addEventListener('submit', onSubmit);
  }

  function showSignupSuccessPopup() {
    showModal({
      title: 'Thank you for signing up!',
      subtitle: 'Please check your email to verify information.',
      variant: 'success'
    });
  }

  function showFailedLoginPopup(message = 'Please try again') {
    showModal({
      title: 'Invalid email/password!',
      subtitle: message,
      variant: 'danger',
      actions: [
        {
          id: 'retrieve-username',
          heading: 'Forgot username?',
          label: 'Retrieve username',
          onClick: (overlay) => {
            renderSupportForm(overlay, `
              <div class="card shadow-sm"><div class="card-body p-4">
                <h4 class="mb-3">Retrieve Username</h4>
                <p class="mb-3">Enter the phone number and ZIP code used on the account.</p>
                <div id="retrieve-status" class="alert d-none" role="alert"></div>
                <form id="retrieve-username-form">
                  <div class="mb-3"><input class="form-control" name="phone" placeholder="Phone number" required></div>
                  <div class="mb-3"><input class="form-control" name="zip" placeholder="ZIP code" required></div>
                  <button class="btn re-modal-btn" type="submit">Find Username</button>
                </form>
              </div></div>`,
              async (event) => {
                event.preventDefault();
                const status = document.getElementById('retrieve-status');
                hideStatus(status);
                const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
                if (!validatePhone(payload.phone || '')) return setStatus(status, 'Enter a valid phone number.', 'danger');
                if (!validateZip(payload.zip || '')) return setStatus(status, 'Enter a valid ZIP code.', 'danger');
                try {
                  const response = await api('/api/auth/retrieve-username', { method: 'POST', body: JSON.stringify(payload) });
                  setStatus(status, `We found your username: ${response.username}`, 'success');
                } catch (error) {
                  setStatus(status, error.message, 'danger');
                }
              }
            );
          }
        },
        {
          id: 'reset-password',
          heading: 'Forgot password?',
          label: 'Reset password',
          onClick: (overlay) => {
            renderSupportForm(overlay, `
              <div class="card shadow-sm"><div class="card-body p-4">
                <h4 class="mb-3">Reset Password</h4>
                <p class="mb-3">For this class demo, confirm the account email and phone number, then choose a new password.</p>
                <div id="reset-status" class="alert d-none" role="alert"></div>
                <form id="reset-password-form">
                  <div class="mb-3"><input class="form-control" type="email" name="email" placeholder="Email address" required></div>
                  <div class="mb-3"><input class="form-control" name="phone" placeholder="Phone number" required></div>
                  <div class="mb-3"><input class="form-control" type="password" name="newPassword" placeholder="New password" required></div>
                  <div class="mb-3"><input class="form-control" type="password" name="confirmPassword" placeholder="Confirm new password" required></div>
                  <button class="btn re-modal-btn" type="submit">Save New Password</button>
                </form>
              </div></div>`,
              async (event) => {
                event.preventDefault();
                const status = document.getElementById('reset-status');
                hideStatus(status);
                const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
                if (!validateEmail(payload.email || '')) return setStatus(status, 'Enter a valid email address.', 'danger');
                if (!validatePhone(payload.phone || '')) return setStatus(status, 'Enter a valid phone number.', 'danger');
                if ((payload.newPassword || '').length < 6) return setStatus(status, 'Password must be at least 6 characters long.', 'danger');
                if (payload.newPassword !== payload.confirmPassword) return setStatus(status, 'Passwords do not match.', 'danger');
                try {
                  const response = await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) });
                  setStatus(status, response.message, 'success');
                } catch (error) {
                  setStatus(status, error.message, 'danger');
                }
              }
            );
          }
        }
      ]
    });
  }

  function renderOrderPage(menu) {
    const sections = {
      rolls: document.querySelector('#rolls'),
      bowls: document.querySelector('#bowls'),
      extras: document.querySelector('#sauces')
    };
    Object.entries(sections).forEach(([key, section]) => {
      if (!section) return;
      const items = menu.filter((entry) => entry.category === key);
      section.innerHTML = `<h2>${categoryTitles[key]}</h2>` + items.map((item) => `
        <article class="re-item">
          <div class="re-item-text">
            <div class="re-item-title">${escapeHtml(item.name)} - ${currency(item.price)}</div>
            <div class="re-item-desc">${escapeHtml(item.description)}</div>
          </div>
          <div class="re-item-action">
            <button class="re-add-btn" type="button" data-add-item="${escapeHtml(item.id)}">Add to Order</button>
            <span class="re-item-qty-badge d-none" data-item-quantity="${escapeHtml(item.id)}" aria-live="polite"></span>
          </div>
        </article>
      `).join('');
    });

    document.querySelectorAll('[data-add-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const menuItem = state.menu.find((item) => item.id === button.dataset.addItem);
        if (menuItem) addToCart(menuItem);
      });
    });

    updateMenuItemQuantities();
  }

  function renderOrderSummary() {
    const itemsContainer = document.querySelector('.re-summary-items');
    const totalsContainer = document.querySelector('.re-summary-totals');
    if (!itemsContainer || !totalsContainer) return;

    if (!state.cart.items.length) {
      itemsContainer.innerHTML = '<div class="re-sum-row"><div><div class="re-sum-item">Your cart is empty.</div><div class="re-sum-note">Add menu items to start your order.</div></div></div>';
    } else {
      itemsContainer.innerHTML = state.cart.items.map((item) => `
        <div class="re-sum-row">
          <div>
            <div class="re-sum-item">${escapeHtml(item.name)}</div>
            <div class="re-sum-note">${escapeHtml(item.description)}</div>
            <div class="re-sum-qty-controls" aria-label="Update quantity for ${escapeHtml(item.name)}">
              <button class="re-qty-btn" type="button" aria-label="Decrease quantity" data-decrease-item="${escapeHtml(item.id)}">−</button>
              <input class="re-sum-qty-input" type="number" min="1" value="${item.quantity}" data-qty-item="${escapeHtml(item.id)}" aria-label="Quantity for ${escapeHtml(item.name)}" />
              <button class="re-qty-btn" type="button" aria-label="Increase quantity" data-increase-item="${escapeHtml(item.id)}">+</button>
            </div>
          </div>
          <div class="re-sum-right">
            <div class="re-sum-price">${currency(item.price * item.quantity)}</div>
            <button class="re-trash" type="button" aria-label="Remove item" data-remove-item="${escapeHtml(item.id)}">🗑️</button>
          </div>
        </div>
      `).join('');

      itemsContainer.querySelectorAll('[data-decrease-item]').forEach((button) => {
        button.addEventListener('click', () => {
          const item = state.cart.items.find((entry) => entry.id === button.dataset.decreaseItem);
          if (item) setCartQuantity(item.id, item.quantity - 1);
        });
      });

      itemsContainer.querySelectorAll('[data-increase-item]').forEach((button) => {
        button.addEventListener('click', () => {
          const item = state.cart.items.find((entry) => entry.id === button.dataset.increaseItem);
          if (item) setCartQuantity(item.id, item.quantity + 1);
        });
      });

      itemsContainer.querySelectorAll('[data-qty-item]').forEach((input) => {
        input.addEventListener('change', () => setCartQuantity(input.dataset.qtyItem, input.value));
      });

      itemsContainer.querySelectorAll('[data-remove-item]').forEach((button) => {
        button.addEventListener('click', () => removeFromCart(button.dataset.removeItem));
      });
    }

    totalsContainer.innerHTML = `
      <div class="re-total-row"><span>Sub-Total:</span><span>${currency(state.cart.subtotal)}</span></div>
      <div class="re-total-row"><span>Taxes/Fees:</span><span>${currency(state.cart.tax)}</span></div>
      <div class="re-total-row re-total-row--bold"><span>Total:</span><span>${currency(state.cart.total)}</span></div>
    `;
  }

  function renderCartPage() {
    const emptyState = document.querySelector('.re-cart-empty-state');
    const content = document.querySelector('.re-cart-content');
    if (!emptyState || !content) return;

    const cartItemsBox = content.querySelector('.re-cart-items-box');
    const summaryBox = content.querySelector('.re-cart-summary-box');
    if (!cartItemsBox || !summaryBox) return;

    const confirmation = getOrderConfirmation();
    if (confirmation) {
      emptyState.classList.add('d-none');
      content.classList.remove('d-none');
      cartItemsBox.innerHTML = `
        <div class="re-order-confirmation">
          <h2 class="re-cart-section-title">Thank you for your order!</h2>
          <p><strong>Order Number:</strong> ${escapeHtml(confirmation.orderId)}</p>
          <p>Your order will be ready at your ${escapeHtml(confirmation.fulfillmentLabel)} time of <strong>${escapeHtml(confirmation.readyText)}</strong>.</p>
          <p>A confirmation has been prepared for ${escapeHtml(confirmation.customerName)}.</p>
          <div class="mt-3 d-flex gap-2 flex-wrap">
            <a class="btn re-cart-start-btn" href="order-online.html">Start Another Order</a>
            <button class="btn btn-outline-secondary" type="button" id="dismiss-order-confirmation">Close Message</button>
          </div>
        </div>`;
      summaryBox.innerHTML = `
        <h2 class="re-cart-section-title">Order Submitted</h2>
        <div class="re-cart-summary-row"><span>Status</span><span>Submitted</span></div>
        <div class="re-cart-summary-row"><span>Order #</span><span>${escapeHtml(confirmation.orderId)}</span></div>
        <div class="re-cart-summary-row"><span>Fulfillment</span><span>${escapeHtml(confirmation.fulfillmentMethod)}</span></div>
        <div class="re-cart-summary-row"><span>Ready At</span><span>${escapeHtml(confirmation.readyText)}</span></div>`;
      document.getElementById('dismiss-order-confirmation')?.addEventListener('click', () => {
        clearOrderConfirmation();
        renderCartPage();
      });
      return;
    }

    if (!state.cart.items.length) {
      emptyState.classList.remove('d-none');
      content.classList.add('d-none');
      return;
    }

    emptyState.classList.add('d-none');
    content.classList.remove('d-none');

    cartItemsBox.innerHTML = '<h2 class="re-cart-section-title">Cart Items</h2>' + state.cart.items.map((item) => `
      <article class="re-cart-item">
        <div class="re-cart-item-image-wrap">
          <img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="re-cart-item-image" />
        </div>
        <div class="re-cart-item-details">
          <h3 class="re-cart-item-title">${escapeHtml(item.name)}</h3>
          <p class="re-cart-item-desc">${escapeHtml(item.description)}</p>
          <div class="re-cart-item-controls">
            <label class="re-cart-label-small">Qty</label>
            <input type="number" min="1" value="${item.quantity}" class="re-cart-qty-input" data-qty-item="${escapeHtml(item.id)}" />
            <button type="button" class="btn re-cart-remove-btn" data-remove-item="${escapeHtml(item.id)}">Remove</button>
          </div>
        </div>
        <div class="re-cart-item-price">${currency(item.price * item.quantity)}</div>
      </article>
    `).join('');

    const prefs = loadOrderPrefs();
    const user = state.currentUser || {};
    summaryBox.innerHTML = `
      <h2 class="re-cart-section-title">Order Summary</h2>
      <div class="re-cart-summary-row"><span>Items</span><span>${state.cart.items.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
      <div class="re-cart-summary-row"><span>Sub-total</span><span>${currency(state.cart.subtotal)}</span></div>
      <div class="re-cart-summary-row"><span>Tax</span><span>${currency(state.cart.tax)}</span></div>
      <div class="re-cart-summary-row"><span>Total</span><span>${currency(state.cart.total)}</span></div>
      <hr>
      <div id="checkout-status" class="alert d-none" role="alert"></div>
      <form id="checkout-form" class="re-checkout-form">
        <h3 class="re-cart-section-title">Checkout</h3>
        <div class="mb-2"><input class="form-control" name="name" placeholder="Full name" value="${escapeHtml(user.name || '')}" required></div>
        <div class="mb-2"><input class="form-control" name="email" type="email" placeholder="Email address" value="${escapeHtml(user.email || '')}" required></div>
        <div class="mb-2"><input class="form-control" name="phone" placeholder="Phone number" value="${escapeHtml(user.phone || '')}" required></div>
        <div class="mb-2"><input class="form-control" name="address" placeholder="Delivery or billing address" value="${escapeHtml(user.address || '')}"></div>
        <div class="mb-2">
          <select class="form-select" name="fulfillment">
            <option value="Pickup" ${prefs.fulfillment === 'Delivery' ? '' : 'selected'}>Pickup</option>
            <option value="Delivery" ${prefs.fulfillment === 'Delivery' ? 'selected' : ''}>Delivery</option>
          </select>
        </div>
        <div class="mb-2"><input class="form-control" name="scheduledDate" type="date" value="${escapeHtml(prefs.date || '')}" required></div>
        <div class="mb-2"><input class="form-control" name="scheduledTime" type="time" value="${escapeHtml(prefs.time || '')}" required></div>
        <div class="mb-2"><textarea class="form-control" name="notes" rows="3" placeholder="Order notes">${escapeHtml(prefs.notes || '')}</textarea></div>
        <button class="btn re-cart-submit-btn w-100" type="submit">Submit Order</button>
      </form>
      <div class="mt-3 small" data-loyalty-summary></div>
    `;

    cartItemsBox.querySelectorAll('[data-remove-item]').forEach((button) => {
      button.addEventListener('click', () => removeFromCart(button.dataset.removeItem));
    });
    cartItemsBox.querySelectorAll('[data-qty-item]').forEach((input) => {
      input.addEventListener('change', () => setCartQuantity(input.dataset.qtyItem, input.value));
    });

    const checkoutForm = document.getElementById('checkout-form');
    checkoutForm?.addEventListener('submit', handleCheckout);
    updateAuthUi();
  }

  async function handleCheckout(event) {
    event.preventDefault();
    const status = document.getElementById('checkout-status');
    hideStatus(status);
    const formData = new FormData(event.currentTarget);
    const customer = Object.fromEntries(formData.entries());

    if (!validateEmail(customer.email || '')) return setStatus(status, 'Please enter a valid email address.', 'danger');
    if (!validatePhone(customer.phone || '')) return setStatus(status, 'Please enter a valid phone number.', 'danger');
    if (!customer.name?.trim()) return setStatus(status, 'Please enter your name.', 'danger');
    if (!customer.scheduledDate) return setStatus(status, 'Please select a pickup or delivery date.', 'danger');
    if (!customer.scheduledTime) return setStatus(status, 'Please select a pickup or delivery time.', 'danger');

    try {
      const payload = {
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
          address: customer.address?.trim() || ''
        },
        fulfillment: {
          method: customer.fulfillment,
          date: customer.scheduledDate,
          time: customer.scheduledTime,
          notes: customer.notes?.trim() || ''
        },
        cart: state.cart
      };

      const response = await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
      const readyText = `${formatDisplayDate(customer.scheduledDate)} at ${formatDisplayTime(customer.scheduledTime)}`;
      saveOrderConfirmation({
        orderId: response.orderId,
        fulfillmentMethod: customer.fulfillment,
        fulfillmentLabel: customer.fulfillment.toLowerCase(),
        readyText,
        customerName: customer.name.trim()
      });
      state.cart = { items: [], subtotal: 0, tax: 0, total: 0 };
      saveCart();
      if (getToken()) {
        try {
          const auth = await api('/api/auth/me');
          localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
          state.currentUser = auth.user;
        } catch (error) {
          console.warn(error.message);
        }
      }
      renderCartPage();
      renderOrderSummary();
    } catch (error) {
      setStatus(status, error.message, 'danger');
    }
  }

  async function initLoginPage() {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login');
    const authMessage = document.getElementById('auth-message');
    if (!signupForm || !loginForm || !authMessage) return;

    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideStatus(authMessage);
      const payload = Object.fromEntries(new FormData(signupForm).entries());

      if (!validateEmail(payload.email || '')) return setStatus(authMessage, 'Enter a valid email address.', 'danger');
      if (!validatePhone(payload.phone || '')) return setStatus(authMessage, 'Enter a valid phone number.', 'danger');
      if (!validateZip(payload.zip || '')) return setStatus(authMessage, 'Enter a valid ZIP code.', 'danger');
      if ((payload.password || '').length < 6) return setStatus(authMessage, 'Password must be at least 6 characters long.', 'danger');

      try {
        await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
        signupForm.reset();
        showSignupSuccessPopup();
      } catch (error) {
        setStatus(authMessage, error.message, 'danger');
      }
    });

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideStatus(authMessage);
      const payload = {
        email: document.getElementById('li-email')?.value.trim(),
        password: document.getElementById('li-password')?.value || ''
      };

      try {
        const response = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
        saveUserSession(response.token, response.user);
        setStatus(authMessage, 'You are now logged in and your saved information is ready to use.', 'success');
        loginForm.reset();
      } catch (error) {
        setStatus(authMessage, error.message, 'danger');
        if (error.status === 401) {
          showFailedLoginPopup('Please try again');
        }
      }
    });
  }

  function initContactPage() {
    const form = document.querySelector('.re-contact-form');
    if (!form) return;

    const status = document.createElement('div');
    status.id = 'contact-status';
    status.className = 'alert d-none mt-3';
    form.prepend(status);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideStatus(status);
      const payload = Object.fromEntries(new FormData(form).entries());
      if (!validateEmail(payload.email || '')) return setStatus(status, 'Please provide a valid email address.', 'danger');
      if (payload.phone && !validatePhone(payload.phone)) return setStatus(status, 'Please provide a valid phone number.', 'danger');
      if (!(payload.message || '').trim()) return setStatus(status, 'Please enter a message before submitting.', 'danger');
      try {
        await api('/api/contact', { method: 'POST', body: JSON.stringify(payload) });
        setStatus(status, 'Thank you for contacting Rolls Express. Your message has been submitted.', 'success');
        form.reset();
      } catch (error) {
        setStatus(status, error.message, 'danger');
      }
    });
  }

  function initCateringPage() {
    const form = document.querySelector('.catering-form');
    if (!form) return;

    const status = document.createElement('div');
    status.id = 'catering-status';
    status.className = 'alert d-none mb-3';
    form.prepend(status);

    const requirements = [
      'Orders require at least 72 hours notice.',
      'A 15 person minimum is required for catering.',
      'Please include your event date, time, and headcount.',
      'Delivery availability depends on your location and event size.',
      'A deposit may be required for large events.',
      'Final guest counts should be confirmed 24 hours in advance.',
      'Special dietary requests should be listed in the event details.'
    ];

    document.querySelectorAll('.req-btn').forEach((button, index) => {
      button.addEventListener('click', () => {
        setStatus(status, requirements[index] || 'More details available on request.', 'info');
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideStatus(status);
      const inputs = form.querySelectorAll('input, textarea');
      const payload = {
        name: inputs[0]?.value.trim() || '',
        email: inputs[1]?.value.trim() || '',
        phone: inputs[2]?.value.trim() || '',
        address: inputs[3]?.value.trim() || '',
        eventDetails: inputs[4]?.value.trim() || ''
      };
      if (!validateEmail(payload.email)) return setStatus(status, 'Please enter a valid email address.', 'danger');
      if (!validatePhone(payload.phone)) return setStatus(status, 'Please enter a valid phone number.', 'danger');
      if (payload.eventDetails.length < 10) return setStatus(status, 'Please include a few more details about your event.', 'danger');
      try {
        await api('/api/catering', { method: 'POST', body: JSON.stringify(payload) });
        setStatus(status, 'Your catering inquiry has been submitted successfully.', 'success');
        form.reset();
      } catch (error) {
        setStatus(status, error.message, 'danger');
      }
    });
  }

  function initOrderPrefs() {
    const dateInput = document.getElementById('order-date');
    const timeInput = document.getElementById('order-time');
    if (!dateInput || !timeInput) return;

    const prefs = loadOrderPrefs();
    const radio = document.querySelector(`input[name="fulfillment"][value="${prefs.fulfillment || 'Pickup'}"]`);
    if (radio) radio.checked = true;

    if (!prefs.date) {
      const today = new Date();
      const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
      prefs.date = localDate;
    }
    if (!prefs.time) {
      prefs.time = '16:00';
    }

    dateInput.value = prefs.date || '';
    timeInput.value = prefs.time || '';

    const persist = () => {
      const selectedFulfillment = document.querySelector('input[name="fulfillment"]:checked')?.value || 'Pickup';
      saveOrderPrefs({
        fulfillment: selectedFulfillment,
        date: dateInput.value,
        time: timeInput.value
      });
    };

    dateInput.addEventListener('change', persist);
    timeInput.addEventListener('change', persist);
    document.querySelectorAll('input[name="fulfillment"]').forEach((input) => input.addEventListener('change', persist));
    document.querySelectorAll('[data-picker-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.pickerTarget);
        if (!input) return;
        if (typeof input.showPicker === 'function') {
          input.showPicker();
        } else {
          input.focus();
          input.click();
        }
      });
    });
    persist();
  }

  async function hydrateCurrentUser() {
    const token = getToken();
    if (!token) return;
    try {
      const response = await api('/api/auth/me');
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      state.currentUser = response.user;
    } catch (error) {
      clearUserSession();
    }
  }

  function initLogoutButtons() {
    document.addEventListener('click', async (event) => {
      const logoutButton = event.target.closest('.re-logout-btn');
      if (!logoutButton) return;
      event.preventDefault();
      logoutButton.disabled = true;
      const originalText = logoutButton.textContent;
      logoutButton.textContent = 'Logging Out...';
      try {
        await api('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.warn(error.message);
      } finally {
        clearUserSession();
        logoutButton.disabled = false;
        logoutButton.textContent = originalText;
        window.location.href = buttonHomeHref();
      }
    });
  }

  function buttonHomeHref() {
    return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
  }

  async function init() {
    initLogoutButtons();
    updateCartBadges();
    await hydrateCurrentUser();
    updateAuthUi();

    if (document.querySelector('.re-summary')) {
      const menu = await loadMenu();
      renderOrderPage(menu);
      renderOrderSummary();
      initOrderPrefs();
    }

    if (document.querySelector('.re-cart-main')) {
      renderCartPage();
    }

    await initLoginPage();
    initContactPage();
    initCateringPage();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
