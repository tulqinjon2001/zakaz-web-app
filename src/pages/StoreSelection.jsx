import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientAPI } from '../services/api';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { MapPin, Loader } from 'lucide-react';

const StoreSelection = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setError(null);
      const response = await clientAPI.getStores();
      
      // Check if response data is valid
      if (!response || !response.data) {
        throw new Error('Javob ma\'lumotlari noto\'g\'ri');
      }
      
      const storesData = Array.isArray(response.data) ? response.data : [];
      setStores(storesData);
      
      // Check if there's a previously selected store
      const savedStore = storage.get(STORAGE_KEYS.STORE_INFO);
      if (savedStore && storesData.length > 0) {
        const store = storesData.find(s => s.id === savedStore.id);
        if (store) {
          setSelectedStore(store);
        }
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      
      // Detailed error message
      let errorMessage = 'Do\'konlarni yuklashda xatolik';
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      if (error.response) {
        // Server responded with error
        errorMessage = `Server xatosi: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`;
      } else if (error.request) {
        // Request was made but no response
        errorMessage = `Serverga ulanib bo'lmadi.\n\nAPI URL: ${apiUrl}\n\nInternet aloqasini tekshiring yoki backend server ishlamoqda ekanligini tekshiring.`;
        console.error('API URL:', apiUrl);
        console.error('Request config:', error.config);
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'So\'rov vaqti tugadi. Internet aloqasini tekshiring.';
      } else {
        // Other error
        errorMessage = error.message || 'Noma\'lum xatolik';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    storage.set(STORAGE_KEYS.STORE_INFO, store);
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-tg-button" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-tg-text mb-2">
          Do'kon tanlang
        </h1>
        <p className="text-tg-hint mb-6">
          Buyurtma berish uchun do'konni tanlang
        </p>

        <div className="space-y-3">
          {error ? (
            <div className="card text-center py-8 space-y-4">
              <p className="text-red-500 font-semibold">{error}</p>
              <button
                onClick={fetchStores}
                className="bg-tg-button text-tg-button-text px-4 py-2 rounded-lg font-semibold"
              >
                Qayta urinish
              </button>
              {import.meta.env.DEV && (
                <p className="text-xs text-tg-hint mt-2">
                  API URL: {import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}
                </p>
              )}
            </div>
          ) : stores.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-tg-hint">Do'konlar mavjud emas</p>
            </div>
          ) : (
            stores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleSelectStore(store)}
                className={`card w-full text-left transition-all ${
                  selectedStore?.id === store.id
                    ? 'border-2 border-tg-button'
                    : 'border border-transparent'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-tg-button text-tg-button-text rounded-full p-3">
                    <MapPin size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-tg-text mb-1">
                      {store.name}
                    </h3>
                    <p className="text-sm text-tg-hint flex items-center">
                      <MapPin size={14} className="mr-1" />
                      {store.address}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreSelection;
