import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { initTelegram } from "./utils/telegram";
import { storage, STORAGE_KEYS } from "./utils/storage";
import StoreSelection from "./pages/StoreSelection";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Help from "./pages/Help";
import CartProvider from "./context/CartContext";

function App() {
  const [telegram, setTelegram] = useState(null);
  const [storeSelected, setStoreSelected] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp
    try {
      const tg = initTelegram();
      setTelegram(tg);
      
      if (tg) {
        console.log("✅ Telegram WebApp initialized successfully");
        console.log("📱 Telegram WebApp version:", tg.version);
        console.log("👤 User:", tg.initDataUnsafe?.user);
      } else {
        console.warn("⚠️ Telegram WebApp not detected - running in browser mode");
        console.warn("💡 This is normal if testing in a regular browser");
      }
    } catch (error) {
      console.error("❌ Error initializing Telegram WebApp:", error);
    }

    // Check if store is selected
    const storeInfo = storage.get(STORAGE_KEYS.STORE_INFO);
    setStoreSelected(!!storeInfo);
  }, []);

  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              storeSelected ? (
                <Navigate to="/home" replace />
              ) : (
                <StoreSelection />
              )
            }
          />
          <Route path="/home" element={<Home telegram={telegram} />} />
          <Route path="/checkout" element={<Checkout telegram={telegram} />} />
          <Route path="/orders" element={<Orders telegram={telegram} />} />
          <Route path="/account" element={<Account />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
