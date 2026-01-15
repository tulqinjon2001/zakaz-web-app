import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Phone,
  User,
  Map,
  X,
} from "lucide-react";
import { clientAPI } from "../services/api";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { useCart } from "../context/CartContext";
import { getTelegramUser } from "../utils/telegram";

const Checkout = ({ telegram }) => {
  const navigate = useNavigate();
  const {
    cart,
    getTotalPrice,
    getTotalItems,
    clearCart,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    location: "",
  });

  const [locationData, setLocationData] = useState(null);
  const [useLocation, setUseLocation] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState(null);

  const storeInfo = storage.get(STORAGE_KEYS.STORE_INFO);
  const storeId = storeInfo?.id;
  const currency = cart[0]?.currency || "SUM";
  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();
  const discount = 0; // For now, discount is 0

  useEffect(() => {
    if (cart.length === 0) {
      navigate("/home");
      return;
    }

    // Load saved user info from storage
    const savedUserInfo = storage.get(STORAGE_KEYS.USER_INFO);
    if (savedUserInfo) {
      setFormData((prev) => ({
        ...prev,
        name: savedUserInfo.name || prev.name,
        phone: savedUserInfo.phone || prev.phone,
        address: savedUserInfo.address || prev.address,
        location: savedUserInfo.location || prev.location,
      }));
    } else {
      // Pre-fill form with Telegram user data if no saved info
      const user = getTelegramUser();
      if (user) {
        setFormData((prev) => ({
          ...prev,
          name:
            `${user.first_name} ${user.last_name || ""}`.trim() || prev.name,
          phone: user.phone_number || prev.phone,
        }));
      }
    }
  }, [cart, navigate]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      alert("Lokatsiya funksiyasi mavjud emas");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationData({
          latitude,
          longitude,
        });
        setUseLocation(true);
        setFormData((prev) => ({
          ...prev,
          location: `${latitude}, ${longitude}`,
        }));
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Lokatsiyani olishda xatolik yuz berdi");
      }
    );
  };

  const handleOpenMapModal = () => {
    // Get current location if available
    if (locationData) {
      setMapLocation(locationData);
    } else if (formData.location) {
      const coords = formData.location
        .split(",")
        .map((c) => parseFloat(c.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        setMapLocation({ latitude: coords[0], longitude: coords[1] });
      }
    }
    setShowMapModal(true);
  };

  const handleMapLocationSelect = (lat, lng) => {
    setMapLocation({ latitude: lat, longitude: lng });
    setFormData((prev) => ({
      ...prev,
      location: `${lat}, ${lng}`,
    }));
    setLocationData({ latitude: lat, longitude: lng });
    setUseLocation(true);
  };

  const handleConfirmMapLocation = () => {
    if (mapLocation) {
      setFormData((prev) => ({
        ...prev,
        location: `${mapLocation.latitude}, ${mapLocation.longitude}`,
      }));
      setLocationData(mapLocation);
      setUseLocation(true);
      setShowMapModal(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearCart = () => {
    if (window.confirm("Savatni tozalashni xohlaysizmi?")) {
      clearCart();
      navigate("/home");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Ismingizni kiriting");
      return;
    }

    if (!formData.phone.trim()) {
      alert("Telefon raqamingizni kiriting");
      return;
    }

    if (!formData.address.trim() && !formData.location.trim()) {
      alert("Manzil yoki lokatsiyani kiriting");
      return;
    }

    setLoading(true);

    try {
      // Try to get Telegram user, but if not available, use form data
      let telegramId = null;
      const user = getTelegramUser();

      if (user && user.id) {
        telegramId = user.id.toString();
      } else if (
        window.Telegram &&
        window.Telegram.WebApp &&
        window.Telegram.WebApp.initDataUnsafe
      ) {
        // Fallback: try to get from Telegram WebApp directly
        const initData = window.Telegram.WebApp.initDataUnsafe;
        if (initData.user && initData.user.id) {
          telegramId = initData.user.id.toString();
        }
      }

      // If still no telegramId, use phone number as identifier
      if (!telegramId) {
        const cleanPhone = formData.phone
          .replace(/\s+/g, "")
          .replace(/[^0-9+]/g, "");
        telegramId = `phone_${cleanPhone}`;
      }

      // Create or get user
      const userResponse = await clientAPI.createOrGetUser({
        telegramId: telegramId,
        name: formData.name,
        phone: formData.phone,
      });

      const userId = userResponse.data.id;

      // Create order with address and location
      const orderData = {
        userId: userId,
        storeId: storeId,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        totalPrice: totalPrice,
        address: formData.address || null,
        location: formData.location || null,
      };

      await clientAPI.createOrder(orderData);

      // Save user info for next time
      storage.set(STORAGE_KEYS.USER_INFO, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        location: formData.location,
      });

      // Clear cart
      clearCart();

      // Navigate to orders page
      navigate("/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Buyurtma berishda xatolik yuz berdi";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-50"
      style={{
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/home")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Savat</h1>
          </div>
          <button
            onClick={handleClearCart}
            className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
          >
            Tozalash
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          WebkitOverflowScrolling: "touch",
          minHeight: 0,
        }}
      >
        <div className="px-4 py-4 space-y-4 pb-6">
          {/* Products List */}
          <div className="space-y-2.5">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
              >
                <div className="flex items-center space-x-2.5">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center bg-gray-100"
                      style={{ display: item.productImage ? "none" : "flex" }}
                    >
                      <span className="text-lg font-bold text-gray-400">
                        {item.productName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 mb-0.5 leading-tight">
                      {item.productName}
                    </h3>
                    {item.productCode && (
                      <p className="text-[10px] text-gray-500 mb-1.5">
                        Kod: {item.productCode}
                      </p>
                    )}
                    <p className="text-sm font-bold text-blue-600 mb-2">
                      {item.price.toLocaleString("uz-UZ")} {item.currency}
                    </p>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="w-7 h-7 bg-white text-gray-700 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm active:scale-95"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-10 text-center text-xs font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          className="w-7 h-7 bg-blue-600 text-white rounded-md flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors active:scale-95"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Mahsulotlar ({totalItems} dona)</span>
                <span>
                  {totalPrice.toLocaleString("uz-UZ")} {currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Chegirma</span>
                <span className="text-green-600">
                  - {discount.toLocaleString("uz-UZ")} {currency}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">JAMI:</span>
                <span className="text-xl font-bold text-blue-600">
                  {totalPrice.toLocaleString("uz-UZ")} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* User Information Form */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Foydalanuvchi ma'lumotlari
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Ism
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    placeholder="Ismingizni kiriting"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Telefon raqami
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    placeholder="+998 90 123 45 67"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Manzil (qo'lda yozing)
                </label>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 resize-none"
                    placeholder="To'liq manzilni kiriting (ko'cha, uy, kvartira)"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Lokatsiya
                </label>
                <div className="space-y-2 mb-2">
                  <button
                    type="button"
                    onClick={handleRequestLocation}
                    className="w-full px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Map size={18} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">
                      Joriy lokatsiyani olish
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenMapModal}
                    className="w-full px-3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <MapPin size={18} />
                    <span className="text-xs font-medium">
                      Xaritadan tanlash
                    </span>
                  </button>
                </div>
                {useLocation && locationData && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 mb-2">
                    ✓ Lokatsiya muvaffaqiyatli olingan
                  </div>
                )}
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  placeholder="Masalan: 41.3111, 69.2797"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3.5 rounded-lg transition-colors text-base mt-2"
              >
                {loading ? "Buyurtma berilmoqda..." : "Buyurtmani yakunlash"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Lokatsiyani tanlang
              </h3>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 overflow-hidden relative">
              {mapLocation ? (
                <iframe
                  src={`https://yandex.uz/map-widget/v1/?ll=${mapLocation.longitude},${mapLocation.latitude}&z=16&pt=${mapLocation.longitude},${mapLocation.latitude}&l=map`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  title="Location Map"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center p-4">
                    <Map size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      Xaritani yuklash uchun lokatsiyani tanlang
                    </p>
                    <button
                      type="button"
                      onClick={handleRequestLocation}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Joriy lokatsiyani olish
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Map Controls */}
            <div className="p-4 border-t border-gray-200 space-y-3">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Joriy lokatsiya
                </button>
                {mapLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      // Open Google Maps in new tab for better selection
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${mapLocation.latitude},${mapLocation.longitude}`,
                        "_blank"
                      );
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    Google Maps'da ochish
                  </button>
                )}
              </div>

              {/* Manual coordinate input */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  Yoki koordinatalarni kiriting:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Kenglik"
                    value={mapLocation?.latitude || ""}
                    onChange={(e) => {
                      const lat = parseFloat(e.target.value);
                      if (!isNaN(lat)) {
                        setMapLocation((prev) => ({
                          ...prev,
                          latitude: lat,
                          longitude: prev?.longitude || 69.2401,
                        }));
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Uzunlik"
                    value={mapLocation?.longitude || ""}
                    onChange={(e) => {
                      const lng = parseFloat(e.target.value);
                      if (!isNaN(lng)) {
                        setMapLocation((prev) => ({
                          ...prev,
                          longitude: lng,
                          latitude: prev?.latitude || 41.3111,
                        }));
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMapLocation}
                  disabled={!mapLocation}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  Tasdiqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
