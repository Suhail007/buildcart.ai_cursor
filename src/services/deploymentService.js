const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const emailService = require('./emailService');

const prisma = new PrismaClient();

class DeploymentService {
  constructor() {
    this.buildDir = path.join(__dirname, '../../builds');
    this.templatesDir = path.join(__dirname, '../templates');
    this.ensureBuildDirectory();
  }

  // Ensure build directory exists
  async ensureBuildDirectory() {
    try {
      await fs.mkdir(this.buildDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create build directory:', error);
    }
  }

  // Deploy store
  async deployStore(storeId, environment = 'production') {
    try {
      // Get store data
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
          user: true,
          products: {
            where: { isActive: true },
            include: { variants: true }
          },
          customers: true
        }
      });

      if (!store) {
        throw new Error('Store not found');
      }

      // Create deployment record
      const deployment = await prisma.deployment.create({
        data: {
          storeId,
          version: this.generateVersion(),
          status: 'BUILDING',
          environment,
          config: {
            store: store,
            environment,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Update store status
      await prisma.store.update({
        where: { id: storeId },
        data: { 
          status: 'PUBLISHED',
          isDeployed: true
        }
      });

      // Generate static site
      const buildPath = await this.generateStaticSite(store, deployment);

      // Update deployment with success
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: 'SUCCESS',
          url: this.generateStoreUrl(store),
          deployedAt: new Date(),
          buildLogs: 'Build completed successfully'
        }
      });

      // Update store with deployment URL
      await prisma.store.update({
        where: { id: storeId },
        data: { 
          deploymentUrl: this.generateStoreUrl(store)
        }
      });

      // Send deployment notification
      try {
        await emailService.sendStoreDeploymentNotification(store, deployment);
      } catch (error) {
        logger.error('Failed to send deployment notification:', error);
      }

      logger.info(`Store deployed successfully: ${store.name} (${deployment.id})`);

      return {
        deployment,
        url: this.generateStoreUrl(store),
        buildPath
      };

    } catch (error) {
      logger.error('Deployment failed:', error);
      
      // Update deployment with failure
      if (deployment) {
        await prisma.deployment.update({
          where: { id: deployment.id },
          data: {
            status: 'FAILED',
            buildLogs: error.message
          }
        });
      }

      throw error;
    }
  }

  // Generate static site from store configuration
  async generateStaticSite(store, deployment) {
    const buildPath = path.join(this.buildDir, store.slug);
    
    try {
      // Create build directory
      await fs.mkdir(buildPath, { recursive: true });

      // Generate HTML pages
      await this.generateHomePage(store, buildPath);
      await this.generateProductsPage(store, buildPath);
      await this.generateProductPages(store, buildPath);
      await this.generateCartPage(store, buildPath);
      await this.generateCheckoutPage(store, buildPath);
      await this.generateContactPage(store, buildPath);
      await this.generateAboutPage(store, buildPath);

      // Generate CSS
      await this.generateStyles(store, buildPath);

      // Generate JavaScript
      await this.generateScripts(store, buildPath);

      // Copy assets
      await this.copyAssets(buildPath);

      // Generate sitemap
      await this.generateSitemap(store, buildPath);

      // Generate robots.txt
      await this.generateRobotsTxt(store, buildPath);

      return buildPath;

    } catch (error) {
      logger.error('Failed to generate static site:', error);
      throw error;
    }
  }

  // Generate home page
  async generateHomePage(store, buildPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${store.metaTitle || store.name}</title>
    <meta name="description" content="${store.metaDescription || store.description}">
    <link rel="stylesheet" href="/styles.css">
    <link rel="canonical" href="${this.generateStoreUrl(store)}">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1>${store.name}</h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/cart" class="cart-link">Cart (<span id="cart-count">0</span>)</a></li>
            </ul>
        </nav>
    </header>

    <main class="main">
        <section class="hero">
            <div class="hero-content">
                <h2>Welcome to ${store.name}</h2>
                <p>${store.description || 'Discover amazing products at great prices.'}</p>
                <a href="/products" class="btn btn-primary">Shop Now</a>
            </div>
        </section>

        <section class="featured-products">
            <h3>Featured Products</h3>
            <div class="products-grid">
                ${store.products.slice(0, 6).map(product => `
                    <div class="product-card">
                        <img src="${product.images[0] || '/placeholder.jpg'}" alt="${product.name}">
                        <h4>${product.name}</h4>
                        <p class="price">$${product.price}</p>
                        <button class="btn btn-secondary" onclick="addToCart('${product.id}')">Add to Cart</button>
                    </div>
                `).join('')}
            </div>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2024 ${store.name}. All rights reserved.</p>
    </footer>

    <script src="/scripts.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(buildPath, 'index.html'), html);
  }

  // Generate products page
  async generateProductsPage(store, buildPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - ${store.name}</title>
    <meta name="description" content="Browse our collection of products">
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1><a href="/">${store.name}</a></h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/cart" class="cart-link">Cart (<span id="cart-count">0</span>)</a></li>
            </ul>
        </nav>
    </header>

    <main class="main">
        <section class="products-section">
            <h2>All Products</h2>
            <div class="products-grid">
                ${store.products.map(product => `
                    <div class="product-card">
                        <img src="${product.images[0] || '/placeholder.jpg'}" alt="${product.name}">
                        <h4>${product.name}</h4>
                        <p class="description">${product.shortDescription || product.description}</p>
                        <p class="price">$${product.price}</p>
                        <button class="btn btn-secondary" onclick="addToCart('${product.id}')">Add to Cart</button>
                    </div>
                `).join('')}
            </div>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2024 ${store.name}. All rights reserved.</p>
    </footer>

    <script src="/scripts.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(buildPath, 'products.html'), html);
  }

  // Generate individual product pages
  async generateProductPages(store, buildPath) {
    const productsDir = path.join(buildPath, 'product');
    await fs.mkdir(productsDir, { recursive: true });

    for (const product of store.products) {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${product.name} - ${store.name}</title>
    <meta name="description" content="${product.metaDescription || product.description}">
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1><a href="/">${store.name}</a></h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/cart" class="cart-link">Cart (<span id="cart-count">0</span>)</a></li>
            </ul>
        </nav>
    </header>

    <main class="main">
        <section class="product-detail">
            <div class="product-images">
                <img src="${product.images[0] || '/placeholder.jpg'}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h1>${product.name}</h1>
                <p class="description">${product.description}</p>
                <p class="price">$${product.price}</p>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="addToCart('${product.id}')">Add to Cart</button>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2024 ${store.name}. All rights reserved.</p>
    </footer>

    <script src="/scripts.js"></script>
</body>
</html>`;

      const filename = product.urlHandle || product.id;
      await fs.writeFile(path.join(productsDir, `${filename}.html`), html);
    }
  }

  // Generate cart page
  async generateCartPage(store, buildPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cart - ${store.name}</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1><a href="/">${store.name}</a></h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/cart" class="cart-link">Cart (<span id="cart-count">0</span>)</a></li>
            </ul>
        </nav>
    </header>

    <main class="main">
        <section class="cart-section">
            <h2>Shopping Cart</h2>
            <div id="cart-items">
                <!-- Cart items will be populated by JavaScript -->
            </div>
            <div class="cart-total">
                <h3>Total: $<span id="cart-total">0.00</span></h3>
                <button class="btn btn-primary" onclick="proceedToCheckout()">Proceed to Checkout</button>
            </div>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2024 ${store.name}. All rights reserved.</p>
    </footer>

    <script src="/scripts.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(buildPath, 'cart.html'), html);
  }

  // Generate checkout page
  async generateCheckoutPage(store, buildPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout - ${store.name}</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1><a href="/">${store.name}</a></h1>
            </div>
        </nav>
    </header>

    <main class="main">
        <section class="checkout-section">
            <h2>Checkout</h2>
            <form id="checkout-form" class="checkout-form">
                <div class="form-section">
                    <h3>Contact Information</h3>
                    <input type="email" name="email" placeholder="Email" required>
                    <input type="tel" name="phone" placeholder="Phone">
                </div>
                
                <div class="form-section">
                    <h3>Shipping Address</h3>
                    <input type="text" name="firstName" placeholder="First Name" required>
                    <input type="text" name="lastName" placeholder="Last Name" required>
                    <input type="text" name="address" placeholder="Address" required>
                    <input type="text" name="city" placeholder="City" required>
                    <input type="text" name="state" placeholder="State" required>
                    <input type="text" name="zip" placeholder="ZIP Code" required>
                    <input type="text" name="country" placeholder="Country" required>
                </div>

                <div class="form-section">
                    <h3>Payment Information</h3>
                    <input type="text" name="cardNumber" placeholder="Card Number" required>
                    <input type="text" name="expiry" placeholder="MM/YY" required>
                    <input type="text" name="cvv" placeholder="CVV" required>
                </div>

                <button type="submit" class="btn btn-primary">Place Order</button>
            </form>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2024 ${store.name}. All rights reserved.</p>
    </footer>

    <script src="/scripts.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(buildPath, 'checkout.html'), html);
  }

  // Generate contact page
  async generateContactPage(store, buildPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact - ${store.name}</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1><a href="/">${store.name}</a></h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/cart" class="cart-link">Cart (<span id="cart-count">0</span>)</a></li>
            </ul>
        </nav>
    </header>

    <main class="main">
        <section class="contact-section">
            <h2>Contact Us</h2>
            <p>Get in touch with us for any questions or support.</p>
            <form class="contact-form">
                <input type="text" name="name" placeholder="Your Name" required>
                <input type="email" name="email" placeholder="Your Email" required>
                <textarea name="message" placeholder="Your Message" required></textarea>
                <button type="submit" class="btn btn-primary">Send Message</button>
            </form>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2024 ${store.name}. All rights reserved.</p>
    </footer>

    <script src="/scripts.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(buildPath, 'contact.html'), html);
  }

  // Generate about page
  async generateAboutPage(store, buildPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About - ${store.name}</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1><a href="/">${store.name}</a></h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/cart" class="cart-link">Cart (<span id="cart-count">0</span>)</a></li>
            </ul>
        </nav>
    </header>

    <main class="main">
        <section class="about-section">
            <h2>About ${store.name}</h2>
            <p>${store.description || 'We are dedicated to providing quality products and excellent service to our customers.'}</p>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2024 ${store.name}. All rights reserved.</p>
    </footer>

    <script src="/scripts.js"></script>
</body>
</html>`;

    await fs.writeFile(path.join(buildPath, 'about.html'), html);
  }

  // Generate CSS styles
  async generateStyles(store, buildPath) {
    const theme = store.theme || {};
    const primaryColor = theme.primaryColor || '#3B82F6';
    const secondaryColor = theme.secondaryColor || '#1F2937';

    const css = `
/* Reset and base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
    color: #333;
}

/* Header */
.header {
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 100;
}

.nav {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-brand h1 {
    color: ${primaryColor};
    font-size: 1.5rem;
}

.nav-brand a {
    text-decoration: none;
    color: inherit;
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.nav-menu a {
    text-decoration: none;
    color: #333;
    font-weight: 500;
    transition: color 0.3s;
}

.nav-menu a:hover {
    color: ${primaryColor};
}

/* Main content */
.main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

/* Hero section */
.hero {
    background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
    color: white;
    padding: 4rem 2rem;
    text-align: center;
    border-radius: 12px;
    margin-bottom: 3rem;
}

.hero h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

.hero p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
}

/* Buttons */
.btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-primary {
    background: ${primaryColor};
    color: white;
}

.btn-primary:hover {
    background: ${secondaryColor};
    transform: translateY(-2px);
}

.btn-secondary {
    background: #f3f4f6;
    color: #333;
    border: 1px solid #d1d5db;
}

.btn-secondary:hover {
    background: #e5e7eb;
}

/* Products grid */
.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.product-card {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.3s;
}

.product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.product-card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 6px;
    margin-bottom: 1rem;
}

.product-card h4 {
    margin-bottom: 0.5rem;
    color: #333;
}

.product-card .description {
    color: #666;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.product-card .price {
    font-size: 1.2rem;
    font-weight: bold;
    color: ${primaryColor};
    margin-bottom: 1rem;
}

/* Product detail */
.product-detail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    margin-top: 2rem;
}

.product-images img {
    width: 100%;
    border-radius: 8px;
}

.product-info h1 {
    margin-bottom: 1rem;
    color: #333;
}

.product-info .description {
    color: #666;
    margin-bottom: 2rem;
    line-height: 1.8;
}

.product-info .price {
    font-size: 2rem;
    font-weight: bold;
    color: ${primaryColor};
    margin-bottom: 2rem;
}

/* Cart */
.cart-section {
    max-width: 800px;
    margin: 0 auto;
}

.cart-total {
    margin-top: 2rem;
    padding: 2rem;
    background: #f9fafb;
    border-radius: 8px;
    text-align: right;
}

/* Checkout form */
.checkout-form {
    max-width: 600px;
    margin: 0 auto;
}

.form-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
}

.form-section h3 {
    margin-bottom: 1rem;
    color: #333;
}

.checkout-form input,
.checkout-form textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 1rem;
}

.checkout-form textarea {
    height: 100px;
    resize: vertical;
}

/* Contact form */
.contact-form {
    max-width: 500px;
    margin: 0 auto;
}

.contact-form input,
.contact-form textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 1rem;
}

.contact-form textarea {
    height: 150px;
    resize: vertical;
}

/* Footer */
.footer {
    background: #f9fafb;
    text-align: center;
    padding: 2rem;
    margin-top: 4rem;
    color: #666;
}

/* Responsive */
@media (max-width: 768px) {
    .nav {
        flex-direction: column;
        gap: 1rem;
    }
    
    .nav-menu {
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .product-detail {
        grid-template-columns: 1fr;
        gap: 2rem;
    }
    
    .hero h2 {
        font-size: 2rem;
    }
    
    .products-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }
}`;

    await fs.writeFile(path.join(buildPath, 'styles.css'), css);
  }

  // Generate JavaScript
  async generateScripts(store, buildPath) {
    const js = `
// Cart functionality
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function addToCart(productId) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: productId, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    // Show notification
    showNotification('Product added to cart!');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    displayCart();
}

function updateQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = parseInt(quantity);
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            displayCart();
        }
    }
}

function displayCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Your cart is empty.</p>';
        cartTotal.textContent = '0.00';
        return;
    }
    
    // This would typically fetch product details from an API
    // For now, we'll show a simple representation
    const cartHTML = cart.map(item => \`
        <div class="cart-item">
            <span>Product \${item.id}</span>
            <input type="number" value="\${item.quantity}" min="1" 
                   onchange="updateQuantity('\${item.id}', this.value)">
            <button onclick="removeFromCart('\${item.id}')">Remove</button>
        </div>
    \`).join('');
    
    cartItems.innerHTML = cartHTML;
    cartTotal.textContent = (cart.length * 9.99).toFixed(2); // Placeholder price
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!');
        return;
    }
    window.location.href = '/checkout.html';
}

// Checkout form handling
document.addEventListener('DOMContentLoaded', function() {
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Collect form data
            const formData = new FormData(checkoutForm);
            const orderData = Object.fromEntries(formData);
            
            // Add cart data
            orderData.items = cart;
            orderData.total = (cart.length * 9.99).toFixed(2);
            
            // Submit order (this would typically go to your API)
            console.log('Order data:', orderData);
            
            // Clear cart
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Show success message
            showNotification('Order placed successfully!');
            
            // Redirect to home
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        });
    }
    
    // Initialize cart count
    updateCartCount();
    
    // Display cart if on cart page
    if (window.location.pathname === '/cart.html') {
        displayCart();
    }
});

// Contact form handling
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Collect form data
            const formData = new FormData(contactForm);
            const contactData = Object.fromEntries(formData);
            
            // Submit contact form (this would typically go to your API)
            console.log('Contact data:', contactData);
            
            // Show success message
            showNotification('Message sent successfully!');
            
            // Reset form
            contactForm.reset();
        });
    }
});

// Notification system
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${store.theme?.primaryColor || '#3B82F6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    \`;
    notification.textContent = message;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = \`
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    \`;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}`;

    await fs.writeFile(path.join(buildPath, 'scripts.js'), js);
  }

  // Copy assets
  async copyAssets(buildPath) {
    const assetsDir = path.join(buildPath, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });
    
    // Copy placeholder image
    const placeholderImage = path.join(__dirname, '../assets/placeholder.jpg');
    try {
      await fs.copyFile(placeholderImage, path.join(assetsDir, 'placeholder.jpg'));
    } catch (error) {
      // Create a simple placeholder if file doesn't exist
      logger.warn('Placeholder image not found, creating simple one');
    }
  }

  // Generate sitemap
  async generateSitemap(store, buildPath) {
    const baseUrl = this.generateStoreUrl(store);
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/products</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/about</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
    <url>
        <loc>${baseUrl}/contact</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
    ${store.products.map(product => `
    <url>
        <loc>${baseUrl}/product/${product.urlHandle || product.id}</loc>
        <lastmod>${new Date(product.updatedAt).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
    `).join('')}
</urlset>`;

    await fs.writeFile(path.join(buildPath, 'sitemap.xml'), sitemap);
  }

  // Generate robots.txt
  async generateRobotsTxt(store, buildPath) {
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${this.generateStoreUrl(store)}/sitemap.xml`;

    await fs.writeFile(path.join(buildPath, 'robots.txt'), robotsTxt);
  }

  // Generate store URL
  generateStoreUrl(store) {
    if (store.customDomain) {
      return `https://${store.customDomain}`;
    }
    return `https://${store.slug}${process.env.SUBDOMAIN_SUFFIX || '.stores.buildcart.ai'}`;
  }

  // Generate version
  generateVersion() {
    return `v${Date.now()}`;
  }

  // Get deployment status
  async getDeploymentStatus(deploymentId) {
    return await prisma.deployment.findUnique({
      where: { id: deploymentId }
    });
  }

  // Rollback deployment
  async rollbackDeployment(storeId, version) {
    const deployment = await prisma.deployment.findFirst({
      where: {
        storeId,
        version,
        status: 'SUCCESS'
      }
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // Update store to use previous deployment
    await prisma.store.update({
      where: { id: storeId },
      data: {
        deploymentUrl: deployment.url
      }
    });

    logger.info(`Deployment rolled back: ${storeId} to ${version}`);
    return deployment;
  }

  // Setup custom domain
  async setupCustomDomain(storeId, domain) {
    // Validate domain
    if (!this.isValidDomain(domain)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain is available
    const existingStore = await prisma.store.findFirst({
      where: { customDomain: domain }
    });

    if (existingStore && existingStore.id !== storeId) {
      throw new Error('Domain is already in use');
    }

    // Update store with custom domain
    await prisma.store.update({
      where: { id: storeId },
      data: { customDomain: domain }
    });

    logger.info(`Custom domain setup: ${domain} for store ${storeId}`);
    return { domain, url: `https://${domain}` };
  }

  // Enable SSL
  async enableSSL(domain) {
    // This would typically integrate with a certificate provider
    // For now, we'll just log the request
    logger.info(`SSL certificate requested for: ${domain}`);
    return { domain, sslEnabled: true };
  }

  // Validate domain
  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }
}

module.exports = new DeploymentService(); 