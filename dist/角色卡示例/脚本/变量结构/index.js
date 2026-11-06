import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js_8998c919__ from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

var __webpack_modules__ = {
  "./示例/角色卡示例/schema.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Schema: () => (/* binding */ Schema)\n/* harmony export */ });\n/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ \"zod\");\n/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);\n\nconst Schema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n    世界: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n        当前时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n        当前地点: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n        近期事务: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('事务名'), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('事务描述')),\n    }),\n    白娅: zod__WEBPACK_IMPORTED_MODULE_0__.z\n        .object({\n        依存度: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)),\n        着装: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.enum(['上装', '下装', '内衣', '袜子', '鞋子', '饰品']), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('服装描述')),\n        称号: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('称号名'), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n            效果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n            自我评价: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n        })),\n    })\n        .transform(data => {\n        const $依存度阶段 = data.依存度 < 20\n            ? '消极自毁'\n            : data.依存度 < 40\n                ? '渴求注视'\n                : data.依存度 < 60\n                    ? '暗中靠近'\n                    : data.依存度 < 80\n                        ? '忐忑相依'\n                        : '柔软依存';\n        data.称号 = _(data.称号)\n            .entries()\n            .takeRight(Math.ceil(data.依存度 / 10))\n            .fromPairs()\n            .value();\n        return { ...data, $依存度阶段 };\n    }),\n    主角: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n        物品栏: zod__WEBPACK_IMPORTED_MODULE_0__.z\n            .record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('物品名'), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n            描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n            数量: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number(),\n        }))\n            .transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0)),\n    }),\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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IjpbInNyYzovL3RhdmVybl9oZWxwZXJfdGVtcGxhdGUv56S65L6LL+inkuiJsuWNoeekuuS+iy9zY2hlbWEudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IFNjaGVtYSA9IHoub2JqZWN0KHtcbiAg5LiW55WMOiB6Lm9iamVjdCh7XG4gICAg5b2T5YmN5pe26Ze0OiB6LnN0cmluZygpLFxuICAgIOW9k+WJjeWcsOeCuTogei5zdHJpbmcoKSxcbiAgICDov5HmnJ/kuovliqE6IHoucmVjb3JkKHouc3RyaW5nKCkuZGVzY3JpYmUoJ+S6i+WKoeWQjScpLCB6LnN0cmluZygpLmRlc2NyaWJlKCfkuovliqHmj4/ov7AnKSksXG4gIH0pLFxuXG4gIOeZveWohTogelxuICAgIC5vYmplY3Qoe1xuICAgICAg5L6d5a2Y5bqmOiB6LmNvZXJjZS5udW1iZXIoKS50cmFuc2Zvcm0odiA9PiBfLmNsYW1wKHYsIDAsIDEwMCkpLFxuICAgICAg552A6KOFOiB6LnJlY29yZCh6LmVudW0oWyfkuIroo4UnLCAn5LiL6KOFJywgJ+WGheihoycsICfoopzlrZAnLCAn6Z6L5a2QJywgJ+mlsOWTgSddKSwgei5zdHJpbmcoKS5kZXNjcmliZSgn5pyN6KOF5o+P6L+wJykpLFxuICAgICAg56ew5Y+3OiB6LnJlY29yZChcbiAgICAgICAgei5zdHJpbmcoKS5kZXNjcmliZSgn56ew5Y+35ZCNJyksXG4gICAgICAgIHoub2JqZWN0KHtcbiAgICAgICAgICDmlYjmnpw6IHouc3RyaW5nKCksXG4gICAgICAgICAg6Ieq5oiR6K+E5Lu3OiB6LnN0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgfSlcbiAgICAudHJhbnNmb3JtKGRhdGEgPT4ge1xuICAgICAgY29uc3QgJOS+neWtmOW6pumYtuautSA9XG4gICAgICAgIGRhdGEu5L6d5a2Y5bqmIDwgMjBcbiAgICAgICAgICA/ICfmtojmnoHoh6rmr4EnXG4gICAgICAgICAgOiBkYXRhLuS+neWtmOW6piA8IDQwXG4gICAgICAgICAgICA/ICfmuLTmsYLms6jop4YnXG4gICAgICAgICAgICA6IGRhdGEu5L6d5a2Y5bqmIDwgNjBcbiAgICAgICAgICAgICAgPyAn5pqX5Lit6Z2g6L+RJ1xuICAgICAgICAgICAgICA6IGRhdGEu5L6d5a2Y5bqmIDwgODBcbiAgICAgICAgICAgICAgICA/ICflv5Dlv5Hnm7jkvp0nXG4gICAgICAgICAgICAgICAgOiAn5p+U6L2v5L6d5a2YJztcbiAgICAgIGRhdGEu56ew5Y+3ID0gXyhkYXRhLuensOWPtylcbiAgICAgICAgLmVudHJpZXMoKVxuICAgICAgICAudGFrZVJpZ2h0KE1hdGguY2VpbChkYXRhLuS+neWtmOW6piAvIDEwKSlcbiAgICAgICAgLmZyb21QYWlycygpXG4gICAgICAgIC52YWx1ZSgpO1xuICAgICAgcmV0dXJuIHsgLi4uZGF0YSwgJOS+neWtmOW6pumYtuautSB9O1xuICAgIH0pLFxuXG4gIOS4u+inkjogei5vYmplY3Qoe1xuICAgIOeJqeWTgeagjzogelxuICAgICAgLnJlY29yZChcbiAgICAgICAgei5zdHJpbmcoKS5kZXNjcmliZSgn54mp5ZOB5ZCNJyksXG4gICAgICAgIHoub2JqZWN0KHtcbiAgICAgICAgICDmj4/ov7A6IHouc3RyaW5nKCksXG4gICAgICAgICAg5pWw6YePOiB6LmNvZXJjZS5udW1iZXIoKSxcbiAgICAgICAgfSksXG4gICAgICApXG4gICAgICAudHJhbnNmb3JtKGRhdGEgPT4gXy5waWNrQnkoZGF0YSwgKHsg5pWw6YePIH0pID0+IOaVsOmHjyA+IDApKSxcbiAgfSksXG59KTtcbmV4cG9ydCB0eXBlIFNjaGVtYSA9IHoub3V0cHV0PHR5cGVvZiBTY2hlbWE+O1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./示例/角色卡示例/schema.ts\n\n}");
  },
  "./示例/角色卡示例/脚本/变量结构/index.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    eval('{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js */ "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js");\n/* harmony import */ var _schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../schema */ "./示例/角色卡示例/schema.ts");\n\n\n$(() => {\n    (0,https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__.registerMvuSchema)(_schema__WEBPACK_IMPORTED_MODULE_1__.Schema);\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi/npLrkvosv6KeS6Imy5Y2h56S65L6LL+iEmuacrC/lj5jph4/nu5PmnoQvaW5kZXgudHMiLCJtYXBwaW5ncyI6Ijs7O0FBQW9IO0FBQzlFO0FBRXRDLENBQUMsQ0FBQyxHQUFHLEVBQUU7SUFDTCxnSUFBaUIsQ0FBQywyQ0FBTSxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzIjpbInNyYzovL3RhdmVybl9oZWxwZXJfdGVtcGxhdGUv56S65L6LL+inkuiJsuWNoeekuuS+iy/ohJrmnKwv5Y+Y6YeP57uT5p6EL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlZ2lzdGVyTXZ1U2NoZW1hIH0gZnJvbSAnaHR0cHM6Ly90ZXN0aW5nY2YuanNkZWxpdnIubmV0L2doL1N0YWdlRG9nL3RhdmVybl9yZXNvdXJjZS9kaXN0L3V0aWwvbXZ1X3pvZC5qcyc7XG5pbXBvcnQgeyBTY2hlbWEgfSBmcm9tICcuLi8uLi9zY2hlbWEnO1xuXG4kKCgpID0+IHtcbiAgcmVnaXN0ZXJNdnVTY2hlbWEoU2NoZW1hKTtcbn0pO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./示例/角色卡示例/脚本/变量结构/index.ts\n\n}');
  },
  "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js"(module) {
    module.exports = __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js_8998c919__;
  },
  zod(module) {
    module.exports = z;
  }
};

const __webpack_module_cache__ = {};

function __webpack_require__(moduleId) {
  const cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }
  const module = __webpack_module_cache__[moduleId] = {
    exports: {}
  };
  if (!(moduleId in __webpack_modules__)) {
    delete __webpack_module_cache__[moduleId];
    const e = new Error("Cannot find module '" + moduleId + "'");
    e.code = "MODULE_NOT_FOUND";
    throw e;
  }
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}

__webpack_require__.n = module => {
  const getter = module && module.__esModule ? () => module["default"] : () => module;
  __webpack_require__.d(getter, {
    a: getter
  });
  return getter;
};

__webpack_require__.d = (exports, definition) => {
  for (var key in definition) {
    if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: definition[key]
      });
    }
  }
};

__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

__webpack_require__.r = exports => {
  Object.defineProperty(exports, Symbol.toStringTag, {
    value: "Module"
  });
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
};

let __webpack_exports__ = __webpack_require__("./示例/角色卡示例/脚本/变量结构/index.ts");