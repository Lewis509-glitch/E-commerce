// Load products from the backend first, with local fallback if API is unavailable
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api';
const ADMIN_FALLBACK_EMAIL = 'admin@shopverse.local';
const ADMIN_FALLBACK_PASSWORD = 'Admin123!';
let products = [];
let adminToken = sessionStorage.getItem('shopverse_token');
let adminAuthenticated = Boolean(adminToken);

async function loadProducts() {
  const fetched = await fetchProductsFromApi();
  if (!fetched) {
    const stored = localStorage.getItem('shopverse_products');
    if (stored) {
      try {
        products = JSON.parse(stored);
      } catch (e) {
        products = [];
      }
    } else {
      products = [];
    }
    products.forEach(p => { if (!p.id) p.id = Date.now() + Math.random(); });
    saveProducts();
    renderProducts();
  }
}

async function fetchProductsFromApi() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) throw new Error('API unavailable');
    const apiProducts = await response.json();
    if (Array.isArray(apiProducts)) {
      products = apiProducts.map(p => ({
        id: p._id || p.id || Date.now() + Math.random(),
        name: p.name,
        category: p.category,
        price: p.price,
        rating: p.rating,
        image: p.imageUrl || p.image,
        description: p.description,
      }));
      saveProducts();
      renderProducts();
      if (adminAuthenticated) renderAdminProductList();
      return true;
    }
  } catch (err) {
    console.warn('Backend API unavailable, using local data.', err.message);
  }
  return false;
}

function saveProducts() {
  localStorage.setItem('shopverse_products', JSON.stringify(products));
}

async function submitOrder(cartItems, customer = {}) {
  if (!cartItems || cartItems.length === 0) {
    throw new Error('Cart is empty.');
  }

  const orderPayload = {
    customer: {
      name: customer.name || 'Guest Shopper',
      email: customer.email || 'guest@shopverse.local',
      phone: customer.phone || '',
    },
    items: cartItems.map(item => ({
      productId: item.id,
      name: item.name,
      quantity: item.qty || 1,
      price: item.price,
    })),
    total: cartItems.reduce((sum, item) => sum + item.price * (item.qty || 1), 0),
    status: 'Processing',
  };

  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to submit order.');
  }

  return response.json();
}

function getCustomerDetails() {
  return {
    name: checkoutName?.value.trim() || 'Guest Shopper',
    email: checkoutEmail?.value.trim() || 'guest@shopverse.local',
    phone: checkoutPhone?.value.trim() || '',
  };
}

function updateCheckoutFields() {
  if (!checkoutFields) return;
  checkoutFields.style.display = cart.length > 0 ? 'block' : 'none';
}

function openWhatsAppLink(url) {
  if (!url) return;
  window.open(url, '_blank');
}

async function fetchOrders() {
  if (!adminAuthenticated || !adminToken || !ordersList) return [];
  const response = await fetch(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!response.ok) throw new Error('Unable to fetch orders.');
  return response.json();
}

function renderOrdersList(orders) {
  if (!ordersList) return;
  if (!Array.isArray(orders) || orders.length === 0) {
    ordersList.innerHTML = '<p style="color:#6b6b80;">No orders found.</p>';
    return;
  }

  ordersList.innerHTML = orders.map(order => `
    <div class="admin-product-item">
      <div class="admin-product-info">
        <strong>Order #${order._id.slice(-6)}</strong>
        <span class="admin-product-category">${new Date(order.createdAt).toLocaleString()}</span>
        <p style="margin:0.6rem 0 0 0; color:#4b5563;">${order.customer.name} — ${order.customer.email}</p>
      </div>
      <div class="admin-product-edits" style="flex:1 1 220px; justify-content:flex-end; align-items:flex-start;">
        <div style="text-align:right;">
          <div style="font-weight:700;">Ksh ${order.total.toFixed(2)}</div>
          <div style="font-size:0.9rem; color:#6b7280; margin-top:0.4rem;">${order.status}</div>
        </div>
      </div>
    </div>
  `).join('');
}

