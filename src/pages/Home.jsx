import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  LayoutGrid,
  GlassWater,
  Cake,
  UtensilsCrossed,
  Sandwich,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { clientAPI } from "../services/api";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { useCart } from "../context/CartContext";
import { getTelegramUser } from "../utils/telegram";

const Home = ({ telegram }) => {
  const navigate = useNavigate();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalPrice,
    getTotalItems,
  } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortBy, setSortBy] = useState(""); // "name-asc", "name-desc", "price-asc", "price-desc", "stock-asc", "stock-desc"
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar toggle state

  const storeInfo = storage.get(STORAGE_KEYS.STORE_INFO);
  const storeId = storeInfo?.id;

  useEffect(() => {
    if (!storeId) {
      navigate("/");
      return;
    }
    fetchData();
  }, [storeId, navigate]);

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return;

    try {
      const user = getTelegramUser();
      if (!user) {
        alert("Foydalanuvchi ma'lumotlari topilmadi");
        return;
      }

      // Create or get user
      const userResponse = await clientAPI.createOrGetUser({
        telegramId: user.id.toString(),
        name: `${user.first_name} ${user.last_name || ""}`.trim(),
        phone: user.phone_number || null,
      });

      const userId = userResponse.data.id;

      // Create order
      const orderData = {
        userId: userId,
        storeId: storeId,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        totalPrice: getTotalPrice(),
      };

      await clientAPI.createOrder(orderData);

      // Clear cart
      cart.forEach((item) => removeFromCart(item.productId));

      navigate("/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Buyurtma berishda xatolik yuz berdi");
    }
  }, [cart, storeId, navigate, getTotalPrice, removeFromCart]);

  useEffect(() => {
    // Setup Telegram MainButton
    if (telegram && telegram.MainButton) {
      const totalItems = getTotalItems();
      if (totalItems > 0) {
        const totalPrice = getTotalPrice();
        const currency = cart[0]?.currency || "SUM";
        const priceText = totalPrice.toLocaleString("uz-UZ");

        telegram.MainButton.setText(
          `Buyurtma berish (${priceText} ${currency})`
        );
        telegram.MainButton.onClick(() => navigate("/checkout"));
        telegram.MainButton.show();

        return () => {
          if (telegram && telegram.MainButton) {
            telegram.MainButton.offClick(handleCheckout);
            telegram.MainButton.hide();
          }
        };
      } else {
        telegram.MainButton.hide();
      }
    }
  }, [telegram, cart, getTotalItems, getTotalPrice, handleCheckout]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        clientAPI.getProductsByStore(storeId),
        clientAPI.getCategories(),
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setSelectedCategory(null);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery) {
      filterProducts();
      return;
    }

    const timer = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchProducts = async (query) => {
    try {
      const response = await clientAPI.searchProducts({
        name: query,
        storeId: storeId,
      });
      const sorted = sortProducts(response.data);
      setFilteredProducts(sorted);
    } catch (error) {
      console.error("Error searching products:", error);
    }
  };

  const getAllCategoryIds = (category) => {
    const ids = [category.id];
    if (category.children && category.children.length > 0) {
      category.children.forEach((child) => {
        ids.push(child.id);
        // Recursively get all sub-categories
        if (child.children && child.children.length > 0) {
          child.children.forEach((subChild) => {
            ids.push(subChild.id);
          });
        }
      });
    }
    return ids;
  };

  const sortProducts = (productsList) => {
    if (!sortBy) return productsList;

    const sorted = [...productsList];
    const [field, order] = sortBy.split("-");

    sorted.sort((a, b) => {
      let aValue, bValue;

      if (field === "name") {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (field === "price") {
        aValue = a.inventories?.[0]?.price || 0;
        bValue = b.inventories?.[0]?.price || 0;
      } else if (field === "stock") {
        aValue = a.inventories?.[0]?.stockCount || 0;
        bValue = b.inventories?.[0]?.stockCount || 0;
      }

      if (aValue < bValue) return order === "asc" ? -1 : 1;
      if (aValue > bValue) return order === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const filterProducts = () => {
    if (searchQuery) {
      // Already filtered by search
      return;
    }

    let filtered = [...products];

    if (selectedCategory) {
      // Get all category IDs including sub-categories
      const categoryIds = getAllCategoryIds(selectedCategory);
      filtered = filtered.filter((product) =>
        categoryIds.includes(product.categoryId)
      );
    }

    // Apply sorting
    filtered = sortProducts(filtered);

    setFilteredProducts(filtered);
  };

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, products, sortBy]);

  const buildCategoryTree = (cats) => {
    const categoryMap = new Map();
    const rootCategories = [];

    cats.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    cats.forEach((cat) => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(cat.id));
        }
      } else {
        rootCategories.push(categoryMap.get(cat.id));
      }
    });

    return rootCategories;
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSearchQuery("");
  };

  const getCartQuantity = (productId) => {
    const item = cart.find((item) => item.productId === productId);
    return item?.quantity || 0;
  };

  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes("ichimlik") || name.includes("drink")) return GlassWater;
    if (name.includes("shirinlik") || name.includes("sweet")) return Cake;
    if (name.includes("oziq") || name.includes("food")) return UtensilsCrossed;
    if (name.includes("fast") || name.includes("burger")) return Sandwich;
    return LayoutGrid;
  };

  const categoryTree = buildCategoryTree(categories);

  // Product Card with Image Component
  const ProductImageCard = ({
    product,
    inventory,
    quantity,
    isInCart,
    updateQuantity,
    addToCart,
  }) => {
    const [imageError, setImageError] = useState(false);
    const [inputValue, setInputValue] = useState(quantity.toString());
    const [showImageModal, setShowImageModal] = useState(false);
    const showDefaultImage = !product.imageUrl || imageError;

    // Update input value when quantity changes
    useEffect(() => {
      setInputValue(quantity.toString());
    }, [quantity]);

    const handleInputChange = (e) => {
      const value = e.target.value;
      // Allow empty string for editing
      if (value === "") {
        setInputValue("");
        return;
      }
      // Only allow numbers
      if (/^\d+$/.test(value)) {
        const numValue = parseInt(value, 10);
        // Limit to stock count
        if (numValue <= inventory.stockCount) {
          setInputValue(value);
        }
      }
    };

    const handleInputBlur = () => {
      const numValue = parseInt(inputValue, 10);
      if (isNaN(numValue) || numValue < 1) {
        // Reset to 1 if invalid
        setInputValue("1");
        updateQuantity(product.id, 1);
      } else if (numValue > inventory.stockCount) {
        // Limit to stock count
        setInputValue(inventory.stockCount.toString());
        updateQuantity(product.id, inventory.stockCount);
      } else {
        // Update quantity
        updateQuantity(product.id, numValue);
      }
    };

    const handleInputKeyPress = (e) => {
      if (e.key === "Enter") {
        e.target.blur();
      }
    };

    return (
      <>
        <div className="w-48 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Product Image */}
          <div className="relative w-full h-28 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer">
            {!showDefaultImage ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-1"
                onError={() => setImageError(true)}
                onDoubleClick={() => setShowImageModal(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-1">
                    <span className="text-lg font-bold text-gray-500">
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-500">{product.name}</p>
                </div>
              </div>
            )}

            {/* Qoldiq Badge */}
            {inventory.stockCount > 0 && (
              <div
                className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${
                  inventory.stockCount < 10 ? "bg-orange-500" : "bg-green-500"
                }`}
              >
                {inventory.stockCount} dona
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-2 space-y-1">
            <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">
              {product.name}
            </h3>
            {product.code && (
              <p className="text-[9px] text-gray-500">Kod: {product.code}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-blue-600">
                {inventory.price.toLocaleString("uz-UZ")} {inventory.currency}
              </span>
            </div>

            {/* Action Button */}
            {inventory.stockCount > 0 ? (
              isInCart ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1 mt-1">
                  <button
                    onClick={() =>
                      updateQuantity(product.id, Math.max(1, quantity - 1))
                    }
                    className="w-7 h-7 bg-white text-gray-700 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyPress={handleInputKeyPress}
                    className="w-12 h-7 bg-white border border-gray-200 rounded text-center text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={4}
                  />
                  <button
                    onClick={() =>
                      updateQuantity(
                        product.id,
                        Math.min(inventory.stockCount, quantity + 1)
                      )
                    }
                    className="w-7 h-7 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(product, 1)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center space-x-1 mt-1"
                >
                  <Plus size={14} />
                  <span>Savatga</span>
                </button>
              )
            ) : (
              <div className="w-full bg-gray-100 text-gray-400 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center border border-gray-200 mt-1">
                TUGAGAN
              </div>
            )}
          </div>
        </div>

        {/* Image Modal */}
        {showImageModal && product.imageUrl && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-auto h-auto object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 bg-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg z-10"
              >
                <span className="text-3xl font-bold leading-none">×</span>
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-0 border-r-0"
        }`}
      >
        <div
          className={`p-4 border-b border-gray-200 whitespace-nowrap overflow-hidden ${
            sidebarOpen ? "opacity-100" : "opacity-0 w-0 p-0"
          } transition-opacity duration-300`}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">POS Shop</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
        <div
          className={`flex-1 overflow-y-auto overscroll-contain ${
            sidebarOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          } transition-opacity duration-300`}
        >
          <div className="p-2">
            <div className="mb-2">
              <button
                onClick={() => handleCategorySelect(null)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  !selectedCategory
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <LayoutGrid size={20} />
                <span className="font-medium">Barchasi</span>
              </button>
            </div>
            {categoryTree.map((category) => {
              const Icon = getCategoryIcon(category.name);
              return (
                <div key={category.id} className="mb-1">
                  <button
                    onClick={() => handleCategorySelect(category)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                      selectedCategory?.id === category.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{category.name}</span>
                  </button>
                  {category.children && category.children.length > 0 && (
                    <div className="ml-8 mt-1 space-y-1">
                      {category.children.map((subCategory) => (
                        <button
                          key={subCategory.id}
                          onClick={() => handleCategorySelect(subCategory)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                            selectedCategory?.id === subCategory.id
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span>{subCategory.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center space-x-3 mb-3">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
            >
              {sidebarOpen ? (
                <ChevronLeft size={20} className="text-gray-700" />
              ) : (
                <Menu size={20} className="text-gray-700" />
              )}
            </button>
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Mahsulotlarni qidirish..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="relative p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ShoppingCart size={22} className="text-gray-700" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          {/* Category Filter Tabs */}
          {!searchQuery && (
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => handleCategorySelect(null)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-medium ${
                  !selectedCategory
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Barchasi
              </button>
              {categoryTree.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-medium ${
                    selectedCategory?.id === category.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 bg-gray-50">
          {/* Filter/Sort Bar */}
          <div className="mb-4 flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                Tartiblash:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="">Tartiblanmagan</option>
                <option value="name-asc">Nomi (A-Z)</option>
                <option value="name-desc">Nomi (Z-A)</option>
                <option value="price-asc">Narxi (Past → Yuqori)</option>
                <option value="price-desc">Narxi (Yuqori → Past)</option>
                <option value="stock-asc">Soni (Kam → Ko'p)</option>
                <option value="stock-desc">Soni (Ko'p → Kam)</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Jami: {filteredProducts.length} ta mahsulot
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Mahsulotlar topilmadi</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {filteredProducts.map((product) => {
                const inventory = product.inventories?.[0];
                const quantity = getCartQuantity(product.id);
                const isInCart = quantity > 0;

                if (!inventory) return null;

                return (
                  <ProductImageCard
                    key={product.id}
                    product={product}
                    inventory={inventory}
                    quantity={quantity}
                    isInCart={isInCart}
                    updateQuantity={updateQuantity}
                    addToCart={addToCart}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
