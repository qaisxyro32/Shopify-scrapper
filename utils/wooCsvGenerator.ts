
import { WooCommerceProduct } from '../types';
import { cleanHtml } from './htmlCleaner';

export const generateWooCsvBlob = (products: WooCommerceProduct[], statusOverride: string): Blob => {
  const headers = [
    'ID', 'Type', 'SKU', 'Name', 'Published', 'Is featured?', 'Visibility in catalog',
    'Short description', 'Description', 'Sale price', 'Regular price', 'Tax status',
    'Tax class', 'In stock?', 'Stock', 'Weight', 'Length', 'Width', 'Height',
    'Categories', 'Tags', 'Images'
  ];

  const rows: string[][] = [headers];

  products.forEach(p => {
    const finalStatus = statusOverride === 'original' ? (p.status === 'publish' ? '1' : '0') : (statusOverride === 'active' ? '1' : '0');
    const imagesStr = (p.images || []).map(img => img.src).join(', ');
    const catsStr = (p.categories || []).map(c => c.name).join(', ');
    const tagsStr = (p.tags || []).map(t => t.name).join(', ');

    rows.push([
      String(p.id || ''),
      p.type || 'simple',
      p.sku || '',
      p.name || '',
      finalStatus,
      p.featured ? '1' : '0',
      p.catalog_visibility || 'visible',
      cleanHtml(p.short_description || ''),
      cleanHtml(p.description || ''),
      p.sale_price || '',
      p.regular_price || p.price || '',
      'taxable',
      '',
      p.stock_status === 'instock' ? '1' : '0',
      String(p.stock_quantity || ''),
      p.weight || '',
      p.dimensions?.length || '',
      p.dimensions?.width || '',
      p.dimensions?.height || '',
      catsStr,
      tagsStr,
      imagesStr
    ]);
  });

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
