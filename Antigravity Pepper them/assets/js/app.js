/* PEPPER THEM - GLOBAL APP CONTROLLER */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initScrollAnimations();
  initCartCounter();
  registerServiceWorker();
});

// Mobile Hamburger Menu & Scroll Header Toggle
function initNavigation() {
  const header = document.querySelector('.header');
  const hamburger = document.querySelector('.hamburger');
  const mobileOverlay = document.querySelector('.mobile-overlay');
  
  if (!header) return;

  // Sticky Header on Scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
  
  // Set scrolled class on refresh if already page scrolled
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  }

  // Hamburger Toggle
  if (hamburger && mobileOverlay) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = hamburger.classList.toggle('active');
      mobileOverlay.classList.toggle('active', isActive);
      document.body.style.overflow = isActive ? 'hidden' : '';
    });

    // Close menu when clicking navigation links
    const mobileLinks = mobileOverlay.querySelectorAll('.nav-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // Highlighting active nav link based on URL
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (currentPath.endsWith(href) || (currentPath === '/' && href === 'index.html'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Scroll Entry Animations utilizing IntersectionObserver
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const observerOptions = {
      root: null, // viewport
      threshold: 0.15, // trigger when 15% of element is visible
      rootMargin: '0px 0px -50px 0px' // offset target slightly
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // only animate once
        }
      });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback if IntersectionObserver is not supported
    revealElements.forEach(el => el.classList.add('revealed'));
  }
}

// Global Cart Counter Synchronization
function initCartCounter() {
  updateCartBadge();
  
  // Listen for local storage updates from other pages
  window.addEventListener('storage', (e) => {
    if (e.key === 'pepper_them_cart') {
      updateCartBadge();
    }
  });
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-count');
  const cartData = JSON.parse(localStorage.getItem('pepper_them_cart') || '[]');
  
  // Count total quantity
  const totalCount = cartData.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  badges.forEach(badge => {
    badge.textContent = totalCount;
    if (totalCount > 0) {
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  });
}

// Register service worker for offline capability and caching
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          console.log('Pepper Them Service Worker registered successfully:', reg.scope);
        })
        .catch(err => {
          console.error('Pepper Them Service Worker registration failed:', err);
        });
    });
  }
}

// Global Cart Helper Functions
window.PepperThem = {
  getCart: () => JSON.parse(localStorage.getItem('pepper_them_cart') || '[]'),
  
  addToCart: (productId, productName, price, image) => {
    let cart = window.PepperThem.getCart();
    const existingIndex = cart.findIndex(item => item.id === productId);
    
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        id: productId,
        name: productName,
        price: price,
        image: image,
        quantity: 1
      });
    }
    
    localStorage.setItem('pepper_them_cart', JSON.stringify(cart));
    updateCartBadge();
    
    // Custom event to notify other scripts on same page
    window.dispatchEvent(new Event('cartUpdated'));
    
    // Subtle alert animation
    const cartTrigger = document.querySelector('.cart-trigger');
    if (cartTrigger) {
      cartTrigger.classList.add('bounce');
      setTimeout(() => cartTrigger.classList.remove('bounce'), 500);
    }
  },
  
  removeFromCart: (productId) => {
    let cart = window.PepperThem.getCart();
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('pepper_them_cart', JSON.stringify(cart));
    updateCartBadge();
    window.dispatchEvent(new Event('cartUpdated'));
  },
  
  clearCart: () => {
    localStorage.removeItem('pepper_them_cart');
    updateCartBadge();
    window.dispatchEvent(new Event('cartUpdated'));
  }
};
