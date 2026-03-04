
/**
 * Removes HTML tags from a string and decodes basic entities.
 */
export const cleanHtml = (html: string): string => {
  if (!html) return '';
  
  // Basic regex for stripping HTML tags
  const text = html.replace(/<[^>]*>?/gm, ' ');
  
  // Clean up whitespace
  return text
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

/**
 * Validates if a URL is a likely Shopify product URL
 */
export const isValidShopifyProductUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes('/products/');
  } catch {
    return false;
  }
};

/**
 * Validates if a URL is a likely Shopify collection URL
 */
export const isValidShopifyCollectionUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes('/collections/');
  } catch {
    return false;
  }
};

/**
 * Prepares the URL for fetching the .json endpoint
 */
export const formatProductJsonUrl = (url: string): string => {
  let cleanUrl = url.trim().split('?')[0]; // Remove query params
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  
  if (!cleanUrl.endsWith('.json')) {
    return `${cleanUrl}.json`;
  }
  return cleanUrl;
};

/**
 * Prepares the URL for fetching collection products .json endpoint
 */
export const formatCollectionJsonUrl = (url: string): string => {
  let cleanUrl = url.trim().split('?')[0];
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  
  if (!cleanUrl.endsWith('/products.json')) {
    if (cleanUrl.endsWith('.json')) {
       // If user put something.json, we assume they want the specific file, 
       // but Shopify collections specifically use /products.json for the items
       return cleanUrl;
    }
    return `${cleanUrl}/products.json`;
  }
  return cleanUrl;
};
