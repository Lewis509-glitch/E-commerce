// ===== PRODUCT DATA (with localStorage fallback) =====
const DEFAULT_PRODUCTS = [
{
  id: 1,
  name: 'Wireless Noise-Cancelling Headphones',
  category: 'electronics',
  price: 149.99,
  rating: 4.8,
  image: 'pdt1.jpg',
  description: 'Premium over-ear headphones with active noise cancellation and 30-hour battery life.'
},
{
  id: 2,
  name: 'Slim Fit Cotton T-Shirt',
  category: 'clothing',
  price: 24.99,
  rating: 4.3,
  image: 'pdt2.jpg',
  description: 'Comfortable 100% organic cotton t-shirt with a modern slim fit.'
},
{
  id: 3,
  name: 'Modern Ceramic Table Lamp',
  category: 'home',
  price: 59.99,
  rating: 4.6,
  image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&h=200&fit=crop&crop=center&auto=format',
  description: 'Elegant ceramic lamp with warm LED glow — perfect for any living space.'
},
{
  id: 4,
  name: 'Hydrating Facial Serum',
  category: 'beauty',
  price: 39.99,
  rating: 4.7,
  image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center&auto=format',
  description: 'Vitamin C and hyaluronic acid serum for radiant, hydrated skin.'
},
{
  id: 5,
  name: 'Smart Fitness Watch',
  category: 'electronics',
  price: 199.99,
  rating: 4.9,
  image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop&crop=center&auto=format',
  description: 'Track your heart rate, sleep, and workouts with this advanced smartwatch.'
},
{
  id: 6,
  name: 'Classic Denim Jacket',
  category: 'clothing',
  price: 79.99,
  rating: 4.4,
  image: 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=200&h=200&fit=crop&crop=center&auto=format',
  description: 'Timeless denim jacket with a relaxed fit and durable fabric.'
},
{
  id: 7,
  name: 'Aromatherapy Diffuser',
  category: 'home',
  price: 34.99,
  rating: 4.2,
  image: 'https://images.unsplash.com/photo-1587918842454-870dbd18261a?w=200&h=200&fit=crop&crop=center&auto=format',
  description: 'Ultrasonic essential oil diffuser with color-changing LED lights.'
},
{
  id: 8,
  name: 'Organic Rosewater Toner',
  category: 'beauty',
  price: 18.99,
  rating: 4.5,
  image: 'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?w=200&h=200&fit=crop&crop=center&auto=format',
  description: 'Pure rosewater toner to balance and refresh your skin.'
}];

// Load products from localStorage or use defaults
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api';
const ADMIN_FALLBACK_EMAIL = 'admin@shopverse.local';
const ADMIN_FALLBACK_PASSWORD = 'Admin123!';
let products = [];
let adminToken = sessionStorage.getItem('shopverse_token');
let adminAuthenticated = Boolean(adminToken);

function loadProducts() {
  const stored = localStorage.getItem('shopverse_products');
  if (stored) {
    try {
      products = JSON.parse(stored);
    } catch (e) {
      products = [...DEFAULT_PRODUCTS];
    }
  } else {
    products = [...DEFAULT_PRODUCTS];
  }
  products.forEach(p => { if (!p.id) p.id = Date.now() + Math.random(); });
  saveProducts();
  fetchProductsFromApi();
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
    }
  } catch (err) {
    console.warn('Backend API unavailable, using local data.', err.message);
  }
}

function saveProducts() {
  localStorage.setItem('shopverse_products', JSON.stringify(products));
}

// ===== STATE =====
let cart = [];
let currentCategory = 'all';
let searchQuery = '';

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

// Admin refs (may be null if not added)
const adminModal = document.getElementById('adminModal');
const adminOverlay = document.getElementById('adminOverlay');
const adminClose = document.getElementById('adminClose');
const adminToggle = document.getElementById('adminToggle');
const adminProductList = document.getElementById('adminProductList');
const addProductForm = document.getElementById('addProductForm');
const adminList = document.getElementById('adminList');
const addAdminForm = document.getElementById('addAdminForm');

// ===== RENDER PRODUCTS =====
function renderProducts() {
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
  cartBadge.textContent = count;
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
  cartTotalPrice.textContent = `Ksh ${getCartTotal().toFixed(2)}`;
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
document.getElementById('cartToggle').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.getElementById('cartContinueShopping').addEventListener('click', closeCart);

// ===== MOBILE MENU =====
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
menuToggle.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
  const icon = menuToggle.querySelector('i');
  icon.className = mobileNav.classList.contains('open') ? 'fas fa-times' : 'fas fa-bars';
});
mobileNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    menuToggle.querySelector('i').className = 'fas fa-bars';
  });
});

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
    if (mobileNav.classList.contains('open')) {
      mobileNav.classList.remove('open');
      menuToggle.querySelector('i').className = 'fas fa-bars';
    }
  });
});

// ===== SEARCH =====
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

function performSearch() {
  searchQuery = searchInput.value;
  renderProducts();
}
searchInput.addEventListener('input', performSearch);
searchBtn.addEventListener('click', performSearch);

// ===== CHECKOUT =====
document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }
  showToast('Order placed successfully! 🎉');
  cart = [];
  updateCartUI();
  closeCart();
});

// ===== ADMIN PANEL (only if elements exist) =====
const adminLoginSection = document.getElementById('adminLoginSection');
const adminContentSection = document.getElementById('adminContent');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

if (adminToggle && adminModal && adminOverlay && adminClose) {
  function openAdmin() {
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
  adminToggle.addEventListener('click', openAdmin);
  adminClose.addEventListener('click', closeAdmin);
  adminOverlay.addEventListener('click', closeAdmin);
  
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
  
  function loginSuccess(token) {
    adminAuthenticated = true;
    adminToken = token || null;
    if (token) sessionStorage.setItem('shopverse_token', token);
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
        if (fallbackLocalLogin(email, password)) {
          adminAuthenticated = true;
          adminToken = null;
          sessionStorage.removeItem('shopverse_token');
          setAdminView();
          showToast('Admin signed in locally.');
        } else {
          showToast('Login failed.');
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

      try {
        if (adminAuthenticated && adminToken) {
          const created = await addProductToBackend(name, category, price, rating, description, file);
          products.unshift(created);
          saveProducts();
          renderProducts();
          if (adminProductList) renderAdminProductList();
          addProductForm.reset();
          showToast('Product added successfully!');
          return;
        }
      } catch (err) {
        console.warn('Backend add failed, falling back to local product creation.', err.message);
      }

      try {
        await addProductLocally(name, category, price, rating, description, file);
      } catch (err) {
        showToast('Failed to add product.');
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