import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, User, Map, List, ArrowRight } from 'lucide-react';
import { clientAPI } from '../services/api';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { useCart } from '../context/CartContext';
import { getTelegramUser } from '../utils/telegram';

const Checkout = ({ telegram }) => {
  const navigate = useNavigate();
  const { cart, getTotalPrice, getTotalItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    location: '',
  });

  const [locationData, setLocationData] = useState(null);
  const [useLocation, setUseLocation] = useState(false);

  const storeInfo = storage.get(STORAGE_KEYS.STORE_INFO);
  const storeId = storeInfo?.id;
  const currency = cart[0]?.currency || 'SUM';
  const totalPrice = getTotalPrice();

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/home');
      return;
    }

    // Load saved user info from storage
    const savedUserInfo = storage.get(STORAGE_KEYS.USER_INFO);
    if (savedUserInfo) {
      setFormData(prev => ({
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
        setFormData(prev => ({
          ...prev,
          name: `${user.first_name} ${user.last_name || ''}`.trim() || prev.name,
          phone: user.phone_number || prev.phone,
        }));
      }
    }
  }, [cart, navigate]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      alert('Lokatsiya funksiyasi mavjud emas');
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
        setFormData(prev => ({
          ...prev,
          location: `${latitude}, ${longitude}`,
        }));
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Lokatsiyani olishda xatolik yuz berdi');
      }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Ismingizni kiriting');
      return;
    }
    
    if (!formData.phone.trim()) {
      alert('Telefon raqamingizni kiriting');
      return;
    }
    
    if (!formData.address.trim() && !formData.location.trim()) {
      alert('Manzil yoki lokatsiyani kiriting');
      return;
    }

    setLoading(true);

    try {
      // Try to get Telegram user, but if not available, use form data
      let telegramId = null;
      const user = getTelegramUser();
      
      if (user && user.id) {
        telegramId = user.id.toString();
      } else if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        // Fallback: try to get from Telegram WebApp directly
        const initData = window.Telegram.WebApp.initDataUnsafe;
        if (initData.user && initData.user.id) {
          telegramId = initData.user.id.toString();
        }
      }

      // If still no telegramId, use phone number as identifier
      // This allows orders even when Telegram WebApp is not available (e.g., in browser)
      if (!telegramId) {
        // Use phone number as identifier (remove spaces and special chars)
        const cleanPhone = formData.phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
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
      navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Buyurtma berishda xatolik yuz berdi';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/home')}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Buyurtma berish</h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Contact Info & Location */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact Information */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-2 mb-4">
                <User size={18} className="text-gray-700" />
                <h2 className="text-base font-bold text-gray-900">Kontakt ma'lumotlari</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Ism
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                    <Phone size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                    <MapPin size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 resize-none"
                      placeholder="To'liq manzilni kiriting (ko'cha, uy, kvartira)"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Map size={18} className="text-gray-700" />
                <h2 className="text-base font-bold text-gray-900">Lokatsiya</h2>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  className="w-full px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center space-y-1.5"
                >
                  <Map size={20} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-700">Lokatsiyani xaritadan belgilash</span>
                </button>

                {useLocation && locationData && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                    ✓ Lokatsiya muvaffaqiyatli olingan
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-600 mb-1.5">Yoki koordinatalarni kiriting</p>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    placeholder="Masalan: 41.3111, 69.2797"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-16">
              <div className="flex items-center space-x-2 mb-4">
                <List size={18} className="text-gray-700" />
                <h2 className="text-base font-bold text-gray-900">Buyurtma xulosasi</h2>
              </div>

              <div className="space-y-2.5 mb-4">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-start justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <span className="text-gray-700 font-medium block">{item.productName}</span>
                      <span className="text-gray-500 text-[10px]">
                        {item.quantity} × {item.price.toLocaleString('uz-UZ')} {item.currency}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900 text-xs whitespace-nowrap">
                      {(item.price * item.quantity).toLocaleString('uz-UZ')} {item.currency}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-200 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Jami to'lov:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {totalPrice.toLocaleString('uz-UZ')} {currency}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <span>{loading ? 'Buyurtma berilmoqda...' : 'Buyurtmani yakunlash'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>

              <p className="text-[10px] text-gray-500 text-center mt-3 leading-relaxed">
                Tugmani bosish orqali siz bizning{' '}
                <span className="text-blue-600 underline cursor-pointer">foydalanish shartlarimizga</span>{' '}
                rozilik bildirasiz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
