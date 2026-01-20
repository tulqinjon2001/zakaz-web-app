import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";

const Help = () => {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "Ko'p so'ralgan savollar",
      answer:
        "Qandey buyurtma beraman? Katalogdan mahsulotlarni tanlang, Savdiga 'ish tugmasini bosing va ma'lumotlaringizni to'ldiring.",
    },
    {
      id: 2,
      question: "To'lov turlari ganday?",
      answer:
        "Hozirda naqd pul va karta orqali to'lov qabul qilamiz. To'lov imkoniyatlari tez orada ko'paytiriladi.",
    },
    {
      id: 3,
      question: "Yetkazib berish gancha vaqt oladi?",
      answer:
        "Odatda buyurtma sadiqlangandan so'ng 15-30 daqiqa ichida yetkazib beriladi.",
    },
    {
      id: 4,
      question: "Lokatsiyani ganday yuboraman?",
      answer:
        "Rasmiylashtirishinch sahifasida 'Lokatsiya' tugmasini bosib, joylashuvingizni ulasishingiz mumkin.",
    },
  ];

  const contacts = [
    {
      id: 1,
      name: "Telegram Support",
      icon: "💬",
      contact: "@market_support",
      type: "telegram",
    },
    {
      id: 2,
      name: "Call Center",
      icon: "📞",
      contact: "+998 71 200 00 00",
      type: "phone",
    },
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleContactClick = (contact) => {
    if (contact.type === "telegram") {
      // Open Telegram
      window.open("https://t.me/market_support", "_blank");
    } else if (contact.type === "phone") {
      // Call
      window.location.href = `tel:+998712000000`;
    }
  };

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
          <h1 className="text-xl font-bold text-gray-900">Yordam</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto pb-32">
          {/* FAQ Section */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Ko'p so'ralgan savollar
            </h2>

            <div className="space-y-2">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 text-left">
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 flex-shrink-0 transition-transform ${
                        expandedFaq === faq.id ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedFaq === faq.id && (
                    <div className="px-4 pb-4 border-t border-gray-200 pt-4 bg-gray-50">
                      <p className="text-gray-700 text-sm">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Biz bilan aloqa
            </h2>

            <div className="space-y-3">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  className="w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    <span className="text-xl">{contact.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{contact.name}</p>
                    <p className="text-sm text-gray-500">{contact.contact}</p>
                  </div>
                  <ChevronLeft
                    size={20}
                    className="text-gray-400 transform rotate-180"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* App Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-blue-900">
                Noto'g'ri narsani topding?
              </span>
              <br />
              Bizga xabar qoldiring, biz tez orada javob beramiz!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
