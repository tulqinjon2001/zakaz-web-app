// Telegram WebApp utilities
export const initTelegram = () => {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;

    // Expand to full screen
    tg.expand();

    // Enable closing confirmation
    tg.enableClosingConfirmation();

    // Set background color to match Telegram theme
    if (tg.themeParams && tg.themeParams.bg_color) {
      document.body.style.backgroundColor = tg.themeParams.bg_color;
    } else {
      // Default background color
      document.body.style.backgroundColor = "#ffffff";
    }

    // Set theme colors from Telegram
    const root = document.documentElement;
    if (tg.themeParams) {
      if (tg.themeParams.bg_color) {
        root.style.setProperty("--tg-theme-bg-color", tg.themeParams.bg_color);
        document.body.style.backgroundColor = tg.themeParams.bg_color;
      }
      if (tg.themeParams.text_color) {
        root.style.setProperty(
          "--tg-theme-text-color",
          tg.themeParams.text_color,
        );
      }
      if (tg.themeParams.hint_color) {
        root.style.setProperty(
          "--tg-theme-hint-color",
          tg.themeParams.hint_color,
        );
      }
      if (tg.themeParams.link_color) {
        root.style.setProperty(
          "--tg-theme-link-color",
          tg.themeParams.link_color,
        );
      }
      if (tg.themeParams.button_color) {
        root.style.setProperty(
          "--tg-theme-button-color",
          tg.themeParams.button_color,
        );
      }
      if (tg.themeParams.button_text_color) {
        root.style.setProperty(
          "--tg-theme-button-text-color",
          tg.themeParams.button_text_color,
        );
      }
      if (tg.themeParams.secondary_bg_color) {
        root.style.setProperty(
          "--tg-theme-secondary-bg-color",
          tg.themeParams.secondary_bg_color,
        );
      }
    }

    // Set viewport height for mobile
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setViewportHeight();
    window.addEventListener("resize", setViewportHeight);

    return tg;
  }
  return null;
};

export const getTelegramUser = () => {
  if (
    window.Telegram &&
    window.Telegram.WebApp &&
    window.Telegram.WebApp.initDataUnsafe
  ) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }

  // Development mode mock user
  if (!import.meta.env.PROD) {
    const mockUser = {
      id: 123456789,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
      language_code: "uz",
      is_bot: false,
      is_premium: false,
    };
    console.log("Using mock Telegram user for development:", mockUser);
    return mockUser;
  }

  return null;
};

export const useTelegramMainButton = (tg, text, onClick) => {
  if (!tg) return;

  tg.MainButton.setText(text);
  tg.MainButton.onClick(onClick);
  tg.MainButton.show();

  return () => {
    tg.MainButton.offClick(onClick);
    tg.MainButton.hide();
  };
};