async function updateDashboardCounts() {
  if (adminProductCountEl) {
    adminProductCountEl.textContent = products.length;
  }
  if (adminUserCountEl) {
    try {
      const users = await fetchAdminUsers();
      adminUserCountEl.textContent = Array.isArray(users) ? users.length : '—';
    } catch (err) {
      adminUserCountEl.textContent = '—';
    }
  }
  if (orderSummaryCount || orderSummaryStatus) {
    try {
      const orders = await fetchOrders();
      if (orderSummaryCount) orderSummaryCount.textContent = Array.isArray(orders) ? orders.length : '0';
      if (orderSummaryStatus) {
        const latest = orders[0];
        orderSummaryStatus.textContent = latest ? latest.status : 'No orders';
      }
      renderOrdersList(orders);
    } catch (err) {
      if (orderSummaryCount) orderSummaryCount.textContent = '0';
      if (orderSummaryStatus) orderSummaryStatus.textContent = 'Unavailable';
      console.warn(err.message);
    }
  }
}

// ===== STATE =====
let cart = [];
let currentCategory = 'all';
let searchQuery = '';
let contactStatusFilter = 'All';

// ===== DOM REFS =====
const productGrid = document.getElementById('productGrid');
const productCount = document.getElementById('productCount');
const cartBadge = document.getElementById('cartBadge');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const cartFooter = document.getElementById('cartFooter');
const toast = document.getElementById('toast');
const cartToggle = document.getElementById('cartToggle');
const cartClose = document.getElementById('cartClose');
const cartContinueShopping = document.getElementById('cartContinueShopping');

// Admin refs (may be null if not added)
const adminModal = document.getElementById('adminModal');
const adminOverlay = document.getElementById('adminOverlay');
const adminClose = document.getElementById('adminClose');
const adminToggle = document.getElementById('adminToggle');
const adminProductList = document.getElementById('adminProductList');
const addProductForm = document.getElementById('addProductForm');
const adminList = document.getElementById('adminList');
const addAdminForm = document.getElementById('addAdminForm');
const adminProductCountEl = document.getElementById('adminProductCount');
const adminUserCountEl = document.getElementById('adminUserCount');
const adminContactCountEl = document.getElementById('adminContactCount');
const adminContactList = document.getElementById('adminContactList');
const adminContactFilter = document.getElementById('adminContactFilter');
const orderSummaryCount = document.getElementById('orderSummaryCount');
const orderSummaryStatus = document.getElementById('orderSummaryStatus');
const ordersList = document.getElementById('ordersList');
const checkoutFields = document.getElementById('checkoutFields');
const checkoutName = document.getElementById('checkoutName');
const checkoutEmail = document.getElementById('checkoutEmail');
const checkoutPhone = document.getElementById('checkoutPhone');
const contactForm = document.getElementById('contactForm');
const adminLoginStatus = document.getElementById('adminLoginStatus');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');

// ===== RENDER PRODUCTS =====
function renderProducts() {
  if (!productGrid || !productCount) return;
  let filtered = products;
  
  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }
  
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }
  
  productCount.textContent = `${filtered.length} items`;
  
  if (filtered.length === 0) {
    productGrid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:3rem 0; color:#8888a0;">
        <i class="fas fa-search" style="font-size:2rem; display:block; margin-bottom:1rem;"></i>
        No products found.
      </div>
    `;
    return;
  }
  
  productGrid.innerHTML = filtered.map(product => `
    <div class="product-card" data-id="${product.id}">
      <div class="product-card__image">
        <img src="${product.image || product.imageUrl}" alt="${product.name}" loading="lazy" />
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${product.category}</span>
        <h3 class="product-card__title">${product.name}</h3>
        <div class="product-card__rating">
          ${'★'.repeat(Math.floor(product.rating))}${product.rating % 1 >= 0.5 ? '★' : ''}
          <span style="color:#8888a0; font-weight:400;">(${product.rating})</span>
        </div>
        <div class="product-card__price">Ksh ${product.price.toFixed(2)}</div>
        <button class="product-card__add" data-id="${product.id}">
          <i class="fas fa-plus"></i> Add to Cart
        </button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.product-card__add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      addToCart(id);
    });
  });
}

