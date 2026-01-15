import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar toggle state - default yopiq
  const scrollContainerRef = useRef(null);
  const savedScrollPosition = useRef(null);

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

  // Restore scroll position when cart changes
  useLayoutEffect(() => {
    if (savedScrollPosition.current !== null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = savedScrollPosition.current;
      savedScrollPosition.current = null;
    }
  }, [cart]);

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
    setSidebarOpen(false); // Kategoriya tanlaganda sidebar yopiladi
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
    scrollContainerRef,
    savedScrollPosition,
  }) => {
    const [imageError, setImageError] = useState(false);
    const [inputValue, setInputValue] = useState(quantity.toString());
    const [showImageModal, setShowImageModal] = useState(false);
    const showDefaultImage = !product.imageUrl || imageError;

    // Save scroll position before cart operations
    const saveScrollPosition = () => {
      if (scrollContainerRef && scrollContainerRef.current) {
        savedScrollPosition.current = scrollContainerRef.current.scrollTop;
      }
    };

    // Wrapper for addToCart to preserve scroll position
    const handleAddToCart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveScrollPosition();
      addToCart(product, 1);
    };

    // Wrapper for updateQuantity to preserve scroll position
    const handleUpdateQuantity = (newQuantity) => {
      saveScrollPosition();
      updateQuantity(product.id, newQuantity);
    };

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
        handleUpdateQuantity(1);
      } else if (numValue > inventory.stockCount) {
        // Limit to stock count
        setInputValue(inventory.stockCount.toString());
        handleUpdateQuantity(inventory.stockCount);
      } else {
        // Update quantity
        handleUpdateQuantity(numValue);
      }
    };

    const handleInputKeyPress = (e) => {
      if (e.key === "Enter") {
        e.target.blur();
      }
    };

    return (
      <>
        <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          {/* Product Image */}
          <div className="relative w-full h-40 sm:h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden cursor-pointer">
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
                className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold text-white shadow-md ${
                  inventory.stockCount < 10 ? "bg-orange-500" : "bg-green-500"
                }`}
              >
                {inventory.stockCount} dona
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-3 sm:p-4 space-y-2">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem]">
              {product.name}
            </h3>
            {product.code && (
              <p className="text-xs text-gray-500">Kod: {product.code}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-lg sm:text-xl font-bold text-blue-600">
                {inventory.price.toLocaleString("uz-UZ")}{" "}
                <span className="text-sm">{inventory.currency}</span>
              </span>
            </div>

            {/* Action Button */}
            {inventory.stockCount > 0 ? (
              isInCart ? (
                <div className="flex items-center justify-between bg-gray-100 rounded-lg p-1.5 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUpdateQuantity(Math.max(1, quantity - 1));
                    }}
                    className="w-9 h-9 bg-white text-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyPress={handleInputKeyPress}
                    className="w-14 h-9 bg-white border-2 border-gray-300 rounded-lg text-center text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={4}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUpdateQuantity(
                        Math.min(inventory.stockCount, quantity + 1)
                      );
                    }}
                    className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 mt-2 shadow-sm"
                >
                  <Plus size={18} />
                  <span>Savatga</span>
                </button>
              )
            ) : (
              <div className="w-full bg-gray-200 text-gray-500 text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center border border-gray-300 mt-2">
                Tugagan
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
                type="button"
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
    <div className="h-screen bg-gray-50 flex overflow-hidden relative">
      {/* Backdrop Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div
        className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out
          fixed md:relative z-50 md:z-auto
          ${sidebarOpen ? "w-80 md:w-64" : "w-0 border-r-0"}
        `}
      >
        <div
          className={`p-4 border-b border-gray-200 whitespace-nowrap overflow-hidden ${
            sidebarOpen ? "opacity-100" : "opacity-0 w-0 p-0"
          } transition-opacity duration-300`}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Kategoriyalar</h1>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
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
                type="button"
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
                    type="button"
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
                          type="button"
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
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0 shadow-sm"
            >
              <Menu size={20} className="text-white" />
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
              type="button"
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
        </div>

        {/* Category Filter Tabs - Alohida qator */}
        {!searchQuery && (
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
              <button
                type="button"
                onClick={() => handleCategorySelect(null)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-semibold shadow-sm ${
                  !selectedCategory
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Barchasi
              </button>
              {categoryTree.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm font-semibold shadow-sm ${
                    selectedCategory?.id === category.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 bg-gray-50"
        >
          {/* Filter/Sort Bar */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 shadow-sm"
            >
              <option value="">📊 Tartiblash</option>
              <option value="name-asc">📝 Nomi (A-Z)</option>
              <option value="name-desc">📝 Nomi (Z-A)</option>
              <option value="price-asc">💰 Narxi ↑</option>
              <option value="price-desc">💰 Narxi ↓</option>
              <option value="stock-asc">📦 Soni ↑</option>
              <option value="stock-desc">📦 Soni ↓</option>
            </select>
            <div className="bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm">
              {filteredProducts.length} ta
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Mahsulotlar topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
                    scrollContainerRef={scrollContainerRef}
                    savedScrollPosition={savedScrollPosition}
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
