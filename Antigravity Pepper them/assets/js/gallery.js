/* PEPPER THEM - SHOP AND GALLERY CONTROLLER */

document.addEventListener('DOMContentLoaded', () => {
  const productGrid = document.getElementById('shop-product-grid');
  const featuredGrid = document.getElementById('featured-product-grid');
  const filterContainer = document.querySelector('.filter-container');
  
  let products = [];
  let lightbox = null;

  // Initialize Product Grid (for shop.html)
  if (productGrid) {
    loadProducts((data) => {
      products = data;
      renderProducts(products, productGrid);
      initFilters();
      initLightbox();
    });
  }

  // Initialize Featured Grid (for index.html)
  if (featuredGrid) {
    loadProducts((data) => {
      // Filter for items tagged with 'Featured' or 'New', limit to 4
      const featured = data.filter(p => p.tags.includes('Featured') || p.tags.includes('New')).slice(0, 4);
      renderProducts(featured, featuredGrid);
      initLightbox();
    });
  }

  // Fetch product metadata
  function loadProducts(callback) {
    fetch('assets/data/products.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => callback(data))
      .catch(error => {
        console.error('Error loading products database:', error);
        const grid = productGrid || featuredGrid;
        if (grid) {
          grid.innerHTML = `<div class="error-msg" style="grid-column: 1/-1; text-align: center; color: var(--accent-red); padding: 40px;">Failed to load products. Please check your network connection.</div>`;
        }
      });
  }

  // Inject cards into the DOM
  function renderProducts(items, targetGrid) {
    targetGrid.innerHTML = '';
    
    if (items.length === 0) {
      targetGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No products match the selected category.</div>`;
      return;
    }

    items.forEach((product, index) => {
      const card = document.createElement('div');
      card.className = `product-card reveal reveal-scale`;
      
      // Calculate stagger delay
      const delay = (index % 4) * 100;
      card.style.transitionDelay = `${delay}ms`;

      const primaryImg = product.images[0] || 'assets/img/prod_hoodie_1.png';
      const secondaryImg = product.images[1] || primaryImg;
      const hasSecondary = product.images.length > 1;

      // Badge HTML
      let badgeHtml = '';
      if (product.tags && product.tags.length > 0) {
        product.tags.forEach(tag => {
          const badgeClass = tag.toLowerCase() === 'new' ? 'badge-red' : 'badge-volt';
          badgeHtml += `<span class="badge ${badgeClass}">${tag}</span>`;
        });
      }

      card.innerHTML = `
        <div class="product-img-wrapper">
          <a href="${primaryImg}" class="glightbox" data-gallery="products" data-title="${product.name}" data-description="${product.description}">
            <img class="product-img" src="${primaryImg}" alt="${product.name}" loading="lazy">
            ${hasSecondary ? `<img class="product-img-secondary" src="${secondaryImg}" alt="${product.name} alternate" loading="lazy">` : ''}
          </a>
          <div class="product-badges">
            ${badgeHtml}
          </div>
          <div class="product-overlay">
            <button class="btn-icon-round add-to-cart-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${primaryImg}" title="Add to Cart">
              <i class="fas fa-shopping-bag"></i>
            </button>
          </div>
        </div>
        <div class="product-info">
          <span class="product-category">${product.category}</span>
          <h3 class="product-name" title="${product.name}">${product.name}</h3>
          <div class="product-footer">
            <span class="product-price">$${product.price.toFixed(2)}</span>
            <a href="contact.html?product=${encodeURIComponent(product.id)}" class="product-shop-btn">
              Order Now <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      `;

      targetGrid.appendChild(card);
      
      // Initialize IntersectionObserver trigger for this new card
      setTimeout(() => {
        card.classList.add('revealed');
      }, 50);
    });

    // Attach cart event handlers
    const addButtons = targetGrid.querySelectorAll('.add-to-cart-btn');
    addButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const price = parseFloat(btn.getAttribute('data-price'));
        const image = btn.getAttribute('data-image');
        
        window.PepperThem.addToCart(id, name, price, image);
        
        // Visual feedback
        const icon = btn.querySelector('i');
        icon.className = 'fas fa-check';
        btn.style.background = 'var(--accent-volt)';
        btn.style.color = 'var(--bg-primary)';
        btn.style.boxShadow = '0 0 15px var(--accent-volt)';
        
        setTimeout(() => {
          icon.className = 'fas fa-shopping-bag';
          btn.style.background = '';
          btn.style.color = '';
          btn.style.boxShadow = '';
        }, 1500);
      });
    });
  }

  // Handle Category Filters
  function initFilters() {
    if (!filterContainer) return;

    const filterBtns = filterContainer.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Toggle active button style
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.getAttribute('data-filter');
        
        // Filter elements
        let filteredProducts = products;
        if (category !== 'all') {
          filteredProducts = products.filter(p => p.category === category);
        }

        // Render with simple fade transition
        productGrid.style.opacity = 0;
        productGrid.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
          renderProducts(filteredProducts, productGrid);
          productGrid.style.opacity = 1;
          productGrid.style.transform = 'translateY(0)';
          
          // Re-initialize lightbox since grid is re-rendered
          initLightbox();
        }, 300);
      });
    });
  }

  // Initialize or Refresh GLightbox instances
  function initLightbox() {
    if (lightbox) {
      lightbox.destroy();
    }
    
    if (typeof GLightbox !== 'undefined') {
      lightbox = GLightbox({
        selector: '.glightbox',
        touchNavigation: true,
        loop: true,
        zoomable: true,
        autoplayVideos: false
      });
    }
  }
});
