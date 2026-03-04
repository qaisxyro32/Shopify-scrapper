
import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Plus, 
  FileText,
  ExternalLink,
  ShoppingBag,
  Package,
  Layers,
  Settings,
  Database,
  Tag,
  Globe,
  Layout
} from 'lucide-react';
import { ProductFetchResult, ExportFormat, ExportStatus, InventoryTracker, ShopifyProduct, WooCommerceProduct } from './types';
import { fetchProductData, fetchCollectionProducts } from './services/shopifyService';
import { fetchWooProductData, fetchWooCollection } from './services/wooService';
import { generateCsvBlob } from './utils/csvGenerator';
import { generateWooCsvBlob } from './utils/wooCsvGenerator';
import { isValidShopifyProductUrl, isValidShopifyCollectionUrl } from './utils/htmlCleaner';

type ToolMode = 'shopify' | 'woo';
type TabType = 'single' | 'collection';

export default function App() {
  const [toolMode, setToolMode] = useState<ToolMode>('shopify');
  const [activeTab, setActiveTab] = useState<TabType>('single');
  const [inputUrls, setInputUrls] = useState<string>('');
  const [results, setResults] = useState<ProductFetchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Shopify specific settings
  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.SHOPIFY);
  const [exportStatus, setExportStatus] = useState<ExportStatus>(ExportStatus.ORIGINAL);
  const [inventoryTracker, setInventoryTracker] = useState<InventoryTracker>(InventoryTracker.ORIGINAL);
  const [defaultInvQty, setDefaultInvQty] = useState<string>('');
  const [customVendor, setCustomVendor] = useState<string>('');
  
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isShopify = toolMode === 'shopify';
  const themeColor = isShopify ? 'green' : 'purple';
  const accentColor = isShopify ? 'text-green-600' : 'text-purple-600';
  const bgColor = isShopify ? 'bg-green-600' : 'bg-purple-600';
  const hoverBgColor = isShopify ? 'hover:bg-green-700' : 'hover:bg-purple-700';
  const lightBg = isShopify ? 'bg-green-50' : 'bg-purple-50';
  const borderActive = isShopify ? 'border-green-600' : 'border-purple-600';

  const handleConvert = async () => {
    const urls = inputUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      setGlobalError(`Please enter at least one URL.`);
      return;
    }

    setGlobalError(null);
    setIsProcessing(true);
    
    if (isShopify) {
      if (activeTab === 'single') {
        for (const url of urls) {
          const res = await fetchProductData(url);
          setResults(prev => [...prev, res]);
        }
      } else {
        for (const url of urls) {
          const collectionResults = await fetchCollectionProducts(url);
          setResults(prev => [...prev, ...collectionResults]);
        }
      }
    } else {
      // WooCommerce Mode
      if (activeTab === 'single') {
        for (const url of urls) {
          const res = await fetchWooProductData(url);
          setResults(prev => [...prev, res]);
        }
      } else {
        for (const url of urls) {
          const collectionResults = await fetchWooCollection(url);
          setResults(prev => [...prev, ...collectionResults]);
        }
      }
    }

    setIsProcessing(false);
    setInputUrls('');
  };

  const handleDownload = () => {
    const successResults = results.filter(r => r.status === 'success' && r.product);
    if (successResults.length === 0) return;

    let blob: Blob;
    if (isShopify) {
      blob = generateCsvBlob(
        successResults.map(r => r.product as ShopifyProduct), 
        exportFormat, 
        exportStatus, 
        inventoryTracker, 
        defaultInvQty,
        customVendor
      );
    } else {
      blob = generateWooCsvBlob(
        successResults.map(r => r.product as WooCommerceProduct),
        exportStatus
      );
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolMode}_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const clearResults = () => {
    setResults([]);
    setGlobalError(null);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const pendingCount = results.filter(r => r.status === 'pending').length;

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Invalid URL';
    }
  };

  const getProductName = (result: ProductFetchResult) => {
    if (!result.product) return result.url;
    return isShopify 
      ? (result.product as ShopifyProduct).title 
      : (result.product as WooCommerceProduct).name;
  };

  return (
    <div className="min-h-screen pb-12 bg-[#f8fafc]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`${bgColor} p-2 rounded-lg shadow-sm transition-colors duration-300`}>
              <ShoppingBag className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">E-com Extractor Pro</h1>
          </div>
          
          <nav className="flex items-center bg-gray-100 p-1 rounded-xl">
             <button 
              onClick={() => { setToolMode('shopify'); clearResults(); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isShopify ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <ShoppingBag className="w-4 h-4" /> Shopify
             </button>
             <button 
              onClick={() => { setToolMode('woo'); clearResults(); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${!isShopify ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Globe className="w-4 h-4" /> WooCommerce
             </button>
          </nav>

          <div className="hidden md:flex items-center gap-4 text-sm text-gray-500 font-medium">
            <span className="bg-gray-50 px-2 py-0.5 rounded text-[10px] text-gray-400 border border-gray-200 uppercase tracking-widest">Multi-Source Engine</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Settings Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
                    activeTab === 'single' 
                      ? `${accentColor} ${lightBg} border-b-2 ${borderActive}` 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Package className="w-4 h-4" /> Single
                </button>
                <button
                  onClick={() => setActiveTab('collection')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
                    activeTab === 'collection' 
                      ? `${accentColor} ${lightBg} border-b-2 ${borderActive}` 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Layers className="w-4 h-4" /> {isShopify ? 'Collection' : 'Category / Site'}
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {activeTab === 'single' ? 'URLs (one per line)' : `${isShopify ? 'Collection' : 'Store/Category'} URL`}
                  </label>
                  <textarea
                    className="w-full h-32 p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 ring-offset-1 ring-gray-100 outline-none transition-all resize-none font-mono placeholder:text-gray-300"
                    placeholder={isShopify ? "https://store.com/products/handle" : "https://woosite.com/product/item-name"}
                    value={inputUrls}
                    onChange={(e) => setInputUrls(e.target.value)}
                    disabled={isProcessing}
                  />
                  <p className="text-[10px] text-gray-400 mt-2 italic">
                    {activeTab === 'collection' ? 'Note: Full site extraction may take time depending on size.' : ''}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Extraction Parameters</span>
                  </div>

                  {isShopify && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight">CSV Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setExportFormat(ExportFormat.SHOPIFY)}
                          className={`px-3 py-2 text-[10px] font-black rounded-lg border transition-all uppercase ${
                            exportFormat === ExportFormat.SHOPIFY ? `${lightBg} ${borderActive} ${accentColor}` : 'bg-white border-gray-200 text-gray-500'
                          }`}
                        >
                          Shopify Native
                        </button>
                        <button
                          onClick={() => setExportFormat(ExportFormat.BASIC)}
                          className={`px-3 py-2 text-[10px] font-black rounded-lg border transition-all uppercase ${
                            exportFormat === ExportFormat.BASIC ? `${lightBg} ${borderActive} ${accentColor}` : 'bg-white border-gray-200 text-gray-500'
                          }`}
                        >
                          Basic List
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight">Status Override</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setExportStatus(ExportStatus.ACTIVE)}
                        className={`px-1 py-2 text-[10px] font-black rounded-lg border transition-all uppercase ${exportStatus === ExportStatus.ACTIVE ? `${lightBg} ${borderActive} ${accentColor}` : 'bg-white border-gray-200 text-gray-500'}`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setExportStatus(ExportStatus.DRAFT)}
                        className={`px-1 py-2 text-[10px] font-black rounded-lg border transition-all uppercase ${exportStatus === ExportStatus.DRAFT ? `${lightBg} ${borderActive} ${accentColor}` : 'bg-white border-gray-200 text-gray-500'}`}
                      >
                        Draft
                      </button>
                      <button
                        onClick={() => setExportStatus(ExportStatus.ORIGINAL)}
                        className={`px-1 py-2 text-[10px] font-black rounded-lg border transition-all uppercase ${exportStatus === ExportStatus.ORIGINAL ? `bg-gray-100 border-gray-400 text-gray-700` : 'bg-white border-gray-200 text-gray-500'}`}
                      >
                        Source
                      </button>
                    </div>
                  </div>

                  {isShopify && (
                    <>
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Custom Vendor
                        </label>
                        <input 
                          type="text"
                          placeholder="Store Name"
                          className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 ring-gray-50 outline-none font-medium"
                          value={customVendor}
                          onChange={(e) => setCustomVendor(e.target.value)}
                        />
                      </div>

                      <div className="space-y-3 border-t border-gray-50 pt-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight">Inventory Logic</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => setInventoryTracker(InventoryTracker.ORIGINAL)} className={`px-1 py-2 text-[10px] font-black rounded-lg border transition-all uppercase ${inventoryTracker === InventoryTracker.ORIGINAL ? `${lightBg} ${borderActive} ${accentColor}` : 'bg-white border-gray-200 text-gray-500'}`}>Original</button>
                          <button onClick={() => setInventoryTracker(InventoryTracker.SHOPIFY)} className={`px-1 py-2 text-[10px] font-black rounded-lg border transition-all uppercase ${inventoryTracker === InventoryTracker.SHOPIFY ? `${lightBg} ${borderActive} ${accentColor}` : 'bg-white border-gray-200 text-gray-500'}`}>Track On</button>
                          <button onClick={() => setInventoryTracker(InventoryTracker.NONE)} className={`px-1 py-2 text-[10px] font-black rounded-lg border transition-all uppercase ${inventoryTracker === InventoryTracker.NONE ? `bg-red-50 border-red-200 text-red-600` : 'bg-white border-gray-200 text-gray-500'}`}>Track Off</button>
                        </div>
                        <input 
                          type="number"
                          placeholder="Fixed Stock Count"
                          className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 ring-gray-50 outline-none font-medium"
                          value={defaultInvQty}
                          onChange={(e) => setDefaultInvQty(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleConvert}
                  disabled={isProcessing || !inputUrls.trim()}
                  className={`w-full ${bgColor} ${hoverBgColor} text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-gray-200 mt-6 uppercase tracking-widest text-xs`}
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {isProcessing ? 'Working...' : `Run ${isShopify ? 'Shopify' : 'Woo'} Extractor`}
                </button>

                {globalError && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{globalError}</span>
                  </div>
                )}
              </div>
            </div>

            {results.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Job Metrics</h3>
                  <button onClick={clearResults} className="text-xs text-red-400 font-bold hover:text-red-600 transition-colors">Reset</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Success</div>
                    <div className="text-xl font-black text-gray-900">{successCount}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Errors</div>
                    <div className="text-xl font-black text-red-500">{errorCount}</div>
                  </div>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={successCount === 0 || isProcessing}
                  className="w-full bg-gray-900 hover:bg-black text-white py-3 px-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 transition-all active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" /> Download Export
                </button>
              </div>
            )}
          </div>

          {/* Results Display */}
          <div className="lg:col-span-8">
            {results.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 h-[750px] flex flex-col items-center justify-center text-gray-400 p-12 text-center group">
                <div className="bg-gray-50 p-8 rounded-full mb-8 ring-8 ring-gray-50/50 group-hover:scale-110 transition-transform duration-500">
                  <Layout className="w-16 h-16 opacity-5" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">System Idle</h3>
                <p className="max-w-md mt-4 text-sm leading-relaxed text-gray-500 font-medium">
                  Enter product or shop links to begin. Our engine supports high-speed extraction for {isShopify ? 'Shopify' : 'WooCommerce'} storefronts.
                </p>
                <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left w-full max-w-xl">
                  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 ${lightBg} rounded-lg ${accentColor}`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <strong className="text-gray-900 font-black uppercase text-[10px] tracking-widest">Public Data</strong>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">Legal and ethical scraping using standardized public JSON & HTML structured data.</p>
                  </div>
                  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 ${lightBg} rounded-lg ${accentColor}`}>
                        <Layout className="w-4 h-4" />
                      </div>
                      <strong className="text-gray-900 font-black uppercase text-[10px] tracking-widest">Clean Schema</strong>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">Descriptions are automatically stripped of messy HTML to ensure a perfect import experience.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Queue Output</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-white shadow-sm text-gray-500 px-4 py-1.5 rounded-full border border-gray-100 uppercase tracking-widest">
                      {results.length} Nodes Processed
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 scrollbar-thin">
                  {results.slice().reverse().map((result, idx) => (
                    <div 
                      key={`${result.url}-${idx}`}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all group relative border-l-4 overflow-hidden"
                      style={{ borderLeftColor: result.status === 'success' ? (isShopify ? '#16a34a' : '#9333ea') : '#ef4444' }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {result.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[150px]">
                              {getHostname(result.url)}
                            </span>
                          </div>
                          <h4 className="text-base font-black text-gray-900 truncate group-hover:translate-x-1 transition-transform duration-300">
                            {getProductName(result)}
                          </h4>
                          
                          {result.product && (
                            <div className="flex flex-wrap gap-4 mt-3">
                              <span className="text-[10px] text-gray-500 flex items-center gap-1 font-black uppercase tracking-tighter">
                                <span className="text-gray-900">Images:</span> {(result.product.images || []).length}
                              </span>
                              {!isShopify && (
                                <span className="text-[10px] text-gray-500 flex items-center gap-1 font-black uppercase tracking-tighter">
                                  <span className="text-gray-900">SKU:</span> {(result.product as WooCommerceProduct).sku || 'N/A'}
                                </span>
                              )}
                              {isShopify && (
                                <span className="text-[10px] text-gray-500 flex items-center gap-1 font-black uppercase tracking-tighter">
                                  <span className="text-gray-900">Variants:</span> {(result.product as ShopifyProduct).variants?.length || 0}
                                </span>
                              )}
                            </div>
                          )}

                          {result.error && (
                            <p className="text-[10px] text-red-600 mt-2 font-black bg-red-50 inline-block px-3 py-1 rounded-lg uppercase tracking-wider">
                              {result.error}
                            </p>
                          )}
                        </div>
                        
                        {(result.product as any)?.image?.src || (result.product as any)?.images?.[0]?.src ? (
                          <div className="relative shrink-0">
                             <img 
                              src={(result.product as any)?.image?.src || (result.product as any)?.images?.[0]?.src} 
                              alt="" 
                              className="w-20 h-20 rounded-xl object-cover border border-gray-100 shadow-sm transition-all group-hover:rotate-3 group-hover:scale-110"
                            />
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${bgColor} border-2 border-white rounded-full shadow-sm`}></div>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-200" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-32 border-t border-gray-200 py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-gray-100 p-2.5 rounded-xl shadow-inner text-gray-400">
               <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="font-black text-2xl text-gray-900 tracking-tighter">E-com Extractor <span className={accentColor}>Pro</span></span>
          </div>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Standardizing the way catalogs are migrated. Our platform bridges the gap between Shopify and WooCommerce, providing clean, import-ready data for e-commerce professionals worldwide.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
            {['No API Keys', 'Variant Support', 'HTML Sanitized', 'High Resolution Images'].map(tag => (
              <span key={tag} className="text-[10px] text-gray-400 font-black tracking-widest uppercase bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">{tag}</span>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
            <span>© 2025 Multi-Platform Extraction Engine</span>
            <div className="flex gap-8 mt-4 md:mt-0">
               <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
               <a href="#" className="hover:text-gray-600 transition-colors">Legal</a>
               <a href="#" className="hover:text-gray-600 transition-colors">Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