// ===== CART LOGIC =====
function addToCart(productId) {
  const id = String(productId);
  const product = products.find(p => String(p.id) === id);
  if (!product) return;
  const existing = cart.find(item => String(item.id) === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCartUI();
  showToast(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
  const id = String(productId);
  cart = cart.filter(item => String(item.id) !== id);
  updateCartUI();
}

function updateQty(productId, delta) {
  const id = String(productId);
  const item = cart.find(i => String(i.id) === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
  } else {
    updateCartUI();
  }
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartItemCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartUI() {
  const count = getCartItemCount();
  if (cartBadge) cartBadge.textContent = count;
  if (!cartItems || !cartEmpty || !cartFooter) {
    if (cartTotalPrice) cartTotalPrice.textContent = `Ksh ${getCartTotal().toFixed(2)}`;
    updateCheckoutFields();
    return;
  }

  if (cart.length === 0) {
    cartItems.innerHTML = '';
    cartEmpty.style.display = 'block';
    cartFooter.style.display = 'none';
  } else {
    cartEmpty.style.display = 'none';
    cartFooter.style.display = 'block';
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item__image">
          <img src="${item.image}" alt="${item.name}" />
        </div>
        <div class="cart-item__info">
          <div class="cart-item__title">${item.name}</div>
          <div class="cart-item__price">Ksh ${item.price.toFixed(2)}</div>
          <div class="cart-item__qty">
            <button data-id="${item.id}" data-delta="-1">−</button>
            <span>${item.qty}</span>
            <button data-id="${item.id}" data-delta="1">+</button>
          </div>
        </div>
        <button class="cart-item__remove" data-id="${item.id}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `).join('');
    document.querySelectorAll('.cart-item__qty button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const delta = Number(btn.dataset.delta);
        updateQty(id, delta);
      });
    });
    document.querySelectorAll('.cart-item__remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        removeFromCart(id);
        showToast('Item removed from cart.');
      });
    });
  }
  if (cartTotalPrice) cartTotalPrice.textContent = `Ksh ${getCartTotal().toFixed(2)}`;
  updateCheckoutFields();
}

// ===== TOAST =====

let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ===== CART SIDEBAR =====
function openCart() {
  cartSidebar.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
if (cartToggle) cartToggle.addEventListener('click', openCart);
if (cartClose) cartClose.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
if (cartContinueShopping) cartContinueShopping.addEventListener('click', closeCart);

// ===== MOBILE MENU =====
if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const icon = menuToggle.querySelector('i');
    icon.className = mobileNav.classList.contains('open') ? 'fas fa-times' : 'fas fa-bars';
  });
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      const icon = menuToggle.querySelector('i');
      if (icon) icon.className = 'fas fa-bars';
    });
  });
}

// ===== CATEGORY FILTERING =====
function setActiveCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.header__nav-list a, .header__mobile-nav a, .footer__links a[data-category]').forEach(link => {
    link.classList.toggle('active', link.dataset.category === category);
  });
  document.querySelectorAll('.pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === category);
  });
  renderProducts();
}
document.querySelectorAll('.header__nav-list a, .header__mobile-nav a, .footer__links a[data-category], .pill').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const category = el.dataset.category;
    if (category) setActiveCategory(category);
    if (mobileNav && mobileNav.classList.contains('open')) {
      mobileNav.classList.remove('open');
      if (menuToggle) {
        const icon = menuToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      }
    }
  });
});

// ===== SEARCH =====
function performSearch() {
  if (!searchInput) return;
  searchQuery = searchInput.value;
  renderProducts();
}
if (searchInput) searchInput.addEventListener('input', performSearch);
if (searchBtn) searchBtn.addEventListener('click', performSearch);

// ===== CHECKOUT =====
if (checkoutBtn) checkoutBtn.addEventListener('click', async () => {
  if (cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }

  const customer = getCustomerDetails();
  if (!customer.name || !customer.email || !customer.phone) {
    showToast('Please add your name, email, and phone before checkout.');
    return;
  }

  try {
    const result = await submitOrder(cart, customer);
    showToast('Order placed successfully! 🎉');
    if (result.whatsappUrl) {
      openWhatsAppLink(result.whatsappUrl);
    }
  } catch (err) {
    console.warn('Order API failed:', err.message);
    showToast('Order placed locally. Database connection failed.');
  }

  cart = [];
  updateCartUI();
  closeCart();
});

// ===== CONTACT + ADMIN PANEL (only if elements exist) =====
const adminLoginSection = document.getElementById('adminLoginSection');
const adminContentSection = document.getElementById('adminContent');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    if (!name || !email || !phone || !message) {
      showToast('Please fill in all contact fields.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Unable to send contact request.');
      }
      const result = await response.json();
      showToast('Contact request sent!');
      if (result.whatsappUrl) {
        openWhatsAppLink(result.whatsappUrl);
      }
      contactForm.reset();
    } catch (err) {
      console.warn(err.message);
      showToast('Unable to send contact request. Please try again later.');
    }
  });
}

