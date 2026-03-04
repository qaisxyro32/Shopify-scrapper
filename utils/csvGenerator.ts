
import { ShopifyProduct, ExportFormat, ExportStatus, InventoryTracker } from '../types';
import { cleanHtml } from './htmlCleaner';

/**
 * Safely converts a value to a string, handling null/undefined and preserving 0.
 */
const safeString = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val);
};

export const generateCsvBlob = (
  products: ShopifyProduct[], 
  format: ExportFormat, 
  statusOverride: ExportStatus,
  invTracker: InventoryTracker,
  invQty: string,
  customVendor: string
): Blob => {
  const rows: string[][] = [];

  if (format === ExportFormat.SHOPIFY) {
    // Header for Shopify Import Format
    rows.push([
      'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Standard Product Type', 'Custom Product Type', 'Tags', 'Published',
      'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
      'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
      'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping',
      'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card',
      'SEO Title', 'SEO Description', 'Google Shopping / Google Product Category', 'Google Shopping / Gender',
      'Google Shopping / Age Group', 'Google Shopping / MPN', 'Google Shopping / AdWords Grouping',
      'Google Shopping / AdWords Labels', 'Google Shopping / Condition', 'Google Shopping / Custom Product',
      'Google Shopping / Custom Label 0', 'Google Shopping / Custom Label 1', 'Google Shopping / Custom Label 2',
      'Google Shopping / Custom Label 3', 'Google Shopping / Custom Label 4', 'Variant Image', 'Variant Weight Unit',
      'Variant Tax Code', 'Cost per item', 'Included / United States', 'Price / United States', 'Compare At Price / United States', 'Status'
    ]);

    products.forEach(product => {
      const variants = product.variants || [];
      const images = product.images || [];
      const rowCount = Math.max(variants.length, images.length);
      
      const option1Name = product.options?.[0]?.name || '';
      const option2Name = product.options?.[1]?.name || '';
      const option3Name = product.options?.[2]?.name || '';

      // Vendor override logic
      const finalVendor = customVendor.trim() !== '' ? customVendor : (product.vendor || '');

      // Status
      let finalStatus = 'active';
      if (statusOverride === ExportStatus.ORIGINAL) {
        finalStatus = product.status || 'active';
      } else {
        finalStatus = statusOverride;
      }

      for (let i = 0; i < rowCount; i++) {
        const variant = variants[i] || null;
        const image = images[i] || null;
        const isFirstRow = i === 0;

        // Inventory Logic
        let finalTracker = '';
        let finalQty = '';

        if (variant) {
          if (invTracker === InventoryTracker.ORIGINAL) {
            finalTracker = safeString(variant.inventory_management);
          } else if (invTracker === InventoryTracker.SHOPIFY) {
            finalTracker = 'shopify';
          } else {
            finalTracker = '';
          }

          if (invQty !== '') {
            finalQty = invQty;
          } else if (invTracker === InventoryTracker.ORIGINAL || invTracker === InventoryTracker.SHOPIFY) {
            finalQty = safeString(variant.inventory_quantity);
          }
        }

        // Find the image URL for this specific variant if it exists
        let variantImageSrc = '';
        if (variant && variant.image_id) {
          const vImg = images.find(img => img.id === variant.image_id);
          if (vImg) variantImageSrc = vImg.src;
        }

        rows.push([
          safeString(product.handle),
          isFirstRow ? safeString(product.title) : '',
          isFirstRow ? safeString(product.body_html) : '',
          isFirstRow ? safeString(finalVendor) : '',
          '', // Standard Type
          isFirstRow ? safeString(product.product_type) : '',
          isFirstRow ? safeString(product.tags) : '',
          isFirstRow ? 'TRUE' : '',
          isFirstRow ? option1Name : '',
          variant ? safeString(variant.option1) : '',
          isFirstRow ? option2Name : '',
          variant ? safeString(variant.option2) : '',
          isFirstRow ? option3Name : '',
          variant ? safeString(variant.option3) : '',
          variant ? safeString(variant.sku) : '',
          variant ? safeString(variant.grams) : '',
          finalTracker,
          finalQty,
          variant ? (safeString(variant.inventory_policy) || 'deny') : '',
          variant ? (safeString(variant.fulfillment_service) || 'manual') : '',
          variant ? safeString(variant.price) : '',
          variant ? safeString(variant.compare_at_price) : '',
          variant ? (variant.requires_shipping ? 'TRUE' : 'FALSE') : '',
          variant ? (variant.taxable ? 'TRUE' : 'FALSE') : '',
          variant ? safeString(variant.barcode) : '',
          image ? safeString(image.src) : '',
          image ? safeString(image.position) : '',
          image ? safeString(image.alt) : '',
          isFirstRow ? 'FALSE' : '', // Gift Card
          '', '', '', '', '', '', '', '', 'new', 'FALSE', '', '', '', '', '',
          variantImageSrc,
          variant ? safeString(variant.weight_unit) : '',
          '', '', '', '', '',
          isFirstRow ? finalStatus : ''
        ]);
      }
    });
  } else {
    // Basic Export Format
    rows.push([
      'Product ID', 'Handle', 'Title', 'Vendor', 'Type', 'Description', 'Tags', 'Created At',
      'Variant ID', 'Variant Title', 'SKU', 'Price', 'Compare At Price', 'Inventory Tracker', 'Inventory Qty', 'Requires Shipping',
      'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
      'Main Image URL', 'All Image URLs', 'Status'
    ]);

    products.forEach(product => {
      const cleanDesc = cleanHtml(product.body_html);
      const allImageUrls = (product.images || []).map(img => img.src).join('; ');
      
      const finalVendor = customVendor.trim() !== '' ? customVendor : (product.vendor || '');

      let finalStatus = 'active';
      if (statusOverride === ExportStatus.ORIGINAL) {
        finalStatus = product.status || 'active';
      } else {
        finalStatus = statusOverride;
      }

      product.variants.forEach(variant => {
        let finalTracker = '';
        let finalQty = '';

        if (invTracker === InventoryTracker.ORIGINAL) {
          finalTracker = safeString(variant.inventory_management);
        } else if (invTracker === InventoryTracker.SHOPIFY) {
          finalTracker = 'shopify';
        } else {
          finalTracker = 'None';
        }

        if (invQty !== '') {
          finalQty = invQty;
        } else {
          finalQty = safeString(variant.inventory_quantity);
        }

        rows.push([
          safeString(product.id),
          safeString(product.handle),
          safeString(product.title),
          safeString(finalVendor),
          safeString(product.product_type),
          cleanDesc,
          safeString(product.tags),
          safeString(product.created_at),
          safeString(variant.id),
          safeString(variant.title),
          safeString(variant.sku),
          safeString(variant.price),
          safeString(variant.compare_at_price),
          finalTracker,
          finalQty,
          variant.requires_shipping ? 'Yes' : 'No',
          product.options?.[0]?.name || '',
          safeString(variant.option1),
          product.options?.[1]?.name || '',
          safeString(variant.option2),
          product.options?.[2]?.name || '',
          safeString(variant.option3),
          product.images?.[0]?.src || '',
          allImageUrls,
          finalStatus
        ]);
      });
    });
  }

  const csvContent = rows
    .map(row => 
      row.map(cell => {
        const str = (cell !== null && cell !== undefined) ? String(cell).replace(/"/g, '""') : '';
        return `"${str}"`;
      }).join(',')
    )
    .join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};
