import type { Preview } from "@storybook/react-vite";
import React from "react";
import "../src/index.css";
import "../src/lib/dayjs-setup";
import i18n, { supportedLanguages } from "../src/i18n";
import { I18nextProvider } from "react-i18next";

const preview: Preview = {
  // 全局装饰器：包裹 I18nextProvider
  decorators: [
    (Story, context) => {
      // 从工具栏获取语言设置
      const locale = context.globals.locale;

      // 切换语言
      React.useEffect(() => {
        if (locale && locale !== i18n.language) {
          i18n.changeLanguage(locale);
        }
      }, [locale]);

      return (
        <I18nextProvider i18n= { i18n } >
        <Story />
        </I18nextProvider>
      );
    },
  ],

// 全局工具栏配置
globalTypes: {
  locale: {
    name: "Language",
      description: "Internationalization locale",
        toolbar: {
      icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "zh-CN", title: "简体中文" },
          { value: "zh-TW", title: "繁體中文" },
        ],
          showName: true,
            dynamicTitle: true,
      },
  },
},

// 全局初始值
initialGlobals: {
  locale: "zh-CN",
  },

parameters: {
  controls: {
    matchers: {
      color: /(background|color)$/i,
        date: /Date$/i,
      },
  },

  a11y: {
    // 'todo' - show a11y violations in the test UI only
    // 'error' - fail CI on a11y violations
    // 'off' - skip a11y checks entirely
    test: "todo",
    },
},
};

export default preview;

