import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, LogOut } from "lucide-react";
import { getTelegramUser } from "../utils/telegram";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { clientAPI } from "../services/api";

const Account = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    location: null,
  });
  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const telegramUser = getTelegramUser();

      // Load saved account data from localStorage
      const savedAccountData = storage.get(STORAGE_KEYS.ACCOUNT_INFO);

      if (savedAccountData) {
        // Use saved data if available
        setFormData(savedAccountData);
      } else if (telegramUser) {
        // Otherwise use Telegram data as default
        setUser(telegramUser);
        setFormData((prev) => ({
          ...prev,
          name: `${telegramUser.first_name} ${telegramUser.last_name || ""}`.trim(),
          phone: telegramUser.phone_number || "",
        }));
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading user data:", error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGetCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData((prev) => ({
            ...prev,
            location: `${latitude},${longitude}`,
          }));
          setGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Lokatsiyani olishda xatolik yuz berdi");
          setGettingLocation(false);
        },
      );
    } else {
      alert(
        "Sizning brauzeringiz geolokatsiyani qo'llashni qo'llashni qo'llamasligi mumkin",
      );
      setGettingLocation(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Validate inputs
      if (!formData.name.trim()) {
        alert("Iltimos, ismingizni kiriting");
        return;
      }

      if (!formData.phone.trim()) {
        alert("Iltimos, telefon raqamingizni kiriting");
        return;
      }

      // Save to localStorage
      storage.set(STORAGE_KEYS.ACCOUNT_INFO, formData);
      alert("✅ Profil saqlandi!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Profil saqlanishda xatolik yuz berdi");
    }
  };

  const handleLogout = () => {
    storage.remove(STORAGE_KEYS.STORE_INFO);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Profil</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Personal Info Section */}
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Foydalanuvchi ma'lumotlari
            </h2>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ism
              </label>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">👤</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ismingizni kiriting"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon raqami
              </label>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">📞</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            {/* Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manzil (qo'lda yozish)
              </label>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">📍</span>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Yunusobod tumani 12, 20A uy"
                />
              </div>
            </div>

            {/* Location */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lokatsiya
              </label>
              <div className="space-y-2">
                <button
                  onClick={handleGetCurrentLocation}
                  disabled={gettingLocation}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  <MapPin size={20} />
                  {gettingLocation
                    ? "Lokatsiya olinmoqda..."
                    : "Joriy lokatsiyani olish"}
                </button>

                {formData.location && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Koordinatalar:</p>
                    <p className="text-sm font-mono text-gray-700 break-all">
                      {formData.location}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              💾 Saqlash
            </button>
          </div>
        </div>
      </div>

      {/* Logout Button - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Chiqish
        </button>
      </div>
    </div>
  );
};

export default Account;
