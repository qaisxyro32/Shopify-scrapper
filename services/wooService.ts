
import { WooCommerceProduct, ProductFetchResult } from '../types';
import { cleanHtml } from '../utils/htmlCleaner';

const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Attempts to fetch WooCommerce data from a variety of public endpoints.
 */
export const fetchWooProductData = async (url: string): Promise<ProductFetchResult> => {
  try {
    const targetUrl = new URL(url);
    const origin = targetUrl.origin;
    const pathParts = targetUrl.pathname.split('/').filter(Boolean);
    const slug = pathParts[pathParts.length - 1];

    // Try WC REST API first (many sites leave public read access on)
    const apiEndpoint = `${origin}/wp-json/wc/v3/products?slug=${slug}`;
    try {
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(apiEndpoint)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            url,
            product: data[0] as WooCommerceProduct,
            error: null,
            status: 'success'
          };
        }
      }
    } catch (e) {
      console.debug("REST API failed, falling back to HTML scraping");
    }

    // Fallback: Try parsing the HTML directly
    const htmlResponse = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!htmlResponse.ok) throw new Error('Could not reach the WooCommerce site.');

    const html = await htmlResponse.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Basic scraping logic for public WooCommerce data
    const title = doc.querySelector('.product_title')?.textContent?.trim() || doc.title;
    const priceText = doc.querySelector('.price')?.textContent?.trim() || '';
    const description = doc.querySelector('.woocommerce-product-details__short-description')?.innerHTML || '';
    const longDescription = doc.querySelector('#tab-description')?.innerHTML || '';
    const sku = doc.querySelector('.sku')?.textContent?.trim() || '';
    
    // Extract images
    const images: { src: string }[] = [];
    doc.querySelectorAll('.woocommerce-product-gallery__image img, .wp-post-image').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && !images.find(i => i.src === src)) images.push({ src });
    });

    if (!title || (title === doc.title && !priceText && images.length === 0)) {
       throw new Error('Not a valid WooCommerce product page or data is hidden.');
    }

    const mockProduct: Partial<WooCommerceProduct> = {
      name: title,
      sku: sku,
      description: longDescription,
      short_description: description,
      regular_price: priceText,
      images: images as any,
      status: 'publish',
      type: 'simple',
      stock_status: 'instock'
    };

    return {
      url,
      product: mockProduct as WooCommerceProduct,
      error: null,
      status: 'success'
    };
  } catch (error: any) {
    return {
      url,
      product: null,
      error: error.message || 'Failed to extract WooCommerce data.',
      status: 'error'
    };
  }
};

/**
 * Fetches all products from a WooCommerce category or store.
 * Now includes a fallback to scrape product links from the category HTML.
 */
export const fetchWooCollection = async (url: string): Promise<ProductFetchResult[]> => {
  try {
    const targetUrl = new URL(url);
    const origin = targetUrl.origin;
    
    // 1. Attempt to use the REST API (Fastest)
    try {
      const apiEndpoint = `${origin}/wp-json/wc/v3/products?per_page=100`;
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(apiEndpoint)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data.map(p => ({
            url: p.permalink || `${origin}/?p=${p.id}`,
            product: p as WooCommerceProduct,
            error: null,
            status: 'success'
          }));
        }
      }
    } catch (e) {
      console.debug("REST API restricted, falling back to category scraping");
    }

    // 2. Fallback: Scrape the Category Page for Product Links
    const htmlResponse = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!htmlResponse.ok) throw new Error('Could not reach the category page.');

    const html = await htmlResponse.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Refined selectors to specifically target the main product anchor
    // We avoid generic 'a' tags that might be 'add to cart' or 'compare' buttons
    const selectors = [
      '.products li.product a.woocommerce-LoopProduct-link', // Standard WC link
      '.products .product-type-simple a:first-child',       // Usually the image/title link
      '.products .product-type-variable a:first-child',
      '.woocommerce-loop-product__title a'                   // Specific title links
    ];

    const productLinks: string[] = [];
    
    doc.querySelectorAll(selectors.join(', ')).forEach(el => {
      let href = el.getAttribute('href');
      if (!href) return;

      // Handle relative URLs
      if (href.startsWith('/')) {
        href = origin + href;
      } else if (!href.startsWith('http')) {
        // Handle cases where origin might be missing or weird
        href = origin + (href.startsWith('/') ? '' : '/') + href;
      }

      // Filter out utility links (Add to Cart, Compare, Wishlist, etc.)
      const isUtilityLink = 
        href.includes('add-to-cart=') || 
        href.includes('/compare/') || 
        href.includes('?product_id=') && href.includes('/compare/') ||
        href.includes('/wishlist/') ||
        href.includes('?add-to-cart') ||
        href.includes('/product-category/') || // Don't follow nested categories
        href.includes('?remove_item=') ||
        href.includes('?query_type_');

      if (!isUtilityLink && !productLinks.includes(href)) {
        productLinks.push(href);
      }
    });

    if (productLinks.length === 0) {
      throw new Error('No product links found. This store might have non-standard HTML or data is restricted.');
    }

    // Process found products
    const results: ProductFetchResult[] = [];
    const limit = Math.min(productLinks.length, 50); // Increased limit slightly
    
    for (let i = 0; i < limit; i++) {
      const res = await fetchWooProductData(productLinks[i]);
      // Only push successful extractions or meaningful errors (ignore "data is hidden" for junk links if they slipped through)
      if (res.status === 'success' || (res.error && !res.error.includes('hidden'))) {
        results.push(res);
      }
    }

    return results;
  } catch (error: any) {
    return [{
      url,
      product: null,
      error: error.message,
      status: 'error'
    }];
  }
};
