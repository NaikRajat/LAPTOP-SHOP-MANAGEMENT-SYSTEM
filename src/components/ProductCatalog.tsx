import React, { useState, useEffect } from 'react';
import { Product } from '../types.js';
import { api } from '../services/api.js';
import { useApp } from '../context/AppContext.js';
import {
  Laptop,
  ShoppingCart,
  Info,
  CheckCircle,
  Star,
  Sparkles,
  ShieldCheck,
  Search,
  Phone,
  Filter,
  Keyboard,
  Video,
  Cpu,
  ArrowRight,
  X
} from 'lucide-react';

interface ProductCatalogProps {
  selectedCategory?: string;
  searchQuery?: string;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  selectedCategory: propsCategory,
  searchQuery: propsSearch
}) => {
  const {
    addToCart,
    setSpecsModalProduct,
    selectedCategory: contextCategory,
    setSelectedCategory,
    searchQuery: contextSearch,
    setSearchQuery,
    setIsCctvSurveyModalOpen,
    setIsCustomPcModalOpen
  } = useApp();

  const activeCategory = propsCategory !== undefined ? propsCategory : contextCategory;
  const activeSearch = propsSearch !== undefined ? propsSearch : contextSearch;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [conditionFilter, setConditionFilter] = useState<'all' | 'brand_new' | 'refurbished'>('all');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({
        category: activeCategory !== 'all' ? activeCategory : undefined,
        condition: conditionFilter !== 'all' ? conditionFilter : undefined,
        search: activeSearch || undefined
      });
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeCategory, conditionFilter, activeSearch]);

  const categoryTitles: Record<string, { title: string; desc: string; icon: any }> = {
    all: {
      title: 'Full Hardware & Technology Showroom',
      desc: 'Factory-sealed new models, certified refurbished workstations, accessories, CCTV surveillance & custom gaming builds.',
      icon: Laptop
    },
    laptops: {
      title: 'Laptops, MacBooks & Workstations',
      desc: 'Lenovo ThinkPad, Dell Latitude, Apple M-Series & HP laptops with comprehensive 40-point diagnostic certifications.',
      icon: Laptop
    },
    accessories: {
      title: 'Accessories & High-Speed Peripherals',
      desc: 'Mechanical keyboards, 100W GaN fast chargers, rugged portable NVMe SSDs, and dual-display docks.',
      icon: Keyboard
    },
    cctv: {
      title: 'CCTV & Security Surveillance Systems',
      desc: 'Hikvision, CP Plus 4K UHD, WiFi PTZ cameras, solar-powered 4G surveillance & surveillance hard drives for Kumta.',
      icon: Video
    },
    custom_pc: {
      title: 'Custom PC Builds & Performance Hardware',
      desc: 'Handcrafted liquid-cooled gaming rigs, creator workstations, Gen4 NVMe drives, DDR5 memory kits & high-wattage PSUs.',
      icon: Cpu
    }
  };

  const currentMeta = categoryTitles[activeCategory] || categoryTitles['all'];

  // Categorize for grouped display
  const brandNewProducts = products.filter(p => p.condition === 'brand_new');
  const refurbishedProducts = products.filter(p => p.condition === 'refurbished');

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10" id="laptop-catalog">
      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-8 gap-3.5 sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              Kumta Showroom & Online Inventory
            </span>
            {activeCategory !== 'all' && (
              <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                Category: {activeCategory.replace('_', ' ')}
              </span>
            )}
            {activeSearch && (
              <span className="inline-flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40">
                Search: &ldquo;{activeSearch}&rdquo;
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-500 cursor-pointer p-0.5"
                  title="Clear search filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            {activeSearch ? `Search Results for "${activeSearch}"` : currentMeta.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#888] mt-1 max-w-2xl">
            {activeSearch
              ? `Found ${products.length} matching ${products.length === 1 ? 'product' : 'products'} across our catalog${activeCategory !== 'all' ? ` in ${currentMeta.title}` : ''}.`
              : currentMeta.desc}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-[#141414] p-1 rounded-xl text-[10.5px] sm:text-xs border border-slate-200 dark:border-[#222]">
            <button
              onClick={() => setConditionFilter('all')}
              className={`px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                conditionFilter === 'all'
                  ? 'bg-white dark:bg-[#222] text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-[#777] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Conditions
            </button>
            <button
              onClick={() => setConditionFilter('brand_new')}
              className={`px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                conditionFilter === 'brand_new'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#777] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Brand New
            </button>
            <button
              onClick={() => setConditionFilter('refurbished')}
              className={`px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                conditionFilter === 'refurbished'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#777] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Refurbished
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#141414] border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            100% Bench Tested
          </span>
        </div>
      </div>

      {/* Interactive Tool Banner for CCTV */}
      {activeCategory === 'cctv' && (
        <div className="mb-6 sm:mb-8 p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Need a Custom CCTV Security Installation in Kumta?
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#aaa] mt-0.5">
                Calculate camera count, storage days, and book a free on-site property inspection with our technicians.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCctvSurveyModalOpen(true)}
            className="py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer"
          >
            <span>Launch CCTV Package Planner</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Interactive Tool Banner for Custom PCs */}
      {activeCategory === 'custom_pc' && (
        <div className="mb-6 sm:mb-8 p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-cyan-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Design Your Own Rig with Live Wattage & Compatibility Check
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#aaa] mt-0.5">
                Configure your custom CPU, GPU, RAM, Liquid Cooling & PSU with bench testing in Kumta.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCustomPcModalOpen(true)}
            className="py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer"
          >
            <span>Launch PC Builder & Wattage Calc</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Active Filter Pill Row */}
      {activeCategory !== 'all' && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-slate-500 dark:text-[#888]">Showing:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-bold">
            <span>{currentMeta.title.split('&')[0].trim()}</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className="hover:text-slate-900 dark:hover:text-white ml-1 font-bold"
              title="Clear Category Filter"
            >
              ×
            </button>
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className="text-xs text-slate-500 hover:text-cyan-600 underline font-medium"
          >
            Show All Categories
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-medium">Loading Kumta inventory...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#222]">
          <Search className="w-10 h-10 text-slate-400 dark:text-[#555] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {activeSearch ? `No products found matching "${activeSearch}"` : 'No hardware matched your filters'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#777] mt-1.5 max-w-md mx-auto leading-relaxed">
            {activeSearch
              ? `We couldn't find any products matching "${activeSearch}". Try searching for popular terms like ThinkPad, MacBook, RTX 4060, SSD, or check the spelling.`
              : 'We source custom laptops and computer parts daily. Drop us a note or call our technician to procure your exact requested model.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {activeSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setConditionFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Clear Search & Show All Products
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setConditionFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1e1e1e] hover:bg-slate-200 dark:hover:bg-[#282828] text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-slate-200 dark:border-[#333]"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => addToCart(product)}
              onOpenSpecs={() => setSpecsModalProduct(product)}
            />
          ))}

          {/* Sourcing Desk Card */}
          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-dashed border-slate-300 dark:border-[#262626] hover:border-cyan-500/50 p-4 sm:p-6 flex flex-col justify-between shadow-xs transition-all">
            <div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 sm:mb-4 border border-cyan-500/20">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="inline-block text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 mb-2">
                Special Sourcing Service
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 sm:mb-2 leading-snug">
                Got a Specific Model or Part in Mind?
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#888] mb-3.5 sm:mb-4 leading-relaxed">
                Whether you need a specific Dell Latitude, Apple MacBook Air, HP Workstation, CP Plus 8-Ch CCTV setup, or custom graphics card, our Kumta store team will procure, test, and warranty it.
              </p>
              <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs text-slate-700 dark:text-[#aaa]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span>Procurement within 24 to 48 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span>Full diagnostic test before delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span>Custom RAM & SSD setups available</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-[#1e1e1e] pt-3 sm:pt-4 mt-2">
              <a
                href="tel:+919448155198"
                className="w-full py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Contact Owner / Request Model
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
  onOpenSpecs: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onOpenSpecs }) => {
  const isRefurb = product.condition === 'refurbished';
  const hasSavings = product.originalPrice && product.originalPrice > product.price;
  const savingsAmount = hasSavings ? product.originalPrice! - product.price : 0;

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#222] hover:border-slate-300 dark:hover:border-[#333] shadow-xs hover:shadow-md transition-all p-3.5 sm:p-5 flex flex-col justify-between group">
      <div>
        {/* Product Thumbnail Aspect Box */}
        <div className="relative w-full aspect-[16/10] rounded-xl bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-[#222] overflow-hidden mb-3 sm:mb-4 flex items-center justify-center p-2.5 sm:p-3">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />

          {/* Condition Badge */}
          <span
            className={`absolute top-2 left-2 sm:top-2.5 sm:left-2.5 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
              isRefurb
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
            }`}
          >
            {isRefurb ? 'Certified Refurb' : 'Brand New'}
          </span>

          {/* Savings / Feature Tag */}
          {hasSavings && (
            <span className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded bg-slate-900/90 dark:bg-[#050505]/90 border border-slate-800 dark:border-[#222] font-mono text-[9px] sm:text-[10px] text-cyan-400 font-bold">
              Save ₹{savingsAmount.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Meta Bar */}
        <div className="flex items-center justify-between mb-1 sm:mb-1.5 text-[10.5px] sm:text-xs text-slate-500 dark:text-[#777] font-mono">
          <span>SKU: {product.sku}</span>
          <span className="text-amber-500 flex items-center gap-1 font-mono text-[10.5px] sm:text-[11px] font-semibold">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
            {product.rating} ({product.reviewsCount})
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">
          {product.title}
        </h3>

        {/* Tagline / Benefit */}
        <p className="text-[11px] sm:text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-2.5 sm:mb-3 flex items-center gap-1 line-clamp-1">
          <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
          {product.specs?.tagline || product.specs?.warranty || 'Inspected & Guaranteed at Kumta Bench'}
        </p>

        {/* Specs Chips Row */}
        {product.specs && (
          <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4 text-[9.5px] sm:text-[10px] text-slate-600 dark:text-[#888]">
            {product.specs.cpu && (
              <span className="px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-md font-mono">
                {product.specs.cpu.split('(')[0]}
              </span>
            )}
            {product.specs.ram && (
              <span className="px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-md text-slate-900 dark:text-white font-bold font-mono">
                {product.specs.ram.split(' ')[0]} {product.specs.ram.includes('Unified') ? 'Unified' : 'RAM'}
              </span>
            )}
            {product.specs.storage && (
              <span className="px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-md font-mono">
                {product.specs.storage.split(' ')[0]} SSD
              </span>
            )}
            {product.specs.display && (
              <span className="px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-md font-mono">
                {product.specs.display.split('(')[0].substring(0, 14)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pricing and Action Grid */}
      <div className="border-t border-slate-100 dark:border-[#1e1e1e] pt-3 sm:pt-4 mt-2">
        <div className="flex items-baseline gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {hasSavings && (
            <span className="text-[11px] sm:text-xs text-slate-400 line-through font-mono">
              ₹{product.originalPrice!.toLocaleString('en-IN')}
            </span>
          )}
          <span className="ml-auto text-[11px] sm:text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            disabled={product.stock <= 0}
            className="py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 dark:disabled:bg-[#222] disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSpecs();
            }}
            className="py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222] text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-[#262626] cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" /> Specs
          </button>
        </div>
      </div>
    </div>
  );
};
