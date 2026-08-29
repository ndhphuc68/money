# Project Rules

## Icons

Luôn dùng thư viện icon `lucide-react-native` cho mọi icon trong UI. Không dùng emoji (🎉, ✅, 📱...) hay ký tự Unicode (→, ★, ✓...) để thay thế cho icon.

- Import icon từ `lucide-react-native`, ví dụ: `import { Trash2 } from "lucide-react-native"`.
- Xem `src/components/finance/icons.tsx` để biết cách tổ chức/re-export icon dùng chung trong dự án.
- Nếu thiếu icon phù hợp trong `lucide-react-native`, hỏi lại trước khi dùng emoji/ký tự thay thế.

## ESLint và Prettier

Dự án dùng Expo Router (SDK ~54) nên lint/format phải theo đúng toolchain chính thức của Expo, không dùng `@react-native/eslint-config` (dành cho bare RN CLI, không phù hợp). Chi tiết khảo sát đầy đủ: [docs/research/eslint-prettier-react-native-expo.md](docs/research/eslint-prettier-react-native-expo.md).

- **ESLint**: dùng `eslint-config-expo` (flat config `eslint.config.js`), cài/khởi tạo qua `npx expo lint`. Với SDK 54, version tương thích là `10.0.0` (không phải bản "latest" trên npm, bản đó dành cho SDK mới hơn) — để `expo install`/`npx expo lint` tự chọn version khớp SDK, không tự ghim version tay.
- Đã bật sẵn TypeScript syntactic rules; nếu cần strict type-checked rules (`no-floating-promises`, `no-unsafe-assignment`...), augment thêm bằng package `typescript-eslint` (`tseslint.configs.strictTypeChecked`) với `languageOptions.parserOptions.projectService: true` trỏ vào `tsconfig.json` (đã có `strict: true`).
- **Prettier**: `.prettierrc.json` dùng convention tổng hợp (không phải chuẩn cứng bắt buộc, có thể điều chỉnh theo team):
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "bracketSameLine": true
  }
  ```
- **Tích hợp ESLint + Prettier**: theo đúng hướng dẫn chính thức của Expo, dùng `eslint-plugin-prettier/recommended` (chạy Prettier như một ESLint rule) trong `eslint.config.js`, cùng với `eslint-config-prettier` để tắt các rule format xung đột — cả hai cài qua `npx expo install prettier eslint-config-prettier eslint-plugin-prettier --dev`. Nhờ vậy `npx expo lint` báo cả lỗi lint lẫn lỗi format trong một lệnh duy nhất.
- Luôn chạy `npx expo lint` (và Prettier check nếu tách riêng) trước khi coi một task hoàn thành.
