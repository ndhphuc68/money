# ESLint và Prettier cho dự án React Native + Expo Router + TypeScript

> Ngày khảo sát: 2026-08-29
> Phạm vi: Expo SDK ~54.0.0, expo-router ~6.0.0, React 19.1.0, react-native 0.81.5, TypeScript ~5.9.2 (repo `offline-first-sync`, d:\money). Nguồn chính: docs.expo.dev, github.com/expo/expo (branch `main` và tag `sdk-54`), github.com/facebook/react-native, npm registry, github.com/prettier/eslint-config-prettier.

## Tóm tắt tình trạng hiện tại của repo (đã tự kiểm tra trước khi kết luận)

- Không có `.eslintrc*`, `eslint.config.*`, hay `.prettierrc*` nào ở gốc `d:\money` — mọi kết quả tìm thấy đều nằm trong `node_modules/**` (config nội bộ của các package phụ thuộc, không liên quan repo).
- `package.json` (`devDependencies`) không có `eslint`, `prettier`, `eslint-config-expo`, hay bất kỳ package linting/format nào. → **Dự án chưa cài ESLint lẫn Prettier**, xác nhận đúng như mô tả trong yêu cầu.
- `tsconfig.json` gốc:
  ```json
  {
    "extends": "expo/tsconfig.base",
    "compilerOptions": {
      "strict": true,
      "baseUrl": ".",
      "paths": { "@/*": ["src/*"] }
    },
    "include": ["**/*.ts", "**/*.tsx"]
  }
  ```
  `strict: true` đã bật tường minh (dù `expo/tsconfig.base` đã có `strict: true` sẵn, việc lặp lại ở đây không sai, chỉ dư).

---

## 1. Config ESLint chính thức cho Expo Router: `eslint-config-expo`

