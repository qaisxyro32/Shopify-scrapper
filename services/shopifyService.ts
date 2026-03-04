
import { ShopifyProduct, ProductFetchResult } from '../types';
import { formatProductJsonUrl, formatCollectionJsonUrl } from '../utils/htmlCleaner';

const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Fetches data for a single product.
 */
export const fetchProductData = async (url: string): Promise<ProductFetchResult> => {
  const jsonUrl = formatProductJsonUrl(url);
  
  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(jsonUrl)}`);
    
    if (!response.ok) {
      if (response.status === 404) throw new Error('Product not found.');
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || !data.product) throw new Error('Invalid Shopify product JSON.');

    return {
      url,
      product: data.product as ShopifyProduct,
      error: null,
      status: 'success'
    };
  } catch (error: any) {
    return {
      url,
      product: null,
      error: error.message || 'Network error.',
      status: 'error'
    };
  }
};

/**
 * Fetches all products from a collection.
 * Returns an array of results, one for each product in the collection.
 */
export const fetchCollectionProducts = async (collectionUrl: string): Promise<ProductFetchResult[]> => {
  const jsonUrl = formatCollectionJsonUrl(collectionUrl);
  
  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(jsonUrl)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch collection: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.products)) {
      throw new Error('Invalid Shopify collection JSON format.');
    }

    const products = data.products as ShopifyProduct[];
    
    return products.map(p => ({
      // We reconstruct a likely product URL if possible, or just use the handle
      url: `${new URL(collectionUrl).origin}/products/${p.handle}`,
      product: p,
      error: null,
      status: 'success'
    }));
  } catch (error: any) {
    return [{
      url: collectionUrl,
      product: null,
      error: error.message || 'Collection fetch failed.',
      status: 'error'
    }];
  }
};
