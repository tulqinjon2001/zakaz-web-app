import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clientAPI } from "../services/api";
import { getTelegramUser } from "../utils/telegram";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { ArrowLeft, Package, Clock } from "lucide-react";

const Orders = ({ telegram }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchUserAndOrders();
  }, []);

  const fetchUserAndOrders = async () => {
    try {
      const user = getTelegramUser();
      console.log("Telegram user:", user);

      if (!user) {
        console.log("No Telegram user found, trying localStorage");
        navigate("/");
        return;
      }

      // Get or create user
      let userResponse;
      try {
        userResponse = await clientAPI.getUserByTelegramId(user.id.toString());
      } catch (error) {
        if (error.response?.status === 404) {
          // User doesn't exist, create one
          userResponse = await clientAPI.createOrGetUser({
            telegramId: user.id.toString(),
            name: `${user.first_name} ${user.last_name || ""}`.trim(),
            phone: user.phone_number || null,
          });
        } else {
          throw error;
        }
      }

      const currentUserId = userResponse.data.id;
      setUserId(currentUserId);

      // Fetch orders
      const ordersResponse = await clientAPI.getUserOrders(currentUserId);
      setOrders(ordersResponse.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      alert("Buyurtmalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      PENDING: "badge badge-pending",
      ACCEPTED: "badge badge-accepted",
      PREPARING: "badge badge-preparing",
      SHIPPED: "badge badge-shipped",
      COMPLETED: "badge badge-completed",
    };
    return classes[status] || "badge bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: "Kutilmoqda",
      ACCEPTED: "Qabul qilindi",
      PREPARING: "Tayyorlanmoqda",
      SHIPPED: "Yuborildi",
      COMPLETED: "Tugallandi",
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-tg-hint">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => navigate("/home")}
            className="p-2 bg-tg-secondary-bg rounded-lg"
          >
            <ArrowLeft size={24} className="text-tg-text" />
          </button>
          <h1 className="text-xl font-bold text-tg-text">
            Mening buyurtmalarim
          </h1>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-tg-hint mb-4" />
            <p className="text-tg-hint mb-4">Sizda hali buyurtmalar yo'q</p>
            <button
              onClick={() => navigate("/home")}
              className="btn btn-primary"
            >
              Mahsulotlarni ko'rish
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              const currency = items[0]?.currency || "SUM";

              return (
                <div key={order.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Package size={20} className="text-tg-hint" />
                        <span className="font-semibold text-tg-text">
                          Buyurtma #{order.id}
                        </span>
                      </div>
                      <p className="text-sm text-tg-hint flex items-center">
                        <Clock size={14} className="mr-1" />
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className={getStatusBadgeClass(order.status)}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-tg-hint mb-1">Do'kon:</p>
                    <p className="font-medium text-tg-text">
                      {order.store?.name}
                    </p>
                    <p className="text-sm text-tg-hint">
                      {order.store?.address}
                    </p>
                  </div>

                  {items.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-tg-hint mb-2">Mahsulotlar:</p>
                      <div className="space-y-1">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-tg-text">
                              {item.productName ||
                                `Mahsulot #${item.productId}`}
                            </span>
                            <span className="text-tg-hint">
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-sm text-tg-hint">Jami:</span>
                    <span className="font-bold text-lg text-tg-text">
                      {order.totalPrice?.toLocaleString("uz-UZ")} {currency}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
