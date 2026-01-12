import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientAPI } from '../services/api';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { MapPin, Loader } from 'lucide-react';

const StoreSelection = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await clientAPI.getStores();
      setStores(response.data);
      
      // Check if there's a previously selected store
      const savedStore = storage.get(STORAGE_KEYS.STORE_INFO);
      if (savedStore) {
        const store = response.data.find(s => s.id === savedStore.id);
        if (store) {
          setSelectedStore(store);
        }
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      alert('Do\'konlarni yuklashda xatolik');
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
          {stores.length === 0 ? (
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
