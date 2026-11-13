import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { Product } from '../types.js';
import {
  Laptop,
  Wrench,
  ShoppingCart,
  Bell,
  Sun,
  Moon,
  User as UserIcon,
  Search,
  LogOut,
  LayoutDashboard,
  Store,
  Menu,
  X,
  Keyboard,
  Video,
  Cpu
} from 'lucide-react';

interface HeaderProps {
  onSearchChange?: (q: string) => void;
  searchQuery?: string;
}

export const Header: React.FC<HeaderProps> = ({ onSearchChange, searchQuery: propsSearchQuery }) => {
  const {
    user,
    isAdmin,
    logout,
    currentView,
    setCurrentView,
    cartCount,
    setIsCartOpen,
    openAuthModal,
    setIsUserProfileOpen,
    setIsRepairModalOpen,
    isNotificationsOpen,
    setIsNotificationsOpen,
    unreadNotifsCount,
    darkMode,
    toggleDarkMode,
    selectedCategory,
    setSelectedCategory,
    setSpecsModalProduct,
    searchQuery: contextSearchQuery,
    setSearchQuery: contextSetSearchQuery
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeSearch = propsSearchQuery !== undefined ? propsSearchQuery : contextSearchQuery;

  // Search state
  const [inputQuery, setInputQuery] = useState(activeSearch || '');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize local input state with external activeSearch updates
  useEffect(() => {
    setInputQuery(activeSearch || '');
  }, [activeSearch]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live product search as user types
  useEffect(() => {
    const trimmed = inputQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      if (activeSearch) {
        handleSearch('');
      }
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await api.getProducts({ search: trimmed });
        setSearchResults(results);
        // Also update background catalog filter live as user types
        handleSearch(trimmed);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [inputQuery]);

  const handleSearch = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    contextSetSearchQuery(val);
  };

  const handleSubmitSearch = () => {
    const trimmed = inputQuery.trim();
    handleSearch(trimmed);
    setIsDropdownOpen(false);
    setMobileMenuOpen(false);
    if (currentView !== 'store') {
      setCurrentView('store');
    }
    const catalogEl = document.getElementById('laptop-catalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSpecsModalProduct(product);
    setIsDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleClearSearch = () => {
    setInputQuery('');
    handleSearch('');
    setSearchResults([]);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitSearch();
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentView('store');
    setMobileMenuOpen(false);
    const catalogEl = document.getElementById('laptop-catalog') || document.getElementById('catalog-categories');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-white/95 dark:bg-[#090909]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1e1e1e] shadow-xs transition-colors duration-200">
      {/* Main Navbar (Special Notice removed as requested) */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 md:h-20 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <button
            onClick={() => {
              if (isAdmin) {
                setCurrentView('admin');
              } else {
                setCurrentView('store');
                setSelectedCategory('all');
              }
            }}
            className="flex items-center gap-2 sm:gap-3 text-left group cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-cyan-600 dark:bg-[#121212] border border-cyan-500/30 dark:border-[#222] text-white dark:text-cyan-400 flex items-center justify-center shadow-md transition-all group-hover:scale-105">
              <Laptop className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none whitespace-nowrap">
                  SYS<span className="text-cyan-600 dark:text-cyan-400 ml-0.5">TECH</span>
                </h1>
                {isAdmin && (
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded border border-cyan-500/20">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[7.5px] sm:text-[9px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-slate-500 dark:text-[#777] mt-0.5 font-bold truncate hidden min-[360px]:block">
                Computer Solutions • Kumta
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          {isAdmin ? (
            /* Admin view: streamlined navigation with NO customer cart or repair booking */
            <nav className="hidden lg:flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setCurrentView('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#161616] text-slate-700 dark:text-slate-300 hover:text-cyan-600'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Admin Dashboard
              </button>
              <button
                onClick={() => setCurrentView('store')}
                className={`px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                  currentView === 'store'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151515]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                View Storefront
              </button>
            </nav>
          ) : (
            /* Normal User view: store catalog categories */
            <nav className="hidden lg:flex items-center gap-1 text-xs">
              <button
                onClick={() => handleCategoryClick('all')}
                className={`px-3 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  currentView === 'store' && selectedCategory === 'all'
                    ? 'bg-cyan-50 dark:bg-[#1a1a1a] text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151515]'
                }`}
              >
                All Items
              </button>

              <button
                onClick={() => handleCategoryClick('laptops')}
                className={`px-3 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedCategory === 'laptops'
                    ? 'bg-cyan-50 dark:bg-[#1a1a1a] text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151515]'
                }`}
              >
                Laptops
              </button>

              <button
                onClick={() => handleCategoryClick('accessories')}
                className={`px-3 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedCategory === 'accessories'
                    ? 'bg-cyan-50 dark:bg-[#1a1a1a] text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151515]'
                }`}
              >
                Accessories
              </button>

              <button
                onClick={() => handleCategoryClick('cctv')}
                className={`px-3 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedCategory === 'cctv'
                    ? 'bg-cyan-50 dark:bg-[#1a1a1a] text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151515]'
                }`}
              >
                CCTV & Security
              </button>

              <button
                onClick={() => handleCategoryClick('custom_pc')}
                className={`px-3 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedCategory === 'custom_pc'
                    ? 'bg-cyan-50 dark:bg-[#1a1a1a] text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151515]'
                }`}
              >
                Custom PCs
              </button>

              <a
                href="#repairs"
                onClick={() => setCurrentView('store')}
                className="px-3 py-2 rounded-lg font-bold uppercase tracking-wider text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151515] transition-colors"
              >
                Repairs & Lab
              </a>
            </nav>
          )}
        </div>

        {/* Right Search & Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5 shrink-0">
          {/* Search Input (Store view only - desktop) */}
          {!isAdmin && (
            <div ref={searchRef} className="relative hidden md:flex items-center w-40 xl:w-56">
              <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={inputQuery}
                onChange={e => {
                  setInputQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => {
                  if (inputQuery.trim().length > 0) setIsDropdownOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search products, SKUs..."
                className="w-full pl-9 pr-7 py-2 bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {inputQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 p-0.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Desktop Live Search Dropdown */}
              {isDropdownOpen && inputQuery.trim().length > 0 && (
                <div className="absolute top-full mt-2 right-0 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#262626] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-[#1e1e1e] flex items-center justify-between bg-slate-50/80 dark:bg-[#161616]/80">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {isSearching ? 'Searching...' : `Matching Products (${searchResults.length})`}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Press ↵ for all
                    </span>
                  </div>

                  {isSearching ? (
                    <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Searching showroom & inventory...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className="p-3 hover:bg-cyan-500/5 dark:hover:bg-cyan-500/10 transition-colors cursor-pointer flex items-center gap-3 group"
                        >
                          <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#282828] p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.title}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-[#222] text-slate-700 dark:text-slate-300">
                                {product.brand}
                              </span>
                              <span className="text-[9px] font-mono text-slate-400 truncate">
                                {product.sku}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                              {product.title}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                                ₹{product.price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                                {product.condition === 'refurbished' ? 'Certified Refurb' : 'Brand New'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="p-2 bg-slate-50 dark:bg-[#161616] text-center border-t border-slate-100 dark:border-[#1e1e1e]">
                        <button
                          type="button"
                          onClick={handleSubmitSearch}
                          className="w-full py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          View All Results in Catalog →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        No products found
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                        No matches found for &ldquo;{inputQuery}&rdquo;. Try searching for ThinkPad, MacBook, RTX 4060, SSD, or SKU.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mobile Search Button (< md screens) */}
          {!isAdmin && (
            <button
              onClick={() => {
                setMobileMenuOpen(true);
                setTimeout(() => mobileInputRef.current?.focus(), 150);
              }}
              aria-label="Search Catalog"
              title="Search Catalog"
              className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] flex items-center justify-center text-slate-600 dark:text-[#aaa] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400" />
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle Theme"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] flex items-center justify-center text-slate-600 dark:text-[#aaa] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />}
          </button>

          {/* Bell Icon: ONLY SHOWN IN ADMIN PANEL */}
          {isAdmin && (
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] flex items-center justify-center text-slate-600 dark:text-[#aaa] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Admin Notifications & Alerts"
              title="Admin Notifications & Alerts"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 dark:text-cyan-400" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-white dark:border-[#050505] animate-pulse"></span>
              )}
            </button>
          )}

          {/* Cart Button: ONLY FOR NORMAL CUSTOMERS */}
          {!isAdmin && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] text-slate-800 dark:text-white hover:border-cyan-500/50 transition-colors flex items-center gap-1 sm:gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-cyan-600 text-white font-bold text-[9px] sm:text-[10px] flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Profile Button */}
              <button
                onClick={() => setIsUserProfileOpen(true)}
                className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] hover:border-cyan-500/50 transition-colors cursor-pointer"
                title="View Profile"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                  alt={user.name}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg border border-cyan-500/50 object-cover"
                />
                <span className="hidden md:inline text-xs font-bold text-slate-800 dark:text-white max-w-[85px] truncate">
                  {user.name.split(' ')[0]}
                </span>
              </button>

              {/* Log Out Button */}
              <button
                onClick={logout}
                title="Log Out"
                className="p-1.5 sm:px-2.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <button
                id="header-login-btn"
                onClick={() => openAuthModal()}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] flex items-center justify-center text-slate-600 dark:text-[#aaa] cursor-pointer shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-[#1a1a1a] bg-white dark:bg-[#0d0d0d] p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 animate-in slide-in-from-top-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {isAdmin ? (
            /* Admin Mobile Menu (no cart or repair booking) */
            <div className="space-y-2">
              <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Admin Panel Controls
              </div>
              <button
                onClick={() => {
                  setCurrentView('admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-xl bg-cyan-600 text-white text-left font-bold text-xs flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
              </button>
              <button
                onClick={() => {
                  setCurrentView('store');
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#222] text-slate-800 dark:text-white text-left font-bold text-xs flex items-center gap-2"
              >
                <Store className="w-4 h-4 text-cyan-500" /> View Storefront
              </button>
            </div>
          ) : (
            /* Customer Mobile Menu */
            <>
              <div ref={mobileSearchRef} className="space-y-2">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={mobileInputRef}
                    type="text"
                    value={inputQuery}
                    onChange={e => {
                      setInputQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (inputQuery.trim().length > 0) setIsDropdownOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search products, SKUs..."
                    className="w-full pl-9 pr-7 py-2 bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                  {inputQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Mobile Live Results in Drawer */}
                {inputQuery.trim().length > 0 && (
                  <div className="bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#222] rounded-xl p-2 max-h-64 overflow-y-auto space-y-1.5 animate-in fade-in-50 duration-150">
                    {isSearching ? (
                      <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Searching showroom...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        <div className="px-1 py-0.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Matching Products ({searchResults.length})</span>
                          <button
                            type="button"
                            onClick={handleSubmitSearch}
                            className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
                          >
                            View All →
                          </button>
                        </div>
                        {searchResults.map(product => (
                          <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className="p-2 rounded-lg bg-white dark:bg-[#1c1c1c] border border-slate-200/70 dark:border-[#282828] flex items-center gap-2.5 active:bg-cyan-500/10 cursor-pointer"
                          >
                            <img
                              src={product.image}
                              alt={product.title}
                              className="w-10 h-10 object-contain rounded bg-slate-100 dark:bg-[#222] p-0.5 flex-shrink-0"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {product.title}
                              </p>
                              <div className="flex items-center justify-between mt-0.5 text-[10px]">
                                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                                  ₹{product.price.toLocaleString('en-IN')}
                                </span>
                                <span className="text-slate-400 font-mono">
                                  {product.sku}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleSubmitSearch}
                          className="w-full py-1.5 px-2 mt-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold uppercase tracking-wider text-center"
                        >
                          View {searchResults.length} Products in Catalog
                        </button>
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          No products found
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Try searching ThinkPad, MacBook, RTX 4060, or SSD
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleCategoryClick('all')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-[#222] text-left font-bold text-slate-800 dark:text-white"
                >
                  All Items
                </button>
                <button
                  onClick={() => handleCategoryClick('laptops')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-[#222] text-left font-bold text-slate-800 dark:text-white flex items-center gap-1.5"
                >
                  <Laptop className="w-3.5 h-3.5 text-cyan-500" /> Laptops
                </button>
                <button
                  onClick={() => handleCategoryClick('accessories')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-[#222] text-left font-bold text-slate-800 dark:text-white flex items-center gap-1.5"
                >
                  <Keyboard className="w-3.5 h-3.5 text-cyan-500" /> Accessories
                </button>
                <button
                  onClick={() => handleCategoryClick('cctv')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-[#222] text-left font-bold text-slate-800 dark:text-white flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5 text-cyan-500" /> CCTV
                </button>
                <button
                  onClick={() => handleCategoryClick('custom_pc')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-[#222] text-left font-bold text-slate-800 dark:text-white flex items-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-500" /> Custom PCs
                </button>
                <button
                  onClick={() => {
                    setIsRepairModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-[#222] text-left font-bold text-slate-800 dark:text-white flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 text-cyan-500" /> Book Repair
                </button>
              </div>
            </>
          )}

          <div className="border-t border-slate-200 dark:border-[#222] pt-3 flex items-center justify-between">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => {
                    setIsUserProfileOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <UserIcon className="w-4 h-4 text-cyan-500" />
                  <span>{user.name}</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs uppercase flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Log Out
                </button>
              </div>
            ) : (
              <div className="w-full">
                <button
                  id="mobile-header-login-btn"
                  onClick={() => {
                    openAuthModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white text-center uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