Tài liệu chính thức [docs.expo.dev/guides/using-eslint](https://docs.expo.dev/guides/using-eslint/) (đã lấy nguyên văn nội dung `.mdx` từ [github.com/expo/expo/blob/main/docs/pages/guides/using-eslint.mdx](https://github.com/expo/expo/blob/main/docs/pages/guides/using-eslint.mdx)):

> "Running this command also creates a **eslint.config.js** file at the root of your project which extends configuration from [`eslint-config-expo`](https://github.com/expo/expo/tree/main/packages/eslint-config-expo)."

Lệnh cài đặt chính thức:

```sh
npx expo lint
```

> "Running the above command will run the `lint` script from **package.json**." — lần đầu chạy, nó cài `eslint` + `eslint-config-expo` và sinh `eslint.config.js`; các lần sau nó chạy lint thật.

### Flat config là chuẩn hiện tại (từ SDK 53 trở lên)

Trích nguyên văn doc chính thức:

> "**From SDK 53 onwards**, the default ESLint config file uses the [Flat config](https://eslint.org/blog/2022/08/new-config-system-part-2/) format. It also supports legacy config. **For SDK 52 and earlier**, the default ESLint config file uses legacy config and does not support Flat config."

Dự án này ở SDK 54 → **flat config `eslint.config.js` là định dạng mặc định/chuẩn**, `.eslintrc.js` legacy vẫn được `npx expo lint` hỗ trợ song song nhưng không còn là mặc định.

Xác nhận bằng cách đọc trực tiếp template mà Expo CLI sinh ra (`node_modules/expo/node_modules/@expo/cli/static/template/eslint.config.js` trong chính repo này — đây là bản đóng gói kèm theo `expo` package, phản ánh đúng những gì `npx expo lint` sẽ tạo):

```js
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([expoConfig, { ignores: ['dist/*'] }]);
```

README chính thức của package ([github.com/expo/expo/tree/main/packages/eslint-config-expo](https://github.com/expo/expo/tree/main/packages/eslint-config-expo)) xác nhận cách dùng flat config y hệt, và ghi rõ package "**is intended to be composed with the linter rules of your choice**" — tức đây là base config tối giản, không phải bộ rule toàn diện.

### Version tương thích với ESLint

Từ `package.json` chính thức của `eslint-config-expo` (đọc trực tiếp từ GitHub, nhánh `main`, version npm mới nhất `57.0.2`):

```json
"peerDependencies": { "eslint": ">=8.10" }
```

Không giới hạn trần trên — tương thích cả ESLint 8.x lẫn 9.x (flat config chuẩn từ ESLint 9, nhưng ESLint 8.10+ cũng đã hỗ trợ flat config thử nghiệm). Bản thân `eslint-config-expo` build và test với `eslint@^9.18.0` (`devDependencies`), nghĩa là target chính thức là ESLint 9.

### **Lưu ý quan trọng về version cho SDK 54 cụ thể**: `eslint-config-expo` không dùng semver độc lập nữa

Khảo sát lịch sử version trên npm registry (`registry.npmjs.org/eslint-config-expo`) cho thấy:

```
... 9.1.0, 9.1.1, 9.2.0, 10.0.0, 55.0.0, 55.0.1, 56.0.0, ..., 57.0.2 (mới nhất)
```

Từ bản `55.0.0`, Expo đã **đổi sang đánh version `eslint-config-expo` trùng với version SDK** (SDK 55 → `eslint-config-expo@55.x`, SDK 56 → `56.x`, SDK 57 → `57.x` hiện là bản mới nhất trên npm). Trước đó package versioning độc lập, và version cuối cùng trước khi đổi sang scheme SDK là `10.0.0`.

Đã xác nhận trực tiếp bằng cách đọc `package.json` của `eslint-config-expo` tại tag `sdk-54` trên GitHub (`github.com/expo/expo` ref `sdk-54`):

```json
{
  "name": "eslint-config-expo",
  "version": "10.0.0",
  ...
}
```

→ **Với dự án Expo SDK ~54.0.0, version `eslint-config-expo` phù hợp/tương thích chính xác là `10.0.0`**, KHÔNG phải bản `57.0.2` là "latest" trên npm (bản đó dành cho SDK 57). `npx expo lint` chạy trong dự án SDK 54 sẽ tự chọn đúng version tương thích qua cơ chế resolve của `expo install`.

### So sánh với `@react-native/eslint-config` (bare RN)

Từ npm registry (`registry.npmjs.org/@react-native/eslint-config/latest`, version `0.87.1`), package description chính thức: **"ESLint config for React Native"**, `homepage`: [github.com/react/react-native/tree/HEAD/packages/eslint-config-react-native](https://github.com/facebook/react-native/tree/main/packages/eslint-config-react-native).

Đọc trực tiếp `index.js` của config này (từ `facebook/react-native`):

```js
module.exports = {
  env: { es6: true },
  parserOptions: sharedConfig.parserOptions,
  extends: ['prettier'],
  plugins: ['eslint-comments', 'react', 'react-hooks', 'react-native', '@react-native', 'jest'],
  ...
};
```

Khác biệt cốt lõi:

|                     | `eslint-config-expo`                                                             | `@react-native/eslint-config`                                                                                             |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Đối tượng           | Expo-managed / Expo Router apps                                                  | Bare React Native (không qua Expo CLI)                                                                                    |
| Plugin RN gốc       | Không có `eslint-plugin-react-native`                                            | Có `eslint-plugin-react-native`, `@react-native/eslint-plugin`                                                            |
| Flow type           | Không hỗ trợ                                                                     | Có override cho Flow (`.js` + `@babel/eslint-parser` + `ft-flow`) — di sản từ codebase Meta nội bộ dùng Flow song song TS |
| Jest plugin         | Không kèm sẵn                                                                    | Có `eslint-plugin-jest` kèm sẵn                                                                                           |
| Prettier            | Khuyến nghị `eslint-plugin-prettier/recommended` (xem mục 4)                     | Đã `extends: ['prettier']` (tức `eslint-config-prettier`) ngay trong core, không dùng `eslint-plugin-prettier`            |
| Global đặc thù Expo | Có (`__DEV__`, extension `.ios.js/.android.js/.web.js` qua `eslint-plugin-expo`) | Không có khái niệm Expo Router/platform extension của Expo                                                                |

**Kết luận cho dự án này**: vì đây là dự án Expo Router (`expo-router: ~6.0.0`) chạy qua Expo CLI/Metro managed workflow, **`eslint-config-expo` là lựa chọn đúng và chính thức được Expo doc khuyến nghị**. `@react-native/eslint-config` được thiết kế cho bare RN CLI project (không có Expo CLI, không có Expo Router platform extensions, có Flow — không liên quan gì tới stack TS-only của dự án này) nên không phù hợp.

---

## 2. `typescript-eslint` typed rules: đã bundle sẵn nhưng KHÔNG bật type-checked rules

Đọc `package.json` chính thức của `eslint-config-expo` (bản `57.0.2`, và xác nhận lại y hệt ở bản `10.0.0` cho SDK 54):

```json
"dependencies": {
  "@typescript-eslint/eslint-plugin": "^8.59.0",
  "@typescript-eslint/parser": "^8.59.0",
  ...
}
```

→ **`eslint-config-expo` đã tự bundle `@typescript-eslint/parser` và `@typescript-eslint/eslint-plugin`** — không cần cài `typescript-eslint` (package hợp nhất) hay hai package trên riêng để có parsing/basic TS rules.

Tuy nhiên, đọc trực tiếp file rule TS của config (`packages/eslint-config-expo/utils/typescript.js`, GitHub `main`):

```js
{
  files: ['*.ts', '*.tsx', '*.d.ts'],
  extends: ['plugin:import/typescript'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/array-type': ['warn', ...],
    '@typescript-eslint/no-empty-object-type': 'warn',
    '@typescript-eslint/consistent-type-assertions': ['warn', ...],
    '@typescript-eslint/no-unused-vars': ['warn', ...],
    ...
  },
  // Không có parserOptions.project ở đây
}
```

**Không có `parserOptions.project`/`projectService`** trong cấu hình mặc định → các rule bật sẵn chỉ là **rule cú pháp (syntactic)**, không phải **rule có type information (typed/type-checked rules)** như `@typescript-eslint/no-floating-promises`, `no-unsafe-assignment`, `no-misused-promises`, v.v. Những rule này đòi hỏi parser biết type thật (cần trỏ tới `tsconfig.json` qua `parserOptions.project` hoặc `languageOptions.parserOptions.projectService`).

### Cách augment để có strict type-checked rules

Theo tài liệu chính thức của `typescript-eslint` project (package hợp nhất `typescript-eslint`, version hiện tại `8.68.0` trên npm registry, tương thích `typescript: ">=4.8.4 <6.1.0"` — khớp với `typescript@~5.9.2` của dự án), cách chuẩn với flat config là dùng `tseslint.configs.strictTypeChecked` (hoặc `recommendedTypeChecked`) chồng lên `eslint-config-expo/flat`, cùng khai báo `languageOptions.parserOptions.projectService: true` (API mới, thay cho `project` trỏ file cụ thể) trỏ vào `tsconfig.json` gốc của dự án — dự án này đã có `tsconfig.json` hợp lệ với `strict: true`, phù hợp để bật ngay type-checked rules bổ sung nếu muốn.

Đây là phần **do dự án tự thêm**, không phải phần `eslint-config-expo` cung cấp sẵn — Expo docs không đề cập bước này; đây là khuyến nghị dựa trên tài liệu chính thức của `typescript-eslint` (không phải Expo).

---

## 3. Prettier: phân biệt "chính thức" và "convention cộng đồng"

### Không có "Prettier config chính thức của Expo/RN team" dưới dạng package publish riêng cho _app_ — chỉ có ví dụ trong docs và config nội bộ của chính repo `facebook/react-native`

Cần phân biệt rõ 3 loại nguồn, không được gộp chung:

**(a) Chính thức — Expo docs, chỉ là _ví dụ_, không phải mặc định bắt buộc:**

Tài liệu chính thức [docs.expo.dev/guides/using-eslint/#prettier](https://docs.expo.dev/guides/using-eslint/) chỉ nói:

> "To customize Prettier settings, create a **.prettierrc** file at the root of your project and add your configuration."

Không kèm giá trị mặc định nào. Expo docs trỏ sang package `eslint-config-universe` (sibling, cũ hơn, dùng nội bộ cho các dự án Expo — không phải cùng package với `eslint-config-expo` hiện dùng cho `npx expo lint`) làm ví dụ minh họa. README của `eslint-config-universe` ([github.com/expo/expo/tree/main/packages/eslint-config-universe](https://github.com/expo/expo/tree/main/packages/eslint-config-universe)) đưa ra:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "singleQuote": true,
  "bracketSameLine": true
}
```

Đây được gọi rõ là ví dụ minh họa cách "Customizing Prettier", **không phải giá trị mặc định bắt buộc hay convention chính thức "must use"** — và bản thân `eslint-config-universe` là package cũ (target `eslint@8`), khác với `eslint-config-expo` hiện hành. Coi đây là **"tài liệu chính thức nhưng chỉ mang tính ví dụ"**, không phải chuẩn cứng.

**(b) Chính thức nhưng là config nội bộ của Meta cho chính monorepo `facebook/react-native`, KHÔNG phải khuyến nghị cho app dùng RN:**

Đọc trực tiếp `.prettierrc.js` ở gốc repo [github.com/facebook/react-native](https://github.com/facebook/react-native/blob/main/.prettierrc.js):

```js
module.exports = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: false,
  requirePragma: true, // <-- đặc thù monorepo Meta, KHÔNG áp dụng cho app thường
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  overrides: [/* xử lý Flow (*.js.flow), markdown nội bộ, yaml */],
};
```

`requirePragma: true` bắt buộc file phải có comment `@format` mới được Prettier format — đây là cơ chế đặc thù cho monorepo lớn của Meta (áp dụng dần dần / opt-in từng file), **không phù hợp copy nguyên vào app** vì sẽ khiến Prettier "bỏ qua" mọi file không có pragma đó, khiến format có vẻ như không hoạt động. Đây là "chính thức" theo nghĩa nó là config thật đang chạy trong repo RN core, nhưng **không phải khuyến nghị cho ứng dụng RN cuối** — nó dùng cho công cụ RN tự phát triển RN, khác use case app.

**(c) Convention cộng đồng (phổ biến, không chính thức)** cho các giá trị Prettier thường thấy ở app RN/Expo (KHÔNG lấy từ trang chính thức nào của Expo/RN team làm chuẩn, mà là suy ra/tổng hợp từ (a) + (b) + thực hành phổ biến chung của Prettier cho JS/TS + JSX):

| Option                                     | Giá trị phổ biến                                   | Ghi chú                                                                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `semi`                                     | `true`                                             | Prettier mặc định là `true`; đây là mặc định gốc của Prettier (không riêng RN)                                                                                                                               |
| `singleQuote`                              | `true`                                             | Xuất hiện ở cả (a) và (b) — điểm đồng thuận rõ ràng nhất giữa Meta và ví dụ Expo                                                                                                                             |
| `trailingComma`                            | `"all"`                                            | Dùng ở (b); Prettier 3.x đổi mặc định gốc thành `"all"` từ Prettier 3.0 (trước đó mặc định `"es5"`) — cần TS ≥3.7 hỗ trợ trailing comma sau rest, dự án này TS 5.9 không vấn đề                              |
| `printWidth`                               | `100`                                              | Dùng ở (a) — Prettier mặc định gốc là `80`; nhiều dự án RN nới ra `100` vì JSX dài dòng                                                                                                                      |
| `tabWidth`                                 | `2`                                                | Trùng mặc định gốc Prettier, dùng ở (a)                                                                                                                                                                      |
| `bracketSameLine` (JSX `>` cùng dòng cuối) | `true`                                             | Dùng ở cả (a) và (b) — đây là option thay thế cho `jsxBracketSameLine` cũ (đã deprecate từ Prettier 2.4, xem [prettier.io/docs/options#bracket-line](https://prettier.io/docs/en/options.html#bracket-line)) |
| `arrowParens`                              | `"avoid"` (Meta dùng) hoặc mặc định gốc `"always"` | Đây là điểm KHÔNG đồng thuận: (b) dùng `avoid`, nhưng mặc định gốc Prettier từ v2 là `always`; cộng đồng RN/Expo rộng hơn không thống nhất — nên coi là lựa chọn tùy dự án, không phải chuẩn                 |

**Kết luận mục 3**: Không tồn tại một "Prettier config chính thức cho RN app" được publish thành package chuẩn dùng được ngay (kiểu `@react-native/prettier-config`). Điểm gần nhất với "chính thức" là ví dụ trong Expo docs (mục a) — nên dùng ví dụ đó làm điểm khởi đầu cho dự án này, không nên copy nguyên `.prettierrc.js` của Meta (mục b) vì có `requirePragma` không phù hợp app thường.

---

## 4. Tích hợp ESLint + Prettier: Expo docs khuyến nghị `eslint-plugin-prettier`, khác với khuyến nghị phổ biến "chỉ dùng eslint-config-prettier"

### Điểm mấu chốt cần nêu rõ vì có mâu thuẫn giữa 2 nguồn chính thức

**`eslint-config-prettier`** (package độc lập, không thuộc Expo/RN): README chính thức [github.com/prettier/eslint-config-prettier](https://github.com/prettier/eslint-config-prettier) nêu rõ mục đích:

> "Turns off all rules that are unnecessary or might conflict with Prettier."

Và hướng dẫn dùng với flat config:

```js
import eslintConfigPrettier from 'eslint-config-prettier/flat';
export default [someConfig, eslintConfigPrettier];
```

Đây thuần túy là **tắt rule**, không chạy Prettier qua ESLint — đây là cách được cộng đồng ESLint nói chung khuyến nghị rộng rãi để tránh 2 công cụ đè lẫn nhau (chạy `eslint` và `prettier --check` như hai bước riêng, không lồng nhau) vì hiệu năng tốt hơn và tránh double-reporting.

**NHƯNG** — tài liệu chính thức của chính Expo ([docs.expo.dev/guides/using-eslint/#prettier](https://docs.expo.dev/guides/using-eslint/)) lại khuyến nghị cách khác, dùng **`eslint-plugin-prettier`** chạy Prettier như một ESLint rule:

Lệnh cài đặt trích nguyên văn từ doc:

```sh
npx expo install prettier eslint-config-prettier eslint-plugin-prettier --dev
```

Config flat mẫu chính thức từ doc:

```js
// eslint.config.js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  { ignores: ['dist/*'] },
]);
```

Doc giải thích: "Now, when you run `npx expo lint`, anything that is not aligned with Prettier formatting will be caught as an error." — tức mục tiêu của Expo là gộp Prettier vào luôn output của `npx expo lint` để có một lệnh duy nhất báo cả lỗi lint lẫn lỗi format.

`eslint-plugin-prettier/recommended` (theo cấu trúc export chuẩn của `eslint-plugin-prettier`) tự động bao gồm cả việc tắt rule xung đột (tương đương `eslint-config-prettier`) LẪN bật rule `prettier/prettier` chạy Prettier qua ESLint — nên khi dùng preset `recommended` này, **không cần khai báo thêm `eslint-config-prettier` riêng**, dù lệnh cài đặt chính thức của Expo vẫn liệt kê cả hai package (khả năng để tương thích ngược với legacy config, nơi phải khai `extends: ['expo', 'prettier']` + `plugins: ['prettier']` riêng biệt — xem bản legacy config trong cùng doc).

### So sánh với `@react-native/eslint-config` — dùng cách "chỉ tắt rule", không dùng plugin

Ngược lại, đọc trực tiếp `index.js` của `@react-native/eslint-config` (facebook/react-native, đã trích ở mục 1):

```js
extends: ['prettier'],
```

Đây chính là cách dùng `eslint-config-prettier` (package `eslint-config-prettier` được publish dưới tên ngắn `"prettier"` khi dùng `extends`) — **KHÔNG có `eslint-plugin-prettier`** trong danh sách `plugins` hay `dependencies` của `@react-native/eslint-config`. Xác nhận qua `package.json` npm registry của `@react-native/eslint-config@0.87.1`: `dependencies` có `eslint-config-prettier: ^8.5.0`, hoàn toàn không có `eslint-plugin-prettier`.

### Kết luận mục 4 — khuyến nghị cho dự án này

Có 2 cách chính thức, khác nguồn:

1. **Cách của Expo (docs.expo.dev, cho Expo Router apps)**: `eslint-plugin-prettier/recommended` — chạy Prettier như 1 ESLint rule, một lệnh `npx expo lint` báo cả lỗi format. Đánh đổi: chậm hơn (Prettier chạy qua ESLint mỗi file), và có thể trùng lặp báo lỗi giữa 2 công cụ nếu editor cũng chạy Prettier riêng.
2. **Cách của React Native core (`@react-native/eslint-config`)**: chỉ `eslint-config-prettier` để tắt rule, chạy `eslint` và `prettier --write`/`--check` như 2 bước tách biệt (thường qua `lint-staged`/script npm riêng). Nhanh hơn, tách biệt rõ trách nhiệm 2 công cụ — đây cũng là cách được khuyến nghị phổ biến trong hệ sinh thái ESLint nói chung (không riêng RN).

Vì dự án dùng **Expo Router** và tài liệu Expo chính thức hướng dẫn rõ ràng cách (1) cho đúng loại project này, khuyến nghị: **làm theo đúng hướng dẫn chính thức của Expo (cách 1, `eslint-plugin-prettier/recommended`)** để nhất quán với toolchain `npx expo lint` sẵn có — trừ khi hiệu năng lint trở thành vấn đề thực tế (dự án hiện còn nhỏ), lúc đó có thể chuyển sang cách (2) theo mô hình `@react-native/eslint-config`, dùng `eslint-config-prettier` tắt rule + chạy `prettier --check` như bước CI riêng.

---

## 5. Lệnh cài đặt và cấu trúc file config mẫu cho dự án (Expo SDK 54, Expo Router, TS 5.9, React 19)

### Version cụ thể tại thời điểm khảo sát (2026-08-29), tra trực tiếp từ npm registry / GitHub

| Package                                       | Version đề xuất                                                                                                                                                                                                                   | Nguồn tra cứu                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `eslint-config-expo`                          | `10.0.0` (khớp SDK 54, xem mục 1) — **không dùng `57.0.2` "latest" vì đó là bản cho SDK 57**                                                                                                                                      | `package.json` tại tag `sdk-54`, github.com/expo/expo                    |
| `eslint`                                      | `^9.18.0` (bản `eslint-config-expo@10.0.0` build/test cùng); npm "latest" hiện là `10.9.1` nhưng nên theo peer range mà `eslint-config-expo@10.0.0` đã test (`eslint@^9.18.0` trong `devDependencies` của chính nó) để tránh vênh | npm registry `eslint@latest` = 10.9.1; `eslint-config-expo` package.json |
| `eslint-plugin-prettier`                      | `^5.5.6` (bản mới nhất hiện có)                                                                                                                                                                                                   | npm registry `eslint-plugin-prettier@latest`                             |
| `eslint-config-prettier`                      | `^10.1.8`                                                                                                                                                                                                                         | npm registry `eslint-config-prettier@latest`                             |
| `prettier`                                    | `^3.9.6`                                                                                                                                                                                                                          | npm registry `prettier@latest`                                           |
| `typescript-eslint` (nếu augment typed rules) | `^8.68.0`, peer `typescript: ">=4.8.4 <6.1.0"` — khớp `typescript@~5.9.2` của dự án                                                                                                                                               | npm registry `typescript-eslint@latest`                                  |

Package `@typescript-eslint/eslint-plugin` và `@typescript-eslint/parser` (`^8.18.2` theo `eslint-config-expo@10.0.0`) **đã được cài tự động như dependency của `eslint-config-expo`** — không cần khai riêng trong `devDependencies` trừ khi cần version khác hoặc dùng package hợp nhất `typescript-eslint` để augment typed rules.

### Lệnh cài đặt

Cách được tài liệu hóa chính thức (khuyến nghị dùng thẳng, để `expo install` tự chọn version khớp SDK 54 thay vì gõ tay số cụ thể — tránh lệch version như phân tích ở mục 1):

```sh
npx expo lint
```

Sau đó cài Prettier theo doc chính thức:

```sh
npx expo install prettier eslint-config-prettier eslint-plugin-prettier --dev
```

Nếu muốn augment typed-linting (không bắt buộc, xem mục 2):

```sh
npm install --save-dev typescript-eslint
```

### `eslint.config.js` mẫu (flat config, theo đúng cách Expo doc + augment typed rules tùy chọn)

```js
// eslint.config.js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
// Tùy chọn — chỉ thêm nếu muốn typed rules (mục 2):
// const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  // Tùy chọn — typed rules cho *.ts/*.tsx, cần tsconfig.json đã có sẵn strict: true:
  // {
  //   files: ['**/*.ts', '**/*.tsx'],
  //   extends: [tseslint.configs.strictTypeChecked],
  //   languageOptions: {
  //     parserOptions: { projectService: true, tsconfigRootDir: __dirname },
  //   },
  // },
]);
```

### `.prettierrc.json` mẫu (dựa trên điểm đồng thuận giữa nguồn (a) Expo và (b) Meta ở mục 3, không copy nguyên `requirePragma` của Meta)

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

Ghi chú: đây là **convention tổng hợp**, không phải "chuẩn chính thức duy nhất" — dự án có thể điều chỉnh `printWidth`/`arrowParens` theo sở thích team mà không vi phạm khuyến nghị nào của Expo/RN, vì cả hai đều không ép buộc các giá trị này.

---

## Nguồn tham khảo tổng hợp

- [docs.expo.dev/guides/using-eslint](https://docs.expo.dev/guides/using-eslint/) — hướng dẫn chính thức ESLint + Prettier cho Expo apps
- [github.com/expo/expo/tree/main/packages/eslint-config-expo](https://github.com/expo/expo/tree/main/packages/eslint-config-expo) — README + `package.json` + `flat.js`/`default.js`/`utils/typescript.js`
- [github.com/expo/expo/tree/main/packages/eslint-config-universe](https://github.com/expo/expo/tree/main/packages/eslint-config-universe) — package cũ hơn, nguồn ví dụ Prettier config
- [github.com/expo/expo, tag `sdk-54`, packages/eslint-config-expo/package.json](https://github.com/expo/expo/blob/sdk-54/packages/eslint-config-expo/package.json) — xác nhận version `10.0.0` khớp SDK 54
- [github.com/facebook/react-native/tree/main/packages/eslint-config-react-native](https://github.com/facebook/react-native/tree/main/packages/eslint-config-react-native) — `index.js` của `@react-native/eslint-config`
- [github.com/facebook/react-native/blob/main/.prettierrc.js](https://github.com/facebook/react-native/blob/main/.prettierrc.js) — config Prettier nội bộ của Meta cho chính RN core
- [github.com/prettier/eslint-config-prettier](https://github.com/prettier/eslint-config-prettier) — README, cách dùng flat config `/flat`
- [prettier.io/docs/en/options.html#bracket-line](https://prettier.io/docs/en/options.html#bracket-line) — option `bracketSameLine`
- npm registry (`registry.npmjs.org`) cho version cụ thể: `eslint-config-expo`, `@react-native/eslint-config`, `eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier`, `typescript-eslint`, `@typescript-eslint/eslint-plugin`
- `node_modules/expo/node_modules/@expo/cli/static/template/eslint.config.js` (trong chính repo `d:\money`) — template thật mà `npx expo lint` sinh ra, dùng để đối chiếu với doc
