import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, ProductCondition } from '../../types.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  Plus,
  Search,
  Upload,
  Image as ImageIcon,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Star,
  RefreshCw,
  ExternalLink,
  Sliders,
  Layers,
  Sparkles
} from 'lucide-react';

export const AdminProductsTab: React.FC = () => {
  const { showToast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('laptops');
  const [condition, setCondition] = useState<ProductCondition>('brand_new');
  const [price, setPrice] = useState<number>(50000);
  const [originalPrice, setOriginalPrice] = useState<number>(65000);
  const [stock, setStock] = useState<number>(5);
  const [description, setDescription] = useState('');

  // Image upload / hotlinking
  const [image, setImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Hardware Specs
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [display, setDisplay] = useState('');
  const [gpu, setGpu] = useState('');
  const [battery, setBattery] = useState('');
  const [warranty, setWarranty] = useState('');
  const [tagline, setTagline] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search || undefined
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
  }, [categoryFilter, search]);

  const openAddModal = () => {
    setEditingProduct(null);
    setTitle('');
    setBrand('');
    setSku(`SYS-${Date.now().toString().slice(-5)}`);
    setCategory('laptops');
    setCondition('brand_new');
    setPrice(59999);
    setOriginalPrice(75000);
    setStock(3);
    setDescription('');
    setImage('https://lh3.googleusercontent.com/aida-public/AB6AXuAFae43APyV18GCX-dXReo3_LGOl-LsRl0d2tHjQi4P287FuIMYf8rrwPzlrYdVI2L3aVRBiyG8xg-dTa0X-gpotN6hzQFBgXB3tNXnGicGJrEziZBb833nab4W2RA2xsEuBoyUF5ZHVxJ7LzmI4XHCp2X1tzbH-ZXjLnuPHRGC0rpOT_jefm8ht74wPtXJ1DnVb_Z0QZUBopWwZftWZtCQKFxV3-_U2qkBBtR8k7LwyUHEEB_vcKsc7w');
    setCpu('Intel Core i7-13th Gen (10-Core up to 5.0GHz)');
    setRam('16GB DDR5 5200MHz');
    setStorage('512GB NVMe PCIe Gen4 SSD');
    setDisplay('14" FHD+ IPS Anti-Glare 100% sRGB');
    setGpu('Intel Iris Xe Graphics');
    setBattery('95%+ Tested Battery Health');
    setWarranty('1-Yr SysTech Certified Store Warranty & 40-Point Diagnostic Check');
    setTagline('Factory Inspected with Zero Fault Guarantee');
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setTitle(prod.title);
    setBrand(prod.brand);
    setSku(prod.sku);
    setCategory(prod.category);
    setCondition(prod.condition);
    setPrice(prod.price);
    setOriginalPrice(prod.originalPrice || prod.price);
    setStock(prod.stock);
    setDescription(prod.description || '');
    setImage(prod.image);

    setCpu(prod.specs?.cpu || '');
    setRam(prod.specs?.ram || '');
    setStorage(prod.specs?.storage || '');
    setDisplay(prod.specs?.display || '');
    setGpu(prod.specs?.gpu || '');
    setBattery(prod.specs?.battery || '');
    setWarranty(prod.specs?.warranty || '');
    setTagline(prod.specs?.tagline || '');

    setIsModalOpen(true);
  };

  // Image Upload handler (supports file upload & local base64 to backend)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await api.uploadImage(base64, file.name);
          setImage(res.url);
          showToast('Image Uploaded', 'Stored in backend image storage.', 'success');
        } catch (err: any) {
          // Fallback to direct base64 data url
          setImage(base64);
          showToast('Image Loaded', 'Local image ready for save.', 'info');
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      showToast('Upload Error', e.message, 'error');
      setIsUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !image) {
      showToast('Validation Error', 'Title, price, and image are required.', 'error');
      return;
    }

    const payload = {
      title,
      brand: brand || 'Generic',
      sku: sku || `SYS-${Date.now().toString().slice(-4)}`,
      category,
      condition,
      price: Number(price),
      originalPrice: Number(originalPrice) || Number(price),
      stock: Number(stock),
      image,
      description,
      specs: {
        cpu,
        ram,
        storage,
        display,
        gpu,
        battery,
        warranty,
        tagline
      }
    };

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showToast('Product Updated', `${title} updated in Kumta inventory.`, 'success');
      } else {
        await api.createProduct(payload);
        showToast('Product Added', `${title} published to live customer catalog!`, 'success');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (e: any) {
      showToast('Save Error', e.message || 'Failed to save product', 'error');
    }
  };

  const handleStockAdjust = async (prod: Product, delta: number) => {
    const newStock = Math.max(0, prod.stock + delta);
    try {
      await api.updateProduct(prod.id, { stock: newStock });
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, stock: newStock } : p));
      showToast('Stock Updated', `${prod.title} stock adjusted to ${newStock}.`, 'success');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const handleToggleActive = async (prod: Product) => {
    try {
      const updated = await api.updateProduct(prod.id, { active: !prod.active });
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, active: !prod.active } : p));
      showToast('Status Toggled', `Product is now ${!prod.active ? 'visible to customers' : 'hidden'}.`, 'info');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const handleDelete = async (prod: Product) => {
    if (!confirm(`Are you sure you want to delete ${prod.title}?`)) return;
    try {
      await api.deleteProduct(prod.id);
      setProducts(prev => prev.filter(p => p.id !== prod.id));
      showToast('Product Removed', `${prod.title} removed from database.`, 'info');
    } catch (e: any) {
      showToast('Delete Error', e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0d0d] p-5 rounded-xl border border-[#1a1a1a] shadow-xs">
        <div>
          <h2 className="text-xl font-serif italic text-white">
            Live Gadget & Laptop Catalog ({products.length})
          </h2>
          <p className="text-xs text-[#777] mt-0.5 font-sans">
            Instant upload, pricing edits, stock counters, and customer visibility toggles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#555]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by SKU or title..."
              className="w-full pl-9 pr-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-xs text-white placeholder-[#555] font-mono outline-none focus:border-cyan-500"
            />
          </div>

          {/* Add Product CTA */}
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Laptop / Gadget
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080808] text-[#777] font-mono text-[11px] uppercase border-b border-[#1a1a1a]">
              <tr>
                <th className="px-5 py-3.5">Gadget & Image</th>
                <th className="px-4 py-3.5">Category & Condition</th>
                <th className="px-4 py-3.5">In-Store Price (₹)</th>
                <th className="px-4 py-3.5">Live Stock</th>
                <th className="px-4 py-3.5">Customer Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#666] font-mono">
                    Loading inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#666] font-mono">
                    No products found. Click "Add Laptop / Gadget" to upload your first item!
                  </td>
                </tr>
              ) : (
                products.map(prod => (
                  <tr key={prod.id} className="hover:bg-[#111] transition-colors">
                    {/* Image & Title */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg bg-[#141414] p-1 shrink-0 flex items-center justify-center overflow-hidden border border-[#222]">
                          <img
                            src={prod.image}
                            alt={prod.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <span className="font-mono text-[10px] text-[#666] block uppercase">
                            SKU: {prod.sku}
                          </span>
                          <strong className="text-white font-serif italic text-sm line-clamp-1">
                            {prod.title}
                          </strong>
                          <span className="text-[11px] text-[#777] font-mono">
                            {prod.specs?.cpu ? prod.specs.cpu.split('(')[0] : prod.brand}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category & Condition */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141414] border border-[#222] text-[#888] uppercase">
                          {prod.category}
                        </span>
                        <div className="block">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              prod.condition === 'refurbished'
                                ? 'bg-[#151515] border-emerald-900/50 text-emerald-400'
                                : 'bg-[#151515] border-cyan-900/50 text-cyan-400'
                            }`}
                          >
                            {prod.condition === 'refurbished' ? 'Refurbished' : 'Brand New'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-serif italic text-cyan-400 text-sm">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </div>
                      {prod.originalPrice && prod.originalPrice > prod.price && (
                        <div className="text-[10px] text-[#555] line-through font-mono">
                          ₹{prod.originalPrice.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Stock with 1-click counter */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 bg-[#141414] border border-[#222] p-1 rounded-md">
                        <button
                          onClick={() => handleStockAdjust(prod, -1)}
                          className="w-6 h-6 rounded bg-[#1c1c1c] text-[#ccc] hover:text-white flex items-center justify-center font-bold hover:bg-[#252525] transition-colors"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-xs text-white">
                          {prod.stock}
                        </span>
                        <button
                          onClick={() => handleStockAdjust(prod, 1)}
                          className="w-6 h-6 rounded bg-[#1c1c1c] text-[#ccc] hover:text-white flex items-center justify-center font-bold hover:bg-[#252525] transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Visibility Toggle */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(prod)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase border transition-all ${
                          prod.active
                            ? 'bg-[#141414] border-emerald-900/50 text-emerald-400'
                            : 'bg-[#141414] border-[#222] text-[#666]'
                        }`}
                      >
                        {prod.active ? '● Live on Store' : '○ Hidden'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-2 rounded-md bg-[#141414] border border-[#222] hover:border-cyan-900/50 hover:text-cyan-400 text-[#888] transition-colors"
                          title="Edit Specs & Image"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod)}
                          className="p-2 rounded-md bg-[#141414] border border-[#222] hover:border-red-900/50 hover:text-red-400 text-[#888] transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-[#0d0d0d] text-[#e0e0e0] rounded-xl shadow-2xl border border-[#1a1a1a] overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between">
              <div>
                <h3 className="text-xl font-serif italic text-white">
                  {editingProduct ? 'Edit Gadget / Laptop' : 'Upload New Gadget / Laptop'}
                </h3>
                <p className="text-xs text-[#777] font-sans">
                  Instantly visible to customers across Kumta store catalog.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#181818] border border-[#262626] flex items-center justify-center text-[#777] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProduct} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* IMAGE UPLOAD & PREVIEW SECTION */}
              <div className="p-4 rounded-lg bg-[#111] border border-[#1e1e1e] space-y-3">
                <span className="font-serif italic text-white flex items-center gap-1.5 text-sm">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  Product Image (Upload File or Hotlink URL)
                </span>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {/* Image Preview */}
                  <div className="w-24 h-24 rounded-lg bg-[#080808] border border-[#222] flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-xs">
                    {image ? (
                      <img src={image} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-[#555] text-center font-mono">No Image</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    {/* Hotlink Input */}
                    <div>
                      <label className="block text-[11px] font-mono text-[#888] mb-0.5">
                        Image Hotlink / URL (or paste web link)
                      </label>
                      <input
                        type="url"
                        value={image}
                        onChange={e => setImage(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-md bg-[#080808] border border-[#222] font-mono text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                      />
                    </div>

                    {/* Local File Upload Button */}
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-md bg-[#161616] border border-[#262626] hover:bg-[#202020] text-cyan-400 font-mono cursor-pointer flex items-center gap-1.5 transition-colors text-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingImage ? 'Uploading...' : 'Upload Image from Computer'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-[#555] font-mono">PNG, JPG, WebP supported</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Lenovo ThinkPad X1 Carbon Gen 11"
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="e.g. Lenovo / Apple / Dell / HP"
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                  />
                </div>
              </div>

              {/* Category, Condition, SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none"
                  >
                    <option value="laptops" className="bg-[#111]">Laptops & MacBooks</option>
                    <option value="accessories" className="bg-[#111]">Accessories & Docks</option>
                    <option value="cctv" className="bg-[#111]">CCTV & Surveillance</option>
                    <option value="custom_pc" className="bg-[#111]">Custom PCs & Parts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Condition</label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none"
                  >
                    <option value="brand_new" className="bg-[#111]">Brand New (Factory Sealed)</option>
                    <option value="refurbished" className="bg-[#111]">Certified Refurbished (Grade A+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Store SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value.toUpperCase())}
                    placeholder="SYS-THINK-X1"
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-white font-mono focus:border-cyan-500 outline-none placeholder-[#555]"
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] font-mono font-bold text-cyan-400 focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Original / MRP (₹)</label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={e => setOriginalPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-white font-mono focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Stock Units</label>
                  <input
                    type="number"
                    min={0}
                    value={stock}
                    onChange={e => setStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-white font-mono focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              {/* Hardware Specifications Sub-Form */}
              <div className="pt-2">
                <span className="font-serif italic text-white block mb-2 text-sm">
                  Technical Specifications Matrix
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-[#666] mb-0.5">CPU / Processor</label>
                    <input
                      type="text"
                      value={cpu}
                      onChange={e => setCpu(e.target.value)}
                      placeholder="e.g. Intel Core i7-1365U vPro"
                      className="w-full px-3 py-1.5 rounded-md bg-[#080808] border border-[#222] text-white font-mono text-xs focus:border-cyan-500 outline-none placeholder-[#555]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-[#666] mb-0.5">RAM Memory</label>
                    <input
                      type="text"
                      value={ram}
                      onChange={e => setRam(e.target.value)}
                      placeholder="e.g. 32GB LPDDR5"
                      className="w-full px-3 py-1.5 rounded-md bg-[#080808] border border-[#222] text-white font-mono text-xs focus:border-cyan-500 outline-none placeholder-[#555]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-[#666] mb-0.5">Storage SSD</label>
                    <input
                      type="text"
                      value={storage}
                      onChange={e => setStorage(e.target.value)}
                      placeholder="e.g. 1TB NVMe Gen4 SSD"
                      className="w-full px-3 py-1.5 rounded-md bg-[#080808] border border-[#222] text-white font-mono text-xs focus:border-cyan-500 outline-none placeholder-[#555]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-[#666] mb-0.5">Display Panel</label>
                    <input
                      type="text"
                      value={display}
                      onChange={e => setDisplay(e.target.value)}
                      placeholder='e.g. 14" 2.8K OLED 90Hz'
                      className="w-full px-3 py-1.5 rounded-md bg-[#080808] border border-[#222] text-white font-mono text-xs focus:border-cyan-500 outline-none placeholder-[#555]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-[#666] mb-0.5">GPU Solution</label>
                    <input
                      type="text"
                      value={gpu}
                      onChange={e => setGpu(e.target.value)}
                      placeholder="e.g. Intel Iris Xe / RTX 4060"
                      className="w-full px-3 py-1.5 rounded-md bg-[#080808] border border-[#222] text-white font-mono text-xs focus:border-cyan-500 outline-none placeholder-[#555]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-[#666] mb-0.5">Battery Condition</label>
                    <input
                      type="text"
                      value={battery}
                      onChange={e => setBattery(e.target.value)}
                      placeholder="e.g. 98% Battery Health"
                      className="w-full px-3 py-1.5 rounded-md bg-[#080808] border border-[#222] text-white font-mono text-xs focus:border-cyan-500 outline-none placeholder-[#555]"
                    />
                  </div>
                </div>
              </div>

              {/* Warranty text */}
              <div>
                <label className="block text-[#aaa] font-medium mb-1">Warranty & Certification Notes</label>
                <input
                  type="text"
                  value={warranty}
                  onChange={e => setWarranty(e.target.value)}
                  placeholder="e.g. 1-Yr SysTech Certified Store Warranty & 40-Point Diagnostic Check"
                  className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#1a1a1a] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-[#161616] border border-[#262626] text-[#aaa] hover:text-white font-mono text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-cyan-950/40 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingProduct ? 'Save Changes' : 'Publish Product to Live Store'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
