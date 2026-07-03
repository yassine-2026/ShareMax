import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "Dashboard": "Dashboard",
      "Upload Media": "Upload Media",
      "Settings": "Settings",
      "Language & Region": "Language & Region",
      "Language": "Language",
      "Upload": "Upload",
      "Sign in with Google": "Sign in with Google",
      "Drag & drop your files here": "Drag & drop your files here",
      "Ready to upload": "Ready to upload",
      "Total size": "Total size",
      "Upload Now": "Upload Now",
      "Uploading": "Uploading...",
      "Upload failed": "Upload failed, please try again",
      "Retry": "Retry",
      "Total Storage": "Total Storage",
      "Total Views": "Total Views",
      "Total Downloads": "Total Downloads",
      "Active Files": "Active Files",
      "Recent Uploads": "Recent Uploads",
      "Notifications": "Notifications",
      "Security": "Security",
      "Save Changes": "Save Changes",
      "Theme": "Theme",
      "System": "System",
      "Light": "Light",
      "Dark": "Dark",
      "Shared File": "Shared File",
      "Download Original File": "Download Original File",
    }
  },
  ar: {
    translation: {
      "Dashboard": "لوحة القيادة",
      "Upload Media": "رفع الوسائط",
      "Settings": "الإعدادات",
      "Language & Region": "اللغة والمنطقة",
      "Language": "اللغة",
      "Upload": "رفع",
      "Sign in with Google": "تسجيل الدخول باستخدام Google",
      "Drag & drop your files here": "اسحب وأفلت الملفات هنا",
      "Ready to upload": "جاهز للرفع",
      "Total size": "الحجم الإجمالي",
      "Upload Now": "ارفع الآن",
      "Uploading": "جاري الرفع...",
      "Upload failed": "فشل الرفع، يرجى المحاولة مرة أخرى",
      "Retry": "إعادة المحاولة",
      "Total Storage": "إجمالي التخزين",
      "Total Views": "إجمالي المشاهدات",
      "Total Downloads": "إجمالي التنزيلات",
      "Active Files": "الملفات النشطة",
      "Recent Uploads": "التحميلات الحديثة",
      "Notifications": "الإشعارات",
      "Security": "الأمان",
      "Save Changes": "حفظ التغييرات",
      "Theme": "المظهر",
      "System": "النظام",
      "Light": "فاتح",
      "Dark": "داكن",
      "Shared File": "ملف مشترك",
      "Download Original File": "تنزيل الملف الأصلي",
    }
  },
  fr: {
    translation: {
      "Dashboard": "Tableau de bord",
      "Upload Media": "Téléverser des médias",
      "Settings": "Paramètres",
      "Language & Region": "Langue et région",
      "Language": "Langue",
    }
  },
  es: {
    translation: {
      "Dashboard": "Tablero",
      "Upload Media": "Subir medios",
      "Settings": "Ajustes",
      "Language & Region": "Idioma y región",
      "Language": "Idioma",
    }
  },
  de: {
    translation: {
      "Dashboard": "Armaturenbrett",
      "Upload Media": "Medien hochladen",
      "Settings": "Einstellungen",
    }
  },
  zh: {
    translation: {
      "Dashboard": "仪表板",
      "Upload Media": "上传媒体",
      "Settings": "设置",
    }
  },
  hi: {
    translation: {
      "Dashboard": "डैशबोर्ड",
      "Upload Media": "मीडिया अपलोड करें",
      "Settings": "सेटिंग्स",
    }
  },
  ru: {
    translation: {
      "Dashboard": "Панель приборов",
      "Upload Media": "Загрузить медиа",
      "Settings": "Настройки",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, 
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;
