# expo-sqlite trên web: yêu cầu COOP/COEP và SharedArrayBuffer

> Ngày khảo sát: 2026-08-29
> Phạm vi: Expo SDK 54, Metro dev server (`npx expo start --web`) và static export (`npx expo export -p web`) deploy lên Vercel/Netlify/Cloudflare Pages.

## Tóm tắt

Tài liệu chính thức của Expo **có** đề cập rõ COOP/COEP/SharedArrayBuffer cho `expo-sqlite` trên web — không cần suy luận, đây là mục "Web setup" chính thức. Nguồn: [docs.expo.dev/versions/latest/sdk/sqlite/#web-setup](https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup).

> "To use `expo-sqlite` on web, you need to configure Metro bundler to support **wasm** files and add HTTP headers to allow [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) usage."

> "If you deploy your app to web hosting services, you will also need to add the `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers to your web server."

## 1. metro.config.js (dev server) — snippet chính thức từ Expo

Lấy trực tiếp từ diff nguồn của trang docs (`docs/public/static/diffs/sqlite-web-metro-config.diff` trong repo `expo/expo`, tham chiếu bởi `<DiffBlock>` trong [sqlite.mdx](https://github.com/expo/expo/blob/main/docs/pages/versions/unversioned/sdk/sqlite.mdx)):

```js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add wasm asset support
config.resolver.assetExts.push('wasm');

// Add COEP and COOP headers to support SharedArrayBuffer
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
```

**⚠️ Bug đã xác nhận trong chính snippet này**: thiếu `return` trước `middleware(req, res, next)` khiến response body không được viết ra ở một số trường hợp/browser, dẫn đến lỗi tiếp theo dạng "Sync operation timeout" dù đã set đúng header. Xác nhận bởi cộng đồng trong issue đã đóng ([expo/expo#38481](https://github.com/expo/expo/issues/38481), comment của `alzalabany`, 2025-09-20):

> "fixed above using: ... there is a typo in https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup docs it forgot to return middleware"

Bản sửa khuyến nghị (thêm `return`):

```js
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next); // <-- thêm return
  };
};
```

## 2. Metro API: `server.enhanceMiddleware` có bị deprecate không?

- Trang docs hiện tại của Metro ([metrobundler.dev/docs/configuration/](https://metrobundler.dev/docs/configuration/)) đánh dấu `server.enhanceMiddleware` là **Deprecated** trong bảng `ServerOptions`, nhưng không nêu API thay thế trực tiếp trên trang.
- Theo kết quả tìm kiếm, thay thế ở tầng Metro thuần là `unstable_extraMiddleware` — nhưng đây là tham số của `Metro.runServer()` (lệnh gọi thấp cấp), **không phải** một field trong `metro.config.js`. Expo CLI tự gọi `runServer` nội bộ và không public field này qua `metro.config.js`.
- Do đó, **với Expo SDK 54, `config.server.enhanceMiddleware` trong `metro.config.js` vẫn là cách chính thức và duy nhất được Expo tài liệu hóa** để chèn middleware/set header cho dev server — dù về mặt kỹ thuật, ở tầng Metro gốc field này đã deprecated. Không có field `unstable_` hay `server.middleware` nào được Expo doc hoặc `@expo/metro-config` publish thay thế tại thời điểm khảo sát.

## 3. Không có package thay thế kiểu `vite-plugin-cross-origin-isolation`

Không tìm thấy package "metro-coi" hay tương đương chính thức/phổ biến cho Metro. Cách duy nhất được tài liệu hóa vẫn là chỉnh `metro.config.js` thủ công như trên.

## 4. GitHub issue tham chiếu

- [expo/expo#38481](https://github.com/expo/expo/issues/38481) — "[expo-sqlite][web] openDatabaseSync Throws Uncaught ReferenceError: SharedArrayBuffer is not defined" (đã đóng, `COMPLETED`). Nguyên nhân gốc: response cho `http://localhost:8081/` (trang HTML chính) thiếu header COOP/COEP dù response cho bundle/worker JS có; fix cộng đồng là thêm `return` như trên. Một số trình duyệt (Edge) còn chặn `SharedArrayBuffer` mặc định qua policy riêng, cần bật thủ công.
- Các issue liên quan khác về `expo-sqlite` web (đều là các lỗi runtime khác, không phải COOP/COEP): [#45186](https://github.com/expo/expo/issues/45186), [#47694](https://github.com/expo/expo/issues/47694) (deadlock lúc mở DB, timeout OPFS), [#47756/#48623](https://github.com/expo/expo/issues/48623) (truncation kết quả >255 byte).

## 5. Static export — cấu hình header cho hosting

### Vercel — `vercel.json`

Schema `headers` chính thức: [vercel.com/docs/project-configuration/vercel-json#headers](https://vercel.com/docs/project-configuration/vercel-json#headers).

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    }
  ]
}
```

Dùng `"credentialless"` thay vì `"require-corp"` nếu ứng dụng cần load ảnh/asset cross-origin không có `Cross-Origin-Resource-Policy` — đây cũng là giá trị Expo dùng trong ví dụ EAS Hosting của họ.

### Netlify — file `_headers`

Cú pháp chính thức: [docs.netlify.com/manage/routing/headers/](https://docs.netlify.com/manage/routing/headers/).

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

Đặt file `_headers` (không có phần mở rộng) vào thư mục publish (mặc định `dist` với `expo export -p web`). Tương đương qua `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "credentialless"
```

### Cloudflare Pages — file `_headers`

Cú pháp chung xác nhận từ [developers.cloudflare.com/pages/configuration/headers/](https://developers.cloudflare.com/pages/configuration/headers/) (trang không có ví dụ COOP/COEP cụ thể, nhưng cú pháp khối `[path]` + danh sách `Header: value` thụt lề là chung cho mọi header tùy chỉnh):

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

Cùng cấu trúc file `_headers` như Netlify, đặt ở thư mục output của build.

## Ghi chú áp dụng cho repo

- `credentialless` cho phép load resource cross-origin không có CORP header (ảnh, font CDN) mà vẫn cách ly — phù hợp hơn `require-corp` nếu app có asset bên ngoài; nếu dùng `require-corp` phải đảm bảo mọi resource cross-origin đều trả `Cross-Origin-Resource-Policy`.
- Áp dụng đồng thời fix `return` ở bước 1 khi copy snippet Expo, nếu không có thể gặp treo/timeout thay vì lỗi rõ ràng về SharedArrayBuffer.