if (adminLoginForm) {
  function openAdmin() {
    if (!adminModal || !adminOverlay) return;
    adminModal.classList.add('open');
    adminOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setAdminView();
  }
  
  function closeAdmin() {
    adminModal.classList.remove('open');
    adminOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (adminToggle) adminToggle.addEventListener('click', openAdmin);
  if (adminClose) adminClose.addEventListener('click', closeAdmin);
  if (adminOverlay) adminOverlay.addEventListener('click', closeAdmin);
  
  async function backendLogin(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed');
    }
    const data = await response.json();
    return data.token;
  }
  
  function fallbackLocalLogin(email, password) {
    return email === ADMIN_FALLBACK_EMAIL && password === ADMIN_FALLBACK_PASSWORD;
  }
  
  function updateLoginStatus(message, isError = false) {
    if (!adminLoginStatus) return;
    adminLoginStatus.textContent = message;
    adminLoginStatus.style.color = isError ? '#dc2626' : '#1f2937';
  }

  function loginSuccess(token) {
    adminAuthenticated = true;
    adminToken = token || null;
    if (token) sessionStorage.setItem('shopverse_token', token);
    updateLoginStatus('Signed in successfully.', false);
    setAdminView();
    showToast('Admin signed in.');
  }
  
  function logoutAdmin() {
    adminAuthenticated = false;
    adminToken = null;
    sessionStorage.removeItem('shopverse_token');
    setAdminView();
    showToast('Admin signed out.');
  }

  async function fetchAdminUsers() {
    if (!adminAuthenticated || !adminToken) return [];
    const response = await fetch(`${API_BASE}/admins`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!response.ok) throw new Error('Unable to load admins.');
    return response.json();
  }

  async function fetchContactRequests() {
    if (!adminAuthenticated || !adminToken) return [];
    const response = await fetch(`${API_BASE}/contacts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!response.ok) throw new Error('Unable to load contact requests.');
    return response.json();
  }

  async function updateContactStatus(id, status) {
    if (!adminAuthenticated || !adminToken) return null;
    const response = await fetch(`${API_BASE}/contacts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Unable to update contact status.');
    }
    return response.json();
  }

  async function renderContactRequests() {
    if (!adminContactList) return;
    try {
      const contacts = await fetchContactRequests();
      if (!Array.isArray(contacts) || contacts.length === 0) {
        adminContactList.innerHTML = '<p style="color:#6b6b80;">No contact requests yet.</p>';
        if (adminContactCountEl) adminContactCountEl.textContent = '0';
        return;
      }

      const visibleContacts = contacts.filter(contact =>
        contactStatusFilter === 'All' || contact.status === contactStatusFilter
      );

      if (visibleContacts.length === 0) {
        adminContactList.innerHTML = `<p style="color:#6b6b80;">No ${contactStatusFilter.toLowerCase()} contact requests.</p>`;
        if (adminContactCountEl) adminContactCountEl.textContent = '0';
        return;
      }

      adminContactList.innerHTML = visibleContacts.map(contact => {
        const statusTag = contact.status === 'New'
          ? '<span class="admin-product-category" style="background:#fef3c7;color:#92400e;">New</span>'
          : '<span class="admin-product-category" style="background:#dcfce7;color:#166534;">Read</span>';
        const actionButton = contact.status === 'New'
          ? `<button class="btn btn-outline admin-mark-read" data-id="${contact._id}">Mark as read</button>`
          : '';

        return `
          <div class="admin-product-item">
            <div class="admin-product-info">
              <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.5rem;">
                <strong>${contact.name}</strong>
                ${statusTag}
              </div>
              <div class="admin-product-category">${contact.email} · ${contact.phone}</div>
              <p style="margin:0.6rem 0 0 0; color:#4b5563;">${contact.message}</p>
            </div>
            <div style="text-align:right; min-width:140px; display:flex; flex-direction:column; gap:0.8rem; align-items:flex-end;">
              <div style="font-size:0.85rem; color:#6b7280;">${new Date(contact.createdAt).toLocaleString()}</div>
              ${actionButton}
            </div>
          </div>
        `;
      }).join('');

      if (adminContactCountEl) adminContactCountEl.textContent = String(visibleContacts.length);
      document.querySelectorAll('.admin-mark-read').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          try {
            await updateContactStatus(id, 'Read');
            showToast('Contact request marked as read.');
            renderContactRequests();
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    } catch (err) {
      if (adminContactList) adminContactList.innerHTML = '<p style="color:#e53e3e;">Unable to load contact requests.</p>';
      console.warn(err.message);
    }
  }

  async function renderAdminUsers() {
    if (!adminList) return;
    try {
      const admins = await fetchAdminUsers();
      if (!Array.isArray(admins) || admins.length === 0) {
        adminList.innerHTML = '<p style="color:#6b6b80;">No admin users found.</p>';
        return;
      }

      adminList.innerHTML = admins.map(admin => `
        <div class="admin-product-item" data-id="${admin._id}">
          <div class="admin-product-info">
            <strong>${admin.email}</strong>
          </div>
          <button class="admin-delete-btn admin-delete-admin" data-id="${admin._id}">Remove</button>
        </div>
      `).join('');

      document.querySelectorAll('.admin-delete-admin').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm('Remove this admin?')) return;
          try {
            const response = await fetch(`${API_BASE}/admins/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${adminToken}` },
            });
            if (!response.ok) throw new Error('Could not delete admin.');
            showToast('Admin removed.');
            renderAdminUsers();
            renderContactRequests();
          } catch (err) {
            showToast('Unable to remove admin.');
          }
        });
      });
    } catch (err) {
      adminList.innerHTML = `<p style="color:#e53e3e;">Unable to load admins.</p>`;
      console.warn(err.message);
    }
  }

  async function addAdminUser(email, password) {
    const response = await fetch(`${API_BASE}/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Unable to add admin.');
    }
    return response.json();
  }

  function setAdminView() {
    if (!adminLoginSection || !adminContentSection) return;
    if (adminAuthenticated) {
      adminLoginSection.style.display = 'none';
      adminContentSection.style.display = 'block';
      if (adminLogoutBtn) adminLogoutBtn.style.display = 'inline-flex';
      renderAdminProductList();
      renderAdminUsers();
      renderContactRequests();
      updateDashboardCounts();
    } else {
      adminLoginSection.style.display = 'block';
      adminContentSection.style.display = 'none';
      if (adminLogoutBtn) adminLogoutBtn.style.display = 'none';
    }
  }

  function renderAdminProductList() {
    if (!adminProductList) return;
    adminProductList.innerHTML = products.map(p => `
      <div class="admin-product-item" data-id="${p.id}">
        <div class="admin-product-info">
          <strong>${p.name}</strong>
          <span class="admin-product-category">${p.category}</span>
        </div>
        <div class="admin-product-edits">
          <label>Price Ksh <input type="number" step="0.01" class="admin-edit-price" value="${p.price}" data-id="${p.id}" /></label>
          <label>Upload Image <input type="file" class="admin-edit-image" data-id="${p.id}" accept="image/*" /></label>
          <button class="admin-delete-btn" data-id="${p.id}"><i class="fas fa-trash-alt"></i> Delete</button>
        </div>
      </div>
    `).join('');
    
    document.querySelectorAll('.admin-edit-price').forEach(input => {
      input.addEventListener('change', function() {
        const id = this.dataset.id;
        const newPrice = parseFloat(this.value);
        if (!isNaN(newPrice) && newPrice >= 0) {
          const product = products.find(p => String(p.id) === id);
          if (product) {
            product.price = newPrice;
            saveProducts();
            renderProducts();
            showToast('Price updated!');
          }
        }
      });
    });
    
    document.querySelectorAll('.admin-edit-image').forEach(input => {
      input.addEventListener('change', function() {
        const id = this.dataset.id;
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const product = products.find(p => String(p.id) === id);
          if (product) {
            product.image = reader.result;
            saveProducts();
            renderProducts();
            showToast('Image updated!');
          }
        };
        reader.readAsDataURL(file);
      });
    });
    
    document.querySelectorAll('.admin-delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const id = this.dataset.id;
        if (!confirm('Delete this product?')) return;
        const product = products.find(p => String(p.id) === id);
        if (product) {
          if (adminAuthenticated && adminToken) {
            try {
              const response = await fetch(`${API_BASE}/products/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${adminToken}` },
              });
              if (!response.ok) throw new Error('Could not delete product.');
            } catch (err) {
              console.warn('Delete API failed, removing locally instead.');
            }
          }
          products = products.filter(p => String(p.id) !== id);
          saveProducts();
          renderProducts();
          renderAdminProductList();
          showToast('Product deleted.');
        }
      });
    });
  }
  
  async function addProductLocally(name, category, price, rating, description, file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newProduct = {
          id: Date.now() + Math.random(),
          name,
          category,
          price,
          rating: Math.min(5, Math.max(0, rating)),
          image: reader.result,
          description,
        };
        products.push(newProduct);
        saveProducts();
        renderProducts();
        if (adminProductList) renderAdminProductList();
        addProductForm.reset();
        showToast('Product added locally.');
        resolve(newProduct);
      };
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });
  }
  
  async function addProductToBackend(name, category, price, rating, description, file) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('rating', rating);
    formData.append('description', description);
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add product.');
    }
    const created = await response.json();
    return {
      id: created._id || created.id || Date.now() + Math.random(),
      name: created.name,
      category: created.category,
      price: created.price,
      rating: created.rating,
      image: created.imageUrl || created.image,
      description: created.description,
    };
  }
  
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value.trim();
      if (!email || !password) {
        showToast('Please enter both email and password.');
        return;
      }
      try {
        const token = await backendLogin(email, password);
        loginSuccess(token);
        fetchProductsFromApi();
      } catch (err) {
        const msg = err.message || 'Login failed.';
        if (fallbackLocalLogin(email, password)) {
          if (ordersList) {
            updateLoginStatus('Backend access is required to view orders. Start the server and try again.', true);
            showToast('Orders page requires backend login.');
          } else {
            adminAuthenticated = true;
            adminToken = null;
            sessionStorage.removeItem('shopverse_token');
            updateLoginStatus('Signed in locally. Backend login is required to save products to MongoDB.', false);
            setAdminView();
            showToast('Admin signed in locally.');
          }
        } else {
          updateLoginStatus(msg, true);
          showToast(msg);
        }
      }
    });
  }

  if (addAdminForm) {
    addAdminForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!adminAuthenticated || !adminToken) {
        showToast('Please sign in through the backend to manage admins.');
        return;
      }
      const email = document.getElementById('newAdminEmail').value.trim();
      const password = document.getElementById('newAdminPassword').value.trim();
      if (!email || !password) {
        showToast('Please provide email and password.');
        return;
      }
      try {
        await addAdminUser(email, password);
        document.getElementById('newAdminEmail').value = '';
        document.getElementById('newAdminPassword').value = '';
        showToast('New admin added.');
        renderAdminUsers();
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', logoutAdmin);
  }

  if (adminContactFilter) {
    adminContactFilter.addEventListener('change', () => {
      contactStatusFilter = adminContactFilter.value;
      renderContactRequests();
    });
  }
  
  if (addProductForm) {
    addProductForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('addName').value.trim();
      const category = document.getElementById('addCategory').value;
      const price = parseFloat(document.getElementById('addPrice').value);
      const rating = parseFloat(document.getElementById('addRating').value);
      const fileInput = document.getElementById('addImage');
      const description = document.getElementById('addDescription').value.trim();
      const file = fileInput.files[0];

      if (!name || !category || isNaN(price) || isNaN(rating) || !file || !description) {
        showToast('Please fill all fields and select an image.');
        return;
      }

      if (!adminAuthenticated || !adminToken) {
        showToast('Please sign in to the backend to save products to MongoDB.');
        return;
      }

      try {
        const created = await addProductToBackend(name, category, price, rating, description, file);
        products.unshift(created);
        saveProducts();
        renderProducts();
        if (adminProductList) renderAdminProductList();
        addProductForm.reset();
        showToast('Product added successfully!');
      } catch (err) {
        console.warn('Backend add failed.', err.message);
        showToast('Unable to save product to backend. Check server status and login.');
      }
    });
  }
}

// ===== INIT =====
loadProducts();
renderProducts();
updateCartUI();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCart();
    if (adminModal && adminModal.classList.contains('open')) closeAdmin();
  }
});