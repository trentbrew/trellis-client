import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import { z } from 'zod';
import http, { Server as Server$1 } from 'node:http';
import https, { Server } from 'node:https';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync, mkdirSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { createHash, randomUUID as randomUUID$1 } from 'node:crypto';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as vm from 'node:vm';
import { init } from '@instantdb/admin';
import { fileURLToPath } from 'node:url';
import { getIcons } from '@iconify/utils';
import { consola } from 'consola';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function decode$1(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode$1(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/");
  }
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/") ? input : input + "/";
  }
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    const nextChar = input[_base.length];
    if (!nextChar || nextChar === "/" || nextChar === "?") {
      return input;
    }
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const nextChar = input[_base.length];
  if (nextChar && nextChar !== "/" && nextChar !== "?") {
    return input;
  }
  const trimmed = input.slice(_base.length);
  return trimmed[0] === "/" ? trimmed : "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NullObject = /* @__PURE__ */ (() => {
  const C = function() {
  };
  C.prototype = /* @__PURE__ */ Object.create(null);
  return C;
})();
function parse$1(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = new NullObject();
  const opt = {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize$2(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = { ...defaults };
  for (const key of Object.keys(baseObject)) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c$1=class c{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m(e._destroy,t._destroy);}};function _(){return Object.assign(c$1.prototype,i$1.prototype),Object.assign(c$1.prototype,l$1.prototype),c$1}function m(...n){return function(...e){for(const t of n)t(...e);}}const g=_();class A extends g{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function parse(multipartBodyBuffer, boundary) {
  let lastline = "";
  let state = 0 /* INIT */;
  let buffer = [];
  const allParts = [];
  let currentPartHeaders = [];
  for (let i = 0; i < multipartBodyBuffer.length; i++) {
    const prevByte = i > 0 ? multipartBodyBuffer[i - 1] : null;
    const currByte = multipartBodyBuffer[i];
    const newLineChar = currByte === 10 || currByte === 13;
    if (!newLineChar) {
      lastline += String.fromCodePoint(currByte);
    }
    const newLineDetected = currByte === 10 && prevByte === 13;
    if (0 /* INIT */ === state && newLineDetected) {
      if ("--" + boundary === lastline) {
        state = 1 /* READING_HEADERS */;
      }
      lastline = "";
    } else if (1 /* READING_HEADERS */ === state && newLineDetected) {
      if (lastline.length > 0) {
        const i2 = lastline.indexOf(":");
        if (i2 > 0) {
          const name = lastline.slice(0, i2).toLowerCase();
          const value = lastline.slice(i2 + 1).trim();
          currentPartHeaders.push([name, value]);
        }
      } else {
        state = 2 /* READING_DATA */;
        buffer = [];
      }
      lastline = "";
    } else if (2 /* READING_DATA */ === state) {
      if (lastline.length > boundary.length + 4) {
        lastline = "";
      }
      if ("--" + boundary === lastline) {
        const j = buffer.length - lastline.length;
        const part = buffer.slice(0, j - 1);
        allParts.push(process$1(part, currentPartHeaders));
        buffer = [];
        currentPartHeaders = [];
        lastline = "";
        state = 3 /* READING_PART_SEPARATOR */;
      } else {
        buffer.push(currByte);
      }
      if (newLineDetected) {
        lastline = "";
      }
    } else if (3 /* READING_PART_SEPARATOR */ === state && newLineDetected) {
      state = 1 /* READING_HEADERS */;
    }
  }
  return allParts;
}
function process$1(data, headers) {
  const dataObj = {};
  const contentDispositionHeader = headers.find((h) => h[0] === "content-disposition")?.[1] || "";
  for (const i of contentDispositionHeader.split(";")) {
    const s = i.split("=");
    if (s.length !== 2) {
      continue;
    }
    const key = (s[0] || "").trim();
    if (key === "name" || key === "filename") {
      const _value = (s[1] || "").trim().replace(/"/g, "");
      dataObj[key] = Buffer.from(_value, "latin1").toString("utf8");
    }
  }
  const contentType = headers.find((h) => h[0] === "content-type")?.[1] || "";
  if (contentType) {
    dataObj.type = contentType;
  }
  dataObj.data = Buffer.from(data);
  return dataObj;
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function getRouterParams(event, opts = {}) {
  let params = event.context.params || {};
  if (opts.decode) {
    params = { ...params };
    for (const key in params) {
      params[key] = decode$1(params[key]);
    }
  }
  return params;
}
function getRouterParam(event, name, opts = {}) {
  const params = getRouterParams(event, opts);
  return params[name];
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
const getHeader$1 = getRequestHeader;
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}

const RawBodySymbol = Symbol.for("h3RawBody");
const ParsedBodySymbol = Symbol.for("h3ParsedBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !/\bchunked\b/i.test(
    String(event.node.req.headers["transfer-encoding"] ?? "")
  )) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
async function readBody(event, options = {}) {
  const request = event.node.req;
  if (hasProp(request, ParsedBodySymbol)) {
    return request[ParsedBodySymbol];
  }
  const contentType = request.headers["content-type"] || "";
  const body = await readRawBody(event);
  let parsed;
  if (contentType === "application/json") {
    parsed = _parseJSON(body, options.strict ?? true);
  } else if (contentType.startsWith("application/x-www-form-urlencoded")) {
    parsed = _parseURLEncodedBody(body);
  } else if (contentType.startsWith("text/")) {
    parsed = body;
  } else {
    parsed = _parseJSON(body, options.strict ?? false);
  }
  request[ParsedBodySymbol] = parsed;
  return parsed;
}
async function readMultipartFormData(event) {
  const contentType = getRequestHeader(event, "content-type");
  if (!contentType || !contentType.startsWith("multipart/form-data")) {
    return;
  }
  const boundary = contentType.match(/boundary=([^;]*)(;|$)/i)?.[1];
  if (!boundary) {
    return;
  }
  const body = await readRawBody(event, false);
  if (!body) {
    return;
  }
  return parse(body, boundary);
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}
function _parseJSON(body = "", strict) {
  if (!body) {
    return void 0;
  }
  try {
    return destr(body, { strict });
  } catch {
    throw createError$1({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid JSON body"
    });
  }
}
function _parseURLEncodedBody(body) {
  const form = new URLSearchParams(body);
  const parsedForm = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of form.entries()) {
    if (hasProp(parsedForm, key)) {
      if (!Array.isArray(parsedForm[key])) {
        parsedForm[key] = [parsedForm[key]];
      }
      parsedForm[key].push(value);
    } else {
      parsedForm[key] = value;
    }
  }
  return parsedForm;
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}

function getDistinctCookieKey(name, opts) {
  return [name, opts.domain || "", opts.path || "/"].join(";");
}

function parseCookies(event) {
  return parse$1(event.node.req.headers.cookie || "");
}
function getCookie(event, name) {
  return parseCookies(event)[name];
}
function setCookie(event, name, value, serializeOptions = {}) {
  if (!serializeOptions.path) {
    serializeOptions = { path: "/", ...serializeOptions };
  }
  const newCookie = serialize$2(name, value, serializeOptions);
  const currentCookies = splitCookiesString(
    event.node.res.getHeader("set-cookie")
  );
  if (currentCookies.length === 0) {
    event.node.res.setHeader("set-cookie", newCookie);
    return;
  }
  const newCookieKey = getDistinctCookieKey(name, serializeOptions);
  event.node.res.removeHeader("set-cookie");
  for (const cookie of currentCookies) {
    const parsed = parseSetCookie(cookie);
    const key = getDistinctCookieKey(parsed.name, parsed);
    if (key === newCookieKey) {
      continue;
    }
    event.node.res.appendHeader("set-cookie", cookie);
  }
  event.node.res.appendHeader("set-cookie", newCookie);
}
function deleteCookie(event, name, serializeOptions) {
  setCookie(event, name, "", {
    ...serializeOptions,
    maxAge: 0
  });
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
const setHeader = setResponseHeader;
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _rawReqUrl = event.node.req.url || "/";
    const _reqPath = _decodePath(event._path || _rawReqUrl);
    event._path = _reqPath;
    const _needsRawUrl = _reqPath !== _rawReqUrl;
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _needsRawUrl ? layer.route.length > 1 ? _rawReqUrl.slice(layer.route.length) || "/" : _rawReqUrl : _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function _decodePath(url) {
  const qIndex = url.indexOf("?");
  const path = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : url.slice(qIndex);
  const decodedPath = path.includes("%25") ? decodePath(path.replace(/%25/g, "%2525")) : decodePath(path);
  return decodedPath + query;
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s$1=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch$1 = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$1;
const AbortController$1 = globalThis.AbortController || i;
createFetch({ fetch: fetch$1, Headers: Headers$1, AbortController: AbortController$1 });

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

function serialize$1(o){return typeof o=="string"?`'${o}'`:new c().serialize(o)}const c=/*@__PURE__*/function(){class o{#t=new Map;compare(t,r){const e=typeof t,n=typeof r;return e==="string"&&n==="string"?t.localeCompare(r):e==="number"&&n==="number"?t-r:String.prototype.localeCompare.call(this.serialize(t,true),this.serialize(r,true))}serialize(t,r){if(t===null)return "null";switch(typeof t){case "string":return r?t:`'${t}'`;case "bigint":return `${t}n`;case "object":return this.$object(t);case "function":return this.$function(t)}return String(t)}serializeObject(t){const r=Object.prototype.toString.call(t);if(r!=="[object Object]")return this.serializeBuiltInType(r.length<10?`unknown:${r}`:r.slice(8,-1),t);const e=t.constructor,n=e===Object||e===void 0?"":e.name;if(n!==""&&globalThis[n]===e)return this.serializeBuiltInType(n,t);if(typeof t.toJSON=="function"){const i=t.toJSON();return n+(i!==null&&typeof i=="object"?this.$object(i):`(${this.serialize(i)})`)}return this.serializeObjectEntries(n,Object.entries(t))}serializeBuiltInType(t,r){const e=this["$"+t];if(e)return e.call(this,r);if(typeof r?.entries=="function")return this.serializeObjectEntries(t,r.entries());throw new Error(`Cannot serialize ${t}`)}serializeObjectEntries(t,r){const e=Array.from(r).sort((i,a)=>this.compare(i[0],a[0]));let n=`${t}{`;for(let i=0;i<e.length;i++){const[a,l]=e[i];n+=`${this.serialize(a,true)}:${this.serialize(l)}`,i<e.length-1&&(n+=",");}return n+"}"}$object(t){let r=this.#t.get(t);return r===void 0&&(this.#t.set(t,`#${this.#t.size}`),r=this.serializeObject(t),this.#t.set(t,r)),r}$function(t){const r=Function.prototype.toString.call(t);return r.slice(-15)==="[native code] }"?`${t.name||""}()[native]`:`${t.name}(${t.length})${r.replace(/\s*\n\s*/g,"")}`}$Array(t){let r="[";for(let e=0;e<t.length;e++)r+=this.serialize(t[e]),e<t.length-1&&(r+=",");return r+"]"}$Date(t){try{return `Date(${t.toISOString()})`}catch{return "Date(null)"}}$ArrayBuffer(t){return `ArrayBuffer[${new Uint8Array(t).join(",")}]`}$Set(t){return `Set${this.$Array(Array.from(t).sort((r,e)=>this.compare(r,e)))}`}$Map(t){return this.serializeObjectEntries("Map",t.entries())}}for(const s of ["Error","RegExp","URL"])o.prototype["$"+s]=function(t){return `${s}(${t})`};for(const s of ["Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join(",")}]`};for(const s of ["BigInt64Array","BigUint64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join("n,")}${t.length>0?"n":""}]`};return o}();

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s="base64url";function digest(t){if(e)return e(r,t,s);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s):o.digest(s)}

function hash$1(input) {
  return digest(serialize$1(input));
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {
  "nuxt": {},
  "icon": {
    "provider": "iconify",
    "class": "shrink-0",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "mode": "svg",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codex",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "cuida",
      "dashicons",
      "devicon",
      "devicon-plain",
      "dinkie-icons",
      "duo-icons",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fa7-brands",
      "fa7-regular",
      "fa7-solid",
      "fad",
      "famicons",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-color",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "garden",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "ix",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "lineicons",
      "logos",
      "ls",
      "lsicon",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-icon-theme",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "meteor-icons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "nrk",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "picon",
      "pixel",
      "pixelarticons",
      "prime",
      "proicons",
      "ps",
      "qlementine-icons",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "roentgen",
      "si",
      "si-glyph",
      "sidekickicons",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "stash",
      "streamline",
      "streamline-block",
      "streamline-color",
      "streamline-cyber",
      "streamline-cyber-color",
      "streamline-emojis",
      "streamline-flex",
      "streamline-flex-color",
      "streamline-freehand",
      "streamline-freehand-color",
      "streamline-kameleon-color",
      "streamline-logos",
      "streamline-pixel",
      "streamline-plump",
      "streamline-plump-color",
      "streamline-sharp",
      "streamline-sharp-color",
      "streamline-stickies-color",
      "streamline-ultimate",
      "streamline-ultimate-color",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "temaki",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 2000
  }
};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "72d8566f-9727-44eb-9617-09672cfad81e",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/settings": {
        "redirect": {
          "to": "/settings/profile",
          "statusCode": 307
        }
      },
      "/__nuxt_content/**": {
        "robots": false,
        "cache": false
      },
      "/__nuxt_content/docs/sql_dump.txt": {
        "prerender": true
      },
      "/_fonts/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {
    "googleClientId": "797064432278-au72u8fd04pcomevnkvsgrj2pbhiclc2.apps.googleusercontent.com",
    "githubClientId": "",
    "dataMode": "local",
    "instantAppId": "4d64a085-5464-4766-bf24-6396feaeb955",
    "trellisPort": 1414,
    "vcalendar": "",
    "mdc": {
      "components": {
        "prose": true,
        "map": {},
        "customElements": []
      },
      "headings": {
        "anchorLinks": {
          "h1": false,
          "h2": true,
          "h3": true,
          "h4": true,
          "h5": false,
          "h6": false
        }
      },
      "highlight": {
        "noApiRoute": true,
        "theme": {
          "default": "github-light",
          "dark": "github-dark"
        },
        "highlighter": "shiki",
        "shikiEngine": "oniguruma",
        "langs": [
          "js",
          "jsx",
          "json",
          "ts",
          "tsx",
          "vue",
          "css",
          "html",
          "bash",
          "md",
          "mdc",
          "yaml"
        ]
      }
    },
    "content": {
      "wsUrl": ""
    }
  },
  "instantAppId": "4d64a085-5464-4766-bf24-6396feaeb955",
  "instantAppSecret": "",
  "googleClientSecret": "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",
  "googleCalendarRedirectUri": "http://localhost:1414/api/integrations/google-calendar/callback",
  "googleCalendarWebhookSecret": "",
  "gmailRedirectUri": "http://localhost:1414/api/integrations/gmail/callback",
  "gmailWebhookSecret": "",
  "githubClientSecret": "",
  "githubRedirectUri": "http://localhost:1414/api/integrations/github/callback",
  "githubWebhookSecret": "",
  "resendApiKey": "",
  "resendFrom": "Trellis <noreply@trellis.app>",
  "icon": {
    "serverKnownCssClasses": []
  },
  "content": {
    "databaseVersion": "v3.5.0",
    "version": "3.11.0",
    "database": {
      "type": "sqlite",
      "filename": "./contents.sqlite"
    },
    "localDatabase": {
      "type": "sqlite",
      "filename": "/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/.data/content/contents.sqlite"
    },
    "integrityCheck": true
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
const _sharedAppConfig = _deepFreeze(klona(appConfig));
function useAppConfig(event) {
  {
    return _sharedAppConfig;
  }
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());

getContext("nitro-app", {
  asyncContext: false,
  AsyncLocalStorage: void 0
});

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function isJsonRequest(event) {
  if (hasReqHeader(event, "accept", "text/html")) {
    return false;
  }
  return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
  const value = getRequestHeader(event, name);
  return value && typeof value === "string" && value.toLowerCase().includes(includes);
}

const errorHandler$0 = (async function errorhandler(error, event, { defaultHandler }) {
  if (event.handled || isJsonRequest(event)) {
    return;
  }
  const defaultRes = await defaultHandler(error, event, { json: true });
  const statusCode = error.statusCode || 500;
  if (statusCode === 404 && defaultRes.status === 302) {
    setResponseHeaders(event, defaultRes.headers);
    setResponseStatus(event, defaultRes.status, defaultRes.statusText);
    return send(event, JSON.stringify(defaultRes.body, null, 2));
  }
  const errorObject = defaultRes.body;
  const url = new URL(errorObject.url);
  errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
  errorObject.message ||= "Server Error";
  errorObject.data ||= error.data;
  errorObject.statusMessage ||= error.statusMessage;
  delete defaultRes.headers["content-type"];
  delete defaultRes.headers["content-security-policy"];
  setResponseHeaders(event, defaultRes.headers);
  const reqHeaders = getRequestHeaders(event);
  const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"];
  const res = isRenderingError ? null : await useNitroApp().localFetch(
    withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject),
    {
      headers: { ...reqHeaders, "x-nuxt-error": "true" },
      redirect: "manual"
    }
  ).catch(() => null);
  if (event.handled) {
    return;
  }
  if (!res) {
    const { template } = await import('../_/error-500.mjs');
    setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
    return send(event, template(errorObject));
  }
  const html = await res.text();
  for (const [header, value] of res.headers.entries()) {
    if (header === "set-cookie") {
      appendResponseHeader(event, header, value);
      continue;
    }
    setResponseHeader(event, header, value);
  }
  setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
  return send(event, html);
});

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const script = "\"use strict\";(()=>{const t=window,e=document.documentElement,c=[\"dark\",\"light\"],n=getStorageValue(\"localStorage\",\"trellis-color-mode\")||\"dark\";let i=n===\"system\"?u():n;const r=e.getAttribute(\"data-color-mode-forced\");r&&(i=r),l(i),t[\"__NUXT_COLOR_MODE__\"]={preference:n,value:i,getColorScheme:u,addColorScheme:l,removeColorScheme:d};function l(o){const s=\"\"+o+\"\",a=\"\";e.classList?e.classList.add(s):e.className+=\" \"+s,a&&e.setAttribute(\"data-\"+a,o)}function d(o){const s=\"\"+o+\"\",a=\"\";e.classList?e.classList.remove(s):e.className=e.className.replace(new RegExp(s,\"g\"),\"\"),a&&e.removeAttribute(\"data-\"+a)}function f(o){return t.matchMedia(\"(prefers-color-scheme\"+o+\")\")}function u(){if(t.matchMedia&&f(\"\").media!==\"not all\"){for(const o of c)if(f(\":\"+o).matches)return o}return\"light\"}})();function getStorageValue(t,e){switch(t){case\"localStorage\":return window.localStorage.getItem(e);case\"sessionStorage\":return window.sessionStorage.getItem(e);case\"cookie\":return getCookie(e);default:return null}}function getCookie(t){const c=(\"; \"+window.document.cookie).split(\"; \"+t+\"=\");if(c.length===2)return c.pop()?.split(\";\").shift()}";

const _YyUYKQLG1ZKcsJNFksJUzmv3yB_RmozPvjE0ui_jDg = (function(nitro) {
  nitro.hooks.hook("render:html", (htmlContext) => {
    htmlContext.head.push(`<script>${script}<\/script>`);
  });
});

function defineNitroPlugin(def) {
  return def;
}

var __defProp$9 = Object.defineProperty;
var __defNormalProp$9 = (obj, key, value) => key in obj ? __defProp$9(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$9 = (obj, key, value) => __defNormalProp$9(obj, typeof key !== "symbol" ? key + "" : key, value);
function* flatten(obj, base = "") {
  if (Array.isArray(obj)) {
    for (const v of obj) {
      yield* flatten(v, base);
    }
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      yield* flatten(v, base ? `${base}.${k}` : k);
    }
  } else {
    yield [base, obj];
  }
}
function jsonEntityFacts(entityId, root, type) {
  const facts = [{ e: entityId, a: "type", v: type }];
  for (const [a, v] of flatten(root)) {
    if (v === void 0 || v === null) continue;
    if (Array.isArray(v)) {
      for (const el of v) {
        facts.push({ e: entityId, a, v: el });
      }
    } else if (typeof v === "object") ; else {
      facts.push({ e: entityId, a, v });
    }
  }
  return facts;
}
class EAVStore {
  constructor() {
    __publicField$9(this, "facts", []);
    __publicField$9(this, "links", []);
    __publicField$9(this, "catalog", /* @__PURE__ */ new Map());
    // Indexes for fast lookups
    __publicField$9(this, "eavIndex", /* @__PURE__ */ new Map());
    __publicField$9(this, "aevIndex", /* @__PURE__ */ new Map());
    __publicField$9(this, "aveIndex", /* @__PURE__ */ new Map());
    // Link indexes for graph queries
    __publicField$9(this, "linkIndex", /* @__PURE__ */ new Map());
    // e1 -> a -> e2s
    __publicField$9(this, "linkReverseIndex", /* @__PURE__ */ new Map());
    // e2 -> a -> e1s
    __publicField$9(this, "linkAttrIndex", /* @__PURE__ */ new Map());
    // a -> [(e1, e2)]
    // Distinct value tracking
    __publicField$9(this, "distinct", /* @__PURE__ */ new Map());
  }
  // attr -> set of valueKey
  addFacts(facts) {
    var _a;
    for (let i = 0; i < facts.length; i++) {
      const fact = facts[i];
      if (!fact) continue;
      const attrIndices = (_a = this.eavIndex.get(fact.e)) == null ? void 0 : _a.get(fact.a);
      if (attrIndices) {
        let isDupe = false;
        for (const idx of attrIndices) {
          const existing = this.facts[idx];
          if (existing && existing.v === fact.v) {
            isDupe = true;
            break;
          }
        }
        if (isDupe) continue;
      }
      this.facts.push(fact);
      this.updateIndexes(fact, this.facts.length - 1);
      this.updateCatalog(fact);
    }
  }
  addLinks(links) {
    var _a;
    for (const link of links) {
      const existingTargets = (_a = this.linkIndex.get(link.e1)) == null ? void 0 : _a.get(link.a);
      if (existingTargets == null ? void 0 : existingTargets.has(link.e2)) continue;
      this.links.push(link);
      this.updateLinkIndexes(link);
    }
  }
  deleteFacts(factsToDelete) {
    var _a, _b, _c, _d, _e, _f, _g;
    for (const fact of factsToDelete) {
      const valueKey = this.valueKey(fact.v);
      const indices = (_a = this.aveIndex.get(fact.a)) == null ? void 0 : _a.get(valueKey);
      if (!indices) continue;
      let foundIdx = -1;
      for (const idx of indices) {
        const storedFact = this.facts[idx];
        if (storedFact && storedFact.e === fact.e && storedFact.a === fact.a) {
          foundIdx = idx;
          break;
        }
      }
      if (foundIdx !== -1) {
        this.facts[foundIdx] = void 0;
        (_c = (_b = this.eavIndex.get(fact.e)) == null ? void 0 : _b.get(fact.a)) == null ? void 0 : _c.delete(foundIdx);
        (_e = (_d = this.aevIndex.get(fact.a)) == null ? void 0 : _d.get(fact.e)) == null ? void 0 : _e.delete(foundIdx);
        (_g = (_f = this.aveIndex.get(fact.a)) == null ? void 0 : _f.get(valueKey)) == null ? void 0 : _g.delete(foundIdx);
        this.catalog.get(fact.a);
      }
    }
  }
  deleteLinks(linksToDelete) {
    var _a, _b, _c, _d;
    for (const link of linksToDelete) {
      const initialLen = this.links.length;
      this.links = this.links.filter(
        (l) => !(l.e1 === link.e1 && l.a === link.a && l.e2 === link.e2)
      );
      if (this.links.length < initialLen) {
        (_b = (_a = this.linkIndex.get(link.e1)) == null ? void 0 : _a.get(link.a)) == null ? void 0 : _b.delete(link.e2);
        (_d = (_c = this.linkReverseIndex.get(link.e2)) == null ? void 0 : _c.get(link.a)) == null ? void 0 : _d.delete(link.e1);
        const attrPairs = this.linkAttrIndex.get(link.a);
        if (attrPairs) {
          for (const pair of attrPairs) {
            if (pair[0] === link.e1 && pair[1] === link.e2) {
              attrPairs.delete(pair);
              break;
            }
          }
        }
      }
    }
  }
  updateIndexes(fact, index) {
    if (!this.eavIndex.has(fact.e)) {
      this.eavIndex.set(fact.e, /* @__PURE__ */ new Map());
    }
    if (!this.eavIndex.get(fact.e).has(fact.a)) {
      this.eavIndex.get(fact.e).set(fact.a, /* @__PURE__ */ new Set());
    }
    this.eavIndex.get(fact.e).get(fact.a).add(index);
    if (!this.aevIndex.has(fact.a)) {
      this.aevIndex.set(fact.a, /* @__PURE__ */ new Map());
    }
    if (!this.aevIndex.get(fact.a).has(fact.e)) {
      this.aevIndex.get(fact.a).set(fact.e, /* @__PURE__ */ new Set());
    }
    this.aevIndex.get(fact.a).get(fact.e).add(index);
    if (!this.aveIndex.has(fact.a)) {
      this.aveIndex.set(fact.a, /* @__PURE__ */ new Map());
    }
    const valueKey = this.valueKey(fact.v);
    if (!this.aveIndex.get(fact.a).has(valueKey)) {
      this.aveIndex.get(fact.a).set(valueKey, /* @__PURE__ */ new Set());
    }
    this.aveIndex.get(fact.a).get(valueKey).add(index);
  }
  updateLinkIndexes(link) {
    if (!this.linkIndex.has(link.e1)) {
      this.linkIndex.set(link.e1, /* @__PURE__ */ new Map());
    }
    const e1Attrs = this.linkIndex.get(link.e1);
    if (!e1Attrs.has(link.a)) {
      e1Attrs.set(link.a, /* @__PURE__ */ new Set());
    }
    e1Attrs.get(link.a).add(link.e2);
    if (!this.linkReverseIndex.has(link.e2)) {
      this.linkReverseIndex.set(link.e2, /* @__PURE__ */ new Map());
    }
    const e2Attrs = this.linkReverseIndex.get(link.e2);
    if (!e2Attrs.has(link.a)) {
      e2Attrs.set(link.a, /* @__PURE__ */ new Set());
    }
    e2Attrs.get(link.a).add(link.e1);
    if (!this.linkAttrIndex.has(link.a)) {
      this.linkAttrIndex.set(link.a, /* @__PURE__ */ new Set());
    }
    this.linkAttrIndex.get(link.a).add([link.e1, link.e2]);
  }
  valueKey(v) {
    if (v instanceof Date) return `date:${v.toISOString()}`;
    return `${typeof v}:${v}`;
  }
  updateCatalog(fact) {
    var _a, _b, _c;
    const entry = this.catalog.get(fact.a) || {
      attribute: fact.a,
      type: this.inferType(fact.v),
      cardinality: "one",
      distinctCount: 0,
      examples: []
    };
    const factType = this.inferType(fact.v);
    if (entry.type !== factType && entry.type !== "mixed") {
      entry.type = "mixed";
    }
    const entityAttrs = (_a = this.eavIndex.get(fact.e)) == null ? void 0 : _a.get(fact.a);
    if (entityAttrs && entityAttrs.size > 1) {
      entry.cardinality = "many";
    }
    const k = this.valueKey(fact.v);
    const s = this.distinct.get(fact.a) || (this.distinct.set(fact.a, /* @__PURE__ */ new Set()), this.distinct.get(fact.a));
    s.add(k);
    entry.distinctCount = s.size;
    if (entry.examples.length < 5 && !entry.examples.includes(fact.v)) {
      entry.examples.push(fact.v);
    }
    if (typeof fact.v === "number") {
      entry.min = Math.min((_b = entry.min) != null ? _b : fact.v, fact.v);
      entry.max = Math.max((_c = entry.max) != null ? _c : fact.v, fact.v);
    }
    this.catalog.set(fact.a, entry);
  }
  inferType(v) {
    if (typeof v === "string") return "string";
    if (typeof v === "number") return "number";
    if (typeof v === "boolean") return "boolean";
    if (v instanceof Date) return "date";
    return "mixed";
  }
  // Query methods
  getFactsByEntity(entity) {
    const indices = this.eavIndex.get(entity);
    if (!indices) return [];
    const result = [];
    for (const attrIndices of indices.values()) {
      for (const idx of attrIndices) {
        const fact = this.facts[idx];
        if (fact) {
          result.push(fact);
        }
      }
    }
    return result;
  }
  getFactsByAttribute(attribute) {
    const indices = this.aevIndex.get(attribute);
    if (!indices) return [];
    const result = [];
    for (const entityIndices of indices.values()) {
      for (const idx of entityIndices) {
        const fact = this.facts[idx];
        if (fact) {
          result.push(fact);
        }
      }
    }
    return result;
  }
  getFactsByValue(attribute, value) {
    var _a;
    const indices = (_a = this.aveIndex.get(attribute)) == null ? void 0 : _a.get(this.valueKey(value));
    if (!indices) return [];
    return Array.from(indices).map((idx) => this.facts[idx]).filter((fact) => fact !== void 0);
  }
  getCatalog() {
    return Array.from(this.catalog.values());
  }
  getCatalogEntry(attribute) {
    return this.catalog.get(attribute);
  }
  // Statistics
  getAllFacts() {
    return this.facts.filter((f) => f != null);
  }
  getAllLinks() {
    return [...this.links];
  }
  getLinksByEntity(entity) {
    const results = [];
    const forwardLinks = this.linkIndex.get(entity);
    if (forwardLinks) {
      for (const [attr, targets] of forwardLinks) {
        for (const target of targets) {
          results.push({ e1: entity, a: attr, e2: target });
        }
      }
    }
    const reverseLinks = this.linkReverseIndex.get(entity);
    if (reverseLinks) {
      for (const [attr, sources] of reverseLinks) {
        for (const source of sources) {
          results.push({ e1: source, a: attr, e2: entity });
        }
      }
    }
    return results;
  }
  getLinksByAttribute(attribute) {
    const results = [];
    const links = this.linkAttrIndex.get(attribute);
    if (links) {
      for (const [e1, e2] of links) {
        results.push({ e1, a: attribute, e2 });
      }
    }
    return results;
  }
  getLinksByEntityAndAttribute(entity, attribute) {
    const results = [];
    const attrs = this.linkIndex.get(entity);
    if (attrs) {
      const targets = attrs.get(attribute);
      if (targets) {
        for (const target of targets) {
          results.push({ e1: entity, a: attribute, e2: target });
        }
      }
    }
    return results;
  }
  getStats() {
    return {
      totalFacts: this.facts.length,
      totalLinks: this.links.length,
      uniqueEntities: this.eavIndex.size,
      uniqueAttributes: this.aevIndex.size,
      catalogEntries: this.catalog.size
    };
  }
  /**
   * Creates a serializable snapshot of the current store state.
   */
  snapshot() {
    return {
      facts: this.facts.filter((f) => f !== void 0),
      links: [...this.links],
      catalog: this.getCatalog()
    };
  }
  /**
   * Restores the store state from a snapshot and rebuilds all indexes.
   */
  restore(snapshot) {
    this.facts = [];
    this.links = [];
    this.catalog.clear();
    this.eavIndex.clear();
    this.aevIndex.clear();
    this.aveIndex.clear();
    this.linkIndex.clear();
    this.linkReverseIndex.clear();
    this.linkAttrIndex.clear();
    this.distinct.clear();
    this.addFacts(snapshot.facts);
    this.addLinks(snapshot.links);
    if (snapshot.catalog) {
      for (const entry of snapshot.catalog) {
        this.catalog.set(entry.attribute, entry);
      }
    }
  }
}

async function hashOp(op) {
  const content = JSON.stringify({
    kind: op.kind,
    timestamp: op.timestamp,
    agentId: op.agentId,
    previousHash: op.previousHash,
    facts: op.facts,
    links: op.links,
    nonce: crypto.randomUUID()
  });
  const msgUint8 = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `trellis:op:${hashHex}`;
}
async function createOp(kind, params) {
  const opBase = {
    kind,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    agentId: params.agentId,
    previousHash: params.previousHash,
    facts: params.facts,
    links: params.links
  };
  const hash = await hashOp(opBase);
  return { ...opBase, hash };
}

const PropertyTypeSchema = z.enum([
  "title",
  "rich_text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "people",
  "files",
  "checkbox",
  "url",
  "email",
  "phone_number",
  "relation",
  "rollup",
  "formula",
  "ai_generated",
  "json"
]);
const PropertyValueSpecificationSchema = z.object({
  name: z.string(),
  valueType: PropertyTypeSchema,
  required: z.boolean().optional(),
  description: z.string().optional(),
  // Type-specific config
  selectOptions: z.array(z.any()).optional(),
  relation: z.object({
    targetSchema: z.string().optional(),
    cardinality: z.enum(["one", "many"]).optional(),
    syncedProperty: z.string().optional()
  }).optional(),
  formula: z.string().optional(),
  rollup: z.object({
    relationProperty: z.string(),
    targetProperty: z.string(),
    aggregation: z.enum([
      "count",
      "sum",
      "avg",
      "min",
      "max",
      "median",
      "mode"
    ])
  }).optional(),
  aiGenerated: z.object({
    prompt: z.string(),
    model: z.string().optional()
  }).optional(),
  // UI metadata (optional — system ontologies populate these)
  icon: z.string().optional(),
  group: z.string().optional(),
  display: z.enum(["pill", "toggle", "inline-input", "popover"]).optional(),
  editable: z.boolean().optional(),
  computed: z.boolean().optional(),
  modes: z.array(z.enum(["view", "create", "edit"])).optional(),
  defaultValue: z.any().optional()
});
const EntityClassSchema = z.enum(["temporal", "document", "actor", "container"]);
const OntologyTierSchema = z.enum(["core", "system", "user"]);
const PanelConfigSchema = z.object({
  properties: z.string(),
  content: z.string(),
  footerActions: z.array(z.string())
});
const SchemaDefinitionSchema = z.object({
  "@id": z.string(),
  "@type": z.literal("trellis:Schema"),
  version: z.string(),
  fields: z.array(PropertyValueSpecificationSchema),
  // Tier & inheritance
  tier: OntologyTierSchema.optional(),
  subClassOf: z.string().optional(),
  // Entity classification
  entityClass: EntityClassSchema.optional(),
  // UI metadata
  label: z.string().optional(),
  labelPlural: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  // Projections
  projections: z.array(z.string()).optional(),
  defaultProjection: z.string().optional(),
  // Dialog / panels
  dialogShell: z.string().optional(),
  panels: PanelConfigSchema.optional(),
  // Property field IDs (ordered list referencing field names)
  propertyFieldIds: z.array(z.string()).optional(),
  // Sort & search
  defaultSortField: z.string().optional(),
  searchFields: z.array(z.string()).optional()
});
const ProjectionDefinitionSchema = z.object({
  "@id": z.string(),
  "@type": z.literal("trellis:Projection"),
  name: z.string(),
  type: z.string(),
  // Projection type ID (table, kanban, calendar, etc.)
  query: z.string().optional(),
  // EQL-S or Datalog
  icon: z.string().optional(),
  component: z.string().optional(),
  order: z.number().optional(),
  status: z.string().optional(),
  requirements: z.object({
    schema: z.object({
      fieldTypes: z.array(z.string())
    }).optional()
  }).optional(),
  config: z.record(z.string(), z.any()).optional()
});
const RouteDefinitionSchema = z.object({
  "@id": z.string(),
  "@type": z.literal("trellis:Route"),
  routePath: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  tint: z.string().optional(),
  order: z.number().optional(),
  inRail: z.boolean().optional(),
  railPosition: z.enum(["primary", "secondary"]).optional(),
  collapseSidebar: z.boolean().optional(),
  requiresAuth: z.boolean().optional(),
  inCommandPalette: z.boolean().optional(),
  searchKeywords: z.array(z.string()).optional(),
  permissions: z.record(z.string(), z.any()).optional(),
  meta: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    subtitle: z.string().optional(),
    showBackButton: z.boolean().optional(),
    fullWidth: z.boolean().optional(),
    hideSidebar: z.boolean().optional(),
    sidebarSectionPath: z.string().optional()
  }).optional(),
  sidebarSections: z.array(z.any()).optional(),
  children: z.array(z.any()).optional(),
  editable: z.boolean().optional(),
  tabs: z.array(z.any()).optional(),
  entityType: z.string().optional(),
  pageVariant: z.string().optional(),
  projectionTypes: z.array(z.string()).optional()
});
const AppDefinitionSchema = z.object({
  "@id": z.string(),
  "@type": z.literal("trellis:App"),
  title: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  devPort: z.number().optional()
});
const WorkspaceConfigSchema = z.object({
  workspace: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    ontologies: z.record(z.string(), SchemaDefinitionSchema).optional(),
    graph: z.object({
      nodes: z.array(z.any()).optional(),
      edges: z.array(z.any()).optional()
    }).optional(),
    projections: z.record(z.string(), ProjectionDefinitionSchema).optional(),
    routes: z.record(z.string(), RouteDefinitionSchema).optional(),
    app: AppDefinitionSchema.optional()
  })
});

const f$1 = (name, valueType, opts) => ({ name, valueType, ...opts });
const CORE_VERSION = "1.0.0";
const thing = {
  "@id": "core:Thing",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  label: "Thing",
  icon: "lucide:box",
  fields: [
    f$1("id", "title", { required: true }),
    f$1("createdAt", "date"),
    f$1("updatedAt", "date"),
    f$1("createdBy", "relation", { relation: { targetSchema: "core:Member", cardinality: "one" } }),
    f$1("tags", "multi_select")
  ]
};
const record = {
  "@id": "core:Record",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Record",
  icon: "lucide:file",
  fields: [
    f$1("title", "title", { required: true }),
    f$1("description", "rich_text"),
    f$1("status", "select"),
    f$1("tags", "multi_select")
  ]
};
const document = {
  "@id": "core:Document",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Record",
  label: "Document",
  icon: "lucide:file-text",
  fields: [
    f$1("content", "rich_text"),
    f$1("mimeType", "rich_text"),
    f$1("fileUrl", "url")
  ]
};
const event = {
  "@id": "core:Event",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Record",
  label: "Event",
  icon: "lucide:calendar",
  fields: [
    f$1("startDate", "date"),
    f$1("endDate", "date"),
    f$1("location", "rich_text"),
    f$1("allDay", "checkbox")
  ]
};
const collection = {
  "@id": "core:Collection",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Collection",
  icon: "lucide:database",
  fields: [
    f$1("title", "title", { required: true }),
    f$1("description", "rich_text"),
    f$1("icon", "rich_text"),
    f$1("schema", "rich_text"),
    f$1("recordType", "relation", { relation: { targetSchema: "core:Record", cardinality: "one" } })
  ]
};
const tag = {
  "@id": "core:Tag",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Tag",
  icon: "lucide:tag",
  fields: [
    f$1("name", "title", { required: true }),
    f$1("slug", "rich_text"),
    f$1("color", "rich_text"),
    f$1("icon", "rich_text"),
    f$1("parentTag", "relation", { relation: { targetSchema: "core:Tag", cardinality: "one" } })
  ]
};
const workspace = {
  "@id": "core:Workspace",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Workspace",
  icon: "lucide:building-2",
  fields: [
    f$1("name", "title", { required: true }),
    f$1("slug", "rich_text"),
    f$1("avatar", "files"),
    f$1("plan", "select")
  ]
};
const app = {
  "@id": "core:App",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "App",
  icon: "lucide:layout-grid",
  fields: [
    f$1("name", "title", { required: true }),
    f$1("slug", "rich_text"),
    f$1("icon", "rich_text"),
    f$1("color", "rich_text"),
    f$1("description", "rich_text"),
    f$1("ontologies", "multi_select")
  ]
};
const member = {
  "@id": "core:Member",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Member",
  icon: "lucide:user",
  fields: [
    f$1("name", "title", { required: true }),
    f$1("email", "email"),
    f$1("avatar", "files"),
    f$1("role", "select", {
      required: true,
      selectOptions: ["owner", "admin", "member", "guest"],
      defaultValue: "member"
    }),
    f$1("status", "select", {
      required: true,
      selectOptions: ["pending", "active", "suspended"],
      defaultValue: "pending"
    }),
    f$1("orgId", "relation", { required: true, relation: { targetSchema: "core:Workspace", cardinality: "one" } }),
    f$1("userId", "relation", { relation: { targetSchema: "core:Person", cardinality: "one" } }),
    f$1("invitedAt", "date"),
    f$1("joinedAt", "date")
  ]
};
const notification = {
  "@id": "core:Notification",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Notification",
  icon: "lucide:bell",
  fields: [
    f$1("recipientId", "relation", { required: true, relation: { targetSchema: "core:Person", cardinality: "one" } }),
    f$1("orgId", "relation", { relation: { targetSchema: "core:Workspace", cardinality: "one" } }),
    f$1("orgName", "rich_text"),
    f$1("type", "select", {
      required: true,
      selectOptions: [
        "invite_accepted",
        "invite_sent",
        "member_joined",
        "member_removed",
        "role_changed",
        "mention",
        "comment",
        "entity_updated",
        "system"
      ]
    }),
    f$1("title", "title", { required: true }),
    f$1("message", "rich_text", { required: true }),
    f$1("actionUrl", "url"),
    f$1("icon", "rich_text"),
    f$1("variant", "select", { selectOptions: ["default", "success", "warning", "destructive", "info"] }),
    f$1("isRead", "checkbox", { defaultValue: false }),
    f$1("actorId", "relation", { relation: { targetSchema: "core:Person", cardinality: "one" } }),
    f$1("actorName", "rich_text"),
    f$1("metadata", "rich_text"),
    f$1("createdAt", "date", { required: true })
  ]
};
const share = {
  "@id": "core:Share",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Share",
  icon: "lucide:share-2",
  fields: [
    f$1("entityId", "relation", { required: true }),
    f$1("entityType", "select", { selectOptions: ["entity", "collection"] }),
    f$1("userId", "relation", { required: true, relation: { targetSchema: "core:Person", cardinality: "one" } }),
    f$1("orgId", "relation", { relation: { targetSchema: "core:Workspace", cardinality: "one" } }),
    f$1("permission", "select", { required: true, selectOptions: ["view", "comment", "edit"], defaultValue: "view" }),
    f$1("sharedBy", "relation", { relation: { targetSchema: "core:Person", cardinality: "one" } }),
    f$1("createdAt", "date", { required: true })
  ]
};
const person = {
  "@id": "core:Person",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Person",
  icon: "lucide:user",
  fields: [
    f$1("name", "title", { required: true })
  ]
};
const workflow = {
  "@id": "core:Workflow",
  "@type": "trellis:Schema",
  version: CORE_VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Workflow",
  icon: "lucide:git-branch",
  fields: [
    f$1("name", "title", { required: true }),
    f$1("trigger", "rich_text"),
    f$1("steps", "multi_select"),
    f$1("active", "checkbox")
  ]
};
const CORE_ONTOLOGY = [
  thing,
  record,
  document,
  event,
  collection,
  tag,
  workspace,
  app,
  member,
  notification,
  share,
  person,
  workflow
];

var __defProp$8 = Object.defineProperty;
var __defNormalProp$8 = (obj, key, value) => key in obj ? __defProp$8(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$8 = (obj, key, value) => __defNormalProp$8(obj, typeof key !== "symbol" ? key + "" : key, value);
class ExternalPredicates {
  static regex(str, pattern) {
    if (typeof pattern === "string") {
      try {
        const regexMatch = pattern.match(/^\/(.*)\/([gimuy]*)$/);
        if (regexMatch) {
          const [, regexPattern, flags] = regexMatch;
          const regex = new RegExp(regexPattern, flags || "i");
          return regex.test(str);
        }
        return new RegExp(pattern, "i").test(str);
      } catch (e) {
        console.warn(`Invalid regex pattern: ${pattern}`, e);
        return str.toLowerCase().includes(pattern.toLowerCase());
      }
    }
    return pattern.test(str);
  }
  static gt(a, b) {
    return a > b;
  }
  static lt(a, b) {
    return a < b;
  }
  static between(val, min, max) {
    return val >= min && val <= max;
  }
  static contains(str, substr) {
    return str.toLowerCase().includes(substr.toLowerCase());
  }
  static after(a, b) {
    return a > b;
  }
  static betweenDate(d, start, end) {
    return d >= start && d <= end;
  }
  static sum(values) {
    return values.reduce((a, b) => a + b, 0);
  }
  static count(values) {
    return values.length;
  }
  static avg(values) {
    return values.length > 0 ? this.sum(values) / values.length : 0;
  }
}
class DatalogEvaluator {
  // predicate -> tuples
  constructor(store) {
    __publicField$8(this, "store");
    __publicField$8(this, "rules", []);
    __publicField$8(this, "ws", /* @__PURE__ */ new Map());
    this.store = store;
  }
  addRule(rule) {
    this.rules.push(rule);
  }
  /**
   * Seed base facts into working set
   */
  seedBaseFacts() {
    const attrRows = [];
    for (const f of this.store.getAllFacts()) {
      if (f) {
        attrRows.push([f.e, f.a, f.v]);
      }
    }
    this.ws.set("attr", attrRows);
    const linkRows = [];
    for (const link of this.store.getAllLinks()) {
      linkRows.push([link.e1, link.a, link.e2]);
    }
    this.ws.set("link", linkRows);
  }
  /**
   * Push derived fact to working set
   */
  pushDerived(predicate, tuple) {
    const bucket = this.ws.get(predicate) || [];
    if (!this.ws.has(predicate)) {
      this.ws.set(predicate, bucket);
    }
    const key = JSON.stringify(tuple);
    if (!bucket._keys) {
      bucket._keys = /* @__PURE__ */ new Set();
    }
    const keys = bucket._keys;
    if (keys.has(key)) {
      return false;
    }
    bucket.push(tuple);
    keys.add(key);
    return true;
  }
  /**
   * Evaluate a query using semi-naive evaluation
   */
  evaluate(query) {
    const startTime = performance.now();
    const trace = [];
    this.seedBaseFacts();
    let added = true;
    let iterations = 0;
    const maxIterations = 100;
    while (added && iterations < maxIterations) {
      added = false;
      for (const rule of this.rules) {
        const bindings2 = this.findBindingsOverWS(rule.body);
        for (const binding of bindings2) {
          const head = this.substitute(rule.head, binding);
          const tuple = head.terms.map(
            (term) => this.resolveTerm(term, binding)
          );
          if (this.pushDerived(head.predicate, tuple)) {
            added = true;
          }
        }
      }
      iterations++;
    }
    const bindings = this.findBindingsOverWS(query.goals, trace);
    return {
      bindings,
      executionTime: performance.now() - startTime,
      plan: `Semi-naive evaluation: ${iterations} iterations, ${this.getTotalFacts()} facts`,
      trace
    };
  }
  /**
   * Get total number of facts across all predicates
   */
  getTotalFacts() {
    let total = 0;
    for (const tuples of this.ws.values()) {
      total += tuples.length;
    }
    return total;
  }
  /**
   * Find bindings over working set
   */
  findBindingsOverWS(goals, trace) {
    if (goals.length === 0) {
      return [{}];
    }
    let bindings = [{}];
    for (const goal of goals) {
      const goalStartTime = performance.now();
      const newBindings = [];
      for (const binding of bindings) {
        const goalBindings = this.evaluateGoal(goal, binding);
        for (const goalBinding of goalBindings) {
          const merged = { ...binding, ...goalBinding };
          let hasConflict = false;
          for (const key in merged) {
            if (binding[key] !== void 0 && goalBinding[key] !== void 0 && binding[key] !== goalBinding[key]) {
              hasConflict = true;
              break;
            }
          }
          if (!hasConflict) {
            newBindings.push(merged);
          }
        }
      }
      bindings = newBindings;
      if (trace) {
        trace.push({
          goal: `${goal.predicate}(${goal.terms.join(", ")})`,
          bindingsCount: bindings.length,
          durationMs: performance.now() - goalStartTime
        });
      }
    }
    const uniqueBindings = /* @__PURE__ */ new Map();
    for (const binding of bindings) {
      const key = JSON.stringify(binding);
      uniqueBindings.set(key, binding);
    }
    return Array.from(uniqueBindings.values());
  }
  /**
   * Evaluate a single goal
   */
  evaluateGoal(goal, binding) {
    const { predicate, terms } = goal;
    if (predicate === "not") {
      const inner = goal.terms[0];
      const res = this.evaluateGoal(inner, binding);
      return res.length === 0 ? [binding] : [];
    }
    if (predicate === "attr") {
      return this.evaluateAttrPredicate(terms, binding);
    }
    if (predicate === "link") {
      return this.evaluateLinkPredicate(terms, binding);
    }
    if (predicate === "gt" || predicate === "lt" || predicate === "between" || predicate === ">" || predicate === "<" || predicate === ">=" || predicate === "<=" || predicate === "=" || predicate === "!=") {
      return this.evaluateComparisonPredicate(goal, binding);
    }
    if (predicate === "regex" || predicate === "contains") {
      return this.evaluateStringPredicate(goal, binding);
    }
    if (predicate === "after" || predicate === "betweenDate") {
      return this.evaluateDatePredicate(goal, binding);
    }
    if (predicate.startsWith("ext_")) {
      return this.evaluateExternalPredicate(goal, binding);
    }
    return this.evalPredicateFromWS(predicate, terms, binding);
  }
  /**
   * Evaluate predicate from working set
   */
  evalPredicateFromWS(predicate, terms, binding) {
    const rows = this.ws.get(predicate) || [];
    const results = [];
    rowloop: for (const row of rows) {
      const newBinding = { ...binding };
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        const val = row[i];
        if (typeof term === "string" && term.startsWith("?")) {
          const bound = newBinding[term];
          if (bound !== void 0 && bound !== val) {
            continue rowloop;
          }
          newBinding[term] = val;
        } else {
          if (term !== val) {
            continue rowloop;
          }
        }
      }
      results.push(newBinding);
    }
    return results;
  }
  /**
   * Evaluate attr predicate
   */
  evaluateAttrPredicate(terms, binding) {
    if (terms.length !== 3) return [];
    const [entity, attribute, value] = terms.map(
      (term) => this.resolveTerm(term, binding)
    );
    const results = [];
    if (typeof entity === "string" && !entity.startsWith("?") && typeof attribute === "string" && !attribute.startsWith("?") && (typeof value !== "string" || !value.startsWith("?"))) {
      const facts = this.store.getFactsByValue(attribute, value);
      for (const fact of facts) {
        if (fact.e === entity) {
          results.push({});
        }
      }
      return results;
    }
    if (typeof entity === "string" && !entity.startsWith("?") && typeof attribute === "string" && !attribute.startsWith("?")) {
      const facts = this.store.getFactsByEntity(entity);
      for (const fact of facts) {
        if (fact.a === attribute) {
          const newBinding = { ...binding };
          if (typeof value === "string" && value.startsWith("?")) {
            newBinding[value] = fact.v;
            results.push(newBinding);
          } else if (fact.v === value) {
            results.push(newBinding);
          }
        }
      }
      return results;
    }
    if (typeof attribute === "string" && !attribute.startsWith("?")) {
      const facts = this.store.getFactsByAttribute(attribute);
      for (const fact of facts) {
        const newBinding = { ...binding };
        if (typeof entity === "string" && !entity.startsWith("?") && fact.e !== entity) {
          continue;
        }
        if ((typeof value !== "string" || !value.startsWith("?")) && fact.v !== value) {
          continue;
        }
        if (typeof entity === "string" && entity.startsWith("?")) {
          newBinding[entity] = fact.e;
        }
        if (typeof value === "string" && value.startsWith("?")) {
          newBinding[value] = fact.v;
        }
        results.push(newBinding);
      }
      return results;
    }
    return [];
  }
  /**
   * Evaluate link predicate
   */
  evaluateLinkPredicate(terms, binding) {
    if (terms.length !== 3) return [];
    const [e1, a, e2] = terms;
    const results = [];
    const links = this.store.getAllLinks();
    for (const link of links) {
      const newBinding = { ...binding };
      if (typeof e1 === "string" && !e1.startsWith("?")) {
        if (link.e1 !== e1) continue;
      } else if (typeof e1 === "string" && e1.startsWith("?")) {
        newBinding[e1] = link.e1;
      }
      if (typeof a === "string" && !a.startsWith("?")) {
        if (link.a !== a) continue;
      } else if (typeof a === "string" && a.startsWith("?")) {
        newBinding[a] = link.a;
      }
      if (typeof e2 === "string" && !e2.startsWith("?")) {
        if (link.e2 !== e2) continue;
      } else if (typeof e2 === "string" && e2.startsWith("?")) {
        newBinding[e2] = link.e2;
      }
      {
        results.push(newBinding);
      }
    }
    return results;
  }
  /**
   * Evaluate comparison predicate
   */
  evaluateComparisonPredicate(goal, binding) {
    const { predicate, terms } = goal;
    if (terms.length < 2) return [];
    const left = this.resolveTerm(terms[0], binding);
    const right = this.resolveTerm(terms[1], binding);
    let leftNum = left;
    let rightNum = right;
    if (typeof left === "string" && !isNaN(Number(left))) {
      leftNum = Number(left);
    }
    if (typeof right === "string" && !isNaN(Number(right))) {
      rightNum = Number(right);
    }
    if (typeof leftNum !== "number" || typeof rightNum !== "number") return [];
    let result = false;
    switch (predicate) {
      case "gt":
      case ">":
        result = ExternalPredicates.gt(leftNum, rightNum);
        break;
      case "lt":
      case "<":
        result = ExternalPredicates.lt(leftNum, rightNum);
        break;
      case ">=":
        result = leftNum >= rightNum;
        break;
      case "<=":
        result = leftNum <= rightNum;
        break;
      case "=":
        result = leftNum === rightNum;
        break;
      case "!=":
        result = leftNum !== rightNum;
        break;
      case "between":
        if (terms.length >= 3) {
          const max = this.resolveTerm(terms[2], binding);
          let maxNum = max;
          if (typeof max === "string" && !isNaN(Number(max))) {
            maxNum = Number(max);
          }
          if (typeof maxNum === "number") {
            result = ExternalPredicates.between(leftNum, rightNum, maxNum);
          }
        }
        break;
    }
    return result ? [{}] : [];
  }
  /**
   * Evaluate string predicate
   */
  evaluateStringPredicate(goal, binding) {
    const { predicate, terms } = goal;
    if (terms.length < 2) return [];
    const str = this.resolveTerm(terms[0], binding);
    const pattern = this.resolveTerm(terms[1], binding);
    if (typeof str !== "string" || typeof pattern !== "string") return [];
    let result = false;
    switch (predicate) {
      case "regex":
        result = ExternalPredicates.regex(str, pattern);
        break;
      case "contains":
        result = ExternalPredicates.contains(str, pattern);
        break;
    }
    return result ? [{}] : [];
  }
  /**
   * Evaluate date predicate
   */
  evaluateDatePredicate(goal, binding) {
    const { predicate, terms } = goal;
    if (terms.length < 2) return [];
    const left = this.resolveTerm(terms[0], binding);
    const right = this.resolveTerm(terms[1], binding);
    if (!(left instanceof Date) || !(right instanceof Date)) return [];
    let result = false;
    switch (predicate) {
      case "after":
        result = ExternalPredicates.after(left, right);
        break;
      case "betweenDate":
        if (terms.length >= 3) {
          const end = this.resolveTerm(terms[2], binding);
          if (end instanceof Date) {
            result = ExternalPredicates.betweenDate(left, right, end);
          }
        }
        break;
    }
    return result ? [{}] : [];
  }
  /**
   * Evaluate external predicate
   */
  evaluateExternalPredicate(goal, binding) {
    const { predicate, terms } = goal;
    const resolvedTerms = terms.map((term) => this.resolveTerm(term, binding));
    let result = false;
    switch (predicate) {
      case "ext_regex":
        if (resolvedTerms.length >= 2 && typeof resolvedTerms[0] === "string") {
          result = ExternalPredicates.regex(
            resolvedTerms[0],
            resolvedTerms[1]
          );
        }
        break;
      case "ext_gt":
        if (resolvedTerms.length >= 2 && typeof resolvedTerms[0] === "number" && typeof resolvedTerms[1] === "number") {
          result = ExternalPredicates.gt(resolvedTerms[0], resolvedTerms[1]);
        }
        break;
      case "ext_between":
        if (resolvedTerms.length >= 3 && typeof resolvedTerms[0] === "number" && typeof resolvedTerms[1] === "number" && typeof resolvedTerms[2] === "number") {
          result = ExternalPredicates.between(
            resolvedTerms[0],
            resolvedTerms[1],
            resolvedTerms[2]
          );
        }
        break;
      case "ext_contains":
        if (resolvedTerms.length >= 2 && typeof resolvedTerms[0] === "string") {
          result = ExternalPredicates.contains(
            resolvedTerms[0],
            resolvedTerms[1]
          );
        }
        break;
    }
    return result ? [{}] : [];
  }
  /**
   * Resolve term to value
   */
  resolveTerm(term, binding) {
    if (typeof term === "string" && term.startsWith("?")) {
      return binding[term] || term;
    }
    return term;
  }
  /**
   * Substitute variables in atom
   */
  substitute(atom, binding) {
    return {
      predicate: atom.predicate,
      terms: atom.terms.map((term) => this.resolveTerm(term, binding))
    };
  }
}

var __defProp$7 = Object.defineProperty;
var __defNormalProp$7 = (obj, key, value) => key in obj ? __defProp$7(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$7 = (obj, key, value) => __defNormalProp$7(obj, key + "" , value);
class AttributeResolver {
  constructor() {
    __publicField$7(this, "schema", {});
  }
  /**
   * Build schema from EAV store catalog
   */
  buildSchema(catalog) {
    this.schema = {};
    for (const entry of catalog) {
      const entityType = "default";
      const attributeName = entry.attribute;
      if (!this.schema[entityType]) {
        this.schema[entityType] = {};
      }
      this.schema[entityType][attributeName] = {
        type: entry.type,
        distinctCount: entry.distinctCount,
        examples: entry.examples
      };
    }
  }
  /**
   * Resolve attribute name with case-insensitive matching
   * Returns the exact attribute name from the schema
   */
  resolveAttribute(entityType, queryAttribute) {
    const entitySchema = this.schema[entityType];
    if (!entitySchema) {
      return null;
    }
    const queryLower = queryAttribute.toLowerCase();
    if (entitySchema[queryAttribute]) {
      return queryAttribute;
    }
    for (const [actualAttribute] of Object.entries(entitySchema)) {
      if (actualAttribute.toLowerCase() === queryLower) {
        return actualAttribute;
      }
    }
    return null;
  }
  /**
   * Validate all attributes in a query against the schema
   */
  validateQuery(entityType, attributes) {
    const errors = [];
    const resolved = /* @__PURE__ */ new Map();
    for (const attr of attributes) {
      const resolvedAttr = this.resolveAttribute(entityType, attr);
      if (resolvedAttr) {
        resolved.set(attr, resolvedAttr);
      } else {
        errors.push(
          `Unknown attribute '${attr}' for entity type '${entityType}'. Available attributes: ${Object.keys(
            this.schema[entityType] || {}
          ).join(", ")}`
        );
      }
    }
    return {
      valid: errors.length === 0,
      errors,
      resolved
    };
  }
  /**
   * Get all available attributes for an entity type
   */
  getAvailableAttributes(entityType) {
    return Object.keys(this.schema[entityType] || {});
  }
  /**
   * Get schema for debugging
   */
  getSchema() {
    return this.schema;
  }
}

var __defProp$6 = Object.defineProperty;
var __defNormalProp$6 = (obj, key, value) => key in obj ? __defProp$6(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$6 = (obj, key, value) => __defNormalProp$6(obj, key + "" , value);
class QueryOptimizer {
  constructor(catalog = []) {
    __publicField$6(this, "catalog", catalog);
  }
  /**
   * Optimizes a Datalog query by reordering its goals.
   */
  optimize(query) {
    if (query.goals.length <= 1) return query;
    const optimizedGoals = [];
    const remainingGoals = [...query.goals];
    const boundVars = /* @__PURE__ */ new Set();
    const typeGoalIdx = remainingGoals.findIndex(
      (g) => g.predicate === "attr" && g.terms[1] === "type"
    );
    if (typeGoalIdx !== -1) {
      const typeGoal = remainingGoals.splice(typeGoalIdx, 1)[0];
      optimizedGoals.push(typeGoal);
      this.collectVars(typeGoal, boundVars);
    }
    while (remainingGoals.length > 0) {
      const bestIdx = this.findBestNextGoal(remainingGoals, boundVars);
      if (bestIdx === -1) {
        const goal = remainingGoals.splice(0, 1)[0];
        optimizedGoals.push(goal);
        this.collectVars(goal, boundVars);
      } else {
        const goal = remainingGoals.splice(bestIdx, 1)[0];
        optimizedGoals.push(goal);
        this.collectVars(goal, boundVars);
      }
      let pushdownPossible = true;
      while (pushdownPossible) {
        const filterIdx = remainingGoals.findIndex(
          (g) => this.isFilter(g) && this.isSatisfied(g, boundVars)
        );
        if (filterIdx !== -1) {
          const filter = remainingGoals.splice(filterIdx, 1)[0];
          optimizedGoals.push(filter);
        } else {
          pushdownPossible = false;
        }
      }
    }
    return {
      ...query,
      goals: optimizedGoals
    };
  }
  findBestNextGoal(goals, boundVars) {
    let bestIdx = -1;
    let bestScore = -1;
    const filterVars = /* @__PURE__ */ new Set();
    for (const goal of goals) {
      if (this.isFilter(goal)) {
        for (const term of goal.terms) {
          if (typeof term === "string" && term.startsWith("?")) {
            filterVars.add(term);
          }
        }
      }
    }
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      if (this.isFilter(goal)) continue;
      let score = this.calculateRestrictiveness(goal, boundVars);
      for (const term of goal.terms) {
        if (typeof term === "string" && term.startsWith("?") && !boundVars.has(term) && filterVars.has(term)) {
          score += 25;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
  /**
   * Calculates a "restrictiveness" score for a goal.
   * Higher is more restrictive (better to run earlier).
   */
  calculateRestrictiveness(goal, boundVars) {
    let score = 0;
    const terms = goal.terms;
    for (const term of terms) {
      if (typeof term !== "string" || !term.startsWith("?")) {
        score += 100;
      } else if (boundVars.has(term)) {
        score += 50;
      }
    }
    if (goal.predicate === "attr" && typeof terms[1] === "string") {
      const entry = this.catalog.find((e) => e.attribute === terms[1]);
      if (entry) {
        if (entry.cardinality === "one") {
          score += 20;
        }
        score -= Math.min(10, entry.distinctCount / 100);
      }
    }
    return score;
  }
  isFilter(goal) {
    const filters = /* @__PURE__ */ new Set([
      "gt",
      "lt",
      "between",
      "regex",
      "contains",
      ">",
      "<",
      ">=",
      "<=",
      "=",
      "!=",
      "after",
      "betweenDate"
    ]);
    return filters.has(goal.predicate) || goal.predicate.startsWith("ext_");
  }
  isSatisfied(goal, boundVars) {
    return goal.terms.every((term) => {
      if (typeof term === "string" && term.startsWith("?")) {
        return boundVars.has(term);
      }
      return true;
    });
  }
  collectVars(goal, boundVars) {
    for (const term of goal.terms) {
      if (typeof term === "string" && term.startsWith("?")) {
        boundVars.add(term);
      }
    }
  }
}

var __defProp$5 = Object.defineProperty;
var __defNormalProp$5 = (obj, key, value) => key in obj ? __defProp$5(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$5 = (obj, key, value) => __defNormalProp$5(obj, typeof key !== "symbol" ? key + "" : key, value);
const _EQLSParser = class _EQLSParser {
  constructor() {
    __publicField$5(this, "tokens", []);
    __publicField$5(this, "current", 0);
    __publicField$5(this, "errors", []);
  }
  parse(query) {
    this.tokens = this.tokenize(query);
    this.current = 0;
    this.errors = [];
    try {
      const parsed = this.parseQuery();
      if (this.errors.length > 0) {
        return { errors: this.errors };
      }
      return { query: parsed, errors: [] };
    } catch (error) {
      this.errors.push({
        line: 1,
        column: 1,
        message: `Parse error: ${error instanceof Error ? error.message : "Unknown error"}`
      });
      return { errors: this.errors };
    }
  }
  tokenize(input) {
    const tokens = [];
    const lines = input.split("\n");
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("--")) continue;
      let pos = 0;
      while (pos < line.length) {
        const char = line[pos];
        if (char === " ") {
          pos++;
          continue;
        }
        if (char === '"') {
          const start = pos;
          pos++;
          while (pos < line.length && line[pos] !== '"') {
            if (line[pos] === "\\" && pos + 1 < line.length) {
              pos += 2;
            } else {
              pos++;
            }
          }
          if (pos < line.length) {
            pos++;
            const value = line.slice(start + 1, pos - 1);
            tokens.push({
              type: "STRING",
              value,
              line: lineNum + 1,
              column: start + 1
            });
          } else {
            this.errors.push({
              line: lineNum + 1,
              column: start + 1,
              message: "Unterminated string literal"
            });
            break;
          }
        } else if (char === "/" && pos + 1 < line.length) {
          const start = pos;
          pos++;
          while (pos < line.length && line[pos] !== "/") {
            if (line[pos] === "\\" && pos + 1 < line.length) {
              pos += 2;
            } else {
              pos++;
            }
          }
          if (pos < line.length) {
            pos++;
            const pattern = line.slice(start, pos);
            tokens.push({
              type: "REGEX",
              value: pattern,
              line: lineNum + 1,
              column: start + 1
            });
          } else {
            this.errors.push({
              line: lineNum + 1,
              column: start + 1,
              message: "Unterminated regex literal"
            });
            break;
          }
        } else if (char.match(/[A-Za-z_@]/)) {
          const start = pos;
          while (pos < line.length && line[pos].match(/[A-Za-z0-9_:@-]/)) {
            pos++;
          }
          const value = line.slice(start, pos);
          const upperValue = value.toUpperCase();
          let type = "IDENTIFIER";
          let tokenValue = value;
          if (_EQLSParser.KEYWORDS.has(upperValue)) {
            type = upperValue;
            tokenValue = upperValue;
          } else if (_EQLSParser.MULTI_CHAR_OPERATORS.has(upperValue)) {
            type = "OPERATOR";
            tokenValue = upperValue;
          }
          tokens.push({
            type,
            value: tokenValue,
            // Use original case for identifiers, uppercase for keywords/operators
            line: lineNum + 1,
            column: start + 1
          });
        } else if (char.match(/[0-9]/)) {
          const start = pos;
          let hasDecimal = false;
          while (pos < line.length) {
            const nextChar = line[pos];
            if (nextChar.match(/[0-9]/)) {
              pos++;
            } else if (nextChar === "." && !hasDecimal && pos + 1 < line.length && line[pos + 1].match(/[0-9]/)) {
              hasDecimal = true;
              pos++;
            } else {
              break;
            }
          }
          const value = line.slice(start, pos);
          const numValue = value.includes(".") ? parseFloat(value) : parseInt(value, 10);
          tokens.push({
            type: "NUMBER",
            value: numValue,
            line: lineNum + 1,
            column: start + 1
          });
        } else if (char === ".") {
          tokens.push({
            type: "DOT",
            value: ".",
            line: lineNum + 1,
            column: pos + 1
          });
          pos++;
        } else if (char === "?") {
          const start = pos;
          pos++;
          while (pos < line.length && line[pos].match(/[A-Za-z0-9_]/)) {
            pos++;
          }
          const value = line.slice(start, pos);
          tokens.push({
            type: "VARIABLE",
            value,
            line: lineNum + 1,
            column: start + 1
          });
        } else if (_EQLSParser.SINGLE_CHAR_OPERATORS.has(char) || char === "!" && pos + 1 < line.length && line[pos + 1] === "=" || char === ">" && pos + 1 < line.length && line[pos + 1] === "=" || char === "<" && pos + 1 < line.length && line[pos + 1] === "=" || char === "=" && pos + 1 < line.length && line[pos + 1] === "=") {
          const start = pos;
          if (char === "!" || char === ">" || char === "<" || char === "=") {
            pos += 2;
          } else {
            pos++;
          }
          const value = line.slice(start, pos);
          tokens.push({
            type: "OPERATOR",
            value,
            line: lineNum + 1,
            column: start + 1
          });
        } else if (char === ",") {
          tokens.push({
            type: "COMMA",
            value: ",",
            line: lineNum + 1,
            column: pos + 1
          });
          pos++;
        } else if (char === "(") {
          tokens.push({
            type: "LPAREN",
            value: "(",
            line: lineNum + 1,
            column: pos + 1
          });
          pos++;
        } else if (char === ")") {
          tokens.push({
            type: "RPAREN",
            value: ")",
            line: lineNum + 1,
            column: pos + 1
          });
          pos++;
        } else {
          this.errors.push({
            line: lineNum + 1,
            column: pos + 1,
            message: `Unexpected character '${char}'`,
            expected: ["identifier", "string", "number", "operator"]
          });
          pos++;
        }
      }
    }
    return tokens;
  }
  parseQuery() {
    this.expect("FIND");
    const find = this.expect("IDENTIFIER").value;
    this.expect("AS");
    const as = this.expect("VARIABLE").value;
    let where;
    if (this.match("WHERE")) {
      where = this.parseExpression();
    }
    let returnFields;
    if (this.match("RETURN")) {
      returnFields = this.parseReturnFields();
    }
    let orderBy;
    if (this.match("ORDER")) {
      this.expect("BY");
      const field = this.parseAttributeReference();
      const direction = this.match("DESC") ? "DESC" : this.match("ASC") ? "ASC" : "ASC";
      orderBy = { field, direction };
    }
    let limit;
    if (this.match("LIMIT")) {
      limit = this.expect("NUMBER").value;
    }
    return { find, as, where, return: returnFields, orderBy, limit };
  }
  parseExpression() {
    let left = this.parseTerm();
    while (this.match("AND") || this.match("OR")) {
      const op = this.previous().value;
      const right = this.parseTerm();
      left = { op, left, right };
    }
    return left;
  }
  parseTerm() {
    var _a;
    if (this.match("LPAREN")) {
      const expr = this.parseExpression();
      this.expect("RPAREN");
      return expr;
    }
    if ((this.check("STRING") || this.check("NUMBER") || this.check("IDENTIFIER")) && ((_a = this.tokens[this.current + 1]) == null ? void 0 : _a.type) === "IN") {
      const value = this.parseValue();
      this.expect("IN");
      const field = this.parseAttributeReference();
      return { type: "MEMBERSHIP", value, field };
    }
    return this.parsePredicate();
  }
  parsePredicate() {
    const field = this.parseAttributeReference();
    if (this.match("BETWEEN")) {
      const min = this.expect("NUMBER").value;
      this.expect("AND");
      const max = this.expect("NUMBER").value;
      return { type: "BETWEEN", field, min, max };
    }
    if (this.match("CONTAINS")) {
      const pattern = this.expect("STRING").value;
      return { type: "CONTAINS", field, pattern };
    }
    if (this.match("MATCHES")) {
      const regex = this.expect("REGEX").value;
      return { type: "MATCHES", field, regex };
    }
    if (this.match("IN")) {
      const value = this.parseValue();
      return { type: "MEMBERSHIP", value, field };
    }
    const op = this.expect("OPERATOR").value.trim();
    const right = this.parseValue();
    if (op === "=" || op === "==") {
      return { type: "EQUALS", field, value: right };
    } else {
      return { type: "COMP", left: field, op, right };
    }
  }
  parseAttributeReference() {
    const variable = this.expect("VARIABLE").value;
    const attributeParts = [];
    while (this.check("DOT")) {
      this.advance();
      const attributePart = this.expect("IDENTIFIER").value;
      attributeParts.push(this.toCamelCase(attributePart));
    }
    if (attributeParts.length > 0) {
      return `${variable}.${attributeParts.join(".")}`;
    }
    return variable;
  }
  toCamelCase(str) {
    return str;
  }
  parseValue() {
    if (this.match("STRING")) return this.previous().value;
    if (this.match("NUMBER")) return this.previous().value;
    if (this.match("IDENTIFIER")) {
      const value = this.previous().value;
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }
    if (this.match("VARIABLE")) return this.previous().value;
    throw new Error(`Expected value, got ${this.peek().type}`);
  }
  parseReturnFields() {
    const fields = [];
    do {
      const field = this.parseAttributeReference();
      fields.push(field);
    } while (this.match("COMMA"));
    return fields;
  }
  extractContainsFields(expr) {
    const fields = [];
    if ("op" in expr && (expr.op === "AND" || expr.op === "OR")) {
      fields.push(...this.extractContainsFields(expr.left));
      fields.push(...this.extractContainsFields(expr.right));
    } else if ("type" in expr && expr.type === "CONTAINS" && "field" in expr) {
      fields.push(expr.field);
    }
    return fields;
  }
  match(type) {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }
  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }
  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }
  isAtEnd() {
    return this.peek().type === "EOF";
  }
  peek() {
    return this.tokens[this.current] || {
      type: "EOF",
      value: "",
      line: 0,
      column: 0
    };
  }
  previous() {
    return this.tokens[this.current - 1] || {
      type: "EOF",
      value: "",
      line: 0,
      column: 0
    };
  }
  expect(type) {
    if (this.check(type)) {
      return this.advance();
    }
    const token = this.peek();
    this.errors.push({
      line: token.line,
      column: token.column,
      message: `Expected ${type}, got ${token.type}`,
      expected: [type]
    });
    throw new Error(`Expected ${type}, got ${token.type}`);
  }
};
__publicField$5(_EQLSParser, "KEYWORDS", /* @__PURE__ */ new Set([
  "FIND",
  "AS",
  "WHERE",
  "AND",
  "OR",
  "RETURN",
  "ORDER",
  "BY",
  "LIMIT",
  "ASC",
  "DESC",
  "BETWEEN",
  "CONTAINS",
  "MATCHES",
  "IN"
]));
__publicField$5(_EQLSParser, "SINGLE_CHAR_OPERATORS", /* @__PURE__ */ new Set(["=", ">", "<"]));
__publicField$5(_EQLSParser, "MULTI_CHAR_OPERATORS", /* @__PURE__ */ new Set([
  "CONTAINS",
  "MATCHES",
  "BETWEEN",
  "IN"
]));
let EQLSParser = _EQLSParser;
class EQLSCompiler {
  constructor() {
    __publicField$5(this, "projectionMap", /* @__PURE__ */ new Map());
    // column -> output variable
    __publicField$5(this, "tempCounter", 0);
  }
  compileAll(eqlsQuery) {
    const baseGoals = [];
    const baseVariables = /* @__PURE__ */ new Set();
    this.projectionMap.clear();
    this.tempCounter = 0;
    baseGoals.push({
      predicate: "attr",
      terms: [eqlsQuery.as, "type", eqlsQuery.find]
    });
    baseVariables.add(eqlsQuery.as.substring(1));
    const returnGoals = [];
    const returnVars = /* @__PURE__ */ new Set();
    if (eqlsQuery.return) {
      for (const field of eqlsQuery.return) {
        if (this.isAttributeReference(field)) {
          const [entityVar, attributePath] = this.splitAttributeReference(field);
          const outputVar = this.generateTempVar();
          returnVars.add(outputVar);
          returnGoals.push({
            predicate: "attr",
            terms: [entityVar, attributePath, `?${outputVar}`]
          });
          this.projectionMap.set(field, `?${outputVar}`);
        } else {
          returnVars.add(field.substring(1));
          this.projectionMap.set(field, field);
        }
      }
    }
    const clauses = eqlsQuery.where ? this.toDNF(eqlsQuery.where) : [[]];
    const compiledQueries = [];
    for (const clause of clauses) {
      const goals = [...baseGoals];
      const variables = new Set(baseVariables);
      for (const pred of clause) {
        this.compilePredicate(pred, goals, variables);
      }
      for (const g of returnGoals) goals.push(g);
      for (const v of returnVars) variables.add(v);
      compiledQueries.push({ goals, variables });
    }
    return compiledQueries;
  }
  compile(eqlsQuery) {
    const all = this.compileAll(eqlsQuery);
    return all[0] || { goals: [], variables: /* @__PURE__ */ new Set() };
  }
  getProjectionMap() {
    return this.projectionMap;
  }
  isAttributeReference(field) {
    return field.includes(".") && field.startsWith("?");
  }
  splitAttributeReference(field) {
    const parts = field.split(".");
    if (parts.length < 2) {
      throw new Error(`Invalid attribute reference: ${field}`);
    }
    const entityVar = parts[0];
    const attributePath = parts.slice(1).join(".");
    return [entityVar, attributePath];
  }
  compileExpression(expr, goals, variables) {
    if (!expr || typeof expr !== "object") {
      throw new Error(`Invalid expression: ${expr}`);
    }
    if ("op" in expr && (expr.op === "AND" || expr.op === "OR")) {
      this.compileExpression(expr.left, goals, variables);
      this.compileExpression(expr.right, goals, variables);
    } else {
      this.compilePredicate(expr, goals, variables);
    }
  }
  compilePredicate(pred, goals, variables) {
    switch (pred.type) {
      case "EQUALS":
        goals.push({
          predicate: "attr",
          terms: [
            this.extractEntityVar(pred.field),
            this.extractAttributePath(pred.field),
            pred.value
          ]
        });
        break;
      case "MEMBERSHIP":
        goals.push({
          predicate: "attr",
          terms: [
            this.extractEntityVar(pred.field),
            this.extractAttributePath(pred.field),
            pred.value
          ]
        });
        break;
      case "COMP":
        const tempVar = this.generateTempVar();
        variables.add(tempVar);
        goals.push({
          predicate: "attr",
          terms: [
            this.extractEntityVar(pred.left),
            this.extractAttributePath(pred.left),
            `?${tempVar}`
          ]
        });
        goals.push({
          predicate: pred.op.toLowerCase(),
          terms: [`?${tempVar}`, pred.right]
        });
        break;
      case "BETWEEN":
        const tempVar2 = this.generateTempVar();
        variables.add(tempVar2);
        goals.push({
          predicate: "attr",
          terms: [
            this.extractEntityVar(pred.field),
            this.extractAttributePath(pred.field),
            `?${tempVar2}`
          ]
        });
        goals.push({
          predicate: "between",
          terms: [`?${tempVar2}`, pred.min, pred.max]
        });
        break;
      case "CONTAINS":
        const tempVar3 = this.generateTempVar();
        variables.add(tempVar3);
        goals.push({
          predicate: "attr",
          terms: [
            this.extractEntityVar(pred.field),
            this.extractAttributePath(pred.field),
            `?${tempVar3}`
          ]
        });
        goals.push({
          predicate: "contains",
          terms: [`?${tempVar3}`, pred.pattern]
        });
        break;
      case "MATCHES":
        const tempVar4 = this.generateTempVar();
        variables.add(tempVar4);
        const attributePath = this.extractAttributePath(pred.field);
        const entityVar = this.extractEntityVar(pred.field);
        goals.push({
          predicate: "attr",
          terms: [entityVar, attributePath, `?${tempVar4}`]
        });
        goals.push({
          predicate: "regex",
          terms: [`?${tempVar4}`, pred.regex]
        });
        break;
    }
  }
  extractEntityVar(field) {
    const parts = field.split(".");
    return parts[0];
  }
  extractAttributePath(field) {
    const parts = field.split(".");
    if (parts.length > 1) {
      return parts.slice(1).join(".");
    }
    return field.substring(1);
  }
  generateTempVar() {
    this.tempCounter += 1;
    return `temp${this.tempCounter}`;
  }
  toDNF(expr) {
    if ("op" in expr && (expr.op === "AND" || expr.op === "OR")) {
      const left = this.toDNF(expr.left);
      const right = this.toDNF(expr.right);
      if (expr.op === "OR") {
        return [...left, ...right];
      }
      const combined = [];
      for (const l of left) {
        for (const r of right) {
          combined.push([...l, ...r]);
        }
      }
      return combined;
    }
    return [[expr]];
  }
}
class EQLSProcessor {
  constructor() {
    __publicField$5(this, "parser", new EQLSParser());
    __publicField$5(this, "compiler", new EQLSCompiler());
    __publicField$5(this, "attributeResolver", new AttributeResolver());
    __publicField$5(this, "catalog", []);
  }
  /**
   * Set the attribute schema for validation
   */
  setSchema(catalog) {
    this.catalog = catalog;
    this.attributeResolver.buildSchema(catalog);
  }
  process(query) {
    const parseResult = this.parser.parse(query);
    if (parseResult.errors.length > 0) {
      return { errors: parseResult.errors };
    }
    this.ensureFieldsInProjection(parseResult.query);
    if (Object.keys(this.attributeResolver.getSchema()).length > 0) {
      const entityType = "default";
      const attributes = this.extractAttributes(parseResult.query);
      const validation = this.attributeResolver.validateQuery(
        entityType,
        attributes
      );
      if (!validation.valid) {
        return {
          errors: validation.errors.map((msg) => ({
            message: msg,
            line: 1,
            column: 1
          }))
        };
      }
      this.resolveAttributesInQuery(parseResult.query, validation.resolved);
    }
    const compiledQueries = this.compiler.compileAll(parseResult.query);
    const optimizer = new QueryOptimizer(this.catalog);
    const optimizedQueries = compiledQueries.map((q) => optimizer.optimize(q));
    const projectionMap = this.compiler.getProjectionMap();
    return {
      query: optimizedQueries[0],
      queries: optimizedQueries,
      errors: [],
      projectionMap,
      meta: {
        orderBy: parseResult.query.orderBy,
        limit: parseResult.query.limit
      }
    };
  }
  /**
   * Ensure that any fields used in WHERE clauses with MATCHES are also
   * included in the RETURN clause for projection
   */
  ensureFieldsInProjection(eqlsQuery) {
    var _a;
    if (!eqlsQuery.return) {
      eqlsQuery.return = [];
    }
    if (eqlsQuery.where) {
      const matchesFields = this.extractMatchesFields(eqlsQuery.where);
      for (const field of matchesFields) {
        if (!eqlsQuery.return.includes(field)) {
          eqlsQuery.return.push(field);
        }
      }
      const containsFields = this.extractContainsFields(eqlsQuery.where);
      for (const field of containsFields) {
        if (!eqlsQuery.return.includes(field)) {
          eqlsQuery.return.push(field);
        }
      }
    }
    if ((_a = eqlsQuery.orderBy) == null ? void 0 : _a.field) {
      const field = eqlsQuery.orderBy.field;
      if (!eqlsQuery.return.includes(field)) {
        eqlsQuery.return.push(field);
      }
    }
  }
  /**
   * Extract all fields used in MATCHES predicates
   */
  extractMatchesFields(expr) {
    const fields = [];
    if ("op" in expr && (expr.op === "AND" || expr.op === "OR")) {
      fields.push(...this.extractMatchesFields(expr.left));
      fields.push(...this.extractMatchesFields(expr.right));
    } else if ("type" in expr && expr.type === "MATCHES" && "field" in expr) {
      fields.push(expr.field);
    }
    return fields;
  }
  extractContainsFields(expr) {
    const fields = [];
    if ("op" in expr && (expr.op === "AND" || expr.op === "OR")) {
      fields.push(...this.extractContainsFields(expr.left));
      fields.push(...this.extractContainsFields(expr.right));
    } else if ("type" in expr && expr.type === "CONTAINS" && "field" in expr) {
      fields.push(expr.field);
    }
    return fields;
  }
  extractAttributes(eqlsQuery) {
    const attributes = /* @__PURE__ */ new Set();
    if (eqlsQuery.where) {
      this.extractAttributesFromExpression(eqlsQuery.where, attributes);
    }
    if (eqlsQuery.return) {
      for (const field of eqlsQuery.return) {
        if (this.isAttributeReference(field)) {
          const [, attribute] = this.splitAttributeReference(field);
          attributes.add(attribute);
        }
      }
    }
    return Array.from(attributes);
  }
  extractAttributesFromExpression(expr, attributes) {
    if ("op" in expr && (expr.op === "AND" || expr.op === "OR")) {
      this.extractAttributesFromExpression(expr.left, attributes);
      this.extractAttributesFromExpression(expr.right, attributes);
    } else if ("field" in expr) {
      if (this.isAttributeReference(expr.field)) {
        const [, attribute] = this.splitAttributeReference(expr.field);
        attributes.add(attribute);
      }
    } else if ("left" in expr && "right" in expr) {
      if (typeof expr.left === "string" && this.isAttributeReference(expr.left)) {
        const [, attribute] = this.splitAttributeReference(expr.left);
        attributes.add(attribute);
      }
    }
  }
  resolveAttributesInQuery(eqlsQuery, resolved) {
    if (eqlsQuery.where) {
      this.resolveAttributesInExpression(eqlsQuery.where, resolved);
    }
    if (eqlsQuery.return) {
      for (let i = 0; i < eqlsQuery.return.length; i++) {
        const field = eqlsQuery.return[i];
        if (this.isAttributeReference(field)) {
          const [entityVar, attribute] = this.splitAttributeReference(field);
          const resolvedAttr = resolved.get(attribute);
          if (resolvedAttr) {
            eqlsQuery.return[i] = `${entityVar}.${resolvedAttr}`;
          }
        }
      }
    }
  }
  resolveAttributesInExpression(expr, resolved) {
    if ("op" in expr && (expr.op === "AND" || expr.op === "OR")) {
      this.resolveAttributesInExpression(expr.left, resolved);
      this.resolveAttributesInExpression(expr.right, resolved);
    } else if ("field" in expr) {
      if (this.isAttributeReference(expr.field)) {
        const [entityVar, attribute] = this.splitAttributeReference(expr.field);
        const resolvedAttr = resolved.get(attribute);
        if (resolvedAttr) {
          expr.field = `${entityVar}.${resolvedAttr}`;
        }
      }
    } else if ("left" in expr && "right" in expr) {
      if (typeof expr.left === "string" && this.isAttributeReference(expr.left)) {
        const [entityVar, attribute] = this.splitAttributeReference(expr.left);
        const resolvedAttr = resolved.get(attribute);
        if (resolvedAttr) {
          expr.left = `${entityVar}.${resolvedAttr}`;
        }
      }
    }
  }
  isAttributeReference(field) {
    return field.includes(".");
  }
  splitAttributeReference(field) {
    const parts = field.split(".");
    return [parts[0], parts.slice(1).join(".")];
  }
}

const mathFunctions = {
  $round: (value, decimals = 0) => {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  },
  $abs: (value) => Math.abs(value),
  $min: (...values) => Math.min(...values),
  $max: (...values) => Math.max(...values),
  $sum: (values) => {
    if (!Array.isArray(values)) return 0;
    return values.reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
  },
  $avg: (values) => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const sum = values.reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
    return sum / values.length;
  },
  $floor: (value) => Math.floor(value),
  $ceil: (value) => Math.ceil(value),
  $pow: (base, exponent) => Math.pow(base, exponent),
  $sqrt: (value) => Math.sqrt(value)
};
const stringFunctions = {
  $upper: (str) => String(str).toUpperCase(),
  $lower: (str) => String(str).toLowerCase(),
  $concat: (...parts) => {
    return parts.map((p) => String(p != null ? p : "")).join("");
  },
  $length: (value) => {
    if (typeof value === "string") return value.length;
    if (Array.isArray(value)) return value.length;
    return 0;
  },
  $trim: (str) => String(str).trim(),
  $split: (str, delimiter) => {
    return String(str).split(delimiter);
  },
  $join: (array, delimiter = "") => {
    if (!Array.isArray(array)) return "";
    return array.map((item) => String(item != null ? item : "")).join(delimiter);
  }
};
const logicFunctions = {
  $if: (condition, thenValue, elseValue) => {
    return condition ? thenValue : elseValue;
  },
  $switch: (value, cases, defaultValue) => {
    const key = String(value);
    return cases.hasOwnProperty(key) ? cases[key] : defaultValue;
  },
  $coalesce: (...values) => {
    for (const v of values) {
      if (v !== null && v !== void 0) return v;
    }
    return null;
  }
};
const dateFunctions = {
  $now: () => /* @__PURE__ */ new Date(),
  $dateDiff: (date1, date2, unit = "ms") => {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    const diff = d1.getTime() - d2.getTime();
    switch (unit) {
      case "ms":
        return diff;
      case "s":
        return diff / 1e3;
      case "m":
        return diff / (1e3 * 60);
      case "h":
        return diff / (1e3 * 60 * 60);
      case "d":
        return diff / (1e3 * 60 * 60 * 24);
      default:
        return diff;
    }
  },
  $formatDate: (date, format = "ISO") => {
    var _a, _b, _c;
    const d = date instanceof Date ? date : new Date(date);
    if (format === "ISO") return d.toISOString();
    if (format === "date") return (_a = d.toISOString().split("T")[0]) != null ? _a : "";
    if (format === "time")
      return (_c = (_b = d.toISOString().split("T")[1]) == null ? void 0 : _b.split(".")[0]) != null ? _c : "";
    if (format === "locale") return d.toLocaleDateString();
    return d.toISOString();
  }
};
const utilityFunctions = {
  $currency: (value, currency = "USD", decimals = 2) => {
    const formatted = value.toFixed(decimals);
    return `${currency} ${formatted}`;
  },
  $percent: (value, decimals = 1) => {
    return `${(value * 100).toFixed(decimals)}%`;
  },
  $convert: (value, targetUnit) => {
    if (typeof value === "number") {
      return value;
    }
    return value;
  },
  $type: (value) => {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  },
  $keys: (obj) => {
    return Object.keys(obj != null ? obj : {});
  },
  $values: (obj) => {
    return Object.values(obj != null ? obj : {});
  }
};
const arrayFunctions = {
  $first: (array) => {
    return Array.isArray(array) && array.length > 0 ? array[0] : null;
  },
  $last: (array) => {
    return Array.isArray(array) && array.length > 0 ? array[array.length - 1] : null;
  },
  $slice: (array, start, end) => {
    if (!Array.isArray(array)) return [];
    return array.slice(start, end);
  },
  $reverse: (array) => {
    if (!Array.isArray(array)) return [];
    return [...array].reverse();
  },
  $sort: (array, key) => {
    if (!Array.isArray(array)) return [];
    const sorted = [...array];
    if (key) {
      sorted.sort((a, b) => {
        const aVal = a == null ? void 0 : a[key];
        const bVal = b == null ? void 0 : b[key];
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    } else {
      sorted.sort();
    }
    return sorted;
  }
};
const builtinFunctions = {
  ...mathFunctions,
  ...stringFunctions,
  ...logicFunctions,
  ...dateFunctions,
  ...utilityFunctions,
  ...arrayFunctions
};
function isBuiltinFunction(name) {
  return name in builtinFunctions;
}

var __defProp$4 = Object.defineProperty;
var __defNormalProp$4 = (obj, key, value) => key in obj ? __defProp$4(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$4 = (obj, key, value) => __defNormalProp$4(obj, key + "" , value);
class ExprEvaluator {
  constructor(options = {}) {
    __publicField$4(this, "defaultOptions");
    this.defaultOptions = {
      timeout: 1e3,
      // 1 second default timeout
      allowUnsafe: false,
      builtins: true,
      ...options
    };
  }
  /**
   * Evaluate an expression string with given context
   */
  evaluate(expr, context = {}, options = {}) {
    var _a;
    const startTime = performance.now();
    const opts = { ...this.defaultOptions, ...options };
    try {
      if (!expr || typeof expr !== "string") {
        throw new Error("Expression must be a non-empty string");
      }
      const scope = this.prepareScope(context, opts);
      const value = this.evaluateWithTimeout(expr, scope, (_a = opts.timeout) != null ? _a : 1e3);
      const executionTime = performance.now() - startTime;
      return {
        value,
        executionTime
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return {
        value: void 0,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }
  /**
   * Evaluate multiple expressions in order (for dependencies)
   */
  evaluateBatch(expressions, context = {}, options = {}) {
    const results = {};
    const mergedContext = { ...context };
    for (const [key, expr] of Object.entries(expressions)) {
      const result = this.evaluate(expr, mergedContext, options);
      if (result.error) {
        results[key] = result;
      } else {
        results[key] = result;
        mergedContext[key] = result.value;
      }
    }
    return results;
  }
  /**
   * Prepare evaluation scope with context and built-in functions
   */
  prepareScope(context, options) {
    const scope = {};
    Object.assign(scope, context);
    if (options.builtins !== false) {
      Object.assign(scope, builtinFunctions);
    }
    return scope;
  }
  /**
   * Evaluate expression with timeout protection
   */
  evaluateWithTimeout(expr, scope, timeout) {
    const paramNames = [];
    const paramValues = [];
    for (const [key, value] of Object.entries(scope)) {
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
        paramNames.push(key);
        paramValues.push(value);
      }
    }
    try {
      const fn = new Function(...paramNames, `return (${expr})`);
      return fn(...paramValues);
    } catch (error) {
      throw new Error(
        `Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * Extract variable references from an expression
   * Useful for dependency tracking
   */
  extractReferences(expr) {
    const references = /* @__PURE__ */ new Set();
    const varPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    let match;
    while ((match = varPattern.exec(expr)) !== null) {
      const name = match[1];
      if (!name) continue;
      if (!isBuiltinFunction(name) && !this.isJavaScriptKeyword(name)) {
        references.add(name);
      }
    }
    return Array.from(references);
  }
  /**
   * Check if a name is a JavaScript keyword
   */
  isJavaScriptKeyword(name) {
    const keywords = /* @__PURE__ */ new Set([
      "break",
      "case",
      "catch",
      "class",
      "const",
      "continue",
      "debugger",
      "default",
      "delete",
      "do",
      "else",
      "enum",
      "export",
      "extends",
      "false",
      "finally",
      "for",
      "function",
      "if",
      "import",
      "in",
      "instanceof",
      "new",
      "null",
      "return",
      "super",
      "switch",
      "this",
      "throw",
      "true",
      "try",
      "typeof",
      "var",
      "void",
      "while",
      "with",
      "yield",
      "async",
      "await",
      "let",
      "static",
      "get",
      "set",
      "Math",
      "Date",
      "Array",
      "Object",
      "String",
      "Number",
      "Boolean",
      "JSON",
      "RegExp",
      "Error",
      "Promise",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
      "Symbol",
      "Proxy",
      "Reflect",
      "Int8Array",
      "Uint8Array",
      "Uint8ClampedArray",
      "Int16Array",
      "Uint16Array",
      "Int32Array",
      "Uint32Array",
      "Float32Array",
      "Float64Array",
      "BigInt64Array",
      "BigUint64Array",
      "DataView",
      "ArrayBuffer",
      "SharedArrayBuffer",
      "Atomics",
      "FinalizationRegistry",
      "WeakRef",
      "globalThis"
    ]);
    return keywords.has(name);
  }
  /**
   * Validate an expression syntax without evaluating
   */
  validate(expr) {
    try {
      if (!expr || typeof expr !== "string") {
        return { valid: false, error: "Expression must be a non-empty string" };
      }
      new Function(`return (${expr})`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
function extractExprFields(document) {
  const exprFields = {};
  function traverse(obj, path = "") {
    if (!obj || typeof obj !== "object") return;
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (value && typeof value === "object" && "@expr" in value) {
        const exprValue = value["@expr"];
        if (typeof exprValue === "string") {
          exprFields[currentPath] = exprValue;
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          traverse(item, `${currentPath}[${index}]`);
        });
      } else if (typeof value === "object" && value !== null) {
        traverse(value, currentPath);
      }
    }
  }
  traverse(document);
  return exprFields;
}
function evaluateDocument(document, context = {}, options) {
  const evaluator = new ExprEvaluator(options);
  const exprFields = extractExprFields(document);
  const documentContext = { ...context };
  function buildContext(obj, path = "") {
    if (!obj || typeof obj !== "object") return;
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (value && typeof value === "object" && "@expr" in value) {
        continue;
      }
      if (key.startsWith("@")) {
        continue;
      }
      if (!(currentPath in documentContext)) {
        documentContext[currentPath] = value;
      }
      if (!path && !(key in documentContext)) {
        documentContext[key] = value;
      }
      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          if (!(currentPath in documentContext)) {
            documentContext[currentPath] = value;
          }
          if (!path && !(key in documentContext)) {
            documentContext[key] = value;
          }
          value.forEach((item, index) => {
            const itemPath = `${currentPath}[${index}]`;
            if (!(itemPath in documentContext)) {
              documentContext[itemPath] = item;
            }
            if (typeof item === "object" && item !== null) {
              buildContext(item, itemPath);
            }
          });
        } else {
          buildContext(value, currentPath);
        }
      }
    }
  }
  buildContext(document);
  const results = evaluator.evaluateBatch(exprFields, documentContext, options);
  const evaluated = JSON.parse(JSON.stringify(document));
  function replaceExprFields(obj, path = "") {
    if (!obj || typeof obj !== "object") return;
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (value && typeof value === "object" && "@expr" in value) {
        const result = results[currentPath];
        if (result && !result.error) {
          obj[key] = result.value;
        } else {
          obj[key] = value;
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          replaceExprFields(item, `${currentPath}[${index}]`);
        });
      } else if (typeof value === "object" && value !== null) {
        replaceExprFields(value, currentPath);
      }
    }
  }
  replaceExprFields(evaluated);
  return evaluated;
}

function jsonEntityFactsWithExpr(entityId, root, type, options) {
  if (options == null ? void 0 : options.skipEvaluation) {
    return jsonEntityFacts(entityId, root, type);
  }
  const exprFields = extractExprFields(root);
  if (Object.keys(exprFields).length === 0) {
    return jsonEntityFacts(entityId, root, type);
  }
  const evaluated = evaluateDocument(root, options == null ? void 0 : options.evaluationContext);
  return jsonEntityFacts(entityId, evaluated, type);
}

var __defProp$3 = Object.defineProperty;
var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$3 = (obj, key, value) => __defNormalProp$3(obj, typeof key !== "symbol" ? key + "" : key, value);
function singularize(word) {
  const lowerWord = word.toLowerCase();
  const irregularPlurals = {
    people: "person",
    men: "man",
    women: "woman",
    children: "child",
    teeth: "tooth",
    feet: "foot",
    mice: "mouse",
    geese: "goose",
    oxen: "ox",
    dice: "die",
    lice: "louse",
    stimuli: "stimulus",
    cacti: "cactus",
    foci: "focus",
    radii: "radius",
    alumni: "alumnus",
    fungi: "fungus",
    nuclei: "nucleus",
    analyses: "analysis",
    diagnoses: "diagnosis",
    oases: "oasis",
    theses: "thesis",
    crises: "crisis",
    phenomena: "phenomenon",
    criteria: "criterion",
    data: "datum",
    bacteria: "bacterium",
    curricula: "curriculum"
  };
  if (irregularPlurals[lowerWord]) {
    return irregularPlurals[lowerWord];
  }
  const unchangeables = /* @__PURE__ */ new Set([
    "sheep",
    "fish",
    "deer",
    "series",
    "species",
    "money",
    "aircraft",
    "bison",
    "cod",
    "moose",
    "salmon",
    "swine",
    "trout",
    "offspring",
    "means",
    "species",
    "series"
  ]);
  if (unchangeables.has(lowerWord)) {
    return word;
  }
  if (lowerWord.endsWith("ies")) {
    return word.slice(0, -3) + "y";
  }
  if (lowerWord.endsWith("ves")) {
    return word.slice(0, -3) + "f";
  }
  if (lowerWord.endsWith("ses") || lowerWord.endsWith("xes")) {
    return word.slice(0, -2);
  }
  const commonPlurals = [
    "users",
    "products",
    "tasks",
    "items",
    "orders",
    "posts",
    "events",
    "projects",
    "transactions"
  ];
  if (commonPlurals.includes(lowerWord)) {
    return word.slice(0, -1);
  }
  if (word.endsWith("ies") && word.length > 4) {
    return word.slice(0, -3) + "y";
  }
  if (word.endsWith("s") && word.length > 3) {
    const singular = word.slice(0, -1);
    if (!singular.endsWith("ie") && !singular.endsWith("e")) {
      return singular;
    }
  }
  return word;
}
function detectIdKey(obj) {
  if (!obj || typeof obj !== "object") return void 0;
  const idKeys = ["id", "_id", "uuid", "key", "slug"];
  for (const key of idKeys) {
    if (key in obj) return key;
  }
  return void 0;
}
const stableCompare = (a, b) => {
  if (a === b) return 0;
  if (a === void 0 || a === null) return 1;
  if (b === void 0 || b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b));
};
class TrellisKernel {
  constructor(storeOrOpts) {
    __publicField$3(this, "store");
    __publicField$3(this, "evaluator");
    __publicField$3(this, "eqls");
    __publicField$3(this, "backend");
    __publicField$3(this, "middleware", []);
    __publicField$3(this, "sync");
    __publicField$3(this, "opened", false);
    // Declarative workspace state
    __publicField$3(this, "ontologies", /* @__PURE__ */ new Map());
    __publicField$3(this, "projections", /* @__PURE__ */ new Map());
    // Computation options
    __publicField$3(this, "enableExprEvaluation");
    var _a, _b, _c, _d;
    const opts = storeOrOpts instanceof EAVStore ? { store: storeOrOpts } : storeOrOpts != null ? storeOrOpts : {};
    this.store = (_a = opts.store) != null ? _a : new EAVStore();
    this.evaluator = new DatalogEvaluator(this.store);
    this.eqls = new EQLSProcessor();
    this.backend = opts.backend;
    this.middleware = (_b = opts.middleware) != null ? _b : [];
    this.sync = opts.sync;
    this.enableExprEvaluation = (_c = opts.enableExprEvaluation) != null ? _c : true;
    if (this.sync) {
      this.sync.onRemoteOp(async (op) => {
        await this.applyRemoteOperation(op);
      });
    }
    for (const schema of CORE_ONTOLOGY) {
      this.ontologies.set(schema["@id"], schema);
    }
    const autoReplay = (_d = opts.autoReplay) != null ? _d : true;
    if (this.backend && autoReplay) {
      this.open();
    }
  }
  open() {
    if (!this.backend || this.opened) return;
    this.backend.init();
    const snapshot = this.backend.loadLatestSnapshot();
    let ops = [];
    if (snapshot) {
      this.store.restore(snapshot.data);
      ops = this.backend.readAfter(snapshot.lastOpHash);
    } else {
      ops = this.backend.readAll();
    }
    for (const op of ops) {
      this.applyOp(op, { system: true });
    }
    this.opened = true;
  }
  /**
   * Persists a snapshot of the current kernel state to the backend.
   * This speeds up future boot times by reducing the number of operations to replay.
   */
  async checkpoint() {
    if (!this.backend) return;
    const lastOp = this.backend.getLastOp();
    if (!lastOp) return;
    const snapshotData = this.store.snapshot();
    this.backend.saveSnapshot(lastOp.hash, snapshotData);
  }
  close() {
    var _a, _b;
    (_b = (_a = this.backend) == null ? void 0 : _a.close) == null ? void 0 : _b.call(_a);
  }
  getStore() {
    return this.store;
  }
  /**
   * Boots the kernel with data or a full workspace configuration.
   */
  async boot(data, opts) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    if (this.backend) {
      this.open();
    }
    const wsParse = WorkspaceConfigSchema.safeParse(data);
    if (wsParse.success) {
      const config = wsParse.data;
      await this.bootWorkspace(config);
      return;
    }
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const obj = data;
      if (Array.isArray(obj["@graph"])) {
        const graph = obj["@graph"];
        const results = [];
        for (let i = 0; i < graph.length; i++) {
          const node = graph[i];
          if (!node || typeof node !== "object" || Array.isArray(node))
            continue;
          const entityId = (_a = node["@id"]) != null ? _a : `node:${i}`;
          const rawType = node["@type"];
          const entityType = typeof rawType === "string" ? rawType : Array.isArray(rawType) && typeof rawType[0] === "string" ? rawType[0] : (_b = opts == null ? void 0 : opts.entityType) != null ? _b : "default";
          const nodeData = { ...node };
          delete nodeData["@id"];
          delete nodeData["@type"];
          for (const key of Object.keys(nodeData)) {
            if (key.startsWith("@")) {
              delete nodeData[key];
            }
          }
          const facts2 = this.enableExprEvaluation ? jsonEntityFactsWithExpr(entityId, nodeData, entityType) : jsonEntityFacts(entityId, nodeData, entityType);
          results.push(this.appendFacts(facts2));
        }
        await Promise.all(results);
        this.eqls.setSchema(this.store.getCatalog());
        return;
      }
    }
    if (Array.isArray(data)) {
      const entityType = (_c = opts == null ? void 0 : opts.entityType) != null ? _c : "item";
      const idKey = (_d = opts == null ? void 0 : opts.idKey) != null ? _d : "id";
      const results = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const idVal = item && typeof item === "object" ? item[idKey] : void 0;
        const entityId = `${entityType}:${idVal != null ? idVal : i}`;
        const facts2 = this.enableExprEvaluation ? jsonEntityFactsWithExpr(entityId, item, entityType) : jsonEntityFacts(entityId, item, entityType);
        results.push(this.appendFacts(facts2));
      }
      await Promise.all(results);
      this.eqls.setSchema(this.store.getCatalog());
      return;
    }
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const arrayKeys = Object.keys(data).filter(
        (key) => !key.startsWith("@") && Array.isArray(data[key])
      );
      const nonArrayKeys = Object.keys(data).filter(
        (key) => !key.startsWith("@") && !Array.isArray(data[key]) && typeof data[key] === "object" && !("@expr" in data[key])
        // Exclude computed fields
      );
      if (arrayKeys.length > 0 || nonArrayKeys.length > 0) {
        for (const arrayKey of arrayKeys) {
          const arrayData = data[arrayKey];
          if (arrayData.length === 0) continue;
          const entityType = (_e = opts == null ? void 0 : opts.entityType) != null ? _e : singularize(arrayKey);
          const firstItem = arrayData[0];
          let idKey = opts == null ? void 0 : opts.idKey;
          if (!idKey && firstItem && typeof firstItem === "object") {
            idKey = detectIdKey(firstItem);
          }
          await this.boot(arrayData, { entityType, idKey });
        }
        for (const objectKey of nonArrayKeys) {
          const objectData = data[objectKey];
          if (!objectData || typeof objectData !== "object") continue;
          const entityType = (_f = opts == null ? void 0 : opts.entityType) != null ? _f : objectKey;
          let idKey = opts == null ? void 0 : opts.idKey;
          if (!idKey) {
            idKey = detectIdKey(objectData);
          }
          await this.boot(objectData, { entityType, idKey });
        }
        const hasRootComputedFields = Object.keys(data).some(
          (key) => !key.startsWith("@") && typeof data[key] === "object" && !Array.isArray(data[key]) && "@expr" in data[key]
        );
        if (hasRootComputedFields) {
          const rootEntityId2 = (_g = opts == null ? void 0 : opts.rootEntityId) != null ? _g : "root";
          const rootEntityType2 = (_h = opts == null ? void 0 : opts.rootEntityType) != null ? _h : "root";
          const evaluationContext = {};
          for (const arrayKey of arrayKeys) {
            evaluationContext[arrayKey] = data[arrayKey];
          }
          const facts2 = this.enableExprEvaluation ? jsonEntityFactsWithExpr(rootEntityId2, data, rootEntityType2, {
            evaluationContext
          }) : jsonEntityFacts(rootEntityId2, data, rootEntityType2);
          await this.appendFacts(facts2);
        }
        this.eqls.setSchema(this.store.getCatalog());
        return;
      }
    }
    const rootEntityId = (_i = opts == null ? void 0 : opts.rootEntityId) != null ? _i : "root";
    const rootEntityType = (_k = (_j = opts == null ? void 0 : opts.entityType) != null ? _j : opts == null ? void 0 : opts.rootEntityType) != null ? _k : "root";
    const facts = this.enableExprEvaluation ? jsonEntityFactsWithExpr(rootEntityId, data, rootEntityType) : jsonEntityFacts(rootEntityId, data, rootEntityType);
    await this.appendFacts(facts);
    this.eqls.setSchema(this.store.getCatalog());
  }
  /**
   * Processes a full WorkspaceConfig (.trellis format)
   */
  async bootWorkspace(config) {
    var _a, _b;
    const ws = config.workspace;
    if (ws.ontologies) {
      for (const [id, schema] of Object.entries(ws.ontologies)) {
        this.ontologies.set(id, schema);
      }
    }
    if (ws.projections) {
      for (const [id, projection] of Object.entries(ws.projections)) {
        this.projections.set(id, projection);
      }
    }
    if (ws.graph) {
      const mutationPromises = [];
      if (ws.graph.nodes) {
        for (const node of ws.graph.nodes) {
          const entityId = node["@id"] || `node:${randomUUID()}`;
          const type = node["@type"] || "default";
          mutationPromises.push(this.createNode(entityId, node, type));
        }
      }
      if (ws.graph.edges) {
        for (const edge of ws.graph.edges) {
          const source = ((_a = edge.source) == null ? void 0 : _a["@id"]) || edge.source;
          const target = ((_b = edge.target) == null ? void 0 : _b["@id"]) || edge.target;
          const relation = edge.relationType || edge.relation;
          if (source && target && relation) {
            mutationPromises.push(this.link(source, relation, target));
          }
        }
      }
      await Promise.all(mutationPromises);
    }
    this.hydrateOntologiesFromFacts();
    this.eqls.setSchema(this.store.getCatalog());
  }
  /**
   * Gets a defined projection by ID.
   */
  getProjection(id) {
    return this.projections.get(id);
  }
  /**
   * Lists all defined projections.
   */
  listProjections() {
    return Array.from(this.projections.values());
  }
  /**
   * Gets a defined ontology by ID.
   */
  getOntology(id) {
    return this.ontologies.get(id);
  }
  /**
   * Lists all registered ontologies.
   */
  listOntologies() {
    return Array.from(this.ontologies.values());
  }
  /**
   * Creates a new ontology and persists it as EAV facts.
   * Throws if an ontology with the same ID already exists.
   */
  async createOntology(schema, ctx = {}) {
    if (this.ontologies.has(schema["@id"])) {
      const existing = this.ontologies.get(schema["@id"]);
      if ((existing == null ? void 0 : existing.tier) === "core") {
        throw new Error(`Cannot create ontology: ${schema["@id"]} is a core type (immutable)`);
      }
      throw new Error(`Ontology already exists: ${schema["@id"]}`);
    }
    this.ontologies.set(schema["@id"], schema);
    await this.persistOntology(schema, ctx);
  }
  /**
   * Updates an existing ontology, replacing old EAV facts with new ones.
   * Throws if the ontology does not exist.
   */
  async updateOntology(schema, ctx = {}) {
    if (!this.ontologies.has(schema["@id"])) {
      throw new Error(`Ontology not found: ${schema["@id"]}`);
    }
    const current = this.ontologies.get(schema["@id"]);
    if ((current == null ? void 0 : current.tier) === "core") {
      throw new Error(`Cannot update ontology: ${schema["@id"]} is a core type (immutable)`);
    }
    const entityId = this.ontologyEntityId(schema["@id"]);
    const existing = this.store.getFactsByEntity(entityId);
    if (existing.length > 0) {
      await this._mutate("deleteFacts", { facts: existing }, ctx);
    }
    this.ontologies.set(schema["@id"], schema);
    await this.persistOntology(schema, ctx);
  }
  /**
   * Deletes an ontology from the in-memory map and removes its EAV facts.
   * Throws if the ontology does not exist.
   */
  async deleteOntology(id, ctx = {}) {
    if (!this.ontologies.has(id)) {
      throw new Error(`Ontology not found: ${id}`);
    }
    const current = this.ontologies.get(id);
    if ((current == null ? void 0 : current.tier) === "core") {
      throw new Error(`Cannot delete ontology: ${id} is a core type (immutable)`);
    }
    const entityId = this.ontologyEntityId(id);
    const existing = this.store.getFactsByEntity(entityId);
    if (existing.length > 0) {
      await this._mutate("deleteFacts", { facts: existing }, ctx);
    }
    this.ontologies.delete(id);
  }
  /**
   * Returns only core ontologies (tier: 'core').
   */
  getCoreOntologies() {
    return Array.from(this.ontologies.values()).filter((s) => s.tier === "core");
  }
  /**
   * Converts an ontology @id to an EAV entity ID for persistence.
   */
  ontologyEntityId(id) {
    return `ontology:${id.replace(/[/:]/g, "_")}`;
  }
  /**
   * Persists a SchemaDefinition as EAV facts.
   */
  async persistOntology(schema, ctx = {}) {
    const entityId = this.ontologyEntityId(schema["@id"]);
    const data = {
      type: "trellis:Schema",
      schemaId: schema["@id"],
      version: schema.version,
      fields: JSON.stringify(schema.fields)
    };
    const facts = jsonEntityFacts(entityId, data, "trellis:Schema");
    await this._mutate("addFacts", { facts }, ctx);
  }
  /**
   * Hydrates ontologies from persisted EAV facts (called during boot).
   * Looks for entities of type 'trellis:Schema' and reconstructs SchemaDefinitions.
   */
  hydrateOntologiesFromFacts() {
    const allFacts = this.store.getAllFacts();
    const schemaEntities = /* @__PURE__ */ new Map();
    for (const fact of allFacts) {
      if (!fact.e.startsWith("ontology:")) continue;
      if (!schemaEntities.has(fact.e)) {
        schemaEntities.set(fact.e, {});
      }
      const entity = schemaEntities.get(fact.e);
      entity[fact.a] = fact.v;
    }
    for (const [, attrs] of schemaEntities) {
      if (attrs.type !== "trellis:Schema" || !attrs.schemaId) continue;
      try {
        const schema = {
          "@id": attrs.schemaId,
          "@type": "trellis:Schema",
          version: attrs.version || "1.0.0",
          fields: typeof attrs.fields === "string" ? JSON.parse(attrs.fields) : attrs.fields || []
        };
        if (!this.ontologies.has(schema["@id"])) {
          this.ontologies.set(schema["@id"], schema);
        }
      } catch {
      }
    }
  }
  /**
   * Exports the current kernel state as a full WorkspaceConfig.
   */
  async exportWorkspace() {
    const ontologies = {};
    for (const [id, schema] of this.ontologies.entries()) {
      ontologies[id] = schema;
    }
    const projections = {};
    for (const [id, proj] of this.projections.entries()) {
      projections[id] = proj;
    }
    const nodes = [];
    const entities = /* @__PURE__ */ new Set();
    for (const fact of this.store.getAllFacts()) {
      if (fact) entities.add(fact.e);
    }
    for (const entityId of entities) {
      const facts = this.store.getFactsByEntity(entityId);
      const node = { "@id": entityId };
      for (const f of facts) {
        if (f.a === "type") {
          node["@type"] = f.v;
        } else {
          node[f.a] = f.v;
        }
      }
      nodes.push(node);
    }
    const edges = [];
    for (const link of this.store.getAllLinks()) {
      edges.push({
        source: { "@id": link.e1 },
        target: { "@id": link.e2 },
        relationType: link.a
      });
    }
    return {
      workspace: {
        ontologies: Object.keys(ontologies).length > 0 ? ontologies : void 0,
        projections: Object.keys(projections).length > 0 ? projections : void 0,
        graph: {
          nodes: nodes.length > 0 ? nodes : void 0,
          edges: edges.length > 0 ? edges : void 0
        }
      }
    };
  }
  /**
   * Executes a pre-defined projection by its ID.
   */
  async executeProjection(id, ctx = {}) {
    const projection = this.getProjection(id);
    if (!projection) {
      throw new Error(`Projection ${id} not found`);
    }
    return this.query(projection.query, ctx);
  }
  async appendFacts(facts, ctx = {}) {
    var _a;
    const lastOp = (_a = this.backend) == null ? void 0 : _a.getLastOp();
    const op = await createOp("addFacts", {
      agentId: ctx.agentId || "system",
      facts,
      previousHash: lastOp == null ? void 0 : lastOp.hash
    });
    if (this.backend) {
      this.open();
      this.backend.append(op);
    }
    return this.applyOp(op, ctx);
  }
  applyOp(op, ctx = {}) {
    const runMiddleware = (index) => {
      if (index >= this.middleware.length) {
        if (op.kind === "addFacts" && op.facts) {
          this.store.addFacts(op.facts);
        } else if (op.kind === "addLinks" && op.links) {
          this.store.addLinks(op.links);
        } else if (op.kind === "deleteFacts" && op.facts) {
          this.store.deleteFacts(op.facts);
        } else if (op.kind === "deleteLinks" && op.links) {
          this.store.deleteLinks(op.links);
        }
        return;
      }
      const mw = this.middleware[index];
      if (mw && mw.handleOp) {
        return mw.handleOp(
          op,
          ctx,
          (nextOp, nextCtx) => runMiddleware(index + 1)
        );
      } else {
        return runMiddleware(index + 1);
      }
    };
    return runMiddleware(0);
  }
  /**
   * Performs a mutation on the kernel state by applying an operation.
   * Operations are passed through middleware and persisted to the backend.
   */
  async mutate(op, ctx = {}) {
    if (this.backend) {
      this.open();
      this.backend.append(op);
    }
    await this.applyOp(op, ctx);
    if (this.sync && !ctx.remote && !ctx.system) {
      await this.sync.broadcast(op);
    }
  }
  /**
   * Applies an operation from a remote source (e.g. sync).
   * Persists the operation locally and updates the store.
   */
  async applyRemoteOperation(op, ctx = {}) {
    return this.mutate(op, { ...ctx, remote: true });
  }
  /**
   * Internal helper to create and apply an operation.
   */
  async _mutate(kind, params, ctx) {
    var _a;
    const lastOp = (_a = this.backend) == null ? void 0 : _a.getLastOp();
    const op = await createOp(kind, {
      agentId: ctx.agentId || "system",
      facts: params.facts,
      links: params.links,
      previousHash: lastOp == null ? void 0 : lastOp.hash
    });
    return this.mutate(op, ctx);
  }
  /**
   * High-level CRUD: Create a new node from a JSON object.
   */
  async createNode(entityId, data, type, ctx = {}) {
    const existing = this.store.getFactsByEntity(entityId);
    if (existing.length > 0) {
      await this._mutate("deleteFacts", { facts: existing }, ctx);
    }
    const facts = this.enableExprEvaluation ? jsonEntityFactsWithExpr(entityId, data, type) : jsonEntityFacts(entityId, data, type);
    await this._mutate("addFacts", { facts }, ctx);
  }
  /**
   * High-level CRUD: Update an existing node (merge semantics).
   *
   * Reads existing facts, merges the provided data on top (overwriting
   * supplied fields, preserving unmentioned ones), then writes back.
   * Use createNode() for full-replace / idempotent upsert semantics.
   */
  async updateNode(entityId, data, type, ctx = {}) {
    const existingFacts = this.store.getFactsByEntity(entityId);
    const existing = {};
    for (const f of existingFacts) {
      if (f.a === "type" && f.v === type) continue;
      existing[f.a] = f.v;
    }
    const merged = { ...existing, ...data };
    if (existingFacts.length > 0) {
      await this._mutate("deleteFacts", { facts: existingFacts }, ctx);
    }
    const facts = this.enableExprEvaluation ? jsonEntityFactsWithExpr(entityId, merged, type) : jsonEntityFacts(entityId, merged, type);
    await this._mutate("addFacts", { facts }, ctx);
  }
  /**
   * High-level CRUD: Delete all facts for an entity.
   */
  async deleteNode(entityId, ctx = {}) {
    const facts = this.store.getFactsByEntity(entityId);
    if (facts.length > 0) {
      await this._mutate("deleteFacts", { facts }, ctx);
    }
  }
  /**
   * High-level CRUD: Create a link between two nodes.
   */
  async link(e1, a, e2, ctx = {}) {
    await this._mutate("addLinks", { links: [{ e1, a, e2 }] }, ctx);
  }
  /**
   * High-level CRUD: Remove a link between two nodes.
   */
  async unlink(e1, a, e2, ctx = {}) {
    await this._mutate("deleteLinks", { links: [{ e1, a, e2 }] }, ctx);
  }
  query(eqlsQuery, ctx = {}) {
    return this.runQueryMiddleware(eqlsQuery, ctx);
  }
  /**
   * Evaluates a natural language query by translating it to EQL-S first.
   */
  async queryNatural(nl, opts) {
    const eqlsQuery = await opts.provider.translate(nl, opts.context);
    return this.query(eqlsQuery, opts.context);
  }
  /**
   * Directly executes a Datalog query against the kernel.
   * This bypasses the EQL-S parser and compiler.
   */
  async queryDatalog(query, ctx = {}) {
    return this.runQueryMiddleware(query, ctx);
  }
  runQueryMiddleware(query, ctx) {
    if (this.backend) {
      this.open();
    }
    const runMiddleware = (index, currentQuery, currentCtx) => {
      if (index >= this.middleware.length) {
        if (this.backend && (currentCtx.atHash || currentCtx.atTimestamp)) {
          const ephemeralStore = new EAVStore();
          const ops = currentCtx.atHash ? this.backend.readUntil(currentCtx.atHash) : this.backend.readUntilTimestamp(currentCtx.atTimestamp);
          for (const op of ops) {
            if (op.kind === "addFacts" && op.facts) {
              ephemeralStore.addFacts(op.facts);
            } else if (op.kind === "addLinks" && op.links) {
              ephemeralStore.addLinks(op.links);
            } else if (op.kind === "deleteFacts" && op.facts) {
              ephemeralStore.deleteFacts(op.facts);
            } else if (op.kind === "deleteLinks" && op.links) {
              ephemeralStore.deleteLinks(op.links);
            }
          }
          return this.executeBaseQuery(currentQuery, ephemeralStore);
        }
        return this.executeBaseQuery(currentQuery);
      }
      const mw = this.middleware[index];
      if (mw && mw.handleQuery) {
        return mw.handleQuery(
          currentQuery,
          currentCtx,
          (q, c) => runMiddleware(index + 1, q, c)
        );
      } else {
        return runMiddleware(index + 1, currentQuery, currentCtx);
      }
    };
    return runMiddleware(0, query, ctx);
  }
  executeBaseQuery(queryOrEqls, storeOverride) {
    var _a, _b;
    const store = storeOverride || this.store;
    const evaluator = storeOverride ? new DatalogEvaluator(storeOverride) : this.evaluator;
    this.eqls.setSchema(store.getCatalog());
    if (typeof queryOrEqls !== "string") {
      const exec = evaluator.evaluate(queryOrEqls);
      return {
        rows: exec.bindings,
        executionTime: exec.executionTime,
        plan: exec.plan,
        bindings: exec.bindings
      };
    }
    const processed = this.eqls.process(queryOrEqls);
    if (processed.errors.length > 0 || !processed.query) {
      const message = processed.errors.map((e) => e.message).join("; ");
      throw new Error(message || "Query parsing failed");
    }
    const compiledQueries = processed.queries && processed.queries.length > 0 ? processed.queries : [processed.query];
    const projectionMap = processed.projectionMap || /* @__PURE__ */ new Map();
    const mergedRows = [];
    const seen = /* @__PURE__ */ new Set();
    let totalTime = 0;
    const plans = [];
    const allTraces = [];
    for (const q of compiledQueries) {
      const exec = evaluator.evaluate(q);
      totalTime += exec.executionTime;
      if (exec.plan) plans.push(exec.plan);
      if (exec.trace) allTraces.push(...exec.trace);
      for (const binding of exec.bindings) {
        const row = projectionMap.size === 0 ? binding : (() => {
          const projected = {};
          for (const [field, varName] of projectionMap.entries()) {
            projected[field] = binding[varName];
          }
          return projected;
        })();
        const k = JSON.stringify(row);
        if (!seen.has(k)) {
          seen.add(k);
          mergedRows.push(row);
        }
      }
    }
    const orderBy = (_a = processed.meta) == null ? void 0 : _a.orderBy;
    if (orderBy == null ? void 0 : orderBy.field) {
      const dir = orderBy.direction === "DESC" ? -1 : 1;
      mergedRows.sort(
        (ra, rb) => dir * stableCompare(ra[orderBy.field], rb[orderBy.field])
      );
    }
    const limit = (_b = processed.meta) == null ? void 0 : _b.limit;
    const finalRows = typeof limit === "number" && limit >= 0 ? mergedRows.slice(0, limit) : mergedRows;
    return {
      rows: finalRows,
      executionTime: totalTime,
      plan: plans.length > 0 ? plans.join(" | ") : void 0,
      trace: allTraces.length > 0 ? allTraces : void 0
    };
  }
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
const encodeAtom = (v) => {
  if (v instanceof Date) return { $type: "date", value: v.toISOString() };
  return v;
};
const decodeAtom = (v) => {
  if (v && typeof v === "object" && "$type" in v && v.$type === "date" && typeof v.value === "string") {
    return new Date(v.value);
  }
  return v;
};
const encodeOp = (op) => {
  const encoded = { ...op };
  if (encoded.facts) {
    encoded.facts = encoded.facts.map((f) => ({
      ...f,
      v: encodeAtom(f.v)
    }));
  }
  return encoded;
};
const decodeOp = (raw) => {
  const decoded = { ...raw };
  if (decoded.facts) {
    decoded.facts = decoded.facts.map((f) => ({
      ...f,
      v: decodeAtom(f.v)
    }));
  }
  return decoded;
};
class BetterSqliteBackend {
  constructor(opts) {
    __publicField$2(this, "opts", opts);
    __publicField$2(this, "db");
    this.db = new Database(opts.filename);
  }
  init() {
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        ts INTEGER NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ops_hash ON ops(hash);

      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        last_op_hash TEXT NOT NULL,
        ts INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(ts);
    `);
  }
  append(op) {
    const stmt = this.db.prepare(
      "INSERT INTO ops (hash, ts, kind, payload) VALUES (?, ?, ?, ?)"
    );
    stmt.run(
      op.hash,
      new Date(op.timestamp).getTime(),
      op.kind,
      JSON.stringify(encodeOp(op))
    );
  }
  readAll() {
    const rows = this.db.prepare("SELECT payload FROM ops ORDER BY id ASC").all();
    return rows.map(
      (r) => decodeOp(JSON.parse(r.payload))
    );
  }
  readUntil(hash) {
    const target = this.db.prepare("SELECT id FROM ops WHERE hash = ?").get(hash);
    if (!target) {
      throw new Error(`Operation with hash ${hash} not found`);
    }
    const rows = this.db.prepare("SELECT payload FROM ops WHERE id <= ? ORDER BY id ASC").all(target.id);
    return rows.map(
      (r) => decodeOp(JSON.parse(r.payload))
    );
  }
  readAfter(hash) {
    const target = this.db.prepare("SELECT id FROM ops WHERE hash = ?").get(hash);
    if (!target) {
      throw new Error(`Operation with hash ${hash} not found`);
    }
    const rows = this.db.prepare("SELECT payload FROM ops WHERE id > ? ORDER BY id ASC").all(target.id);
    return rows.map(
      (r) => decodeOp(JSON.parse(r.payload))
    );
  }
  readUntilTimestamp(isoTimestamp) {
    const ts = new Date(isoTimestamp).getTime();
    const rows = this.db.prepare("SELECT payload FROM ops WHERE ts <= ? ORDER BY id ASC").all(ts);
    return rows.map(
      (r) => decodeOp(JSON.parse(r.payload))
    );
  }
  getLastOp() {
    const row = this.db.prepare("SELECT payload FROM ops ORDER BY id DESC LIMIT 1").get();
    if (!row) return void 0;
    return decodeOp(JSON.parse(row.payload));
  }
  countOpsAfter(hash) {
    var _a, _b;
    if (!hash) {
      const row2 = this.db.prepare("SELECT COUNT(*) AS c FROM ops").get();
      return (_a = row2 == null ? void 0 : row2.c) != null ? _a : 0;
    }
    const target = this.db.prepare("SELECT id FROM ops WHERE hash = ?").get(hash);
    if (!target) return 0;
    const row = this.db.prepare("SELECT COUNT(*) AS c FROM ops WHERE id > ?").get(target.id);
    return (_b = row == null ? void 0 : row.c) != null ? _b : 0;
  }
  saveSnapshot(lastOpHash, data) {
    const stmt = this.db.prepare(
      "INSERT INTO snapshots (last_op_hash, ts, data) VALUES (?, ?, ?)"
    );
    stmt.run(lastOpHash, Date.now(), JSON.stringify(data));
  }
  loadLatestSnapshot() {
    const row = this.db.prepare(
      "SELECT last_op_hash, data FROM snapshots ORDER BY ts DESC LIMIT 1"
    ).get();
    if (!row) return void 0;
    return {
      lastOpHash: row.last_op_hash,
      data: JSON.parse(row.data)
    };
  }
  close() {
    this.db.close();
  }
}

const homeRoute = {
  "@id": "route:home",
  "@type": "trellis:Route",
  routePath: "/home",
  label: "Home",
  icon: "lucide:home",
  order: 0,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  collapseSidebar: true,
  searchKeywords: ["home", "chat", "ask", "assistant", "agent"],
  meta: {
    title: "Home",
    description: "Chat with your Trellis assistant",
    hideSidebar: true
  }
};
const agentRoute = {
  "@id": "route:agent",
  "@type": "trellis:Route",
  routePath: "/agent",
  label: "Agent",
  icon: "lucide:bot",
  order: 5,
  inRail: false,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  collapseSidebar: true,
  meta: {
    title: "Agent",
    description: "AI agent workspace",
    hideSidebar: true
  }
};
const workspaceRoute = {
  "@id": "route:workspace",
  "@type": "trellis:Route",
  routePath: "/workspace",
  label: "Collections",
  icon: "lucide:layers",
  order: 1,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: "Collections",
    description: "Your collections and pages"
  },
  sidebarSections: [
    {
      label: "PINNED",
      key: "personal-pinned",
      icon: "lucide:pin",
      items: "pinned",
      collapsible: false,
      order: 1
    },
    {
      label: "WORKSPACE",
      key: "personal-workspace",
      icon: "lucide:briefcase",
      collapsible: true,
      order: 10,
      items: [
        { routePath: "/workspace/today", label: "Overview", icon: "lucide:layout-dashboard" },
        { routePath: "/workspace/feed", label: "Feed", icon: "lucide:rss" },
        { routePath: "/workspace/browse", label: "Browse", icon: "lucide:layers-3" },
        { routePath: "/workspace/calendar", label: "Calendar", icon: "lucide:calendar", entityType: "event" }
      ]
    },
    {
      label: "PAGES",
      key: "personal-pages",
      icon: "lucide:file-text",
      collapsible: true,
      editable: true,
      order: 20,
      items: []
    }
  ],
  children: [
    {
      "@id": "route:workspace/browse",
      "@type": "trellis:Route",
      routePath: "/workspace/browse",
      label: "Browse",
      icon: "lucide:layers-3",
      inCommandPalette: true,
      meta: { title: "Browse", description: "Browse all your entities in one place" }
    },
    {
      "@id": "route:workspace/welcome",
      "@type": "trellis:Route",
      routePath: "/workspace/welcome",
      label: "Welcome",
      icon: "lucide:home",
      meta: { title: "Welcome", description: "World overview and quick links" }
    },
    {
      "@id": "route:workspace/today",
      "@type": "trellis:Route",
      routePath: "/workspace/today",
      label: "Today",
      icon: "lucide:layout-dashboard",
      meta: { title: "Today", description: "Your daily overview" }
    },
    {
      "@id": "route:workspace/feed",
      "@type": "trellis:Route",
      routePath: "/workspace/feed",
      label: "Feed",
      icon: "lucide:rss",
      meta: { title: "Feed", description: "Activity feed" }
    },
    {
      "@id": "route:workspace/people",
      "@type": "trellis:Route",
      routePath: "/workspace/people",
      label: "People",
      icon: "lucide:users",
      entityType: "person",
      pageVariant: "browse",
      projectionTypes: ["table", "card-grid", "list", "graph"],
      meta: { title: "People", description: "Manage your contacts and relationships" }
    },
    {
      "@id": "route:workspace/calendar",
      "@type": "trellis:Route",
      routePath: "/workspace/calendar",
      label: "Calendar",
      icon: "lucide:calendar",
      entityType: "event",
      pageVariant: "browse",
      projectionTypes: ["calendar", "timeline", "list"],
      meta: { title: "Calendar", description: "View and manage your schedule" }
    },
    {
      "@id": "route:workspace/projects",
      "@type": "trellis:Route",
      routePath: "/workspace/projects",
      label: "Projects",
      icon: "lucide:folder-kanban",
      entityType: "project",
      pageVariant: "browse",
      projectionTypes: ["kanban", "list", "table", "timeline"],
      meta: { title: "Projects", description: "Manage your projects" }
    },
    {
      "@id": "route:workspace/tasks",
      "@type": "trellis:Route",
      routePath: "/workspace/tasks",
      label: "Tasks",
      icon: "lucide:check-square",
      entityType: "task",
      pageVariant: "browse",
      projectionTypes: ["kanban", "calendar", "list", "table", "timeline"],
      meta: { title: "Tasks", description: "Manage your tasks" }
    },
    {
      "@id": "route:workspace/notes",
      "@type": "trellis:Route",
      routePath: "/workspace/notes",
      label: "Notes",
      icon: "lucide:sticky-note",
      entityType: "note",
      pageVariant: "browse",
      projectionTypes: ["card-grid", "list", "table"],
      meta: { title: "Notes", description: "Your notes and thoughts" }
    },
    {
      "@id": "route:workspace/documents",
      "@type": "trellis:Route",
      routePath: "/workspace/documents",
      label: "Documents",
      icon: "lucide:file-text",
      entityType: "page",
      pageVariant: "browse",
      projectionTypes: ["list", "card-grid"],
      meta: { title: "Documents", description: "Pages and documents" }
    },
    {
      "@id": "route:workspace/bookmarks",
      "@type": "trellis:Route",
      routePath: "/workspace/bookmarks",
      label: "Bookmarks",
      icon: "lucide:bookmark",
      entityType: "bookmark",
      pageVariant: "browse",
      projectionTypes: ["card-grid", "list", "table", "moodboard"],
      meta: { title: "Bookmarks", description: "Saved bookmarks and links" }
    },
    {
      "@id": "route:workspace/places",
      "@type": "trellis:Route",
      routePath: "/workspace/places",
      label: "Places",
      icon: "lucide:map-pin",
      pageVariant: "browse",
      meta: { title: "Places", description: "Saved locations" }
    },
    {
      "@id": "route:workspace/sprints",
      "@type": "trellis:Route",
      routePath: "/workspace/sprints",
      label: "Sprints",
      icon: "lucide:zap",
      entityType: "sprint",
      pageVariant: "browse",
      projectionTypes: ["list", "kanban", "timeline"],
      meta: { title: "Sprints", description: "Plan and track sprints" }
    },
    {
      "@id": "route:workspace/goals",
      "@type": "trellis:Route",
      routePath: "/workspace/goals",
      label: "Goals",
      icon: "lucide:target",
      entityType: "goal",
      pageVariant: "browse",
      projectionTypes: ["list", "kanban", "table", "timeline"],
      meta: { title: "Goals", description: "Track your goals and progress" }
    },
    {
      "@id": "route:workspace/milestones",
      "@type": "trellis:Route",
      routePath: "/workspace/milestones",
      label: "Milestones",
      icon: "lucide:flag",
      entityType: "milestone",
      pageVariant: "browse",
      projectionTypes: ["timeline", "list", "calendar"],
      meta: { title: "Milestones", description: "Key milestones and checkpoints" }
    },
    {
      "@id": "route:workspace/budgets",
      "@type": "trellis:Route",
      routePath: "/workspace/budgets",
      label: "Budgets",
      icon: "lucide:wallet",
      entityType: "budget",
      pageVariant: "browse",
      projectionTypes: ["list", "table"],
      meta: { title: "Budgets", description: "Manage budgets and spending" }
    }
  ]
};
const ontologiesRoute = {
  "@id": "route:ontologies",
  "@type": "trellis:Route",
  routePath: "/ontologies",
  label: "Ontologies",
  icon: "lucide:shapes",
  order: 2,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: "admin", permission: "read" },
  pageVariant: "database",
  projectionTypes: ["table", "kanban", "card-grid", "calendar", "timeline", "gallery", "list", "moodboard"],
  meta: {
    title: "Ontologies",
    description: "Define the shape of your data \u2014 types, fields, and relationships",
    fullWidth: true
  },
  sidebarSections: [
    {
      label: "TOOLS",
      key: "ontologies-tools",
      icon: "lucide:wrench",
      collapsible: true,
      order: 0,
      items: [
        { routePath: "/ontologies/graph", label: "Graph view", icon: "lucide:git-branch" },
        { routePath: "/ontologies/explorer", label: "Explorer", icon: "lucide:search" },
        { routePath: "/query", label: "Query console", icon: "lucide:terminal" },
        { routePath: "/ontologies/activity", label: "Activity log", icon: "lucide:scroll-text" }
      ]
    },
    {
      label: "CUSTOM",
      key: "ontologies-custom",
      icon: "lucide:blocks",
      items: "unpinned",
      collapsible: true,
      editable: true,
      order: 1
    },
    {
      label: "SYSTEM",
      key: "ontologies-system",
      icon: "lucide:lock",
      collapsible: true,
      order: 2
    },
    {
      label: "CORE",
      key: "ontologies-core",
      icon: "lucide:shield",
      collapsible: true,
      defaultCollapsed: true,
      order: 3
    }
  ],
  children: [
    {
      "@id": "route:ontologies/graph",
      "@type": "trellis:Route",
      routePath: "/ontologies/graph",
      label: "Graph",
      icon: "lucide:git-branch",
      meta: { title: "Ontology Graph", description: "Visualize schema relationships", fullWidth: true }
    },
    {
      "@id": "route:ontologies/explorer",
      "@type": "trellis:Route",
      routePath: "/ontologies/explorer",
      label: "Explorer",
      icon: "lucide:search",
      meta: { title: "Entity Explorer", description: "Browse, search, and inspect graph entities" }
    },
    {
      "@id": "route:ontologies/activity",
      "@type": "trellis:Route",
      routePath: "/ontologies/activity",
      label: "Activity",
      icon: "lucide:scroll-text",
      meta: { title: "Activity Log", description: "Graph mutation log and event stream" }
    }
  ]
};
const queryRoute = {
  "@id": "route:query",
  "@type": "trellis:Route",
  routePath: "/query",
  label: "Query",
  icon: "lucide:terminal",
  order: 2.5,
  inRail: false,
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: "admin", permission: "read" },
  meta: { title: "Query Console", description: "Run EQL-S queries", fullWidth: true }
};
const graphRoute = {
  "@id": "route:graph",
  "@type": "trellis:Route",
  routePath: "/graph",
  label: "Graph",
  icon: "lucide:brain",
  order: 3,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: "admin", permission: "read" },
  collapseSidebar: true,
  meta: {
    title: "Graph Visualization",
    description: "Force-directed view of all graph entities and their relationships",
    fullWidth: true
  }
};
const calendarRoute = {
  "@id": "route:calendar",
  "@type": "trellis:Route",
  routePath: "/calendar",
  label: "Calendar",
  icon: "lucide:calendar",
  order: 12,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: "Calendar",
    description: "View and manage your schedule"
  }
};
const mailRoute = {
  "@id": "route:mail",
  "@type": "trellis:Route",
  routePath: "/mail",
  label: "Mail",
  icon: "lucide:mail",
  order: 15,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: "Mail",
    description: "Read, send, and link emails to workspace entities",
    hideSidebar: false,
    fullWidth: true
  },
  sidebarSections: [
    {
      label: "MAILBOXES",
      key: "mail-mailboxes",
      icon: "lucide:inbox",
      collapsible: true,
      order: 10,
      items: [
        { routePath: "/mail?label=INBOX", label: "Inbox", icon: "lucide:inbox" },
        { routePath: "/mail?label=STARRED", label: "Starred", icon: "lucide:star" },
        { routePath: "/mail?label=SENT", label: "Sent", icon: "lucide:send" },
        { routePath: "/mail?label=DRAFT", label: "Drafts", icon: "lucide:file-edit" },
        { routePath: "/mail?label=IMPORTANT", label: "Important", icon: "lucide:flag" },
        { routePath: "/mail?label=TRASH", label: "Trash", icon: "lucide:trash-2" }
      ]
    },
    {
      label: "LABELS",
      key: "mail-labels",
      icon: "lucide:tag",
      collapsible: true,
      editable: true,
      order: 20,
      items: []
    }
  ],
  children: [
    {
      "@id": "route:mail/compose",
      "@type": "trellis:Route",
      routePath: "/mail/compose",
      label: "Compose",
      icon: "lucide:pen-square",
      meta: { title: "Compose" }
    },
    {
      "@id": "route:mail/thread",
      "@type": "trellis:Route",
      routePath: "/mail/thread/:threadId",
      label: "Thread",
      icon: "lucide:mail",
      meta: { title: "Thread" }
    }
  ]
};
const contactsRoute = {
  "@id": "route:contacts",
  "@type": "trellis:Route",
  routePath: "/contacts",
  label: "Contacts",
  icon: "lucide:contact",
  order: 18,
  inRail: false,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: "Contacts",
    description: "Manage your contacts, people, and organizations",
    hideSidebar: false
  },
  sidebarSections: [
    {
      label: "CONTACTS",
      key: "contacts-all",
      icon: "lucide:users",
      collapsible: true,
      order: 10,
      items: [
        { routePath: "/contacts", label: "All Contacts", icon: "lucide:users" },
        { routePath: "/contacts?type=person", label: "People", icon: "lucide:user" },
        { routePath: "/contacts?type=organization", label: "Organizations", icon: "lucide:building-2" }
      ]
    }
  ],
  children: [
    {
      "@id": "route:contacts/person",
      "@type": "trellis:Route",
      routePath: "/contacts/:id",
      label: "Contact",
      icon: "lucide:user",
      meta: { title: "Contact" }
    }
  ]
};
const messagesRoute = {
  "@id": "route:messages",
  "@type": "trellis:Route",
  routePath: "/messages",
  label: "Messages",
  icon: "lucide:message-square",
  order: 25,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: "Messages",
    description: "Realtime team chat and threads",
    hideSidebar: false
  },
  sidebarSections: [
    {
      label: "CHANNELS",
      key: "chat-channels",
      icon: "lucide:hash",
      collapsible: true,
      editable: true,
      order: 10,
      items: []
    },
    {
      label: "DIRECT MESSAGES",
      key: "chat-dms",
      icon: "lucide:message-circle",
      collapsible: true,
      order: 20,
      items: []
    },
    {
      label: "THREADS",
      key: "chat-threads",
      icon: "lucide:git-branch",
      collapsible: true,
      order: 30,
      items: []
    }
  ],
  children: [
    {
      "@id": "route:messages/channel",
      "@type": "trellis:Route",
      routePath: "/messages/:channelId",
      label: "Channel",
      icon: "lucide:hash",
      meta: { title: "Channel" }
    },
    {
      "@id": "route:messages/dm",
      "@type": "trellis:Route",
      routePath: "/messages/dm/:userId",
      label: "Direct Message",
      icon: "lucide:message-circle",
      meta: { title: "Direct Message" }
    }
  ]
};
const pagesRoute = {
  "@id": "route:pages",
  "@type": "trellis:Route",
  routePath: "/pages",
  label: "Pages",
  icon: "lucide:notebook",
  order: 20,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: "Pages",
    description: "Fullscreen document editor with folders",
    hideSidebar: false
  },
  sidebarSections: [
    {
      label: "PAGES",
      key: "pages-list",
      icon: "lucide:file-text",
      collapsible: true,
      editable: true,
      order: 10,
      items: []
    }
  ],
  children: [
    {
      "@id": "route:pages/page",
      "@type": "trellis:Route",
      routePath: "/pages/:id",
      label: "Page",
      icon: "lucide:file-text",
      meta: { title: "Page" }
    }
  ]
};
const workflowsRoute = {
  "@id": "route:workflows",
  "@type": "trellis:Route",
  routePath: "/workflows",
  label: "Workflows",
  icon: "lucide:git-branch",
  order: 40,
  inRail: true,
  railPosition: "primary",
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: "Workflows",
    description: "Build and manage agentic automation workflows"
  },
  sidebarSections: [
    {
      label: "WORKFLOWS",
      key: "workflows",
      icon: "lucide:git-branch",
      collapsible: true,
      editable: true,
      order: 10
    }
  ]
};
const membersRoute = {
  "@id": "route:members",
  "@type": "trellis:Route",
  routePath: "/settings/members",
  label: "Members",
  icon: "lucide:users-round",
  order: 80,
  inRail: false,
  railPosition: "secondary",
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: "admin", permission: "admin" },
  meta: {
    title: "Members",
    description: "Manage team members, invites, and permissions",
    sidebarSectionPath: "/settings"
  }
};
const settingsRoute = {
  "@id": "route:settings",
  "@type": "trellis:Route",
  routePath: "/settings",
  label: "Settings",
  icon: "lucide:settings",
  order: 42,
  inRail: true,
  railPosition: "secondary",
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: "Settings",
    description: "Application settings"
  },
  sidebarSections: [
    {
      label: "WORKSPACE",
      key: "settings-workspace",
      icon: "lucide:building-2",
      collapsible: true,
      order: 10,
      items: [
        {
          routePath: "/settings/profile",
          label: "Profile",
          icon: "lucide:user",
          permissions: { minRole: "admin", permission: "admin" }
        },
        {
          routePath: "/settings/members",
          label: "Members",
          icon: "lucide:users-round",
          permissions: { minRole: "admin", permission: "admin" }
        },
        {
          routePath: "/settings/roles",
          label: "Roles",
          icon: "lucide:shield",
          permissions: { minRole: "admin", permission: "admin" }
        },
        {
          routePath: "/settings/branding",
          label: "Branding",
          icon: "lucide:sparkles",
          permissions: { minRole: "admin", permission: "admin" }
        }
      ]
    },
    {
      label: "PREFERENCES",
      key: "settings-preferences",
      icon: "lucide:sliders-horizontal",
      collapsible: true,
      order: 20,
      items: [
        { routePath: "/settings/appearance", label: "Appearance", icon: "lucide:paintbrush" },
        { routePath: "/settings/theme", label: "Theme", icon: "lucide:palette" },
        { routePath: "/settings/notifications", label: "Notifications", icon: "lucide:bell" },
        { routePath: "/settings/shortcuts", label: "Keyboard Shortcuts", icon: "lucide:keyboard" }
      ]
    },
    {
      label: "EXTENSIONS",
      key: "settings-extensions",
      icon: "lucide:plug",
      collapsible: true,
      order: 30,
      items: [
        {
          routePath: "/settings/marketplace",
          label: "Marketplace",
          icon: "lucide:store",
          permissions: { minRole: "admin", permission: "admin" }
        },
        {
          routePath: "/settings/integrations",
          label: "Integrations",
          icon: "lucide:plug",
          permissions: { minRole: "admin", permission: "admin" }
        }
      ]
    }
  ],
  children: [
    {
      "@id": "route:settings/project",
      "@type": "trellis:Route",
      routePath: "/settings/project",
      label: "Project",
      icon: "lucide:folder",
      permissions: { minRole: "admin", permission: "admin" },
      meta: { title: "Project Settings" }
    },
    {
      "@id": "route:settings/members",
      "@type": "trellis:Route",
      routePath: "/settings/members",
      label: "Members",
      icon: "lucide:users-round",
      permissions: { minRole: "admin", permission: "admin" },
      meta: { title: "Members", sidebarSectionPath: "/settings" }
    },
    {
      "@id": "route:settings/roles",
      "@type": "trellis:Route",
      routePath: "/settings/roles",
      label: "Roles",
      icon: "lucide:shield",
      permissions: { minRole: "admin", permission: "admin" },
      meta: { title: "Roles" }
    },
    {
      "@id": "route:settings/branding",
      "@type": "trellis:Route",
      routePath: "/settings/branding",
      label: "Branding",
      icon: "lucide:sparkles",
      permissions: { minRole: "admin", permission: "admin" },
      meta: { title: "Branding" }
    },
    {
      "@id": "route:settings/appearance",
      "@type": "trellis:Route",
      routePath: "/settings/appearance",
      label: "Appearance",
      icon: "lucide:paintbrush",
      meta: { title: "Appearance" }
    },
    {
      "@id": "route:settings/theme",
      "@type": "trellis:Route",
      routePath: "/settings/theme",
      label: "Theme",
      icon: "lucide:palette",
      meta: { title: "Theme" }
    },
    {
      "@id": "route:settings/notifications",
      "@type": "trellis:Route",
      routePath: "/settings/notifications",
      label: "Notifications",
      icon: "lucide:bell",
      meta: { title: "Notifications" }
    },
    {
      "@id": "route:settings/shortcuts",
      "@type": "trellis:Route",
      routePath: "/settings/shortcuts",
      label: "Keyboard Shortcuts",
      icon: "lucide:keyboard",
      meta: { title: "Keyboard Shortcuts" }
    },
    {
      "@id": "route:settings/marketplace",
      "@type": "trellis:Route",
      routePath: "/settings/marketplace",
      label: "Marketplace",
      icon: "lucide:store",
      permissions: { minRole: "admin", permission: "admin" },
      meta: { title: "Marketplace" }
    },
    {
      "@id": "route:settings/integrations",
      "@type": "trellis:Route",
      routePath: "/settings/integrations",
      label: "Integrations",
      icon: "lucide:plug",
      permissions: { minRole: "admin", permission: "admin" },
      meta: { title: "Integrations" }
    }
  ]
};
function getRouteDefinitions() {
  return {
    "route:home": homeRoute,
    "route:agent": agentRoute,
    "route:workspace": workspaceRoute,
    "route:calendar": calendarRoute,
    "route:contacts": contactsRoute,
    "route:mail": mailRoute,
    "route:messages": messagesRoute,
    "route:pages": pagesRoute,
    "route:ontologies": ontologiesRoute,
    "route:query": queryRoute,
    "route:graph": graphRoute,
    "route:workflows": workflowsRoute,
    "route:members": membersRoute,
    "route:settings": settingsRoute
  };
}

const ENTITY_NAMESPACE = "entity";
const entityQuery = (alias) => `FIND ${ENTITY_NAMESPACE} AS ${alias}`;

const DEFAULT_DEV_PORT = 1414;
const parsedDevPort = Number.parseInt(process.env.TRELLIS_PORT || "", 10);
const DEV_PORT = Number.isFinite(parsedDevPort) ? parsedDevPort : DEFAULT_DEV_PORT;
const f = (name, valueType, opts) => ({ name, valueType, ...opts });
const baseFields = () => [
  f("title", "title", { required: true }),
  f("description", "rich_text"),
  f("tags", "multi_select", {
    icon: "lucide:hash",
    group: "annotation",
    display: "inline-input",
    editable: true,
    defaultValue: []
  }),
  f("owner", "people", { icon: "lucide:user", group: "people", display: "popover", editable: true }),
  f("involved", "people", { icon: "lucide:users", group: "people", display: "popover", editable: true }),
  f("category", "select", {
    icon: "lucide:tag",
    group: "classification",
    display: "popover",
    editable: true,
    selectOptions: [
      "general",
      "work",
      "personal",
      "meeting",
      "review",
      "appointment",
      "deadline",
      "health",
      "finance",
      "travel"
    ]
  }),
  f("createdAt", "date"),
  f("updatedAt", "date")
];
const temporalFields = () => [
  f("startDate", "date", { icon: "lucide:calendar", group: "scheduling", display: "inline-input", editable: true }),
  f("endDate", "date", { icon: "lucide:calendar-range", group: "scheduling", display: "inline-input", editable: true }),
  f("allDay", "checkbox", {
    icon: "lucide:sun",
    group: "scheduling",
    display: "toggle",
    editable: true,
    defaultValue: false
  }),
  f("startTime", "rich_text"),
  f("endTime", "rich_text"),
  f("priority", "select", {
    selectOptions: ["critical", "high", "medium", "low"],
    icon: "lucide:minus",
    group: "triage",
    display: "popover",
    editable: true,
    computed: true
  }),
  f("urgency", "select", {
    selectOptions: ["urgent", "not-urgent"],
    icon: "lucide:clock",
    group: "triage",
    display: "popover",
    editable: true,
    computed: true
  }),
  f("priorityOverride", "checkbox"),
  f("urgencyOverride", "checkbox")
];
const documentFields = () => [
  f("content", "rich_text"),
  f("pinned", "checkbox", {
    icon: "lucide:pin",
    group: "annotation",
    display: "toggle",
    editable: true,
    defaultValue: false
  })
];
const actorFields = () => [
  f("email", "email"),
  f("phone", "phone_number"),
  f("avatar", "url"),
  f("role", "rich_text")
];
const containerFields = () => [
  f("status", "select", {
    selectOptions: ["active", "archived", "completed", "on-hold"],
    icon: "lucide:circle-dot",
    group: "triage",
    display: "popover",
    editable: true
  }),
  f("parentId", "rich_text"),
  f("progress", "number")
];
const taskOntology = {
  "@id": "trellis:schema/task",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Task",
  labelPlural: "Tasks",
  icon: "lucide:check-square",
  color: "blue",
  projections: ["kanban", "calendar", "list", "table", "timeline"],
  defaultProjection: "kanban",
  dialogShell: "temporal",
  panels: { properties: "TaskProperties", content: "TaskContent", footerActions: ["complete", "archive", "delete"] },
  propertyFieldIds: [
    "type",
    "status",
    "startDate",
    "endDate",
    "allDay",
    "timeRange",
    "priority",
    "urgency",
    "category",
    "owner",
    "involved",
    "folder",
    "tags"
  ],
  defaultSortField: "startDate",
  searchFields: ["title", "description", "notes"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("taskStatus", "select", {
      selectOptions: ["pending", "in-progress", "on-track", "due-soon", "overdue", "completed"],
      icon: "lucide:circle-dot",
      group: "triage",
      display: "popover",
      editable: true
    }),
    f("folder", "rich_text", { icon: "lucide:folder", group: "classification", display: "popover", editable: true }),
    f("notes", "rich_text"),
    f("checklistContent", "rich_text")
  ]
};
const eventOntology = {
  "@id": "trellis:schema/event",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Event",
  labelPlural: "Events",
  icon: "lucide:calendar",
  color: "purple",
  projections: ["calendar", "timeline", "list", "table"],
  defaultProjection: "calendar",
  dialogShell: "temporal",
  panels: { properties: "EventProperties", content: "EventContent", footerActions: ["duplicate", "delete"] },
  propertyFieldIds: ["type", "startDate", "endDate", "allDay", "timeRange", "category", "owner", "involved", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "description", "location"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("location", "rich_text"),
    f("conferenceLink", "url"),
    f("eventSubtype", "select", {
      selectOptions: ["meeting", "appointment", "training", "deadline", "social", "other"]
    })
  ]
};
const tripOntology = {
  "@id": "trellis:schema/trip",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Trip",
  labelPlural: "Trips",
  icon: "lucide:plane",
  color: "cyan",
  projections: ["calendar", "timeline", "list", "card-grid"],
  defaultProjection: "calendar",
  dialogShell: "temporal",
  panels: { properties: "TripProperties", content: "TripContent", footerActions: ["duplicate", "archive", "delete"] },
  propertyFieldIds: ["type", "startDate", "endDate", "allDay", "category", "owner", "involved", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "destination", "origin"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("origin", "rich_text"),
    f("destination", "rich_text"),
    f("transportation", "select", { selectOptions: ["flight", "drive", "train", "bus", "other"] }),
    f("budget", "number"),
    f("currency", "rich_text"),
    f("confirmationNumber", "rich_text"),
    f("tripStatus", "select", { selectOptions: ["planning", "booked", "in-progress", "completed", "cancelled"] })
  ]
};
const paymentOntology = {
  "@id": "trellis:schema/payment",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Payment",
  labelPlural: "Payments",
  icon: "lucide:credit-card",
  color: "emerald",
  projections: ["calendar", "list", "table"],
  defaultProjection: "table",
  dialogShell: "temporal",
  panels: { properties: "PaymentProperties", content: "PaymentContent", footerActions: ["markPaid", "void", "delete"] },
  propertyFieldIds: ["type", "startDate", "allDay", "priority", "urgency", "category", "owner", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "payee", "invoiceNumber"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("amount", "number"),
    f("currency", "rich_text"),
    f("payee", "rich_text"),
    f("paymentMethod", "rich_text"),
    f("recurring", "checkbox"),
    f("paymentStatus", "select", { selectOptions: ["pending", "paid", "overdue", "cancelled"] }),
    f("invoiceNumber", "rich_text")
  ]
};
const appointmentOntology = {
  "@id": "trellis:schema/appointment",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Appointment",
  labelPlural: "Appointments",
  icon: "lucide:stethoscope",
  color: "rose",
  projections: ["calendar", "list", "table", "timeline"],
  defaultProjection: "calendar",
  dialogShell: "temporal",
  panels: {
    properties: "AppointmentProperties",
    content: "AppointmentContent",
    footerActions: ["confirm", "reschedule", "cancel", "delete"]
  },
  propertyFieldIds: ["type", "startDate", "endDate", "timeRange", "category", "owner", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "provider", "location", "specialty"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("provider", "rich_text"),
    f("location", "rich_text"),
    f("specialty", "rich_text"),
    f("insurance", "rich_text"),
    f("copay", "number"),
    f("visitNotes", "rich_text"),
    f("followUpDate", "date")
  ]
};
const reminderOntology = {
  "@id": "trellis:schema/reminder",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Reminder",
  labelPlural: "Reminders",
  icon: "lucide:bell",
  color: "amber",
  projections: ["list", "calendar"],
  defaultProjection: "list",
  dialogShell: "temporal",
  panels: {
    properties: "ReminderProperties",
    content: "ReminderContent",
    footerActions: ["acknowledge", "snooze", "delete"]
  },
  propertyFieldIds: ["type", "startDate", "timeRange", "category", "owner", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "description"],
  fields: [...baseFields(), ...temporalFields(), f("acknowledged", "checkbox")]
};
const deadlineOntology = {
  "@id": "trellis:schema/deadline",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Deadline",
  labelPlural: "Deadlines",
  icon: "lucide:alarm-clock",
  color: "red",
  projections: ["calendar", "timeline", "list"],
  defaultProjection: "calendar",
  dialogShell: "temporal",
  panels: {
    properties: "DeadlineProperties",
    content: "DeadlineContent",
    footerActions: ["markMet", "extend", "delete"]
  },
  propertyFieldIds: ["type", "startDate", "allDay", "priority", "urgency", "category", "owner", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "description"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("sourceEntity", "rich_text"),
    f("sourceType", "rich_text"),
    f("isMet", "checkbox")
  ]
};
const milestoneOntology = {
  "@id": "trellis:schema/milestone",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Milestone",
  labelPlural: "Milestones",
  icon: "lucide:flag",
  color: "orange",
  projections: ["timeline", "list", "calendar"],
  defaultProjection: "timeline",
  dialogShell: "temporal",
  panels: { properties: "MilestoneProperties", content: "MilestoneContent", footerActions: ["achieve", "delete"] },
  propertyFieldIds: ["type", "startDate", "allDay", "category", "owner", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "description"],
  fields: [...baseFields(), ...temporalFields(), f("projectId", "rich_text"), f("achieved", "checkbox")]
};
const sprintOntology = {
  "@id": "trellis:schema/sprint",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Sprint",
  labelPlural: "Sprints",
  icon: "lucide:zap",
  color: "violet",
  projections: ["list", "kanban", "timeline"],
  defaultProjection: "list",
  dialogShell: "temporal",
  panels: { properties: "SprintProperties", content: "SprintContent", footerActions: ["complete", "cancel", "delete"] },
  propertyFieldIds: ["type", "startDate", "endDate", "allDay", "category", "owner", "involved", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "description", "sprintGoal"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("sprintGoal", "rich_text"),
    f("sprintStatus", "select", {
      selectOptions: ["planning", "active", "completed", "cancelled"],
      icon: "lucide:circle-dot",
      group: "triage",
      display: "popover",
      editable: true
    }),
    f("velocity", "number"),
    f("checklistContent", "rich_text")
  ]
};
const budgetOntology = {
  "@id": "trellis:schema/budget",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Budget",
  labelPlural: "Budgets",
  icon: "lucide:wallet",
  color: "emerald",
  projections: ["list", "table"],
  defaultProjection: "list",
  dialogShell: "temporal",
  panels: { properties: "BudgetProperties", content: "BudgetContent", footerActions: ["close", "archive", "delete"] },
  propertyFieldIds: ["type", "startDate", "endDate", "category", "owner", "tags"],
  defaultSortField: "startDate",
  searchFields: ["title", "description"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("amount", "number"),
    f("currency", "rich_text"),
    f("budgetStatus", "select", {
      selectOptions: ["draft", "active", "closed", "over-budget"],
      icon: "lucide:circle-dot",
      group: "triage",
      display: "popover",
      editable: true
    })
  ]
};
const githubIssueOntology = {
  "@id": "trellis:schema/github_issue",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Issue",
  labelPlural: "Issues",
  icon: "lucide:circle-dot",
  color: "green",
  projections: ["kanban", "list", "table", "timeline"],
  defaultProjection: "list",
  dialogShell: "temporal",
  panels: {
    properties: "GithubIssueProperties",
    content: "GithubIssueContent",
    footerActions: ["close", "archive", "delete"]
  },
  propertyFieldIds: [
    "type",
    "issueState",
    "priority",
    "labels",
    "assignees",
    "milestone",
    "repositoryFullName",
    "tags"
  ],
  defaultSortField: "updatedAt",
  searchFields: ["title", "body", "labels", "authorLogin", "repositoryFullName"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("number", "number", { icon: "lucide:hash", group: "identifiers", display: "inline-input" }),
    f("body", "rich_text"),
    f("issueState", "select", {
      selectOptions: ["open", "closed"],
      icon: "lucide:circle-dot",
      group: "triage",
      display: "popover",
      editable: true
    }),
    f("stateReason", "select", {
      selectOptions: ["completed", "not_planned", "reopened"],
      icon: "lucide:info",
      group: "triage",
      display: "popover",
      editable: true
    }),
    f("labels", "multi_select", { icon: "lucide:tag", group: "classification", display: "popover", editable: true }),
    f("authorLogin", "rich_text", { icon: "lucide:user", group: "people", display: "inline-input" }),
    f("authorAvatarUrl", "url"),
    f("assignees", "multi_select", { icon: "lucide:users", group: "people", display: "popover", editable: true }),
    f("milestone", "rich_text", { icon: "lucide:flag", group: "classification", display: "inline-input" }),
    f("commentsCount", "number", { icon: "lucide:message-square" }),
    f("closedAt", "date", { icon: "lucide:calendar-check", group: "scheduling", display: "inline-input" }),
    f("url", "url", { icon: "lucide:external-link", group: "identifiers", display: "inline-input" }),
    f("repositoryFullName", "rich_text", {
      icon: "lucide:git-branch",
      group: "classification",
      display: "inline-input"
    }),
    f("repositoryId", "rich_text"),
    f("githubIssueId", "rich_text"),
    f("source", "rich_text"),
    f("connectionId", "rich_text")
  ]
};
const pullRequestOntology = {
  "@id": "trellis:schema/pull_request",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "temporal",
  label: "Pull Request",
  labelPlural: "Pull Requests",
  icon: "lucide:git-pull-request",
  color: "violet",
  projections: ["kanban", "list", "table", "timeline"],
  defaultProjection: "list",
  dialogShell: "temporal",
  panels: {
    properties: "PullRequestProperties",
    content: "PullRequestContent",
    footerActions: ["merge", "close", "delete"]
  },
  propertyFieldIds: [
    "type",
    "prState",
    "priority",
    "labels",
    "reviewers",
    "assignees",
    "baseBranch",
    "headBranch",
    "repositoryFullName",
    "tags"
  ],
  defaultSortField: "updatedAt",
  searchFields: ["title", "body", "labels", "authorLogin", "repositoryFullName"],
  fields: [
    ...baseFields(),
    ...temporalFields(),
    f("number", "number", { icon: "lucide:hash", group: "identifiers", display: "inline-input" }),
    f("body", "rich_text"),
    f("prState", "select", {
      selectOptions: ["open", "closed", "merged", "draft"],
      icon: "lucide:git-pull-request",
      group: "triage",
      display: "popover",
      editable: true
    }),
    f("draft", "checkbox", { icon: "lucide:git-pull-request-draft", group: "triage", display: "toggle" }),
    f("merged", "checkbox", { icon: "lucide:git-merge", group: "triage", display: "toggle" }),
    f("mergeable", "select", {
      selectOptions: ["mergeable", "conflicting", "unknown"],
      icon: "lucide:git-merge",
      group: "triage",
      display: "popover"
    }),
    f("mergedAt", "date", { icon: "lucide:git-merge", group: "scheduling", display: "inline-input" }),
    f("closedAt", "date", { icon: "lucide:calendar-check", group: "scheduling", display: "inline-input" }),
    f("mergedByLogin", "rich_text", { icon: "lucide:user-check", group: "people" }),
    f("authorLogin", "rich_text", { icon: "lucide:user", group: "people", display: "inline-input" }),
    f("authorAvatarUrl", "url"),
    f("assignees", "multi_select", { icon: "lucide:users", group: "people", display: "popover", editable: true }),
    f("reviewers", "multi_select", {
      icon: "lucide:user-check",
      group: "people",
      display: "popover",
      editable: true
    }),
    f("requestedReviewers", "multi_select", {
      icon: "lucide:user-plus",
      group: "people",
      display: "popover",
      editable: true
    }),
    f("labels", "multi_select", { icon: "lucide:tag", group: "classification", display: "popover", editable: true }),
    f("milestone", "rich_text", { icon: "lucide:flag", group: "classification", display: "inline-input" }),
    f("baseBranch", "rich_text", { icon: "lucide:git-branch", group: "git", display: "inline-input" }),
    f("headBranch", "rich_text", { icon: "lucide:git-branch", group: "git", display: "inline-input" }),
    f("baseSha", "rich_text"),
    f("headSha", "rich_text"),
    f("commits", "number", { icon: "lucide:git-commit" }),
    f("additions", "number"),
    f("deletions", "number"),
    f("changedFiles", "number", { icon: "lucide:file-diff" }),
    f("commentsCount", "number", { icon: "lucide:message-square" }),
    f("reviewCommentsCount", "number", { icon: "lucide:message-square-reply" }),
    f("url", "url", { icon: "lucide:external-link", group: "identifiers", display: "inline-input" }),
    f("repositoryFullName", "rich_text", {
      icon: "lucide:git-branch",
      group: "classification",
      display: "inline-input"
    }),
    f("repositoryId", "rich_text"),
    f("githubPrId", "rich_text"),
    f("source", "rich_text"),
    f("connectionId", "rich_text")
  ]
};
const noteOntology = {
  "@id": "trellis:schema/note",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Note",
  labelPlural: "Notes",
  icon: "lucide:sticky-note",
  color: "yellow",
  projections: ["card-grid", "list", "table"],
  defaultProjection: "card-grid",
  dialogShell: "document",
  panels: { properties: "NoteProperties", content: "NoteContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "pin", "category", "owner", "involved", "tags"],
  defaultSortField: "updatedAt",
  searchFields: ["title", "content", "description"],
  fields: [...baseFields(), ...documentFields()]
};
const fileOntology = {
  "@id": "trellis:schema/file",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "File",
  labelPlural: "Files",
  icon: "lucide:file",
  color: "slate",
  projections: ["card-grid", "list", "table"],
  defaultProjection: "card-grid",
  dialogShell: "document",
  panels: { properties: "FileProperties", content: "FileContent", footerActions: ["download", "share", "delete"] },
  propertyFieldIds: ["type", "pin", "category", "owner", "involved", "tags"],
  defaultSortField: "updatedAt",
  searchFields: ["title", "description"],
  fields: [
    ...baseFields(),
    ...documentFields(),
    f("mimeType", "rich_text"),
    f("sizeBytes", "number"),
    f("url", "url"),
    f("storagePath", "rich_text")
  ]
};
const pageOntology = {
  "@id": "trellis:schema/page",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Page",
  labelPlural: "Pages",
  icon: "lucide:book-open",
  color: "indigo",
  projections: ["list", "card-grid"],
  defaultProjection: "list",
  dialogShell: "document",
  panels: { properties: "PageProperties", content: "PageContent", footerActions: ["publish", "archive", "delete"] },
  propertyFieldIds: ["type", "pin", "category", "owner", "involved", "tags"],
  defaultSortField: "updatedAt",
  searchFields: ["title", "content", "description"],
  fields: [...baseFields(), ...documentFields(), f("slug", "rich_text"), f("isPublished", "checkbox")]
};
const templateOntology = {
  "@id": "trellis:schema/template",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Template",
  labelPlural: "Templates",
  icon: "lucide:copy",
  color: "violet",
  projections: ["list", "card-grid", "table"],
  defaultProjection: "list",
  dialogShell: "document",
  panels: {
    properties: "TemplateProperties",
    content: "TemplateContent",
    footerActions: ["useTemplate", "duplicate", "delete"]
  },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description"],
  fields: [...baseFields(), ...documentFields(), f("templateFor", "rich_text")]
};
const slideDeckOntology = {
  "@id": "trellis:schema/slide_deck",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Slide Deck",
  labelPlural: "Slide Decks",
  icon: "lucide:presentation",
  color: "rose",
  projections: ["slide-deck", "list", "table"],
  defaultProjection: "slide-deck",
  dialogShell: "document",
  panels: {
    properties: "SlideDeckProperties",
    content: "SlideDeckContent",
    footerActions: ["present", "duplicate", "delete"]
  },
  propertyFieldIds: ["type", "pin", "category", "owner", "tags"],
  defaultSortField: "updatedAt",
  searchFields: ["title", "description"],
  fields: [...baseFields(), ...documentFields()]
};
const diagramOntology = {
  "@id": "trellis:schema/diagram",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Diagram",
  labelPlural: "Diagrams",
  icon: "lucide:workflow",
  color: "teal",
  projections: ["card-grid", "list", "table"],
  defaultProjection: "card-grid",
  dialogShell: "document",
  panels: { properties: "DiagramProperties", content: "DiagramContent", footerActions: ["pin", "duplicate", "delete"] },
  propertyFieldIds: ["type", "pin", "category", "owner", "tags"],
  defaultSortField: "updatedAt",
  searchFields: ["title", "description", "content"],
  fields: [
    ...baseFields(),
    ...documentFields(),
    f("diagramType", "select", {
      selectOptions: ["flowchart", "sequence", "gantt", "class", "er", "mindmap", "other"]
    })
  ]
};
const bookmarkOntology = {
  "@id": "trellis:schema/bookmark",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Bookmark",
  labelPlural: "Bookmarks",
  icon: "lucide:bookmark",
  color: "sky",
  projections: ["card-grid", "list", "table", "moodboard"],
  defaultProjection: "card-grid",
  dialogShell: "document",
  panels: { properties: "BookmarkProperties", content: "BookmarkContent", footerActions: ["pin", "archive", "delete"] },
  propertyFieldIds: ["pin", "tags"],
  defaultSortField: "updatedAt",
  searchFields: ["title", "url", "description", "siteName", "excerpt"],
  fields: [
    ...baseFields(),
    ...documentFields(),
    f("url", "url", { required: true }),
    f("favicon", "url"),
    f("thumbnail", "url"),
    f("siteName", "rich_text"),
    f("excerpt", "rich_text")
  ]
};
const emailOntology = {
  "@id": "trellis:schema/email",
  "@type": "trellis:Schema",
  version: "1.1.0",
  tier: "system",
  entityClass: "document",
  label: "Email",
  labelPlural: "Emails",
  icon: "lucide:mail",
  color: "red",
  projections: ["list", "table", "card-grid"],
  defaultProjection: "list",
  dialogShell: "document",
  panels: { properties: "EmailProperties", content: "EmailContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["from", "to", "date", "labelIds", "priority", "aiLabels", "tags"],
  defaultSortField: "date",
  searchFields: ["title", "subject", "from", "to", "snippet", "bodyText", "summary", "aiLabels"],
  fields: [
    ...baseFields(),
    ...documentFields(),
    f("subject", "rich_text"),
    f("snippet", "rich_text"),
    f("from", "email"),
    f("to", "rich_text"),
    f("cc", "rich_text"),
    f("bcc", "rich_text"),
    f("date", "date"),
    f("labelIds", "multi_select"),
    f("threadId", "rich_text"),
    f("messageId", "rich_text"),
    f("isRead", "checkbox"),
    f("isStarred", "checkbox"),
    f("bodyText", "rich_text"),
    f("bodyHtml", "rich_text"),
    f("source", "rich_text"),
    f("gmailMessageId", "rich_text"),
    f("gmailThreadId", "rich_text"),
    // ── AI enrichment (populated by gmail-notifier on ingest) ──────
    f("summary", "rich_text"),
    f("summaryGeneratedAt", "date"),
    f("aiSuggestions", "rich_text"),
    f("aiSuggestedTags", "multi_select"),
    f("aiTypeProposals", "rich_text"),
    f("aiLabels", "multi_select"),
    f("aiScannedAt", "date"),
    f("priority", "select", {
      selectOptions: ["critical", "high", "medium", "low"],
      defaultValue: "medium",
      icon: "lucide:flag"
    })
  ]
};
const personOntology = {
  "@id": "trellis:schema/person",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "actor",
  label: "Person",
  labelPlural: "People",
  icon: "lucide:user",
  color: "sky",
  projections: ["table", "card-grid", "list", "graph"],
  defaultProjection: "table",
  dialogShell: "actor",
  panels: { properties: "PersonProperties", content: "PersonContent", footerActions: ["message", "archive", "delete"] },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "email", "jobTitle", "organization"],
  fields: [...baseFields(), ...actorFields(), f("organization", "rich_text"), f("jobTitle", "rich_text")]
};
const contactOntology = {
  "@id": "trellis:schema/contact",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "actor",
  label: "Contact",
  labelPlural: "Contacts",
  icon: "lucide:contact",
  color: "teal",
  projections: ["table", "card-grid", "list"],
  defaultProjection: "table",
  dialogShell: "actor",
  panels: {
    properties: "ContactProperties",
    content: "ContactContent",
    footerActions: ["message", "archive", "delete"]
  },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "email", "company", "phone"],
  fields: [
    ...baseFields(),
    ...actorFields(),
    f("company", "rich_text"),
    f("address", "rich_text"),
    f("notes", "rich_text")
  ]
};
const organizationOntology = {
  "@id": "trellis:schema/organization",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "actor",
  label: "Organization",
  labelPlural: "Organizations",
  icon: "lucide:building-2",
  color: "zinc",
  projections: ["table", "card-grid", "list", "graph"],
  defaultProjection: "table",
  dialogShell: "actor",
  panels: {
    properties: "OrganizationProperties",
    content: "OrganizationContent",
    footerActions: ["archive", "delete"]
  },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "website", "industry"],
  fields: [
    ...baseFields(),
    ...actorFields(),
    f("website", "url"),
    f("industry", "rich_text"),
    f("memberCount", "number")
  ]
};
const vendorOntology = {
  "@id": "trellis:schema/vendor",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "actor",
  label: "Vendor",
  labelPlural: "Vendors",
  icon: "lucide:store",
  color: "lime",
  projections: ["table", "card-grid", "list"],
  defaultProjection: "table",
  dialogShell: "actor",
  panels: { properties: "VendorProperties", content: "VendorContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "email", "services"],
  fields: [
    ...baseFields(),
    ...actorFields(),
    f("services", "multi_select"),
    f("contractEnd", "date"),
    f("rating", "number")
  ]
};
const projectOntology = {
  "@id": "trellis:schema/project",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Project",
  labelPlural: "Projects",
  icon: "lucide:folder-kanban",
  color: "blue",
  projections: ["kanban", "list", "table", "timeline", "dashboard"],
  defaultProjection: "kanban",
  dialogShell: "container",
  panels: {
    properties: "ProjectProperties",
    content: "ProjectContent",
    footerActions: ["archive", "complete", "delete"]
  },
  propertyFieldIds: ["type", "status", "startDate", "endDate", "category", "owner", "involved", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description"],
  fields: [
    ...baseFields(),
    ...containerFields(),
    f("startDate", "date", { icon: "lucide:calendar", group: "scheduling", display: "inline-input", editable: true }),
    f("endDate", "date", {
      icon: "lucide:calendar-range",
      group: "scheduling",
      display: "inline-input",
      editable: true
    }),
    f("budget", "number")
  ]
};
const folderOntology = {
  "@id": "trellis:schema/folder",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Folder",
  labelPlural: "Folders",
  icon: "lucide:folder",
  color: "amber",
  projections: ["list", "table"],
  defaultProjection: "list",
  dialogShell: "container",
  panels: { properties: "FolderProperties", content: "FolderContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description"],
  fields: [...baseFields(), ...containerFields(), f("isSystemGenerated", "checkbox")]
};
const collectionOntology = {
  "@id": "trellis:schema/collection",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Collection",
  labelPlural: "Collections",
  icon: "lucide:database",
  color: "indigo",
  projections: ["list", "card-grid", "table"],
  defaultProjection: "table",
  dialogShell: "container",
  panels: {
    properties: "CollectionProperties",
    content: "CollectionContent",
    footerActions: ["publish", "archive", "delete"]
  },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description"],
  fields: [
    ...baseFields(),
    ...containerFields(),
    f("collectionType", "select", {
      selectOptions: ["database", "document", "board", "calendar", "gallery", "form", "page", "list"]
    })
  ]
};
const goalOntology = {
  "@id": "trellis:schema/goal",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Goal",
  labelPlural: "Goals",
  icon: "lucide:target",
  color: "emerald",
  projections: ["list", "kanban", "table", "timeline"],
  defaultProjection: "kanban",
  dialogShell: "container",
  panels: { properties: "GoalProperties", content: "GoalContent", footerActions: ["complete", "archive", "delete"] },
  propertyFieldIds: ["type", "status", "endDate", "category", "owner", "involved", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description", "metric"],
  fields: [
    ...baseFields(),
    ...containerFields(),
    f("targetDate", "date"),
    f("metric", "rich_text"),
    f("targetValue", "number"),
    f("currentValue", "number"),
    f("endDate", "date", {
      icon: "lucide:calendar-range",
      group: "scheduling",
      display: "inline-input",
      editable: true
    })
  ]
};
const repositoryOntology = {
  "@id": "trellis:schema/repository",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Repository",
  labelPlural: "Repositories",
  icon: "lucide:git-branch",
  color: "slate",
  projections: ["card-grid", "list", "table"],
  defaultProjection: "card-grid",
  dialogShell: "container",
  panels: {
    properties: "RepositoryProperties",
    content: "RepositoryContent",
    footerActions: ["archive", "delete"]
  },
  propertyFieldIds: ["type", "visibility", "language", "defaultBranch", "ownerLogin", "pushedAt", "tags"],
  defaultSortField: "pushedAt",
  searchFields: ["title", "fullName", "description", "topics", "language"],
  fields: [
    ...baseFields(),
    ...containerFields(),
    f("fullName", "rich_text", { icon: "lucide:git-fork", group: "identifiers", display: "inline-input" }),
    f("ownerLogin", "rich_text", { icon: "lucide:user", group: "identifiers", display: "inline-input" }),
    f("ownerAvatarUrl", "url"),
    f("ownerType", "select", {
      selectOptions: ["User", "Organization"],
      icon: "lucide:users",
      group: "identifiers",
      display: "popover"
    }),
    f("url", "url", { icon: "lucide:external-link", group: "identifiers", display: "inline-input" }),
    f("cloneUrl", "url"),
    f("homepage", "url", { icon: "lucide:home", group: "identifiers", display: "inline-input" }),
    f("defaultBranch", "rich_text", {
      icon: "lucide:git-branch",
      group: "classification",
      display: "inline-input"
    }),
    f("visibility", "select", {
      selectOptions: ["public", "private", "internal"],
      icon: "lucide:eye",
      group: "classification",
      display: "popover",
      editable: true
    }),
    f("language", "rich_text", {
      icon: "lucide:code-2",
      group: "classification",
      display: "inline-input"
    }),
    f("topics", "multi_select", {
      icon: "lucide:hash",
      group: "classification",
      display: "popover",
      editable: true
    }),
    f("license", "rich_text"),
    f("stars", "number", { icon: "lucide:star" }),
    f("forks", "number", { icon: "lucide:git-fork" }),
    f("watchers", "number", { icon: "lucide:eye" }),
    f("openIssuesCount", "number", { icon: "lucide:circle-dot" }),
    f("isArchived", "checkbox", { icon: "lucide:archive", group: "classification", display: "toggle" }),
    f("isFork", "checkbox", { icon: "lucide:git-fork", group: "classification", display: "toggle" }),
    f("isPrivate", "checkbox", { icon: "lucide:lock", group: "classification", display: "toggle" }),
    f("isTemplate", "checkbox", { icon: "lucide:copy", group: "classification", display: "toggle" }),
    f("pushedAt", "date", { icon: "lucide:arrow-up-from-line", group: "scheduling", display: "inline-input" }),
    f("githubRepoId", "rich_text"),
    f("source", "rich_text"),
    f("connectionId", "rich_text")
  ]
};
const facilityOntology = {
  "@id": "trellis:schema/facility",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Facility",
  labelPlural: "Facilities",
  icon: "lucide:building-2",
  color: "slate",
  projections: ["list", "card-grid", "graph"],
  defaultProjection: "card-grid",
  dialogShell: "container",
  panels: { properties: "FacilityProperties", content: "FacilityContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "status", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description", "facilityKind"],
  fields: [
    ...baseFields(),
    ...containerFields(),
    f("ownerAgent", "rich_text", {
      icon: "lucide:user",
      group: "people",
      display: "inline-input",
      editable: true
    }),
    f("facilityKind", "select", {
      selectOptions: ["root", "agent", "team", "project", "registry"],
      icon: "lucide:building",
      group: "classification",
      display: "popover",
      editable: true,
      defaultValue: "agent"
    })
  ]
};
const zoneOntology = {
  "@id": "trellis:schema/zone",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Zone",
  labelPlural: "Zones",
  icon: "lucide:layout-panel-left",
  color: "indigo",
  projections: ["list", "table", "graph"],
  defaultProjection: "list",
  dialogShell: "container",
  panels: { properties: "ZoneProperties", content: "ZoneContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "status", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description", "zoneKind"],
  fields: [
    ...baseFields(),
    ...containerFields(),
    f("zoneKind", "select", {
      required: true,
      selectOptions: ["lab", "lobby", "workshop", "showroom", "classroom", "giftshop", "vault"],
      icon: "lucide:layout-panel-left",
      group: "classification",
      display: "popover",
      editable: true
    }),
    f("facilityId", "rich_text", {
      icon: "lucide:building-2",
      group: "classification",
      display: "inline-input",
      editable: true
    }),
    // JSON-encoded CapabilityGrant[] — actions + target filters
    f("grants", "rich_text"),
    f("memberAgents", "multi_select", {
      icon: "lucide:users",
      group: "people",
      display: "popover",
      editable: true
    }),
    f("publicRead", "checkbox", {
      icon: "lucide:eye",
      group: "classification",
      display: "toggle",
      editable: true,
      defaultValue: false
    })
  ]
};
const agentOntology = {
  "@id": "trellis:schema/agent",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "actor",
  label: "Agent",
  labelPlural: "Agents",
  icon: "lucide:bot",
  color: "purple",
  projections: ["card-grid", "list", "table", "graph"],
  defaultProjection: "card-grid",
  dialogShell: "actor",
  panels: { properties: "AgentProperties", content: "AgentContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description", "role", "model"],
  fields: [
    ...baseFields(),
    ...actorFields(),
    f("agentStatus", "select", {
      selectOptions: ["active", "inactive", "deprecated"],
      icon: "lucide:circle-dot",
      group: "triage",
      display: "popover",
      editable: true,
      defaultValue: "active"
    }),
    f("model", "rich_text", {
      icon: "lucide:cpu",
      group: "classification",
      display: "inline-input",
      editable: true
    }),
    f("provider", "select", {
      selectOptions: ["anthropic", "openai", "google", "ollama", "local", "human"],
      icon: "lucide:plug",
      group: "classification",
      display: "popover",
      editable: true
    }),
    f("systemPrompt", "rich_text"),
    // JSON-encoded graph scope — entity types and filters this agent reads/writes
    f("memoryScope", "rich_text"),
    // JSON-encoded list of MCP tools available to this agent
    f("toolManifest", "rich_text"),
    f("homeFacility", "rich_text", {
      icon: "lucide:building-2",
      group: "classification",
      display: "inline-input",
      editable: true
    }),
    f("walletId", "rich_text", {
      icon: "lucide:wallet",
      group: "identifiers",
      display: "inline-input",
      editable: true
    }),
    f("invitedToZones", "multi_select", {
      icon: "lucide:door-open",
      group: "classification",
      display: "popover",
      editable: true
    })
  ]
};
const walletOntology = {
  "@id": "trellis:schema/wallet",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "actor",
  label: "Wallet",
  labelPlural: "Wallets",
  icon: "lucide:wallet",
  color: "amber",
  projections: ["list", "table", "card-grid"],
  defaultProjection: "card-grid",
  dialogShell: "actor",
  panels: { properties: "WalletProperties", content: "WalletContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "title",
  searchFields: ["title", "description", "identity"],
  fields: [
    ...baseFields(),
    ...actorFields(),
    // Ed25519 public key (base58 or hex). Placeholder string in Phase 0.
    f("identity", "rich_text", {
      icon: "lucide:key",
      group: "identifiers",
      display: "inline-input",
      editable: true
    }),
    // JSON-encoded reputation projection — derived from op-log retention scores
    f("reputation", "rich_text"),
    f("holdsAgent", "rich_text", {
      icon: "lucide:bot",
      group: "people",
      display: "inline-input",
      editable: true
    }),
    f("grantedZones", "multi_select", {
      icon: "lucide:door-open",
      group: "classification",
      display: "popover",
      editable: true
    })
  ]
};
const decisionOntology = {
  "@id": "trellis:schema/decision",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Decision",
  labelPlural: "Decisions",
  icon: "lucide:git-branch",
  color: "cyan",
  projections: ["list", "table", "timeline"],
  defaultProjection: "list",
  dialogShell: "document",
  panels: { properties: "DecisionProperties", content: "DecisionContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "createdAt",
  searchFields: ["title", "rationale", "outcome", "toolName"],
  fields: [
    ...baseFields(),
    ...documentFields(),
    f("rationale", "rich_text"),
    // JSON-encoded snapshot of the graph state the agent considered
    f("contextSnapshot", "rich_text"),
    f("outcome", "select", {
      selectOptions: ["proposed", "executed", "rejected", "superseded", "pending"],
      icon: "lucide:circle-dot",
      group: "triage",
      display: "popover",
      editable: true,
      defaultValue: "executed"
    }),
    f("toolName", "rich_text", {
      icon: "lucide:wrench",
      group: "identifiers",
      display: "inline-input",
      editable: true
    }),
    // JSON-encoded tool call input
    f("toolInput", "rich_text"),
    // JSON-encoded list of options the agent considered but did not choose
    f("alternatives", "rich_text"),
    f("byAgent", "rich_text", {
      icon: "lucide:bot",
      group: "people",
      display: "inline-input",
      editable: true
    }),
    f("inZone", "rich_text", {
      icon: "lucide:layout-panel-left",
      group: "classification",
      display: "inline-input",
      editable: true
    }),
    f("informedBy", "multi_select", {
      icon: "lucide:link",
      group: "classification",
      display: "popover",
      editable: true
    }),
    f("supersedes", "rich_text", {
      icon: "lucide:corner-down-right",
      group: "classification",
      display: "inline-input",
      editable: true
    }),
    f("producesArtifact", "rich_text", {
      icon: "lucide:package",
      group: "classification",
      display: "inline-input",
      editable: true
    })
  ]
};
const artifactOntology = {
  "@id": "trellis:schema/artifact",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Artifact",
  labelPlural: "Artifacts",
  icon: "lucide:package",
  color: "teal",
  projections: ["card-grid", "list", "table"],
  defaultProjection: "card-grid",
  dialogShell: "document",
  panels: { properties: "ArtifactProperties", content: "ArtifactContent", footerActions: ["archive", "delete"] },
  propertyFieldIds: ["type", "category", "owner", "tags"],
  defaultSortField: "updatedAt",
  searchFields: ["title", "description", "contentRef"],
  fields: [
    ...baseFields(),
    ...documentFields(),
    f("artifactType", "select", {
      selectOptions: ["code", "design", "document", "data", "diagram", "deliverable", "other"],
      icon: "lucide:layers",
      group: "classification",
      display: "popover",
      editable: true,
      defaultValue: "document"
    }),
    f("contentRef", "rich_text", {
      icon: "lucide:link",
      group: "identifiers",
      display: "inline-input",
      editable: true
    }),
    f("artifactVersion", "rich_text", {
      icon: "lucide:tag",
      group: "identifiers",
      display: "inline-input",
      editable: true
    }),
    f("createdByAgent", "rich_text", {
      icon: "lucide:bot",
      group: "people",
      display: "inline-input",
      editable: true
    }),
    f("publishedInZone", "rich_text", {
      icon: "lucide:layout-panel-left",
      group: "classification",
      display: "inline-input",
      editable: true
    }),
    f("usedIn", "multi_select", {
      icon: "lucide:folder",
      group: "classification",
      display: "popover",
      editable: true
    })
  ]
};
const SIDEBAR_NODE_NAMESPACE = "sidebar_node";
const sidebarNodeOntology = {
  "@id": `trellis:schema/${SIDEBAR_NODE_NAMESPACE}`,
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "core",
  fields: [
    f("label", "title", { required: true }),
    f("icon", "rich_text"),
    f("routePath", "rich_text"),
    f("entityType", "rich_text"),
    f("scope", "select", { required: true, selectOptions: ["workspace", "database", "settings", "graph"] }),
    f("nodeType", "select", { required: true, selectOptions: ["section", "item", "separator"] }),
    f("locked", "checkbox"),
    f("collapsed", "checkbox"),
    f("order", "number"),
    f("worldId", "rich_text"),
    f("sectionKey", "rich_text"),
    f("specialItems", "rich_text"),
    f("editable", "checkbox")
  ]
};
const entityOntology = {
  "@id": `trellis:schema/${ENTITY_NAMESPACE}`,
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  fields: [
    f("type", "select", {
      required: true,
      selectOptions: [
        "task",
        "event",
        "trip",
        "payment",
        "note",
        "appointment",
        "reminder",
        "deadline",
        "milestone",
        "sprint",
        "budget",
        "bookmark",
        "email",
        "file",
        "page",
        "template",
        "slide_deck",
        "diagram",
        "person",
        "contact",
        "organization",
        "vendor",
        "project",
        "folder",
        "collection",
        "goal",
        "repository",
        "github_issue",
        "pull_request",
        "integration_definition",
        "integration_connection",
        // Campus Substrate (Phase 0)
        "facility",
        "zone",
        "agent",
        "wallet",
        "decision",
        "artifact"
      ]
    }),
    f("title", "title", { required: true }),
    f("description", "rich_text"),
    f("startDate", "date"),
    f("endDate", "date"),
    f("allDay", "checkbox"),
    f("startTime", "rich_text"),
    f("endTime", "rich_text"),
    f("priority", "select", { selectOptions: ["critical", "high", "medium", "low"] }),
    f("urgency", "select", { selectOptions: ["urgent", "not-urgent"] }),
    f("priorityOverride", "checkbox"),
    f("urgencyOverride", "checkbox"),
    f("category", "select", {
      selectOptions: [
        "general",
        "work",
        "personal",
        "meeting",
        "review",
        "appointment",
        "deadline",
        "health",
        "finance",
        "travel"
      ]
    }),
    f("tags", "multi_select"),
    f("owner", "rich_text"),
    f("involved", "multi_select"),
    f("folder", "rich_text"),
    f("notes", "rich_text"),
    f("taskStatus", "select", {
      selectOptions: ["pending", "in-progress", "on-track", "due-soon", "overdue", "completed"]
    }),
    f("location", "rich_text"),
    f("conferenceLink", "url"),
    f("eventType", "select", { selectOptions: ["meeting", "appointment", "training", "deadline", "social", "other"] }),
    f("amount", "number"),
    f("currency", "rich_text"),
    f("payee", "rich_text"),
    f("paymentMethod", "rich_text"),
    f("recurring", "checkbox"),
    f("paymentStatus", "select", { selectOptions: ["pending", "paid", "overdue", "cancelled"] }),
    f("content", "rich_text"),
    f("pinned", "checkbox"),
    f("origin", "rich_text"),
    f("destination", "rich_text"),
    f("transportation", "select", { selectOptions: ["flight", "drive", "train", "bus", "other"] }),
    f("budget", "number"),
    f("confirmationNumber", "rich_text"),
    f("tripStatus", "select", { selectOptions: ["planning", "booked", "in-progress", "completed", "cancelled"] }),
    f("checklistContent", "rich_text"),
    // Integration fields (shared across integration_definition + integration_connection entities)
    f("provider", "rich_text"),
    f("authType", "select", { selectOptions: ["oauth", "api_key", "webhook", "none"] }),
    f("icon", "rich_text"),
    f("color", "rich_text"),
    f("features", "multi_select"),
    f("docsUrl", "url"),
    f("webhookSupport", "checkbox"),
    f("pushNotificationSupport", "checkbox"),
    f("enrichmentSupport", "checkbox"),
    f("syncDirection", "select", { selectOptions: ["import", "export", "bidirectional"] }),
    f("requiredScopes", "multi_select"),
    f("configSchema", "rich_text"),
    f("integrationStatus", "select", { selectOptions: ["available", "beta", "deprecated"] }),
    f("integrationId", "rich_text"),
    f("userId", "rich_text"),
    f("connectionStatus", "select", { selectOptions: ["connected", "error", "configuring", "disconnected"] }),
    f("connectedAt", "date"),
    f("lastSyncAt", "date"),
    f("syncEnabled", "checkbox"),
    f("syncIntervalMs", "number"),
    f("accountEmail", "email"),
    f("accountName", "rich_text"),
    f("config", "rich_text"),
    f("credentialsRef", "rich_text"),
    f("watchChannelId", "rich_text"),
    f("watchExpiration", "date"),
    f("errorMessage", "rich_text"),
    f("syncedEntityCount", "number"),
    // Google Calendar sync fields (for synced event entities)
    f("source", "rich_text"),
    f("googleEventId", "rich_text"),
    f("googleCalendarId", "rich_text"),
    f("htmlLink", "url"),
    f("googleStatus", "rich_text"),
    f("googleUpdatedAt", "rich_text"),
    f("gcalDeleted", "checkbox"),
    // Event participants (persisted from Google Calendar payloads as
    // "Name <email>" strings so they match the Gmail from/to/cc format
    // and can be parsed by the same people-from-emails logic).
    f("organizer", "rich_text"),
    f("attendees", "multi_select"),
    // Email-specific fields (for synced email entities)
    f("subject", "rich_text"),
    f("snippet", "rich_text"),
    f("from", "rich_text"),
    f("to", "rich_text"),
    f("cc", "rich_text"),
    f("bcc", "rich_text"),
    f("date", "date"),
    f("labelIds", "multi_select"),
    f("threadId", "rich_text"),
    f("messageId", "rich_text"),
    f("isRead", "checkbox"),
    f("isStarred", "checkbox"),
    f("bodyText", "rich_text"),
    f("bodyHtml", "rich_text"),
    f("gmailMessageId", "rich_text"),
    f("gmailThreadId", "rich_text"),
    // GitHub-specific fields (repository / issue / pull_request entities)
    f("fullName", "rich_text"),
    f("ownerLogin", "rich_text"),
    f("ownerAvatarUrl", "url"),
    f("ownerType", "select", { selectOptions: ["User", "Organization"] }),
    f("url", "url"),
    f("cloneUrl", "url"),
    f("homepage", "url"),
    f("defaultBranch", "rich_text"),
    f("visibility", "select", { selectOptions: ["public", "private", "internal"] }),
    f("language", "rich_text"),
    f("topics", "multi_select"),
    f("license", "rich_text"),
    f("stars", "number"),
    f("forks", "number"),
    f("watchers", "number"),
    f("openIssuesCount", "number"),
    f("isArchived", "checkbox"),
    f("isFork", "checkbox"),
    f("isPrivate", "checkbox"),
    f("isTemplate", "checkbox"),
    f("pushedAt", "date"),
    f("githubRepoId", "rich_text"),
    f("number", "number"),
    f("body", "rich_text"),
    f("issueState", "select", { selectOptions: ["open", "closed"] }),
    f("stateReason", "select", { selectOptions: ["completed", "not_planned", "reopened"] }),
    f("prState", "select", { selectOptions: ["open", "closed", "merged", "draft"] }),
    f("draft", "checkbox"),
    f("merged", "checkbox"),
    f("mergeable", "select", { selectOptions: ["mergeable", "conflicting", "unknown"] }),
    f("mergedAt", "date"),
    f("closedAt", "date"),
    f("mergedByLogin", "rich_text"),
    f("authorLogin", "rich_text"),
    f("authorAvatarUrl", "url"),
    f("assignees", "multi_select"),
    f("reviewers", "multi_select"),
    f("requestedReviewers", "multi_select"),
    f("labels", "multi_select"),
    f("milestone", "rich_text"),
    f("baseBranch", "rich_text"),
    f("headBranch", "rich_text"),
    f("baseSha", "rich_text"),
    f("headSha", "rich_text"),
    f("commits", "number"),
    f("additions", "number"),
    f("deletions", "number"),
    f("changedFiles", "number"),
    f("commentsCount", "number"),
    f("reviewCommentsCount", "number"),
    f("repositoryFullName", "rich_text"),
    f("repositoryId", "rich_text"),
    f("githubIssueId", "rich_text"),
    f("githubPrId", "rich_text"),
    f("connectionId", "rich_text")
  ]
};
const commentOntology = {
  "@id": "trellis:schema/comment",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  fields: [
    f("entityId", "rich_text", { required: true }),
    f("entityType", "select", {
      required: true,
      selectOptions: ["entity", "task", "note", "event", "payment", "trip"]
    }),
    f("authorId", "rich_text", { required: true }),
    f("authorName", "rich_text", { required: true }),
    f("authorAvatar", "rich_text"),
    f("content", "rich_text", { required: true }),
    f("type", "select", { required: true, selectOptions: ["comment", "status_change", "attachment", "created"] }),
    f("metadata", "rich_text"),
    f("createdAt", "number"),
    f("updatedAt", "number"),
    f("deletedAt", "number")
  ]
};
const NOTIFICATION_NAMESPACE = "notification";
const notificationOntology = {
  "@id": `trellis:schema/${NOTIFICATION_NAMESPACE}`,
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  fields: [
    f("title", "title", { required: true }),
    f("body", "rich_text"),
    // Visual kind — drives icon + color + sound selection
    f("kind", "select", {
      required: true,
      selectOptions: ["success", "error", "warning", "info", "reminder", "email", "calendar", "alert", "ops", "job"]
    }),
    // Origin system that produced the notification
    f("source", "select", {
      required: true,
      selectOptions: ["system", "email", "calendar", "graph", "job", "ops", "workflow", "ai", "user"]
    }),
    f("sourceId", "rich_text"),
    f("priority", "select", { selectOptions: ["critical", "high", "normal", "low"], defaultValue: "normal" }),
    f("status", "select", {
      selectOptions: ["unread", "read", "archived", "snoozed"],
      required: true,
      defaultValue: "unread"
    }),
    f("readAt", "date"),
    f("snoozeUntil", "date"),
    f("archivedAt", "date"),
    // Optional visual overrides
    f("icon", "rich_text"),
    f("color", "rich_text"),
    f("sound", "select", { selectOptions: ["success", "fail", "reminder", "email", "none"] }),
    // Link to a related entity (for deep-link CTA + filtering)
    f("entityId", "rich_text"),
    f("entityType", "rich_text"),
    f("url", "url"),
    // CTA actions serialized as JSON: [{ id, label, kind, ... }]
    f("actions", "rich_text"),
    // Raw payload for source-specific metadata (JSON)
    f("metadata", "rich_text"),
    f("groupKey", "rich_text"),
    f("createdAt", "date"),
    f("updatedAt", "date")
  ]
};
const entityTypeOntologies = {
  "trellis:schema/task": taskOntology,
  "trellis:schema/event": eventOntology,
  "trellis:schema/trip": tripOntology,
  "trellis:schema/payment": paymentOntology,
  "trellis:schema/appointment": appointmentOntology,
  "trellis:schema/reminder": reminderOntology,
  "trellis:schema/deadline": deadlineOntology,
  "trellis:schema/milestone": milestoneOntology,
  "trellis:schema/sprint": sprintOntology,
  "trellis:schema/budget": budgetOntology,
  "trellis:schema/github_issue": githubIssueOntology,
  "trellis:schema/pull_request": pullRequestOntology,
  "trellis:schema/note": noteOntology,
  "trellis:schema/file": fileOntology,
  "trellis:schema/page": pageOntology,
  "trellis:schema/template": templateOntology,
  "trellis:schema/slide_deck": slideDeckOntology,
  "trellis:schema/diagram": diagramOntology,
  "trellis:schema/bookmark": bookmarkOntology,
  "trellis:schema/email": emailOntology,
  "trellis:schema/person": personOntology,
  "trellis:schema/contact": contactOntology,
  "trellis:schema/organization": organizationOntology,
  "trellis:schema/vendor": vendorOntology,
  "trellis:schema/project": projectOntology,
  "trellis:schema/folder": folderOntology,
  "trellis:schema/collection": collectionOntology,
  "trellis:schema/goal": goalOntology,
  "trellis:schema/repository": repositoryOntology,
  // ── Campus Substrate (Phase 0) ─────────────────────────────────────
  "trellis:schema/facility": facilityOntology,
  "trellis:schema/zone": zoneOntology,
  "trellis:schema/agent": agentOntology,
  "trellis:schema/wallet": walletOntology,
  "trellis:schema/decision": decisionOntology,
  "trellis:schema/artifact": artifactOntology
};
const integrationDefinitionOntology = {
  "@id": "trellis:schema/integration_definition",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Integration",
  labelPlural: "Integrations",
  icon: "lucide:plug",
  color: "violet",
  projections: ["list", "card-grid"],
  defaultProjection: "card-grid",
  searchFields: ["title", "description", "provider"],
  fields: [
    f("title", "title", { required: true }),
    f("description", "rich_text"),
    f("provider", "rich_text", { required: true }),
    f("category", "select", {
      selectOptions: ["data", "auth", "communication", "storage", "automation", "analytics"],
      required: true,
      icon: "lucide:tag",
      group: "classification",
      display: "popover",
      editable: true
    }),
    f("authType", "select", {
      selectOptions: ["oauth", "api_key", "webhook", "none"],
      required: true,
      icon: "lucide:key",
      group: "classification",
      display: "popover",
      editable: true
    }),
    f("icon", "rich_text"),
    f("color", "rich_text"),
    f("features", "multi_select"),
    f("docsUrl", "url"),
    f("webhookSupport", "checkbox"),
    f("pushNotificationSupport", "checkbox"),
    f("enrichmentSupport", "checkbox"),
    f("syncDirection", "select", { selectOptions: ["import", "export", "bidirectional"] }),
    f("requiredScopes", "multi_select"),
    f("configSchema", "rich_text"),
    f("integrationStatus", "select", {
      selectOptions: ["available", "beta", "deprecated"],
      defaultValue: "available"
    })
  ]
};
const integrationConnectionOntology = {
  "@id": "trellis:schema/integration_connection",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Integration Connection",
  labelPlural: "Integration Connections",
  icon: "lucide:link",
  color: "green",
  projections: ["list"],
  defaultProjection: "list",
  searchFields: ["title", "integrationId"],
  fields: [
    f("title", "title", { required: true }),
    f("integrationId", "rich_text", { required: true }),
    f("userId", "rich_text", { required: true }),
    f("connectionStatus", "select", {
      selectOptions: ["connected", "error", "configuring", "disconnected"],
      required: true,
      defaultValue: "configuring",
      icon: "lucide:circle-dot",
      group: "triage",
      display: "popover",
      editable: true
    }),
    f("connectedAt", "date"),
    f("lastSyncAt", "date"),
    f("syncEnabled", "checkbox", { defaultValue: true }),
    f("syncIntervalMs", "number", { defaultValue: 9e5 }),
    f("accountEmail", "email"),
    f("accountName", "rich_text"),
    f("config", "rich_text"),
    f("credentialsRef", "rich_text"),
    f("watchChannelId", "rich_text"),
    f("watchExpiration", "date"),
    f("errorMessage", "rich_text"),
    f("syncedEntityCount", "number")
  ]
};
const channelOntology = {
  "@id": "trellis:schema/channel",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "container",
  label: "Channel",
  labelPlural: "Channels",
  icon: "lucide:hash",
  color: "sky",
  projections: ["list"],
  defaultProjection: "list",
  searchFields: ["title", "description"],
  fields: [
    f("title", "title", { required: true }),
    f("slug", "rich_text", { icon: "lucide:hash", group: "classification", display: "inline-input", editable: true }),
    f("description", "rich_text"),
    f("type", "select", {
      selectOptions: ["public", "private", "dm", "thread"],
      icon: "lucide:lock",
      group: "classification",
      display: "popover",
      editable: true
    }),
    f("icon", "rich_text"),
    f("orgId", "rich_text"),
    f("memberIds", "multi_select"),
    f("entityId", "rich_text"),
    f("lastMessageAt", "date"),
    f("createdBy", "rich_text"),
    f("createdAt", "date")
  ]
};
const messageOntology = {
  "@id": "trellis:schema/message",
  "@type": "trellis:Schema",
  version: "1.0.0",
  tier: "system",
  entityClass: "document",
  label: "Message",
  labelPlural: "Messages",
  icon: "lucide:message-square",
  color: "sky",
  projections: ["list"],
  defaultProjection: "list",
  searchFields: ["content", "authorName"],
  fields: [
    f("content", "rich_text", { required: true }),
    f("channelId", "rich_text"),
    f("authorId", "rich_text"),
    f("authorName", "rich_text"),
    f("authorAvatar", "url"),
    f("replyToId", "rich_text"),
    f("reactions", "json"),
    f("entityRefs", "json"),
    f("edited", "checkbox"),
    f("editedAt", "date"),
    f("deletedAt", "date"),
    f("createdAt", "date")
  ]
};
function createWorkspaceConfig() {
  return {
    workspace: {
      name: "Trellis",
      description: "Single graph, many projections \u2014 all app data as a graph.",
      ontologies: {
        // System ontologies
        [`trellis:schema/${ENTITY_NAMESPACE}`]: entityOntology,
        "trellis:schema/comment": commentOntology,
        [`trellis:schema/${NOTIFICATION_NAMESPACE}`]: notificationOntology,
        [`trellis:schema/${SIDEBAR_NODE_NAMESPACE}`]: sidebarNodeOntology,
        // Chat ontologies
        "trellis:schema/channel": channelOntology,
        "trellis:schema/message": messageOntology,
        // Integration ontologies
        "trellis:schema/integration_definition": integrationDefinitionOntology,
        "trellis:schema/integration_connection": integrationConnectionOntology,
        // Per-type ontologies (all 22 entity types)
        ...entityTypeOntologies
      },
      routes: getRouteDefinitions(),
      app: {
        "@id": "trellis:app",
        "@type": "trellis:App",
        title: "Trellis",
        description: "Personal knowledge graph platform",
        version: "0.1.0",
        devPort: DEV_PORT
      },
      projections: {
        "trellis:projection/all-tasks": {
          "@id": "trellis:projection/all-tasks",
          "@type": "trellis:Projection",
          name: "All Tasks",
          type: "table",
          query: `${entityQuery("?t")} WHERE ?t.type = "task"`
        },
        "trellis:projection/all-events": {
          "@id": "trellis:projection/all-events",
          "@type": "trellis:Projection",
          name: "All Events",
          type: "table",
          query: `${entityQuery("?e")} WHERE ?e.type = "event"`
        },
        "trellis:projection/all-notes": {
          "@id": "trellis:projection/all-notes",
          "@type": "trellis:Projection",
          name: "All Notes",
          type: "card-grid",
          query: `${entityQuery("?n")} WHERE ?n.type = "note"`
        },
        "trellis:projection/all-payments": {
          "@id": "trellis:projection/all-payments",
          "@type": "trellis:Projection",
          name: "All Payments",
          type: "table",
          query: `${entityQuery("?p")} WHERE ?p.type = "payment"`
        }
      }
    }
  };
}

const FOUNDER_FACILITY_ID = "entity:founder-facility";
const FOUNDER_LAB_ZONE_ID = "entity:founder-facility-lab";
const FOUNDER_LOBBY_ZONE_ID = "entity:founder-facility-lobby";
const FOUNDER_WORKSHOP_ZONE_ID = "entity:founder-facility-workshop";
const FOUNDER_SHOWROOM_ZONE_ID = "entity:founder-facility-showroom";
const FOUNDER_VAULT_ZONE_ID = "entity:founder-facility-vault";
let _eventCounter = 0;
const _listeners$1 = /* @__PURE__ */ new Set();
function emitMutation(entry) {
  const event = {
    ...entry,
    id: ++_eventCounter,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    zoneId: entry.zoneId || FOUNDER_LAB_ZONE_ID,
    facilityId: entry.facilityId || FOUNDER_FACILITY_ID
  };
  for (const listener of _listeners$1) {
    try {
      listener(event);
    } catch {
    }
  }
  return event;
}
function onMutation(listener) {
  _listeners$1.add(listener);
  return () => {
    _listeners$1.delete(listener);
  };
}
function getListenerCount() {
  return _listeners$1.size;
}

function mutationActionToGrantAction(action) {
  switch (action) {
    case "deleteNode":
      return "DELETE";
    case "createNode":
    case "updateNode":
    case "link":
    case "unlink":
      return "WRITE";
    default:
      return "WRITE";
  }
}
function scopeMatches(grant, agentId, ctx) {
  const scope = grant.scope || {};
  const hasAnyGate = Boolean(scope.public || scope.ownerOnly || scope.membersOnly);
  if (!hasAnyGate) return true;
  if (scope.public) return true;
  if (scope.ownerOnly && ctx.ownerAgent && agentId === ctx.ownerAgent) return true;
  if (scope.membersOnly && ctx.memberAgents.includes(agentId)) return true;
  return false;
}
function evaluateGrant(event, ctx) {
  const requested = mutationActionToGrantAction(event.action);
  if (ctx.ownerAgent && event.agentId === ctx.ownerAgent) {
    return {
      allowed: true,
      reason: `agent is the owner of facility ${ctx.facilityId || "?"}`
    };
  }
  for (const grant of ctx.grants) {
    const actionOk = grant.action === "ALL" || grant.action === requested;
    if (!actionOk) continue;
    if (scopeMatches(grant, event.agentId, ctx)) {
      return {
        allowed: true,
        matchedGrant: grant,
        reason: `matched grant action=${grant.action} scope=${JSON.stringify(grant.scope)}`
      };
    }
  }
  return {
    allowed: false,
    reason: `no grant in zone ${ctx.zoneId} matches ${requested} for agent ${event.agentId}`
  };
}
function parseGrants(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
function coerceStringArray(raw) {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
  if (typeof raw === "string" && raw.length > 0) return [raw];
  return [];
}
function readEntityAttrs(kernel, entityId) {
  var _a;
  try {
    const store = (_a = kernel.getStore) == null ? void 0 : _a.call(kernel);
    if (!store || typeof store.getFactsByEntity !== "function") return null;
    const facts = store.getFactsByEntity(entityId);
    if (!facts.length) return null;
    const attrs = {};
    for (const fact of facts) attrs[fact.a] = fact.v;
    return attrs;
  } catch {
    return null;
  }
}
const _zoneCache = /* @__PURE__ */ new Map();
function loadZoneContext(kernel, zoneId) {
  var _a;
  if (_zoneCache.has(zoneId)) return (_a = _zoneCache.get(zoneId)) != null ? _a : null;
  const zoneAttrs = readEntityAttrs(kernel, zoneId);
  if (!zoneAttrs) {
    _zoneCache.set(zoneId, null);
    return null;
  }
  const facilityId = typeof zoneAttrs.facilityId === "string" ? zoneAttrs.facilityId : void 0;
  let ownerAgent;
  if (facilityId) {
    const facilityAttrs = readEntityAttrs(kernel, facilityId);
    if (facilityAttrs && typeof facilityAttrs.ownerAgent === "string") {
      ownerAgent = facilityAttrs.ownerAgent;
    }
  }
  const ctx = {
    zoneId,
    zoneKind: typeof zoneAttrs.zoneKind === "string" ? zoneAttrs.zoneKind : void 0,
    facilityId,
    ownerAgent,
    memberAgents: coerceStringArray(zoneAttrs.memberAgents),
    publicRead: Boolean(zoneAttrs.publicRead),
    grants: parseGrants(zoneAttrs.grants)
  };
  _zoneCache.set(zoneId, ctx);
  return ctx;
}
function invalidateZoneCache(zoneId) {
  _zoneCache.delete(zoneId);
}
function getZoneGuardMode() {
  const raw = (process.env.TRELLIS_ZONE_GUARD_MODE || "").trim().toLowerCase();
  if (raw === "strict" || raw === "off") return raw;
  return "advisory";
}
function checkMutation(kernel, event) {
  if (!event.zoneId) {
    return {
      decision: { allowed: false, reason: "event missing zoneId" },
      ctx: null
    };
  }
  const ctx = loadZoneContext(kernel, event.zoneId);
  if (!ctx) {
    return {
      decision: { allowed: false, reason: `unknown zone ${event.zoneId}` },
      ctx: null
    };
  }
  return { decision: evaluateGrant(event, ctx), ctx };
}
let _initialized = false;
const _stats = { total: 0, allow: 0, deny: 0, unknownZone: 0, rejected: 0 };
function recordStrictRejection() {
  _stats.rejected++;
}
function initZoneGuard(kernel) {
  if (_initialized) return;
  _initialized = true;
  const mode = getZoneGuardMode();
  const modeLabel = mode === "strict" ? "STRICT (rejects on DENY)" : mode === "off" ? "OFF (no logging)" : "advisory (logs only)";
  console.log(`[zone-guard] Mode: ${modeLabel} \u2014 set TRELLIS_ZONE_GUARD_MODE=off|advisory|strict to change`);
  onMutation((event) => {
    try {
      if (event.type === "zone" && event.entityId) invalidateZoneCache(event.entityId);
      if (event.type === "facility") _zoneCache.clear();
      if (getZoneGuardMode() === "off") return;
      const zoneId = event.zoneId;
      if (!zoneId) return;
      _stats.total++;
      const ctx = loadZoneContext(kernel, zoneId);
      if (!ctx) {
        _stats.unknownZone++;
        console.warn(
          `[zone-guard] UNKNOWN zone=${zoneId} event=#${event.id} action=${event.action} agent=${event.agentId}`
        );
        return;
      }
      const decision = evaluateGrant(event, ctx);
      if (decision.allowed) {
        _stats.allow++;
        console.debug(
          `[zone-guard] ALLOW agent=${event.agentId} action=${event.action} zone=${ctx.zoneKind || zoneId} event=#${event.id}`
        );
      } else {
        _stats.deny++;
        console.warn(
          `[zone-guard] DENY (advisory) agent=${event.agentId} action=${event.action} zone=${ctx.zoneKind || zoneId} event=#${event.id} reason="${decision.reason}"`
        );
      }
    } catch (err) {
      console.warn(`[zone-guard] evaluation error for event #${event.id}:`, err);
    }
  });
}
function getZoneGuardStats() {
  return { ..._stats };
}

const SUBSTRATE_CONTAINER_TYPES = /* @__PURE__ */ new Set(["facility", "zone", "agent", "wallet"]);
async function backfillEntityZones(kernel) {
  var _a;
  const report = {
    scanned: 0,
    alreadyTagged: 0,
    substrateSkipped: 0,
    backfilled: 0,
    failed: 0
  };
  const store = (_a = kernel.getStore) == null ? void 0 : _a.call(kernel);
  if (!store || typeof store.getAllFacts !== "function") {
    console.warn("[campus-migration] kernel.getStore() unavailable; skipping backfill");
    return report;
  }
  const entityTypes = /* @__PURE__ */ new Map();
  const entitiesWithZone = /* @__PURE__ */ new Set();
  for (const fact of store.getAllFacts()) {
    if (typeof fact.e !== "string" || !fact.e.startsWith("entity:")) continue;
    if (fact.a === "type" && typeof fact.v === "string") entityTypes.set(fact.e, fact.v);
    if (fact.a === "zoneId" && typeof fact.v === "string" && fact.v.length > 0) {
      entitiesWithZone.add(fact.e);
    }
  }
  report.scanned = entityTypes.size;
  for (const [entityId, entityType] of entityTypes) {
    if (entitiesWithZone.has(entityId)) {
      report.alreadyTagged++;
      continue;
    }
    if (SUBSTRATE_CONTAINER_TYPES.has(entityType)) {
      report.substrateSkipped++;
      continue;
    }
    try {
      await kernel.updateNode(
        entityId,
        { zoneId: FOUNDER_LAB_ZONE_ID, facilityId: FOUNDER_FACILITY_ID },
        "entity",
        { agentId: "campus-migration" }
      );
      report.backfilled++;
    } catch (err) {
      report.failed++;
      console.warn(`[campus-migration] updateNode failed for ${entityId}:`, (err == null ? void 0 : err.message) || err);
    }
  }
  if (report.backfilled > 0 || report.failed > 0) {
    console.log(
      `[campus-migration] scanned=${report.scanned} alreadyTagged=${report.alreadyTagged} substrateSkipped=${report.substrateSkipped} backfilled=${report.backfilled} failed=${report.failed}`
    );
  } else {
    console.log(
      `[campus-migration] no-op (scanned=${report.scanned} alreadyTagged=${report.alreadyTagged} substrateSkipped=${report.substrateSkipped})`
    );
  }
  return report;
}

const DEFAULT_CHECKPOINT_THRESHOLD = 5e3;
function shouldAutoCheckpoint(input) {
  var _a;
  const threshold = (_a = input.threshold) != null ? _a : DEFAULT_CHECKPOINT_THRESHOLD;
  if (input.opsSinceSnapshot <= 0) {
    return { shouldCheckpoint: false, reason: "no unreplayed ops \u2014 snapshot already current" };
  }
  if (!input.hasSnapshot) {
    return {
      shouldCheckpoint: true,
      reason: `no snapshot exists and ${input.opsSinceSnapshot} ops in log`
    };
  }
  if (input.opsSinceSnapshot >= threshold) {
    return {
      shouldCheckpoint: true,
      reason: `op gap ${input.opsSinceSnapshot} \u2265 threshold ${threshold}`
    };
  }
  return {
    shouldCheckpoint: false,
    reason: `op gap ${input.opsSinceSnapshot} < threshold ${threshold}`
  };
}

let _kernel = null;
let _workspaceConfig = null;
function useTqlKernel() {
  if (!_kernel) {
    throw new Error("[tql] Kernel not initialized \u2014 server plugin has not run yet");
  }
  return _kernel;
}
function useWorkspaceConfig() {
  if (!_workspaceConfig) {
    throw new Error("[tql] Workspace config not initialized \u2014 server plugin has not run yet");
  }
  return _workspaceConfig;
}
const MAX_LOG_ENTRIES = 200;
const _mutationLog = [];
function pushMutationLog(entry) {
  _mutationLog.push({ ...entry, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  if (_mutationLog.length > MAX_LOG_ENTRIES) {
    _mutationLog.splice(0, _mutationLog.length - MAX_LOG_ENTRIES);
  }
}
function getMutationLog() {
  return _mutationLog;
}
const _WYZW_BQhPlZdIPl0TRT_ai74uMMb2gVqJE_1HKPEhtU = defineNitroPlugin(async (nitro) => {
  const dataDir = process.env.TRELLIS_DB_PATH ? resolve$1(process.env.TRELLIS_DB_PATH, "..") : resolve$1(process.cwd(), ".data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = process.env.TRELLIS_DB_PATH || resolve$1(dataDir, "trellis.db");
  const backend = new BetterSqliteBackend({ filename: dbPath });
  const kernel = new TrellisKernel({
    backend,
    autoReplay: true
  });
  if (typeof backend.countOpsAfter === "function") {
    try {
      const latestSnap = backend.loadLatestSnapshot();
      const opsSinceSnapshot = backend.countOpsAfter(latestSnap == null ? void 0 : latestSnap.lastOpHash);
      const decision = shouldAutoCheckpoint({
        opsSinceSnapshot,
        hasSnapshot: Boolean(latestSnap)
      });
      if (decision.shouldCheckpoint) {
        console.log(`[tql] auto-checkpoint triggered: ${decision.reason}`);
        await kernel.checkpoint();
        console.log("[tql] auto-checkpoint saved");
      }
    } catch (err) {
      console.warn("[tql] auto-checkpoint failed (non-fatal):", (err == null ? void 0 : err.message) || err);
    }
  }
  const workspaceConfig = createWorkspaceConfig();
  _workspaceConfig = workspaceConfig;
  await kernel.boot(workspaceConfig);
  const INTEGRATION_DEFS = [
    {
      id: "entity:integration-def-google-calendar",
      data: {
        type: "integration_definition",
        title: "Google Calendar",
        description: "Import and sync events from Google Calendar with realtime push notifications.",
        provider: "Google",
        category: "data",
        authType: "oauth",
        icon: "simple-icons:googlecalendar",
        color: "#4285F4",
        features: ["Realtime sync", "Push notifications", "Entity enrichment", "Multi-calendar"],
        docsUrl: "https://developers.google.com/calendar/api",
        webhookSupport: true,
        pushNotificationSupport: true,
        enrichmentSupport: true,
        syncDirection: "import",
        requiredScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        integrationStatus: "available"
      }
    },
    {
      id: "entity:integration-def-gmail",
      data: {
        type: "integration_definition",
        title: "Gmail",
        description: "Read, send, and link emails to workspace entities. Threads become part of the graph.",
        provider: "Google",
        category: "communication",
        authType: "oauth",
        icon: "simple-icons:gmail",
        color: "#EA4335",
        features: ["Read inbox", "Send + reply", "Label management", "Link emails to entities"],
        docsUrl: "https://developers.google.com/gmail/api",
        webhookSupport: true,
        pushNotificationSupport: true,
        enrichmentSupport: true,
        syncDirection: "bidirectional",
        requiredScopes: [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/gmail.labels"
        ],
        integrationStatus: "available"
      }
    },
    {
      id: "entity:integration-def-notion",
      data: {
        type: "integration_definition",
        title: "Notion",
        description: "Connect with Notion databases and pages.",
        provider: "Notion",
        category: "data",
        authType: "oauth",
        icon: "simple-icons:notion",
        features: ["Import databases", "Sync pages", "Block support"],
        docsUrl: "https://developers.notion.com/",
        syncDirection: "import",
        integrationStatus: "available"
      }
    },
    {
      id: "entity:integration-def-slack",
      data: {
        type: "integration_definition",
        title: "Slack",
        description: "Send notifications and updates to Slack.",
        provider: "Slack",
        category: "communication",
        authType: "oauth",
        icon: "simple-icons:slack",
        features: ["Notifications", "Slash commands", "Interactive messages"],
        docsUrl: "https://api.slack.com/",
        webhookSupport: true,
        syncDirection: "bidirectional",
        integrationStatus: "available"
      }
    },
    {
      id: "entity:integration-def-github",
      data: {
        type: "integration_definition",
        title: "GitHub",
        description: "Sync repositories, issues, and pull requests into the graph. Link GitHub activity to any workspace entity.",
        provider: "GitHub",
        category: "data",
        authType: "oauth",
        icon: "simple-icons:github",
        color: "#24292e",
        features: [
          "Sync repositories",
          "Track issues + pull requests",
          "Link activity to entities",
          "Label + milestone metadata"
        ],
        docsUrl: "https://docs.github.com/en/rest",
        webhookSupport: true,
        pushNotificationSupport: false,
        enrichmentSupport: false,
        syncDirection: "import",
        requiredScopes: ["repo", "read:user", "read:org"],
        integrationStatus: "available"
      }
    }
  ];
  for (const def of INTEGRATION_DEFS) {
    await kernel.createNode(def.id, def.data, "entity");
  }
  console.log(`[tql] Seeded ${INTEGRATION_DEFS.length} integration definitions`);
  const FOUNDER_AGENT_ID = "entity:founder";
  const ZONE_IDS = {
    lab: FOUNDER_LAB_ZONE_ID,
    lobby: FOUNDER_LOBBY_ZONE_ID,
    workshop: FOUNDER_WORKSHOP_ZONE_ID,
    showroom: FOUNDER_SHOWROOM_ZONE_ID,
    vault: FOUNDER_VAULT_ZONE_ID
  };
  const ZONE_GRANTS = {
    lab: [{ action: "ALL", scope: { ownerOnly: true } }],
    lobby: [
      { action: "READ", scope: { public: true } },
      { action: "REQUEST_ACCESS", scope: {} }
    ],
    workshop: [{ action: "ALL", scope: { membersOnly: true } }],
    showroom: [
      { action: "READ", scope: { public: true } },
      { action: "WRITE", scope: { membersOnly: true, requiresPublication: true } }
    ],
    vault: [{ action: "ALL", scope: { ownerOnly: true, requiresSecondFactor: true } }]
  };
  await kernel.createNode(
    FOUNDER_AGENT_ID,
    {
      type: "agent",
      title: "Founder",
      description: "The solo dev \u2014 the human operator of this Trellis instance.",
      role: "founder",
      agentStatus: "active",
      provider: "human",
      homeFacility: FOUNDER_FACILITY_ID,
      invitedToZones: Object.values(ZONE_IDS)
    },
    "entity"
  );
  await kernel.createNode(
    FOUNDER_FACILITY_ID,
    {
      type: "facility",
      title: "Founder",
      description: "Root Facility for the solo dev. Houses all of their zones.",
      facilityKind: "root",
      ownerAgent: FOUNDER_AGENT_ID
    },
    "entity"
  );
  const ZONE_DEFS = [
    {
      id: ZONE_IDS.lab,
      kind: "lab",
      title: "Lab",
      description: "The founder's private workspace. Owner-only access.",
      publicRead: false
    },
    {
      id: ZONE_IDS.lobby,
      kind: "lobby",
      title: "Lobby",
      description: "Public front door. Notifications and access requests route here.",
      publicRead: true
    },
    {
      id: ZONE_IDS.workshop,
      kind: "workshop",
      title: "Workshop",
      description: "Shared workspace for collaborating with invited agents.",
      publicRead: false
    },
    {
      id: ZONE_IDS.showroom,
      kind: "showroom",
      title: "Showroom",
      description: "Public portfolio of shipped artifacts and pages.",
      publicRead: true
    },
    {
      id: ZONE_IDS.vault,
      kind: "vault",
      title: "Vault",
      description: "Irreversible-op zone. Holds credentials and requires second-factor attestation.",
      publicRead: false
    }
  ];
  for (const zone of ZONE_DEFS) {
    await kernel.createNode(
      zone.id,
      {
        type: "zone",
        title: zone.title,
        description: zone.description,
        zoneKind: zone.kind,
        facilityId: FOUNDER_FACILITY_ID,
        grants: JSON.stringify(ZONE_GRANTS[zone.kind]),
        memberAgents: [FOUNDER_AGENT_ID],
        publicRead: zone.publicRead
      },
      "entity"
    );
  }
  console.log(`[tql] Seeded Campus substrate: ${FOUNDER_AGENT_ID} + ${FOUNDER_FACILITY_ID} + ${ZONE_DEFS.length} zones`);
  initZoneGuard(kernel);
  backfillEntityZones(kernel).catch((err) => {
    console.warn("[campus-migration] unexpected error:", err);
  });
  _kernel = kernel;
  nitro.hooks.hook("close", () => {
    kernel.close();
    _kernel = null;
    console.log("[tql] Kernel closed");
  });
  console.log("[tql] TrellisKernel ready");
});

const tql = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: _WYZW_BQhPlZdIPl0TRT_ai74uMMb2gVqJE_1HKPEhtU,
  getMutationLog: getMutationLog,
  pushMutationLog: pushMutationLog,
  useTqlKernel: useTqlKernel,
  useWorkspaceConfig: useWorkspaceConfig
}, Symbol.toStringTag, { value: 'Module' }));

const REFRESH_BUFFER_MS$1 = 5 * 60 * 1e3;
async function loadCredentials$1(connectionId) {
  var _a;
  const kernel = useTqlKernel();
  const entityId = connectionId.startsWith("entity:") ? connectionId : `entity:${connectionId}`;
  const facts = kernel.getStore().getFactsByEntity(entityId);
  const credentialsRef = (_a = facts.find((f) => f.a === "credentialsRef")) == null ? void 0 : _a.v;
  if (!credentialsRef) return null;
  try {
    return JSON.parse(credentialsRef);
  } catch {
    return null;
  }
}
async function refreshAccessToken$1(refreshToken, clientId, clientSecret) {
  const tokenData = await $fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      body: {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token"
      }
    }
  );
  return {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1e3
  };
}
async function getValidAccessToken$1(connectionId) {
  const config = useRuntimeConfig();
  const kernel = useTqlKernel();
  let creds = await loadCredentials$1(connectionId);
  if (!creds) {
    throw createError$1({ statusCode: 404, statusMessage: "No credentials found for this connection." });
  }
  if (creds.expiresAt < Date.now() + REFRESH_BUFFER_MS$1) {
    if (!creds.refreshToken) {
      throw createError$1({
        statusCode: 401,
        statusMessage: "Token expired and no refresh token available. Please reconnect."
      });
    }
    try {
      const refreshed = await refreshAccessToken$1(
        creds.refreshToken,
        config.public.googleClientId,
        config.googleClientSecret
      );
      const entityId = connectionId.startsWith("entity:") ? connectionId : `entity:${connectionId}`;
      const updatedCreds = {
        ...creds,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt
      };
      await kernel.updateNode(entityId, { credentialsRef: JSON.stringify(updatedCreds) }, "entity");
      creds = updatedCreds;
    } catch (err) {
      console.error("[gcal/_credentials] Token refresh failed:", (err == null ? void 0 : err.data) || err);
      throw createError$1({ statusCode: 401, statusMessage: "Failed to refresh access token. Please reconnect." });
    }
  }
  return creds.accessToken;
}

const _credentials$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  getValidAccessToken: getValidAccessToken$1,
  loadCredentials: loadCredentials$1,
  refreshAccessToken: refreshAccessToken$1
}, Symbol.toStringTag, { value: 'Module' }));

const NOTIFICATION_PREFIX = `${NOTIFICATION_NAMESPACE}:`;
function newId() {
  var _a, _b;
  const rand = ((_b = (_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) == null ? void 0 : _b.call(_a)) || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${NOTIFICATION_PREFIX}${rand}`;
}
function serializeActions(actions) {
  if (!actions || actions.length === 0) return void 0;
  try {
    return JSON.stringify(actions);
  } catch {
    return void 0;
  }
}
function serializeMetadata(meta) {
  if (!meta) return void 0;
  try {
    return JSON.stringify(meta);
  } catch {
    return void 0;
  }
}
async function createNotification(input, opts = {}) {
  const kernel = useTqlKernel();
  const id = newId();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const agent = opts.agentId || "system";
  const record = {
    title: input.title,
    body: input.body,
    kind: input.kind,
    source: input.source,
    sourceId: input.sourceId,
    priority: input.priority || "normal",
    status: "unread",
    icon: input.icon,
    color: input.color,
    sound: input.sound,
    entityId: input.entityId,
    entityType: input.entityType,
    url: input.url,
    actions: serializeActions(input.actions),
    metadata: serializeMetadata(input.metadata),
    groupKey: input.groupKey,
    createdAt: now,
    updatedAt: now
  };
  const clean = {};
  for (const [k, v] of Object.entries(record)) if (v !== void 0) clean[k] = v;
  await kernel.createNode(id, clean, NOTIFICATION_NAMESPACE, { agentId: agent });
  pushMutationLog({ action: "createNode", entityId: id, type: NOTIFICATION_NAMESPACE, data: record });
  emitMutation({
    action: "createNode",
    entityId: id,
    type: NOTIFICATION_NAMESPACE,
    agentId: agent,
    data: record
  });
  return {
    id,
    title: input.title,
    body: input.body,
    kind: input.kind,
    source: input.source,
    sourceId: input.sourceId,
    priority: input.priority || "normal",
    status: "unread",
    icon: input.icon,
    color: input.color,
    sound: input.sound,
    entityId: input.entityId,
    entityType: input.entityType,
    url: input.url,
    actions: input.actions,
    metadata: input.metadata,
    groupKey: input.groupKey,
    createdAt: now,
    updatedAt: now
  };
}
async function updateNotificationStatus(id, patch, opts = {}) {
  const kernel = useTqlKernel();
  const agent = opts.agentId || "system";
  const data = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  for (const [k, v] of Object.entries(patch)) if (v !== void 0) data[k] = v;
  await kernel.updateNode(id, data, NOTIFICATION_NAMESPACE, { agentId: agent });
  pushMutationLog({ action: "updateNode", entityId: id, type: NOTIFICATION_NAMESPACE, data });
  emitMutation({ action: "updateNode", entityId: id, type: NOTIFICATION_NAMESPACE, agentId: agent, data });
}
async function deleteNotification(id, opts = {}) {
  const kernel = useTqlKernel();
  const agent = opts.agentId || "system";
  await kernel.deleteNode(id, { agentId: agent });
  pushMutationLog({ action: "deleteNode", entityId: id, type: NOTIFICATION_NAMESPACE });
  emitMutation({ action: "deleteNode", entityId: id, type: NOTIFICATION_NAMESPACE, agentId: agent });
}
function hasUnreadWithSourceId(sourceId) {
  try {
    const kernel = useTqlKernel();
    const result = kernel.query(
      `FIND ${NOTIFICATION_NAMESPACE} AS ?n WHERE ?n.sourceId = "${sourceId}" AND ?n.status = "unread" RETURN ?n.sourceId LIMIT 1`
    );
    return Array.isArray(result == null ? void 0 : result.rows) && result.rows.length > 0;
  } catch {
    return false;
  }
}
async function createSystemAlert(input) {
  if (hasUnreadWithSourceId(input.sourceId)) return null;
  const severity = input.severity || "error";
  const actions = [
    ...input.actions || [],
    { id: "dismiss", kind: "dismiss", label: "Dismiss", icon: "lucide:x" }
  ];
  return createNotification(
    {
      title: input.title,
      body: input.body,
      kind: severity,
      source: input.source || "ops",
      sourceId: input.sourceId,
      priority: severity === "error" ? "high" : "normal",
      url: input.url,
      actions,
      metadata: input.metadata,
      groupKey: input.groupKey || `alert:${input.sourceId}`
    },
    { agentId: input.agentId || "ops-notifier" }
  );
}

const TICK_INTERVAL_MS$1 = 60 * 1e3;
const LOOKAHEAD_MS = 60 * 60 * 1e3;
const DEFAULT_REMINDER_MINUTES = [10];
let _handle$1 = null;
let _running$1 = false;
function listConnectedCalendarAccounts() {
  const kernel = useTqlKernel();
  try {
    const result = kernel.query(
      `FIND entity AS ?c WHERE ?c.type = "integration_connection" AND ?c.integrationId = "google-calendar" AND ?c.connectionStatus = "connected"`
    );
    const rows = (result == null ? void 0 : result.rows) || [];
    const store = kernel.getStore();
    return rows.map((r) => {
      const id = r["?c"] || r["@id"];
      if (!id) return null;
      const facts = store.getFactsByEntity(id);
      const get = (a) => {
        var _a;
        return (_a = facts.find((f) => f.a === a)) == null ? void 0 : _a.v;
      };
      if (get("syncEnabled") === false) return null;
      return {
        id,
        email: get("accountEmail") || get("title"),
        syncEnabled: get("syncEnabled") !== false
      };
    }).filter((c) => c !== null);
  } catch (err) {
    console.error("[calendar-notifier] list connections failed:", err);
    return [];
  }
}
function alreadyNotifiedCalendarKeys() {
  const kernel = useTqlKernel();
  try {
    const result = kernel.query(
      `FIND ${NOTIFICATION_NAMESPACE} AS ?n WHERE ?n.source = "calendar" RETURN ?n.sourceId`
    );
    const rows = (result == null ? void 0 : result.rows) || [];
    const ids = /* @__PURE__ */ new Set();
    for (const r of rows) {
      const v = r["?n.sourceId"] || r.sourceId;
      if (typeof v === "string" && v) ids.add(v);
    }
    return ids;
  } catch (err) {
    console.error("[calendar-notifier] dedupe load failed:", err);
    return /* @__PURE__ */ new Set();
  }
}
function resolveReminderMinutes(ev) {
  const r = ev.reminders;
  if (!r) return DEFAULT_REMINDER_MINUTES;
  if (r.useDefault) return DEFAULT_REMINDER_MINUTES;
  const overrides = (r.overrides || []).map((o) => typeof o.minutes === "number" ? o.minutes : null).filter((n) => n !== null && n >= 0);
  return overrides.length > 0 ? overrides : DEFAULT_REMINDER_MINUTES;
}
function eventStartMs(ev) {
  const s = ev.start;
  if (!s) return null;
  if (s.dateTime) {
    const ms = Date.parse(s.dateTime);
    return Number.isFinite(ms) ? ms : null;
  }
  if (s.date) {
    const ms = Date.parse(`${s.date}T00:00:00`);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}
function humanizeMinutes(minutes) {
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `in ${hours}h`;
  return `in ${hours}h ${rem}m`;
}
async function fetchUpcomingEvents(accessToken, now) {
  const timeMin = new Date(now - 6e4).toISOString();
  const timeMax = new Date(now + LOOKAHEAD_MS).toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50"
  });
  const res = await $fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.items || [];
}
async function pollConnection$1(conn, notified, now) {
  let accessToken;
  try {
    accessToken = await getValidAccessToken$1(conn.id);
  } catch (err) {
    const msg = (err == null ? void 0 : err.statusMessage) || (err == null ? void 0 : err.message) || "Authentication failed";
    console.warn(`[calendar-notifier] token unavailable for ${conn.email || conn.id}:`, msg);
    await createSystemAlert({
      title: `Calendar disconnected${conn.email ? `: ${conn.email}` : ""}`,
      body: `${msg} \u2014 reconnect to resume calendar reminders.`,
      sourceId: `gcal-auth-failed:${conn.id}`,
      source: "calendar",
      severity: "warning",
      url: "/settings/integrations",
      actions: [
        {
          id: "reconnect",
          kind: "link",
          label: "Reconnect",
          icon: "lucide:plug",
          target: "/settings/integrations",
          closesNotification: true
        }
      ],
      metadata: { connectionId: conn.id, accountEmail: conn.email, reason: msg },
      agentId: "calendar-notifier"
    }).catch(() => {
    });
    return 0;
  }
  let events;
  try {
    events = await fetchUpcomingEvents(accessToken, now);
  } catch (err) {
    console.warn(`[calendar-notifier] fetch events failed for ${conn.email || conn.id}:`, (err == null ? void 0 : err.data) || (err == null ? void 0 : err.message));
    return 0;
  }
  let emitted = 0;
  for (const ev of events) {
    if (ev.status === "cancelled") continue;
    const startMs = eventStartMs(ev);
    if (!startMs) continue;
    for (const minutes of resolveReminderMinutes(ev)) {
      const fireAt = startMs - minutes * 6e4;
      if (now < fireAt) continue;
      if (now - fireAt > 2 * TICK_INTERVAL_MS$1) continue;
      if (startMs <= now - 6e4) continue;
      const sourceId = `${conn.id}:${ev.id}:${minutes}`;
      if (notified.has(sourceId)) continue;
      const startLabel = new Date(startMs).toLocaleTimeString(void 0, {
        hour: "numeric",
        minute: "2-digit"
      });
      const title = ev.summary ? `${ev.summary} \u2014 ${humanizeMinutes(minutes)}` : `Event ${humanizeMinutes(minutes)}`;
      const bodyParts = [`Starts ${startLabel}`];
      if (ev.location) bodyParts.push(ev.location);
      await createNotification(
        {
          title,
          body: bodyParts.join(" \xB7 "),
          kind: minutes === 0 ? "calendar" : "reminder",
          source: "calendar",
          sourceId,
          priority: minutes <= 5 ? "high" : "normal",
          url: ev.htmlLink,
          actions: [
            ev.htmlLink ? { id: "open", kind: "link", label: "Open", icon: "lucide:external-link", target: ev.htmlLink } : null,
            { id: "snooze-5", kind: "snooze", label: "Snooze 5m", icon: "lucide:clock", minutes: 5 },
            { id: "dismiss", kind: "dismiss", label: "Dismiss", icon: "lucide:x" }
          ].filter(Boolean),
          metadata: {
            connectionId: conn.id,
            accountEmail: conn.email,
            eventId: ev.id,
            startMs,
            minutesBefore: minutes,
            location: ev.location
          },
          groupKey: `calendar:${conn.id}:${ev.id}`
        },
        { agentId: "calendar-notifier" }
      );
      notified.add(sourceId);
      emitted++;
    }
  }
  return emitted;
}
async function tick$1(now = Date.now()) {
  if (_running$1) return;
  _running$1 = true;
  try {
    const conns = listConnectedCalendarAccounts();
    if (conns.length === 0) return;
    const notified = alreadyNotifiedCalendarKeys();
    let total = 0;
    for (const conn of conns) {
      try {
        total += await pollConnection$1(conn, notified, now);
      } catch (err) {
        console.error("[calendar-notifier] poll failed for", conn.email || conn.id, err);
      }
    }
    if (total > 0) {
      console.log(`[calendar-notifier] emitted ${total} reminder(s) across ${conns.length} account(s)`);
    }
  } catch (err) {
    console.error("[calendar-notifier] tick failed:", err);
  } finally {
    _running$1 = false;
  }
}
const _rzZp72Qyl2YX1C4eUuvheNf0Qfuo20ehUkInmCeiQ = defineNitroPlugin((nitroApp) => {
  if (process.env.TRELLIS_DISABLE_BACKGROUND_JOBS === "1") return;
  const now = Date.now();
  const msUntilNextMinute = 6e4 - now % 6e4;
  setTimeout(() => {
    tick$1().catch((err) => console.error("[calendar-notifier] initial tick error:", err));
    _handle$1 = setInterval(() => {
      tick$1().catch((err) => console.error("[calendar-notifier] tick error:", err));
    }, TICK_INTERVAL_MS$1);
  }, msUntilNextMinute);
  nitroApp.hooks.hook("close", () => {
    if (_handle$1) {
      clearInterval(_handle$1);
      _handle$1 = null;
    }
  });
  console.log(
    `[calendar-notifier] started \u2014 first tick in ${Math.round(msUntilNextMinute / 1e3)}s, interval ${TICK_INTERVAL_MS$1 / 1e3}s`
  );
});

const REFRESH_BUFFER_MS = 5 * 60 * 1e3;
async function loadCredentials(connectionId) {
  var _a;
  const kernel = useTqlKernel();
  const entityId = connectionId.startsWith("entity:") ? connectionId : `entity:${connectionId}`;
  const facts = kernel.getStore().getFactsByEntity(entityId);
  const credentialsRef = (_a = facts.find((f) => f.a === "credentialsRef")) == null ? void 0 : _a.v;
  if (!credentialsRef) return null;
  try {
    return JSON.parse(credentialsRef);
  } catch {
    return null;
  }
}
async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const tokenData = await $fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    }
  });
  return {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1e3
  };
}
async function getValidAccessToken(connectionId) {
  const config = useRuntimeConfig();
  const kernel = useTqlKernel();
  let creds = await loadCredentials(connectionId);
  if (!creds) {
    throw createError$1({ statusCode: 404, statusMessage: "No credentials found for this connection." });
  }
  if (creds.expiresAt < Date.now() + REFRESH_BUFFER_MS) {
    if (!creds.refreshToken) {
      throw createError$1({
        statusCode: 401,
        statusMessage: "Token expired and no refresh token available. Please reconnect."
      });
    }
    try {
      const refreshed = await refreshAccessToken(
        creds.refreshToken,
        config.public.googleClientId,
        config.googleClientSecret
      );
      const entityId = connectionId.startsWith("entity:") ? connectionId : `entity:${connectionId}`;
      const updatedCreds = {
        ...creds,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt
      };
      await kernel.updateNode(entityId, {
        credentialsRef: JSON.stringify(updatedCreds)
      }, "entity");
      creds = updatedCreds;
    } catch (err) {
      console.error("[gmail/_credentials] Token refresh failed:", (err == null ? void 0 : err.data) || err);
      throw createError$1({ statusCode: 401, statusMessage: "Failed to refresh access token. Please reconnect." });
    }
  }
  return creds.accessToken;
}

const _credentials = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  getValidAccessToken: getValidAccessToken,
  loadCredentials: loadCredentials,
  refreshAccessToken: refreshAccessToken
}, Symbol.toStringTag, { value: 'Module' }));

const OLLAMA_HOST$2 = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const DEFAULT_MODEL$2 = process.env.TRELLIS_LLM_DEFAULT_MODEL || "gemma4:e4b";
const CLASS_HINTS = {
  temporal: "Summarize the purpose or agenda of this event/task in 1\u20132 sentences. Focus on what is happening and why.",
  document: "Summarize the key point of this note/document in 1\u20133 sentences. Capture the TL;DR.",
  actor: "Summarize who this person/organization is in 1\u20132 sentences. Role, affiliation, relevance.",
  container: "Summarize the scope and outcome of this project/goal in 1\u20132 sentences."
};
const TYPE_TO_CLASS = {
  event: "temporal",
  appointment: "temporal",
  trip: "temporal",
  task: "temporal",
  deadline: "temporal",
  payment: "temporal",
  note: "document",
  email: "document",
  file: "document",
  bookmark: "document",
  blog_post: "document",
  portfolio_item: "document",
  person: "actor",
  contact: "actor",
  organization: "actor",
  project: "container",
  goal: "container",
  milestone: "container",
  folder: "container"
};
const SYSTEM_PROMPT$1 = `You are a concise summarization assistant. Produce a plain-text summary of the given content. Return ONLY the summary text \u2014 no preamble, no markdown, no quotes, no commentary. Strip boilerplate (dial-in numbers, signatures, calendar links, unsubscribe notices). Do NOT invent facts.`;
function buildUserPrompt$1(text, type, title) {
  const klass = type && TYPE_TO_CLASS[type];
  const hint = klass ? CLASS_HINTS[klass] : "Summarize the content in 1\u20133 sentences.";
  const titlePart = title ? `
Title: "${title}"` : "";
  return `${hint}${titlePart}

Content:
"""
${text}
"""

Summary:`;
}
function stripHtml$1(input) {
  return input.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, "\n\n").trim();
}
async function summarizeText(args) {
  var _a;
  const cleaned = stripHtml$1(args.text).slice(0, 4e3);
  if (cleaned.length < 80) return "";
  const res = await fetch(`${OLLAMA_HOST$2}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DEFAULT_MODEL$2,
      system: SYSTEM_PROMPT$1,
      prompt: buildUserPrompt$1(cleaned, args.type, args.title),
      stream: false
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Ollama error: ${data.error}`);
  let summary = ((_a = data.response) != null ? _a : "").trim();
  summary = summary.replace(/^Summary:\s*/i, "").replace(/^["']|["']$/g, "").trim();
  return summary;
}
const summarizeEntityLlm_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.text) || typeof body.text !== "string") {
    throw createError$1({ statusCode: 400, message: '"text" is required' });
  }
  try {
    const summary = await summarizeText({ text: body.text, type: body.type, title: body.title });
    return { summary };
  } catch (err) {
    throw createError$1({
      statusCode: 502,
      message: `Summarization failed: ${(err == null ? void 0 : err.message) || String(err)}`
    });
  }
});

const summarizeEntityLlm_post$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: summarizeEntityLlm_post,
  summarizeText: summarizeText
}, Symbol.toStringTag, { value: 'Module' }));

const OLLAMA_HOST$1 = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const DEFAULT_MODEL$1 = process.env.TRELLIS_LLM_DEFAULT_MODEL || "gemma4:e4b";
const VALID_IMPORTANCE = /* @__PURE__ */ new Set(["critical", "high", "medium", "low"]);
const SUGGESTED_LABELS = [
  "finance",
  "billing",
  "receipt",
  "invoice",
  "travel",
  "booking",
  "flight",
  "hotel",
  "real-estate",
  "rental",
  "housing",
  "personal",
  "family",
  "friends",
  "work",
  "meeting",
  "calendar",
  "task",
  "deadline",
  "newsletter",
  "marketing",
  "promo",
  "auth",
  "security",
  "notification",
  "social",
  "shopping",
  "order",
  "shipping",
  "support",
  "health",
  "legal",
  "hr",
  "investing",
  "news"
];
const SYSTEM_PROMPT = `You are an email triage assistant. Classify an incoming email into a single importance level and a short set of topical labels. Return ONLY valid JSON \u2014 no markdown, no code fences, no preamble.

Importance scale (bias toward "medium" \u2014 reserve higher levels for clear signals):
- critical: security alerts, account lockouts, fraud alerts, urgent personal emergencies
- high: direct personal messages, action items with a deadline, booked travel confirmations, financial alerts (card declines, payments due), scheduled meetings today/tomorrow
- medium: regular correspondence, newsletters from trusted sources, receipts, shipping updates
- low: bulk marketing, promotional offers, social updates, generic notifications, newsletters the user clearly doesn't read

Labels: 1\u20135 short lowercase slugs describing the email's topic. Prefer the known vocabulary when applicable; invent new slugs only when clearly needed.`;
function buildUserPrompt(args) {
  const { subject, body, from, to } = args;
  const header = [];
  if (from) header.push(`From: ${from}`);
  if (to) header.push(`To: ${to}`);
  header.push(`Subject: ${subject}`);
  return `Classify this email.

${header.join("\n")}

Body:
"""
${body}
"""

Preferred labels (use these when applicable, invent sparingly):
${SUGGESTED_LABELS.join(", ")}

Return JSON in this exact shape:
{"importance": "critical" | "high" | "medium" | "low", "labels": ["label1", "label2"]}`;
}
function stripHtml(input) {
  return input.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, "\n\n").trim();
}
function normalizeLabel(raw) {
  if (typeof raw !== "string") return null;
  const slug = raw.trim().toLowerCase().replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  return slug || null;
}
function parseLLMResponse(raw) {
  const fallback = { importance: "medium", labels: [] };
  if (!raw) return fallback;
  let jsonText = raw.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch == null ? void 0 : fenceMatch[1]) jsonText = fenceMatch[1].trim();
  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1);
  }
  try {
    const parsed = JSON.parse(jsonText);
    const importance = typeof parsed.importance === "string" && VALID_IMPORTANCE.has(parsed.importance) ? parsed.importance : "medium";
    const labels = [];
    if (Array.isArray(parsed.labels)) {
      const seen = /* @__PURE__ */ new Set();
      for (const raw2 of parsed.labels) {
        const slug = normalizeLabel(raw2);
        if (slug && !seen.has(slug)) {
          labels.push(slug);
          seen.add(slug);
        }
        if (labels.length >= 5) break;
      }
    }
    return { importance, labels };
  } catch {
    return fallback;
  }
}
async function classifyEmail(args) {
  var _a;
  const subject = (args.subject || "").trim().slice(0, 400);
  const rawBody = args.body || "";
  const body = stripHtml(rawBody).slice(0, 3e3);
  if (subject.length + body.length < 20) {
    return { importance: "medium", labels: [] };
  }
  const res = await fetch(`${OLLAMA_HOST$1}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DEFAULT_MODEL$1,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt({ subject, body, from: args.from, to: args.to }),
      stream: false
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Ollama error: ${data.error}`);
  return parseLLMResponse((_a = data.response) != null ? _a : "");
}
const classifyEmailLlm_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (typeof (body == null ? void 0 : body.subject) !== "string" || typeof (body == null ? void 0 : body.body) !== "string") {
    throw createError$1({ statusCode: 400, message: '"subject" and "body" are required strings' });
  }
  try {
    return await classifyEmail({
      subject: body.subject,
      body: body.body,
      from: body.from,
      to: body.to
    });
  } catch (err) {
    throw createError$1({
      statusCode: 502,
      message: `Email classification failed: ${(err == null ? void 0 : err.message) || String(err)}`
    });
  }
});

const classifyEmailLlm_post$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  classifyEmail: classifyEmail,
  default: classifyEmailLlm_post
}, Symbol.toStringTag, { value: 'Module' }));

const AGENT_ID = "gmail-notifier";
const MIN_BODY_LENGTH_FOR_ENRICHMENT = 200;
function toEntityId(threadId) {
  return `entity:gmail-${threadId}`;
}
function buildEmailEntityData(thread, connEntityId) {
  const firstMsg = thread.messages[0];
  if (!firstMsg) throw new Error("Thread has no messages");
  const data = {
    type: "email",
    title: firstMsg.subject || "(no subject)",
    subject: firstMsg.subject,
    snippet: firstMsg.snippet,
    from: firstMsg.from,
    to: firstMsg.to,
    cc: firstMsg.cc,
    date: firstMsg.date,
    labelIds: thread.labelIds,
    threadId: thread.id,
    messageId: firstMsg.messageId,
    isRead: !thread.labelIds.includes("UNREAD"),
    isStarred: thread.labelIds.includes("STARRED"),
    bodyText: firstMsg.bodyText,
    bodyHtml: firstMsg.bodyHtml,
    source: "gmail",
    gmailMessageId: firstMsg.id,
    gmailThreadId: thread.id,
    pinned: false
  };
  if (connEntityId) data.connectionId = connEntityId;
  return data;
}
function entityExists(entityId) {
  try {
    const kernel = useTqlKernel();
    const store = kernel.getStore();
    return store.getFactsByEntity(entityId).length > 0;
  } catch {
    return false;
  }
}
async function persistEmailEntity(thread, connEntityId) {
  const kernel = useTqlKernel();
  const entityId = toEntityId(thread.id);
  const existed = entityExists(entityId);
  if (!existed) {
    const data = buildEmailEntityData(thread, connEntityId);
    await kernel.createNode(entityId, data, "entity", { agentId: AGENT_ID });
    pushMutationLog({ action: "createNode", entityId, type: "entity", data });
    emitMutation({ action: "createNode", entityId, type: "entity", agentId: AGENT_ID, data });
    if (connEntityId) {
      try {
        await kernel.link(entityId, "derivedFrom", connEntityId, { agentId: AGENT_ID });
        pushMutationLog({
          action: "link",
          entityId: `${entityId} -> ${connEntityId}`,
          data: { relation: "derivedFrom" }
        });
        emitMutation({
          action: "link",
          entityId: `${entityId} -> ${connEntityId}`,
          agentId: AGENT_ID,
          data: { relation: "derivedFrom", e1: entityId, e2: connEntityId }
        });
      } catch (err) {
        console.warn("[gmail-ingest] derivedFrom link failed:", err);
      }
    }
  } else {
    const firstMsg = thread.messages[0];
    if (firstMsg) {
      const patch = {
        labelIds: thread.labelIds,
        isRead: !thread.labelIds.includes("UNREAD"),
        isStarred: thread.labelIds.includes("STARRED"),
        snippet: firstMsg.snippet
      };
      try {
        await kernel.updateNode(entityId, patch, "entity", { agentId: AGENT_ID });
        pushMutationLog({ action: "updateNode", entityId, type: "entity", data: patch });
        emitMutation({ action: "updateNode", entityId, type: "entity", agentId: AGENT_ID, data: patch });
      } catch (err) {
        console.warn("[gmail-ingest] refresh patch failed for", entityId, err);
      }
    }
  }
  return { entityId, existed };
}
function readExistingTypes() {
  try {
    const kernel = useTqlKernel();
    const schemas = kernel.listOntologies();
    const existingTypes = schemas.map((s) => typeof s["@id"] === "string" ? s["@id"] : "").filter((s) => s.length > 0);
    const existingTypeLabels = schemas.map((s) => typeof s.label === "string" ? s.label : "").filter((l) => l.length > 0);
    return { existingTypes, existingTypeLabels };
  } catch {
    return { existingTypes: [], existingTypeLabels: [] };
  }
}
function buildExtractionText(firstMsg) {
  const subject = firstMsg.subject || "";
  const body = firstMsg.bodyText || firstMsg.snippet || "";
  return [subject, body].filter(Boolean).join("\n\n").trim();
}
async function enrichEmailEntity(entityId, thread) {
  const firstMsg = thread.messages[0];
  if (!firstMsg) return null;
  const text = buildExtractionText(firstMsg);
  if (text.length < MIN_BODY_LENGTH_FOR_ENRICHMENT) {
    return null;
  }
  const { existingTypes, existingTypeLabels } = readExistingTypes();
  const summaryP = summarizeText({ text, type: "email", title: firstMsg.subject }).catch((err) => {
    console.warn("[gmail-ingest] summarize failed for", entityId, (err == null ? void 0 : err.message) || err);
    return "";
  });
  const extractP = $fetch("/api/extract-entities-llm", {
    method: "POST",
    body: { text, kind: "email", existingTypes, existingTypeLabels }
  }).catch((err) => {
    console.warn("[gmail-ingest] extract failed for", entityId, (err == null ? void 0 : err.message) || err);
    return { entities: [], tags: [], typeProposals: [] };
  });
  const classifyP = classifyEmail({
    subject: firstMsg.subject,
    body: firstMsg.bodyText || firstMsg.snippet || "",
    from: firstMsg.from,
    to: firstMsg.to
  }).catch((err) => {
    console.warn("[gmail-ingest] classify failed for", entityId, (err == null ? void 0 : err.message) || err);
    return { importance: "medium", labels: [] };
  });
  const [summary, extract, classify] = await Promise.all([summaryP, extractP, classifyP]);
  const suggestions = Array.isArray(extract.entities) ? extract.entities.map((c) => ({ candidate: c, status: "new" })) : [];
  const enrichment = {
    summary: (summary || "").trim(),
    aiSuggestions: suggestions,
    aiSuggestedTags: Array.isArray(extract.tags) ? extract.tags.slice(0, 12) : [],
    aiTypeProposals: Array.isArray(extract.typeProposals) ? extract.typeProposals : [],
    importance: classify.importance,
    aiLabels: classify.labels,
    scannedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const patch = {
      aiScannedAt: enrichment.scannedAt,
      aiSuggestions: JSON.stringify(enrichment.aiSuggestions),
      aiSuggestedTags: enrichment.aiSuggestedTags,
      aiTypeProposals: JSON.stringify(enrichment.aiTypeProposals)
    };
    if (enrichment.summary && enrichment.summary.length > 0) {
      patch.summary = enrichment.summary;
      patch.summaryGeneratedAt = enrichment.scannedAt;
    }
    if (Array.isArray(enrichment.aiLabels) && enrichment.aiLabels.length > 0) {
      patch.aiLabels = enrichment.aiLabels;
    }
    patch.priority = enrichment.importance;
    const kernel = useTqlKernel();
    await kernel.updateNode(entityId, patch, "entity", { agentId: AGENT_ID });
    pushMutationLog({ action: "updateNode", entityId, type: "entity", data: patch });
    emitMutation({ action: "updateNode", entityId, type: "entity", agentId: AGENT_ID, data: patch });
  } catch (err) {
    console.warn("[gmail-ingest] enrichment write failed for", entityId, err);
  }
  return enrichment;
}
function importanceToNotificationPriority(importance) {
  return importance === "medium" ? "normal" : importance;
}
function hasExistingEnrichment(entityId) {
  try {
    const kernel = useTqlKernel();
    const store = kernel.getStore();
    const facts = store.getFactsByEntity(entityId);
    return facts.some((f) => f.a === "aiScannedAt" && typeof f.v === "string" && f.v.length > 0);
  } catch {
    return false;
  }
}
async function ingestThread(thread, connEntityId) {
  const { entityId, existed } = await persistEmailEntity(thread, connEntityId);
  if (existed && hasExistingEnrichment(entityId)) {
    return { entityId, enrichment: null };
  }
  const enrichment = await enrichEmailEntity(entityId, thread);
  return { entityId, enrichment };
}

function getHeader(headers, name) {
  if (!headers) return "";
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return (h == null ? void 0 : h.value) || "";
}
function decodeBase64Url(data) {
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf-8");
  } catch {
    return "";
  }
}
function extractBody(payload) {
  if (!payload) return {};
  const result = {};
  const walk = (part) => {
    var _a, _b;
    if (part.mimeType === "text/plain" && ((_a = part.body) == null ? void 0 : _a.data) && !result.text) {
      result.text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && ((_b = part.body) == null ? void 0 : _b.data) && !result.html) {
      result.html = decodeBase64Url(part.body.data);
    }
    if (part.parts) for (const sub of part.parts) walk(sub);
  };
  walk(payload);
  return result;
}
function normalizeMessage(msg) {
  var _a;
  const headers = (_a = msg.payload) == null ? void 0 : _a.headers;
  const body = extractBody(msg.payload);
  const dateHeader = getHeader(headers, "Date");
  const internalDateMs = msg.internalDate ? Number(msg.internalDate) : 0;
  const date = dateHeader || (internalDateMs ? new Date(internalDateMs).toISOString() : "");
  return {
    id: msg.id,
    messageId: getHeader(headers, "Message-ID"),
    subject: getHeader(headers, "Subject"),
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    cc: getHeader(headers, "Cc") || void 0,
    date,
    snippet: msg.snippet || "",
    labelIds: msg.labelIds || [],
    bodyText: body.text,
    bodyHtml: body.html,
    internalDate: internalDateMs || void 0
  };
}
function normalizeThread(raw) {
  return {
    id: raw.id,
    labelIds: Array.from(new Set(raw.messages.flatMap((m) => m.labelIds || []))),
    messages: raw.messages.map(normalizeMessage)
  };
}

const POLL_INTERVAL_MS = 3 * 60 * 1e3;
const INITIAL_DELAY_MS = 30 * 1e3;
const MAX_THREADS_PER_POLL = 25;
const MAX_ENRICHMENTS_PER_POLL = 10;
let _handle = null;
let _running = false;
function prettyFrom(raw) {
  if (!raw) return "Unknown sender";
  const m = raw.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  if (m == null ? void 0 : m[1]) return m[1].trim();
  const at = raw.indexOf("@");
  return at > 0 ? raw.slice(0, at).trim() : raw.trim();
}
function listConnectedGmailAccounts() {
  const kernel = useTqlKernel();
  try {
    const result = kernel.query(
      `FIND entity AS ?c WHERE ?c.type = "integration_connection" AND ?c.integrationId = "gmail" AND ?c.connectionStatus = "connected"`
    );
    const rows = (result == null ? void 0 : result.rows) || [];
    const store = kernel.getStore();
    return rows.map((r) => {
      const id = r["?c"] || r["@id"];
      if (!id) return null;
      const facts = store.getFactsByEntity(id);
      const get = (a) => {
        var _a;
        return (_a = facts.find((f) => f.a === a)) == null ? void 0 : _a.v;
      };
      if (get("syncEnabled") === false) return null;
      return {
        id,
        email: get("accountEmail") || get("title"),
        lastSyncAt: get("lastSyncAt"),
        syncEnabled: get("syncEnabled") !== false
      };
    }).filter((c) => c !== null);
  } catch (err) {
    console.error("[gmail-notifier] listConnectedGmailAccounts failed:", err);
    return [];
  }
}
function alreadyNotifiedThreadIds() {
  const kernel = useTqlKernel();
  try {
    const result = kernel.query(
      `FIND ${NOTIFICATION_NAMESPACE} AS ?n WHERE ?n.source = "email" RETURN ?n.sourceId`
    );
    const rows = (result == null ? void 0 : result.rows) || [];
    const ids = /* @__PURE__ */ new Set();
    for (const r of rows) {
      const v = r["?n.sourceId"] || r.sourceId;
      if (typeof v === "string" && v) ids.add(v);
    }
    return ids;
  } catch (err) {
    console.error("[gmail-notifier] alreadyNotifiedThreadIds failed:", err);
    return /* @__PURE__ */ new Set();
  }
}
async function listUnreadThreadRefs(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${MAX_THREADS_PER_POLL}&labelIds=INBOX&labelIds=UNREAD`;
  const listRes = await $fetch(listUrl, { headers });
  return listRes.threads || [];
}
async function fetchFullThread(accessToken, threadId) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  try {
    const raw = await $fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
      { headers }
    );
    if (!raw.messages || raw.messages.length === 0) return null;
    return normalizeThread(raw);
  } catch (err) {
    console.warn("[gmail-notifier] failed to fetch full thread", threadId, err);
    return null;
  }
}
async function pollConnection(conn, notifiedIds) {
  const kernel = useTqlKernel();
  let accessToken;
  try {
    accessToken = await getValidAccessToken(conn.id);
  } catch (err) {
    const msg = (err == null ? void 0 : err.statusMessage) || (err == null ? void 0 : err.message) || "Authentication failed";
    console.warn(`[gmail-notifier] access token unavailable for ${conn.email || conn.id}:`, msg);
    await createSystemAlert({
      title: `Gmail disconnected${conn.email ? `: ${conn.email}` : ""}`,
      body: `${msg} \u2014 reconnect to resume email notifications.`,
      sourceId: `gmail-auth-failed:${conn.id}`,
      source: "email",
      severity: "warning",
      url: "/settings/integrations",
      actions: [
        {
          id: "reconnect",
          kind: "link",
          label: "Reconnect",
          icon: "lucide:plug",
          target: "/settings/integrations",
          closesNotification: true
        }
      ],
      metadata: { connectionId: conn.id, accountEmail: conn.email, reason: msg },
      agentId: "gmail-notifier"
    }).catch(() => {
    });
    return 0;
  }
  const lastSyncMs = conn.lastSyncAt ? Date.parse(conn.lastSyncAt) : 0;
  const refs = await listUnreadThreadRefs(accessToken);
  let emitted = 0;
  let enrichedSoFar = 0;
  for (const ref of refs) {
    const thread = await fetchFullThread(accessToken, ref.id);
    if (!thread) continue;
    const lastMsg = thread.messages[thread.messages.length - 1];
    const internalDate = lastMsg.internalDate || 0;
    const sourceId = `${thread.id}:${internalDate}`;
    if (notifiedIds.has(sourceId)) continue;
    if (lastSyncMs && internalDate && internalDate <= lastSyncMs) continue;
    const fromName = prettyFrom(lastMsg.from);
    const shouldEnrich = enrichedSoFar < MAX_ENRICHMENTS_PER_POLL;
    let enrichment = null;
    try {
      if (shouldEnrich) {
        const result = await ingestThread(thread, conn.id);
        enrichment = result.enrichment;
        enrichedSoFar++;
      } else {
        await ingestThread({ ...thread, messages: thread.messages.slice(0, 1) }, conn.id).catch(
          (err) => console.warn("[gmail-notifier] persist-without-enrich failed:", err)
        );
      }
    } catch (err) {
      console.warn("[gmail-notifier] ingest failed for", thread.id, err);
    }
    const notificationPriority = enrichment ? importanceToNotificationPriority(enrichment.importance) : "normal";
    const notificationBody = ((enrichment == null ? void 0 : enrichment.summary) || "").trim() || lastMsg.snippet || (fromName ? `From ${fromName}` : void 0);
    await createNotification(
      {
        title: lastMsg.subject || `New email from ${fromName}`,
        body: notificationBody,
        kind: "email",
        source: "email",
        sourceId,
        priority: notificationPriority,
        url: `/mail?label=INBOX&thread=${encodeURIComponent(thread.id)}`,
        actions: [
          {
            id: "open",
            kind: "link",
            label: "Open",
            icon: "lucide:external-link",
            target: `/mail?label=INBOX&thread=${encodeURIComponent(thread.id)}`
          },
          { id: "mark-read", kind: "mark_read", label: "Mark read", icon: "lucide:check" },
          { id: "snooze-1h", kind: "snooze", label: "Snooze 1h", icon: "lucide:clock", minutes: 60 }
        ],
        metadata: {
          connectionId: conn.id,
          accountEmail: conn.email,
          from: lastMsg.from,
          fromName,
          internalDate,
          summary: enrichment == null ? void 0 : enrichment.summary,
          aiLabels: enrichment == null ? void 0 : enrichment.aiLabels,
          importance: enrichment == null ? void 0 : enrichment.importance
        },
        groupKey: `email:${conn.id}`
      },
      { agentId: "gmail-notifier" }
    );
    notifiedIds.add(sourceId);
    emitted++;
  }
  try {
    await kernel.updateNode(conn.id, { lastSyncAt: (/* @__PURE__ */ new Date()).toISOString() }, "entity", { agentId: "gmail-notifier" });
  } catch (err) {
    console.warn("[gmail-notifier] failed to update lastSyncAt for", conn.id, err);
  }
  return emitted;
}
async function tick() {
  if (_running) return;
  _running = true;
  try {
    const conns = listConnectedGmailAccounts();
    if (conns.length === 0) return;
    const notified = alreadyNotifiedThreadIds();
    let total = 0;
    for (const conn of conns) {
      try {
        total += await pollConnection(conn, notified);
      } catch (err) {
        console.error("[gmail-notifier] poll failed for", conn.email || conn.id, err);
      }
    }
    if (total > 0) {
      console.log(`[gmail-notifier] emitted ${total} email notification(s) across ${conns.length} account(s)`);
    }
  } catch (err) {
    console.error("[gmail-notifier] tick failed:", err);
  } finally {
    _running = false;
  }
}
const _iwUtc5Rg7mxXrBrX38N4TJqcyxeVzAnPFr0Qh9JrMqk = defineNitroPlugin((nitroApp) => {
  if (process.env.TRELLIS_DISABLE_BACKGROUND_JOBS === "1") return;
  setTimeout(() => {
    tick().catch((err) => console.error("[gmail-notifier] initial tick error:", err));
    _handle = setInterval(() => {
      tick().catch((err) => console.error("[gmail-notifier] tick error:", err));
    }, POLL_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
  nitroApp.hooks.hook("close", () => {
    if (_handle) {
      clearInterval(_handle);
      _handle = null;
    }
  });
  console.log(
    `[gmail-notifier] started \u2014 first poll in ${INITIAL_DELAY_MS / 1e3}s, interval ${POLL_INTERVAL_MS / 1e3}s`
  );
});

const COMPLETED_STATUSES = /* @__PURE__ */ new Set(["done", "completed", "complete", "closed"]);
const AGENT_BURST_WINDOW_MS = 1e4;
const AGENT_BURST_FLUSH_MS = 4e3;
const SILENT_AGENTS = /* @__PURE__ */ new Set([
  "system",
  "graph-notifier",
  "gmail-notifier",
  "calendar-notifier",
  "job-notifier",
  "ops-notifier",
  "workflow-server"
  // workflow completions emit their own richer notification
]);
function isEntityType(type) {
  return !!type && type === ENTITY_NAMESPACE;
}
function getEntityTitle(entityId) {
  var _a;
  try {
    const kernel = useTqlKernel();
    const facts = kernel.getStore().getFactsByEntity(entityId);
    const title = (_a = facts.find((f) => f.a === "title")) == null ? void 0 : _a.v;
    return title && typeof title === "string" ? title : null;
  } catch {
    return null;
  }
}
function getEntityField(entityId, attr) {
  var _a;
  try {
    const kernel = useTqlKernel();
    const facts = kernel.getStore().getFactsByEntity(entityId);
    return (_a = facts.find((f) => f.a === attr)) == null ? void 0 : _a.v;
  } catch {
    return void 0;
  }
}
async function handleTaskCompletion(ev) {
  if (ev.action !== "updateNode") return;
  if (!isEntityType(ev.type)) return;
  const patch = ev.data || {};
  if (!("taskStatus" in patch)) return;
  const nextStatus = String(patch.taskStatus || "").toLowerCase();
  if (!COMPLETED_STATUSES.has(nextStatus)) return;
  const entityId = ev.entityId;
  if (!entityId) return;
  const entityType = getEntityField(entityId, "type");
  if (entityType && entityType !== "task") return;
  const title = getEntityTitle(entityId) || "Task";
  await createNotification(
    {
      title: "Task completed",
      body: title,
      kind: "success",
      source: "graph",
      sourceId: `task-done:${entityId}:${ev.id}`,
      priority: "low",
      entityId,
      entityType: "task",
      url: `#${entityId}`,
      actions: [
        { id: "open", kind: "link", label: "Open", icon: "lucide:external-link", target: `#${entityId}` },
        { id: "dismiss", kind: "dismiss", label: "Dismiss", icon: "lucide:x" }
      ],
      metadata: { agentId: ev.agentId, entityId },
      groupKey: `task-done:${entityId}`
    },
    { agentId: "graph-notifier" }
  );
}
async function handleBulkOp(ev) {
  var _a, _b, _c, _d, _e;
  if (ev.action !== "bulkUpdate" && ev.action !== "bulkDelete") return;
  const isDelete = ev.action === "bulkDelete";
  const count = Number((_d = (_c = (_a = ev.data) == null ? void 0 : _a.updated) != null ? _c : (_b = ev.data) == null ? void 0 : _b.deleted) != null ? _d : 0);
  if (!count) return;
  await createNotification(
    {
      title: isDelete ? "Bulk delete" : "Bulk update",
      body: `${count} ${count === 1 ? "entity" : "entities"} ${isDelete ? "deleted" : "updated"}`,
      kind: isDelete ? "warning" : "ops",
      source: "ops",
      sourceId: `${ev.action}:${ev.id}`,
      priority: isDelete ? "high" : "normal",
      actions: [{ id: "dismiss", kind: "dismiss", label: "Dismiss", icon: "lucide:x" }],
      metadata: { agentId: ev.agentId, count, query: (_e = ev.data) == null ? void 0 : _e.query }
    },
    { agentId: "graph-notifier" }
  );
}
const _bursts = /* @__PURE__ */ new Map();
function recordAgentCreate(ev) {
  var _a;
  if (ev.action !== "createNode") return;
  if (!isEntityType(ev.type)) return;
  if (!ev.agentId || SILENT_AGENTS.has(ev.agentId)) return;
  if (ev.agentId === "browser") return;
  const entityId = ev.entityId;
  if (!entityId) return;
  const key = ev.agentId;
  const now = Date.now();
  let state = _bursts.get(key);
  if (!state || now - state.lastEventAt > AGENT_BURST_WINDOW_MS) {
    if (state == null ? void 0 : state.flushTimer) clearTimeout(state.flushTimer);
    state = {
      firstEventAt: now,
      lastEventAt: now,
      entityIds: [],
      entityTypes: /* @__PURE__ */ new Map(),
      flushTimer: null
    };
    _bursts.set(key, state);
  }
  state.lastEventAt = now;
  state.entityIds.push(entityId);
  const typeValue = ((_a = ev.data) == null ? void 0 : _a.type) || "entity";
  state.entityTypes.set(typeValue, (state.entityTypes.get(typeValue) || 0) + 1);
  if (state.flushTimer) clearTimeout(state.flushTimer);
  state.flushTimer = setTimeout(() => {
    flushAgentBurst(key).catch((err) => console.error("[graph-notifier] flush burst failed:", err));
  }, AGENT_BURST_FLUSH_MS);
}
async function flushAgentBurst(agent) {
  const state = _bursts.get(agent);
  if (!state) return;
  _bursts.delete(agent);
  if (state.flushTimer) clearTimeout(state.flushTimer);
  const count = state.entityIds.length;
  if (count === 0) return;
  const typeSummary = [...state.entityTypes.entries()].map(([type, n]) => `${n} ${type}${n === 1 ? "" : "s"}`).join(", ");
  const firstId = state.entityIds[0];
  const firstTitle = count === 1 ? getEntityTitle(firstId) : null;
  await createNotification(
    {
      title: count === 1 ? `${agent} created ${firstTitle || "an entity"}` : `${agent} created ${count} entities`,
      body: count === 1 && firstTitle ? void 0 : typeSummary,
      kind: "info",
      source: agent.includes("sync") || agent.includes("notifier") ? "job" : "ai",
      sourceId: `agent-burst:${agent}:${state.firstEventAt}`,
      priority: "low",
      entityId: count === 1 ? firstId : void 0,
      url: count === 1 ? `#${firstId}` : void 0,
      actions: count === 1 ? [
        { id: "open", kind: "link", label: "Open", icon: "lucide:external-link", target: `#${firstId}` },
        { id: "dismiss", kind: "dismiss", label: "Dismiss", icon: "lucide:x" }
      ] : [{ id: "dismiss", kind: "dismiss", label: "Dismiss", icon: "lucide:x" }],
      metadata: { agentId: agent, count, entityIds: state.entityIds.slice(0, 10) },
      groupKey: `agent:${agent}`
    },
    { agentId: "graph-notifier" }
  );
}
function shouldIgnore(ev) {
  if (ev.type === NOTIFICATION_NAMESPACE) return true;
  if (ev.agentId && SILENT_AGENTS.has(ev.agentId)) return true;
  return false;
}
async function onEvent(ev) {
  if (shouldIgnore(ev)) return;
  try {
    await handleTaskCompletion(ev);
  } catch (err) {
    console.error("[graph-notifier] task-completion handler failed:", err);
  }
  try {
    await handleBulkOp(ev);
  } catch (err) {
    console.error("[graph-notifier] bulk-op handler failed:", err);
  }
  try {
    recordAgentCreate(ev);
  } catch (err) {
    console.error("[graph-notifier] agent-create handler failed:", err);
  }
}
const _Y2IHdpx4ctmptzQPP85_q0eqKN088oDJv5JHaxEcK48 = defineNitroPlugin((nitroApp) => {
  const unsubscribe = onMutation((ev) => {
    void onEvent(ev);
  });
  nitroApp.hooks.hook("close", () => {
    unsubscribe();
    for (const [, state] of _bursts) {
      if (state.flushTimer) clearTimeout(state.flushTimer);
    }
    _bursts.clear();
  });
  console.log("[graph-notifier] subscribed to mutation stream");
});

const GRAPH_FIELD = "graphJson";
function serializeTrigger(trigger) {
  const stored = {
    type: "workflow-trigger",
    title: trigger.title,
    workflowId: trigger.workflowId,
    kind: trigger.kind,
    active: trigger.active,
    createdAt: trigger.createdAt,
    updatedAt: trigger.updatedAt,
    [GRAPH_FIELD]: JSON.stringify(trigger.graph)
  };
  if (trigger.workflowName) stored.workflowName = trigger.workflowName;
  if (trigger.agentId) stored.agentId = trigger.agentId;
  if (trigger.ownerId) stored.ownerId = trigger.ownerId;
  if (trigger.orgId) stored.orgId = trigger.orgId;
  if (typeof trigger.notifyOnSuccess === "boolean") stored.notifyOnSuccess = trigger.notifyOnSuccess;
  if (trigger.cron) stored.cron = trigger.cron;
  if (trigger.timezone) stored.timezone = trigger.timezone;
  if (trigger.token) stored.token = trigger.token;
  if (trigger.watchType) stored.watchType = trigger.watchType;
  if (trigger.watchAction) stored.watchAction = trigger.watchAction;
  if (trigger.watchAttribute) stored.watchAttribute = trigger.watchAttribute;
  if (trigger.lastFiredAt) stored.lastFiredAt = trigger.lastFiredAt;
  if (trigger.lastRunId) stored.lastRunId = trigger.lastRunId;
  if (typeof trigger.fireCount === "number") stored.fireCount = trigger.fireCount;
  if (trigger.lastError) stored.lastError = trigger.lastError;
  return stored;
}
function deserializeTrigger(id, raw) {
  if (!raw || raw.type !== "workflow-trigger") return null;
  let graph = { nodes: [], edges: [] };
  const graphJson = raw[GRAPH_FIELD];
  if (typeof graphJson === "string") {
    try {
      const parsed = JSON.parse(graphJson);
      if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        graph = parsed;
      }
    } catch {
    }
  }
  return {
    id,
    title: raw.title || "Untitled Trigger",
    workflowId: raw.workflowId || "",
    workflowName: raw.workflowName || void 0,
    graph,
    kind: raw.kind || "schedule",
    active: Boolean(raw.active),
    agentId: raw.agentId || void 0,
    ownerId: raw.ownerId || void 0,
    orgId: raw.orgId || void 0,
    notifyOnSuccess: typeof raw.notifyOnSuccess === "boolean" ? raw.notifyOnSuccess : void 0,
    cron: raw.cron || void 0,
    timezone: raw.timezone || void 0,
    token: raw.token || void 0,
    watchType: raw.watchType || void 0,
    watchAction: raw.watchAction || void 0,
    watchAttribute: raw.watchAttribute || void 0,
    lastFiredAt: raw.lastFiredAt || void 0,
    lastRunId: raw.lastRunId || void 0,
    fireCount: typeof raw.fireCount === "number" ? raw.fireCount : void 0,
    lastError: raw.lastError || void 0,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now()
  };
}
const _listeners = /* @__PURE__ */ new Set();
function notifyListeners(kind, id, trigger) {
  for (const listener of _listeners) {
    try {
      listener({ kind, id, trigger });
    } catch (err) {
      console.error("[workflow-triggers] listener error:", err);
    }
  }
}
function loadEntityFacts(entityId) {
  const kernel = useTqlKernel();
  const store = kernel.getStore();
  const data = {};
  for (const fact of store.getAllFacts()) {
    if (fact.e === entityId) data[fact.a] = fact.v;
  }
  return Object.keys(data).length > 0 ? data : null;
}
function generateTriggerId() {
  return `entity:trigger-${randomUUID$1().replace(/-/g, "").slice(0, 16)}`;
}
function generateWebhookToken() {
  return randomUUID$1().replace(/-/g, "") + randomUUID$1().replace(/-/g, "").slice(0, 16);
}
async function listTriggers(filter) {
  const kernel = useTqlKernel();
  const store = kernel.getStore();
  const triggersById = /* @__PURE__ */ new Map();
  for (const fact of store.getAllFacts()) {
    if (!fact.e.startsWith("entity:trigger-")) continue;
    let bag = triggersById.get(fact.e);
    if (!bag) {
      bag = {};
      triggersById.set(fact.e, bag);
    }
    bag[fact.a] = fact.v;
  }
  const out = [];
  for (const [id, raw] of triggersById.entries()) {
    const trigger = deserializeTrigger(id, raw);
    if (!trigger) continue;
    if ((filter == null ? void 0 : filter.workflowId) && trigger.workflowId !== filter.workflowId) continue;
    if ((filter == null ? void 0 : filter.kind) && trigger.kind !== filter.kind) continue;
    if ((filter == null ? void 0 : filter.activeOnly) && !trigger.active) continue;
    out.push(trigger);
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}
async function getTrigger(id) {
  const raw = loadEntityFacts(id);
  if (!raw) return null;
  return deserializeTrigger(id, raw);
}
async function createTrigger(input, opts = {}) {
  var _a;
  if (!input.workflowId) throw new Error('createTrigger: "workflowId" is required');
  if (!input.graph || !Array.isArray(input.graph.nodes) || !Array.isArray(input.graph.edges)) {
    throw new Error('createTrigger: "graph" must include nodes[] and edges[]');
  }
  if (!["schedule", "webhook", "entity-change"].includes(input.kind)) {
    throw new Error(`createTrigger: unknown kind "${input.kind}"`);
  }
  if (input.kind === "schedule" && !input.cron) {
    throw new Error('createTrigger: schedule triggers require "cron"');
  }
  if (input.kind === "entity-change" && !input.watchType) {
    throw new Error('createTrigger: entity-change triggers require "watchType"');
  }
  const now = Date.now();
  const id = input.id || generateTriggerId();
  const trigger = {
    id,
    title: input.title || `${input.kind} trigger`,
    workflowId: input.workflowId,
    workflowName: input.workflowName,
    graph: input.graph,
    kind: input.kind,
    active: (_a = input.active) != null ? _a : true,
    agentId: input.agentId,
    ownerId: input.ownerId,
    orgId: input.orgId,
    notifyOnSuccess: input.notifyOnSuccess,
    cron: input.cron,
    timezone: input.timezone,
    token: input.kind === "webhook" ? input.token || generateWebhookToken() : input.token,
    watchType: input.watchType,
    watchAction: input.watchAction,
    watchAttribute: input.watchAttribute,
    createdAt: now,
    updatedAt: now,
    fireCount: 0
  };
  const kernel = useTqlKernel();
  const stored = serializeTrigger(trigger);
  const agentId = opts.agentId || "workflow-trigger";
  await kernel.createNode(id, stored, "entity", { agentId });
  pushMutationLog({ action: "createNode", entityId: id, type: "entity", data: stored });
  emitMutation({ action: "createNode", entityId: id, type: "entity", agentId, data: stored });
  notifyListeners("create", id, trigger);
  return trigger;
}
async function updateTrigger(id, patch, opts = {}) {
  const existing = await getTrigger(id);
  if (!existing) throw new Error(`updateTrigger: "${id}" not found`);
  const next = {
    ...existing,
    ...patch,
    id,
    createdAt: existing.createdAt,
    updatedAt: Date.now()
  };
  const kernel = useTqlKernel();
  const stored = serializeTrigger(next);
  const agentId = opts.agentId || "workflow-trigger";
  await kernel.updateNode(id, stored, "entity", { agentId });
  pushMutationLog({ action: "updateNode", entityId: id, type: "entity", data: stored });
  emitMutation({ action: "updateNode", entityId: id, type: "entity", agentId, data: stored });
  notifyListeners("update", id, next);
  return next;
}
async function deleteTrigger(id, opts = {}) {
  const existing = await getTrigger(id);
  if (!existing) return;
  const kernel = useTqlKernel();
  const agentId = opts.agentId || "workflow-trigger";
  await kernel.deleteNode(id, { agentId });
  pushMutationLog({ action: "deleteNode", entityId: id });
  emitMutation({ action: "deleteNode", entityId: id, agentId });
  notifyListeners("delete", id, existing);
}
async function recordTriggerFire(id, result) {
  const existing = await getTrigger(id);
  if (!existing) return;
  await updateTrigger(
    id,
    {
      lastFiredAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastRunId: result.runId,
      fireCount: (existing.fireCount || 0) + 1,
      lastError: result.error
    },
    { agentId: "workflow-trigger" }
  );
}
async function findWebhookTrigger(token) {
  if (!token) return null;
  const all = await listTriggers({ kind: "webhook", activeOnly: true });
  return all.find((t) => t.token === token) || null;
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
class Graph {
  constructor() {
    __publicField$1(this, "nodes", /* @__PURE__ */ new Map());
    __publicField$1(this, "edges", /* @__PURE__ */ new Map());
    __publicField$1(this, "outIdx", /* @__PURE__ */ new Map());
  }
  // preserve insertion order
  addNode(n) {
    if (this.nodes.has(n.id)) throw new Error(`node exists: ${n.id}`);
    this.nodes.set(n.id, n);
    if (!this.outIdx.has(n.id)) this.outIdx.set(n.id, []);
  }
  addEdge(e) {
    if (!this.nodes.has(e.from) || !this.nodes.has(e.to)) {
      throw new Error(`dangling edge ${e.id}: ${e.from} -> ${e.to}`);
    }
    if (this.edges.has(e.id)) throw new Error(`edge exists: ${e.id}`);
    this.edges.set(e.id, e);
    this.outIdx.get(e.from).push(e.id);
  }
  getNode(id) {
    return this.nodes.get(id);
  }
  out(from) {
    const ids = this.outIdx.get(from) || [];
    return ids.map((id) => this.edges.get(id)).filter(Boolean);
  }
  allNodes() {
    return this.nodes.values();
  }
  allEdges() {
    return this.edges.values();
  }
}

const interpolate = (tpl, vars) => tpl.replace(
  /\{\{(\w+(?:\.\w+)*)\}\}/g,
  (_m, k) => {
    var _a;
    return String((_a = pluck$1(vars, k)) != null ? _a : "");
  }
);
function pluck$1(obj, path) {
  return path.split(".").reduce((o, k) => o && o[k] !== void 0 ? o[k] : void 0, obj);
}

function makeDefaultExecutors(opts) {
  const { llm, stream, tools } = opts;
  const Agent = async (node, state) => {
    var _a;
    const {
      system = "",
      prompt = "",
      model = "gpt-4o",
      vars = {},
      stream: wantStream = false
    } = node.data || {};
    const rendered = interpolate(String(prompt || ""), {
      ...vars,
      input: state.input,
      state
    });
    (_a = state.log) == null ? void 0 : _a.call(state, "info", `Agent executing: ${node.id}`, {
      model,
      system: system.slice(0, 100)
    });
    if (wantStream && typeof stream === "function") {
      const iter = await stream({ model, system, prompt: rendered });
      return { output: { stream: iter }, next: "success" };
    } else {
      const { text } = await llm({ model, system, prompt: rendered });
      return { output: { text }, next: "success" };
    }
  };
  const Tool = async (node, state) => {
    var _a, _b, _c;
    const { name, args = {} } = node.data || {};
    console.log(`\u{1F527} [TOOL] Executing tool: ${name}`);
    console.log(`\u{1F4CB} [TOOL] Args:`, args);
    console.log(
      `\u{1F4E5} [TOOL] Input:`,
      ((_a = state.output) == null ? void 0 : _a.text) ? `"${String(state.output.text).slice(0, 100)}..."` : "none"
    );
    console.log(
      `\u{1F9E0} [TOOL] State memory keys:`,
      Object.keys(state.memory || {})
    );
    const fn = tools[name];
    if (!fn) {
      console.log(`\u274C [TOOL] Tool '${name}' not found in registry`);
      console.log(`\u{1F50D} [TOOL] Available tools:`, Object.keys(tools));
      throw new Error(`tool missing: ${name}`);
    }
    (_b = state.log) == null ? void 0 : _b.call(state, "info", `Tool executing: ${name}`, { args });
    try {
      const toolArgs = { ...args, input: (_c = state.output) == null ? void 0 : _c.text, state };
      console.log(`\u26A1 [TOOL] Calling tool with:`, {
        argKeys: Object.keys(toolArgs),
        hasState: !!toolArgs.state,
        hasInput: !!toolArgs.input
      });
      const res = await fn(toolArgs);
      console.log(`\u2705 [TOOL] Tool '${name}' completed successfully`);
      console.log(`\u{1F4E4} [TOOL] Result type:`, typeof res);
      console.log(
        `\u{1F4E4} [TOOL] Result preview:`,
        res && typeof res === "object" ? Object.keys(res) : String(res).slice(0, 100)
      );
      return { output: { tool: name, result: res }, next: "success" };
    } catch (error) {
      console.log(`\u274C [TOOL] Tool '${name}' failed:`, error.message);
      throw error;
    }
  };
  const Router = async (node, state) => {
    var _a;
    const { routes = [] } = node.data || {};
    const hit = routes.find((r) => {
      var _a2;
      return (_a2 = r == null ? void 0 : r.when) == null ? void 0 : _a2.call(r, state);
    });
    const label = (hit == null ? void 0 : hit.label) || "default";
    (_a = state.log) == null ? void 0 : _a.call(state, "debug", `Router routing to: ${label}`, { nodeId: node.id });
    return { output: state.output, next: label };
  };
  const Guard = async (node, state) => {
    var _a;
    const { allow } = node.data || {};
    const ok = typeof allow === "function" ? allow(state) : !!allow;
    (_a = state.log) == null ? void 0 : _a.call(state, "debug", `Guard ${ok ? "passed" : "failed"}`, {
      nodeId: node.id
    });
    return { output: state.output, next: ok ? "pass" : "fail" };
  };
  const MemoryRead = async (node, state) => {
    var _a, _b;
    const { key } = node.data || {};
    const v = (_a = state.memory) == null ? void 0 : _a[key];
    (_b = state.log) == null ? void 0 : _b.call(state, "debug", `Memory read: ${key}`, { value: v });
    return {
      output: { ...state.output, memory: { [key]: v } },
      next: "success"
    };
  };
  const MemoryWrite = async (node, state) => {
    var _a;
    const { key, from = "output.text" } = node.data || {};
    const val = pluck$1(state, from);
    state.memory || (state.memory = {});
    state.memory[key] = val;
    (_a = state.log) == null ? void 0 : _a.call(state, "debug", `Memory write: ${key}`, { value: val });
    return { output: state.output, next: "success" };
  };
  const End = async (_node, state) => {
    var _a;
    (_a = state.log) == null ? void 0 : _a.call(state, "info", "Execution completed");
    return { output: state.output, next: null };
  };
  return { Agent, Tool, Router, Guard, MemoryRead, MemoryWrite, End };
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const _crypto = globalThis.crypto;
class Engine {
  constructor(graph, {
    executors = {},
    llm,
    tools = {},
    maxSteps = 200,
    perNodeMs = 15e3,
    orchestrator,
    onEvent
  } = {}) {
    __publicField(this, "g");
    __publicField(this, "exec");
    __publicField(this, "llm");
    __publicField(this, "tools");
    __publicField(this, "maxSteps");
    __publicField(this, "perNodeMs");
    __publicField(this, "emit");
    __publicField(this, "orchestrator");
    var _a;
    this.g = graph;
    this.llm = llm != null ? llm : (async () => ({ text: "(mock LLM)" }));
    this.tools = tools;
    this.maxSteps = maxSteps;
    this.perNodeMs = perNodeMs;
    this.orchestrator = orchestrator;
    this.emit = onEvent;
    this.exec = {
      ...makeDefaultExecutors({
        llm: this.llm,
        stream: (_a = this.llm) == null ? void 0 : _a.stream,
        tools: this.tools
      }),
      ...executors
    };
  }
  /** Async generator that yields per-step traces and finally returns EngineState */
  async *run(startId, input, seedState = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u;
    let current = this.g.getNode(startId);
    if (!current) throw new Error("no start node");
    let steps = 0;
    const runId = ((_a = _crypto.randomUUID) == null ? void 0 : _a.call(_crypto)) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const traces = [];
    const journal = [];
    let state = {
      runId,
      step: 0,
      input,
      output: null,
      memory: {},
      meta: {},
      traces,
      journal,
      log: (level, msg, data) => this.log(state, level, msg, data),
      ...seedState
    };
    console.log(`\u{1F680} [ENGINE] Starting run ${runId} at node '${startId}'`);
    console.log(`\u{1F4CA} [ENGINE] Initial state:`, {
      step: state.step,
      inputType: typeof input,
      memoryKeys: Object.keys(state.memory || {}),
      startNode: current.id,
      nodeKind: current.kind
    });
    (_b = this.emit) == null ? void 0 : _b.call(this, {
      type: "run.start",
      ts: Date.now(),
      runId,
      data: { input, startId }
    });
    await ((_d = (_c = this.orchestrator) == null ? void 0 : _c.onRunStart) == null ? void 0 : _d.call(_c, state));
    while (current) {
      if (++steps > this.maxSteps)
        throw new Error(`step budget exceeded (${this.maxSteps})`);
      state.step = steps;
      console.log(
        `
\u{1F504} [ENGINE] Step ${steps}: Executing node '${current.id}' (${current.kind})`
      );
      console.log(`\u{1F4CB} [ENGINE] Node data:`, current.data);
      console.log(
        `\u{1F9E0} [ENGINE] Current state memory keys:`,
        Object.keys(state.memory || {})
      );
      const outEdges = this.g.out(current.id);
      console.log(
        `\u{1F517} [ENGINE] Outgoing edges from '${current.id}': [${outEdges.map((e) => `${e.to}(${e.label || "default"})`).join(", ")}]`
      );
      (_e = this.emit) == null ? void 0 : _e.call(this, {
        type: "node.start",
        ts: Date.now(),
        runId,
        nodeId: current.id
      });
      await ((_g = (_f = this.orchestrator) == null ? void 0 : _f.beforeNode) == null ? void 0 : _g.call(_f, current, state));
      const t0 = Date.now();
      let result = { output: state.output, next: null };
      let err;
      try {
        const exec = this.exec[current.kind];
        if (!exec) throw new Error(`no executor for kind: ${current.kind}`);
        console.log(`\u26A1 [ENGINE] Executing ${current.kind} executor...`);
        result = await withTimeout(exec(current, state), this.perNodeMs);
        console.log(`\u2705 [ENGINE] Executor completed:`, {
          outputType: typeof result.output,
          outputKeys: result.output && typeof result.output === "object" ? Object.keys(result.output) : "n/a",
          nextNode: result.next,
          hasOutput: !!result.output
        });
        await ((_i = (_h = this.orchestrator) == null ? void 0 : _h.afterNode) == null ? void 0 : _i.call(_h, current, state, result));
      } catch (e) {
        err = (_j = e == null ? void 0 : e.message) != null ? _j : String(e);
        console.log(`\u274C [ENGINE] Executor failed:`, {
          error: err,
          node: current.id,
          kind: current.kind
        });
        const errorAction = await ((_l = (_k = this.orchestrator) == null ? void 0 : _k.onError) == null ? void 0 : _l.call(
          _k,
          current,
          state,
          e
        ));
        if (errorAction === "retry") {
          continue;
        } else if (errorAction === "skip") {
          result = { output: state.output, next: "success" };
        } else {
          result = { output: state.output, next: "fail" };
        }
        (_m = this.emit) == null ? void 0 : _m.call(this, {
          type: "node.error",
          ts: Date.now(),
          runId,
          nodeId: current.id,
          data: { error: err }
        });
      }
      state.output = result.output;
      const trace = {
        nodeId: current.id,
        kind: current.kind,
        tStart: t0,
        tEnd: Date.now(),
        next: result.next,
        error: err
      };
      traces.push(trace);
      console.log(
        `\u{1F3C1} [ENGINE] Node '${current.id}' completed in ${trace.tEnd - trace.tStart}ms`
      );
      console.log(`\u{1F4E4} [ENGINE] Output type: ${typeof state.output}`);
      console.log(`\u{1F500} [ENGINE] Next routing label: '${result.next || "null"}'`);
      (_n = this.emit) == null ? void 0 : _n.call(this, {
        type: "node.end",
        ts: trace.tEnd,
        runId,
        nodeId: current.id,
        data: trace
      });
      yield { state, trace };
      if (!result.next) {
        console.log(`\u{1F6D1} [ENGINE] No next routing label - ending execution`);
        break;
      }
      const edgeOverride = await ((_p = (_o = this.orchestrator) == null ? void 0 : _o.beforeEdgeSelect) == null ? void 0 : _p.call(
        _o,
        current.id,
        result.next,
        state
      ));
      const finalLabel = (edgeOverride == null ? void 0 : edgeOverride.overrideLabel) || result.next;
      console.log(
        `\u{1F50D} [ENGINE] Selecting edge from '${current.id}' with label '${finalLabel}'`
      );
      const edge = this.selectEdge(current.id, finalLabel, state);
      if (!edge) {
        console.log(
          `\u274C [ENGINE] No matching edge found for label '${finalLabel}' from '${current.id}'`
        );
        const availableEdges = this.g.out(current.id);
        console.log(
          `\u{1F517} [ENGINE] Available edges:`,
          availableEdges.map((e) => ({
            to: e.to,
            label: e.label || "default",
            hasCond: !!e.cond
          }))
        );
        if (err) throw new Error(`unhandled error at ${current.id}: ${err}`);
        break;
      }
      console.log(
        `\u2705 [ENGINE] Selected edge: ${current.id} -> ${edge.to} (label: '${edge.label || "default"}')`
      );
      (_q = this.emit) == null ? void 0 : _q.call(this, {
        type: "edge.select",
        ts: Date.now(),
        runId,
        edgeId: edge.id,
        data: { from: current.id, to: edge.to, label: finalLabel }
      });
      const nextNode = this.g.getNode(edge.to);
      if (!nextNode) {
        console.log(`\u274C [ENGINE] Target node '${edge.to}' not found in graph`);
        break;
      }
      console.log(
        `\u27A1\uFE0F  [ENGINE] Transitioning to node '${edge.to}' (${nextNode.kind})`
      );
      current = nextNode;
    }
    console.log(`
\u{1F3C1} [ENGINE] Run ${runId} completed after ${steps} steps`);
    console.log(`\u{1F4CA} [ENGINE] Final state:`, {
      outputType: typeof state.output,
      memoryKeys: Object.keys(state.memory || {}),
      traceCount: traces.length,
      lastNode: (_r = traces[traces.length - 1]) == null ? void 0 : _r.nodeId
    });
    (_s = this.emit) == null ? void 0 : _s.call(this, {
      type: "run.end",
      ts: Date.now(),
      runId,
      data: { output: state.output, steps }
    });
    await ((_u = (_t = this.orchestrator) == null ? void 0 : _t.onRunEnd) == null ? void 0 : _u.call(_t, state));
    return state;
  }
  async runToEnd(...args) {
    const gen = this.run(...args);
    for await (const _ of gen) {
    }
    const result = await gen.next();
    return result.value;
  }
  selectEdge(fromId, label, state) {
    const outs = this.g.out(fromId);
    console.log(
      `\u{1F50D} [ENGINE] selectEdge: Checking ${outs.length} outgoing edges from '${fromId}' for label '${label}'`
    );
    const labeled = outs.filter((e) => e.label === label);
    console.log(
      `\u{1F3F7}\uFE0F  [ENGINE] Found ${labeled.length} edges with exact label match`
    );
    const pool = labeled.length ? labeled : outs.filter((e) => e.label === "default");
    console.log(
      `\u{1F3AF} [ENGINE] Edge pool size: ${pool.length} (using ${labeled.length ? "labeled" : "default"} edges)`
    );
    for (const edge of pool) {
      const condResult = typeof edge.cond === "function" ? edge.cond(state) : true;
      console.log(
        `\u{1F504} [ENGINE] Testing edge ${fromId} -> ${edge.to}: condition=${condResult}`
      );
      if (condResult) {
        console.log(
          `\u2705 [ENGINE] Selected edge: ${edge.id} (${fromId} -> ${edge.to})`
        );
        return edge;
      }
    }
    console.log(`\u274C [ENGINE] No suitable edge found`);
    return null;
  }
  // give executors a safe logger
  log(state, level, msg, data) {
    var _a, _b;
    const entry = {
      ts: Date.now(),
      level,
      nodeId: (_a = state.traces.at(-1)) == null ? void 0 : _a.nodeId,
      msg,
      data
    };
    state.journal.push(entry);
    (_b = this.emit) == null ? void 0 : _b.call(this, {
      type: "run.log",
      ts: entry.ts,
      runId: state.runId,
      data: entry
    });
  }
}
function withTimeout(p, ms) {
  let to;
  const timeout = new Promise((_, rej) => {
    to = setTimeout(() => rej(new Error(`node timeout ${ms}ms`)), ms);
  });
  return Promise.race([p.finally(() => clearTimeout(to)), timeout]);
}

async function sendEmail(opts) {
  const config = useRuntimeConfig();
  const apiKey = config.resendApiKey;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set \u2014 skipping email send");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const from = opts.from || config.resendFrom || "Trellis <noreply@trellis.app>";
  try {
    const res = await $fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: {
        from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...opts.replyTo ? { reply_to: opts.replyTo } : {}
      }
    });
    return { ok: true, id: res.id };
  } catch (err) {
    console.error("[email] Resend send failed:", err == null ? void 0 : err.message);
    return { ok: false, error: err == null ? void 0 : err.message };
  }
}

let _db = null;
function useInstantAdmin() {
  if (_db) return _db;
  const config = useRuntimeConfig();
  const appId = config.instantAppId || process.env.INSTANTDB_APP_ID || process.env.INSTANT_APP_ID || "";
  const adminToken = config.instantAppSecret || process.env.INSTANTDB_APP_SECRET || "";
  if (!appId || !adminToken) {
    throw new Error(
      "[instant-admin] Missing InstantDB credentials. Set INSTANTDB_APP_ID and INSTANTDB_APP_SECRET in your .env file."
    );
  }
  _db = init({ appId, adminToken });
  return _db;
}

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0a;
  color: #e5e5e5;
  margin: 0;
  padding: 0;
`;
const CARD_STYLE = `
  max-width: 520px;
  margin: 40px auto;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
`;
const HEADER_STYLE = `
  padding: 28px 32px 20px;
  border-bottom: 1px solid #2a2a2a;
`;
const BODY_STYLE = `
  padding: 28px 32px;
`;
const FOOTER_STYLE = `
  padding: 16px 32px;
  border-top: 1px solid #2a2a2a;
  font-size: 11px;
  color: #555;
  text-align: center;
`;
const BTN_STYLE = `
  display: inline-block;
  margin-top: 20px;
  padding: 10px 20px;
  background: #7c3aed;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
`;
function wrap(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_STYLE}">
      <span style="font-size:18px;font-weight:700;color:#e5e5e5;">Trellis</span>
    </div>
    <div style="${BODY_STYLE}">${content}</div>
    <div style="${FOOTER_STYLE}">You're receiving this because you're a member of a Trellis workspace. <a href="{{{unsubscribeUrl}}}" style="color:#555;">Unsubscribe</a></div>
  </div>
</body></html>`;
}
function inviteEmailHtml(opts) {
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">You've been invited to ${opts.orgName}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#999;">${opts.inviterName} invited you to join <strong style="color:#e5e5e5;">${opts.orgName}</strong> on Trellis.</p>
    <a href="${opts.inviteUrl}" style="${BTN_STYLE}">Accept invitation</a>
    <p style="margin:24px 0 0;font-size:12px;color:#555;">Or copy this link: <a href="${opts.inviteUrl}" style="color:#7c3aed;">${opts.inviteUrl}</a></p>
  `);
}
function mentionEmailHtml(opts) {
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">You were mentioned</p>
    <p style="margin:0 0 20px;font-size:14px;color:#999;"><strong style="color:#e5e5e5;">${opts.actorName}</strong> mentioned you in <strong style="color:#e5e5e5;">${opts.entityTitle}</strong>.</p>
    <a href="${opts.actionUrl}" style="${BTN_STYLE}">View</a>
  `);
}
function commentEmailHtml(opts) {
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">New comment on "${opts.entityTitle}"</p>
    <p style="margin:0 0 12px;font-size:14px;color:#999;"><strong style="color:#e5e5e5;">${opts.actorName}</strong> commented:</p>
    <blockquote style="margin:0 0 20px;padding:12px 16px;background:#1e1e1e;border-left:3px solid #7c3aed;border-radius:4px;font-size:14px;color:#ccc;">${opts.commentSnippet}</blockquote>
    <a href="${opts.actionUrl}" style="${BTN_STYLE}">View comment</a>
  `);
}
function assignedEmailHtml(opts) {
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">Task assigned to you</p>
    <p style="margin:0 0 20px;font-size:14px;color:#999;"><strong style="color:#e5e5e5;">${opts.actorName}</strong> assigned <strong style="color:#e5e5e5;">"${opts.taskTitle}"</strong> to you.</p>
    <a href="${opts.actionUrl}" style="${BTN_STYLE}">View task</a>
  `);
}
function esc(value) {
  return value.replace(
    /[<>&"']/g,
    (c) => ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&#39;"
    })[c] || c
  );
}
function notificationEmailHtml(opts) {
  const byline = opts.actorName ? `<p style="margin:0 0 12px;font-size:13px;color:#666;">From <strong style="color:#aaa;">${esc(opts.actorName)}</strong></p>` : "";
  const cta = opts.actionUrl ? `<a href="${opts.actionUrl}" style="${BTN_STYLE}">Open in Trellis</a>` : "";
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">${esc(opts.title)}</p>
    ${byline}
    <p style="margin:0 0 20px;font-size:14px;color:#999;line-height:1.55;">${esc(opts.message)}</p>
    ${cta}
  `);
}
function workflowFailedEmailHtml(opts) {
  const errBlock = `<blockquote style="margin:0 0 20px;padding:12px 16px;background:#1e1e1e;border-left:3px solid #ef4444;border-radius:4px;font-size:13px;font-family:monospace;color:#f87171;white-space:pre-wrap;word-break:break-word;">${esc(opts.error)}</blockquote>`;
  const meta = opts.runId ? `<p style="margin:0 0 12px;font-size:12px;color:#666;">Run ID: <code style="color:#aaa;">${esc(opts.runId)}</code></p>` : "";
  const cta = opts.actionUrl ? `<a href="${opts.actionUrl}" style="${BTN_STYLE}">View run</a>` : "";
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">Workflow failed</p>
    <p style="margin:0 0 12px;font-size:14px;color:#999;"><strong style="color:#e5e5e5;">${esc(opts.workflowName)}</strong> did not finish successfully.</p>
    ${errBlock}
    ${meta}
    ${cta}
  `);
}
function workflowCompletedEmailHtml(opts) {
  const seconds = (opts.durationMs / 1e3).toFixed(1);
  const cta = opts.actionUrl ? `<a href="${opts.actionUrl}" style="${BTN_STYLE}">View run</a>` : "";
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">Workflow completed</p>
    <p style="margin:0 0 12px;font-size:14px;color:#999;"><strong style="color:#e5e5e5;">${esc(opts.workflowName)}</strong> ran successfully.</p>
    <p style="margin:0 0 20px;font-size:13px;color:#777;">${opts.stepCount} step${opts.stepCount === 1 ? "" : "s"} \xB7 ${seconds}s</p>
    ${cta}
  `);
}

const DEFAULT_EMAIL_TYPES = /* @__PURE__ */ new Set([
  "invite_accepted",
  "member_joined",
  "mention",
  "comment",
  "entity_updated",
  "workflow_failed"
]);
async function getRecipientEmail(userId) {
  var _a;
  try {
    const db = useInstantAdmin();
    const res = await db.auth.getUser({ id: userId });
    const email = (_a = res == null ? void 0 : res.user) == null ? void 0 : _a.email;
    return typeof email === "string" && email.includes("@") ? email.toLowerCase() : null;
  } catch (err) {
    console.warn(`[notification-email] getRecipientEmail failed for ${userId}:`, err == null ? void 0 : err.message);
    return null;
  }
}
async function getUserEmailPrefs(userId) {
  var _a, _b;
  const fallback = { emailEnabled: true, emailMutedTypes: [] };
  try {
    const db = useInstantAdmin();
    const settingKey = `user:${userId}:notificationPrefs`;
    const result = await db.query({
      settings: { $: { where: { settingKey } } }
    });
    const setting = (_a = result == null ? void 0 : result.settings) == null ? void 0 : _a[0];
    const value = (setting == null ? void 0 : setting.value) || {};
    return {
      emailEnabled: (_b = value.emailEnabled) != null ? _b : true,
      emailMutedTypes: Array.isArray(value.emailMutedTypes) ? value.emailMutedTypes : []
    };
  } catch (err) {
    console.warn(`[notification-email] getUserEmailPrefs failed for ${userId}:`, err == null ? void 0 : err.message);
    return fallback;
  }
}
function shouldDispatchEmail(type, prefs) {
  if (!prefs.emailEnabled) return false;
  if (prefs.emailMutedTypes.includes(type)) return false;
  if (!DEFAULT_EMAIL_TYPES.has(type)) return false;
  return true;
}
function pickSubject(input) {
  const orgTag = input.orgName ? `[${input.orgName}] ` : "";
  switch (input.type) {
    case "mention":
      return `${orgTag}${input.actorName || "Someone"} mentioned you`;
    case "comment":
      return `${orgTag}${input.title}`;
    case "entity_updated":
      return `${orgTag}${input.title}`;
    case "workflow_failed":
      return `${orgTag}Workflow failed: ${input.title}`;
    case "workflow_completed":
      return `${orgTag}Workflow completed: ${input.title}`;
    case "invite_accepted":
      return `${orgTag}${input.title}`;
    default:
      return `${orgTag}${input.title}`;
  }
}
function pickHtml(input) {
  const actorName = input.actorName || "Someone";
  const actionUrl = input.actionUrl;
  const meta = input.metadata || {};
  switch (input.type) {
    case "mention":
      return mentionEmailHtml({
        actorName,
        entityTitle: input.title.replace(/^[@#]/, "") || "Trellis",
        actionUrl: actionUrl || "https://app.trellis.app"
      });
    case "comment":
      return commentEmailHtml({
        actorName,
        entityTitle: typeof meta.entityTitle === "string" ? meta.entityTitle : input.title,
        commentSnippet: input.message.replace(/^[^:]+:\s*/, "").slice(0, 300),
        actionUrl: actionUrl || "https://app.trellis.app"
      });
    case "entity_updated":
      return assignedEmailHtml({
        actorName,
        taskTitle: typeof meta.entityTitle === "string" ? meta.entityTitle : input.title,
        actionUrl: actionUrl || "https://app.trellis.app"
      });
    case "workflow_failed":
      return workflowFailedEmailHtml({
        workflowName: typeof meta.workflowName === "string" ? meta.workflowName : input.title,
        error: typeof meta.error === "string" ? meta.error : input.message,
        runId: typeof meta.runId === "string" ? meta.runId : void 0,
        actionUrl
      });
    case "workflow_completed":
      return workflowCompletedEmailHtml({
        workflowName: typeof meta.workflowName === "string" ? meta.workflowName : input.title,
        stepCount: typeof meta.stepCount === "number" ? meta.stepCount : 0,
        durationMs: typeof meta.durationMs === "number" ? meta.durationMs : 0,
        actionUrl
      });
    default:
      return notificationEmailHtml({
        title: input.title,
        message: input.message,
        actionUrl,
        actorName: input.actorName
      });
  }
}
async function dispatchNotificationEmail(input) {
  if (!input.recipientId || !input.type || !input.title) {
    return { sent: false, reason: "missing-fields" };
  }
  const prefs = await getUserEmailPrefs(input.recipientId);
  if (!shouldDispatchEmail(input.type, prefs)) {
    return { sent: false, reason: "pref-muted" };
  }
  const to = await getRecipientEmail(input.recipientId);
  if (!to) {
    return { sent: false, reason: "no-email" };
  }
  const result = await sendEmail({
    to,
    subject: pickSubject(input),
    html: pickHtml(input)
  });
  if (!result.ok) {
    return { sent: false, reason: result.error || "send-failed" };
  }
  return { sent: true, id: result.id };
}
function dispatchNotificationEmailAsync(input) {
  dispatchNotificationEmail(input).then((res) => {
    if (!res.sent && res.reason && res.reason !== "pref-muted" && res.reason !== "no-email") {
      console.warn(
        `[notification-email] ${input.type} \u2192 ${input.recipientId} skipped: ${res.reason}`
      );
    }
  }).catch((err) => {
    console.error("[notification-email] dispatch failed:", (err == null ? void 0 : err.message) || err);
  });
}

function asString(value, fallback = "") {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}
function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}
const http_request = async (args) => {
  var _a;
  const url = asString(args.url);
  if (!url) throw new Error('http_request: "url" is required');
  if (!/^https?:\/\//i.test(url)) throw new Error("http_request: url must be http(s)");
  const method = asString(args.method, "GET").toUpperCase();
  const headers = asRecord(args.headers);
  const timeoutMs = Number((_a = args.timeoutMs) != null ? _a : 1e4);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const hasBody = method !== "GET" && method !== "HEAD" && args.body != null;
    const res = await fetch(url, {
      method,
      headers: { "User-Agent": "Trellis-Workflow/1.0", ...headers },
      body: hasBody ? typeof args.body === "string" ? args.body : JSON.stringify(args.body) : void 0,
      signal: controller.signal
    });
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await res.json() : await res.text();
    return {
      status: res.status,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
      body
    };
  } finally {
    clearTimeout(t);
  }
};
const tql_query = async (args) => {
  var _a, _b, _c, _d;
  const eqls = asString((_a = args.eqls) != null ? _a : args.query);
  if (!eqls) throw new Error('tql_query: "eqls" is required');
  const kernel = useTqlKernel();
  const result = await kernel.query(eqls);
  return { rows: (_b = result.rows) != null ? _b : [], count: (_d = (_c = result.rows) == null ? void 0 : _c.length) != null ? _d : 0 };
};
const tql_load_data = async (args) => {
  var _a;
  const entityId = asString((_a = args.entityId) != null ? _a : args.id);
  if (!entityId) throw new Error('tql_load_data: "entityId" is required');
  const kernel = useTqlKernel();
  const store = kernel.getStore();
  const data = {};
  for (const fact of store.getAllFacts()) {
    if (fact.e === entityId) data[fact.a] = fact.v;
  }
  return { id: entityId, data: Object.keys(data).length > 0 ? data : null };
};
const tql_mutate = async (args, ctx) => {
  const action = asString(args.action);
  const kernel = useTqlKernel();
  const agentId = ctx.agentId || "workflow";
  switch (action) {
    case "createNode": {
      const entityId = asString(args.entityId);
      const type = asString(args.type, "entity");
      const data = asRecord(args.data);
      if (!entityId) throw new Error('tql_mutate createNode: "entityId" is required');
      await kernel.createNode(entityId, data, type, { agentId });
      pushMutationLog({ action: "createNode", entityId, type, data });
      emitMutation({ action: "createNode", entityId, type, agentId, data });
      return { ok: true, entityId, created: true };
    }
    case "updateNode": {
      const entityId = asString(args.entityId);
      const type = asString(args.type, "entity");
      const data = asRecord(args.data);
      if (!entityId) throw new Error('tql_mutate updateNode: "entityId" is required');
      await kernel.updateNode(entityId, data, type, { agentId });
      pushMutationLog({ action: "updateNode", entityId, type, data });
      emitMutation({ action: "updateNode", entityId, type, agentId, data });
      return { ok: true, entityId, updated: true };
    }
    case "deleteNode": {
      const entityId = asString(args.entityId);
      if (!entityId) throw new Error('tql_mutate deleteNode: "entityId" is required');
      await kernel.deleteNode(entityId, { agentId });
      pushMutationLog({ action: "deleteNode", entityId });
      emitMutation({ action: "deleteNode", entityId, agentId });
      return { ok: true, entityId, deleted: true };
    }
    case "link": {
      const e1 = asString(args.e1);
      const e2 = asString(args.e2);
      const relation = asString(args.relation);
      if (!e1 || !e2 || !relation) {
        throw new Error('tql_mutate link: "e1", "e2", "relation" are required');
      }
      await kernel.link(e1, relation, e2, { agentId });
      pushMutationLog({ action: "link", entityId: `${e1} -> ${e2}`, data: { relation } });
      emitMutation({ action: "link", entityId: `${e1} -> ${e2}`, agentId, data: { relation, e1, e2 } });
      return { ok: true, linked: true };
    }
    default:
      throw new Error(`tql_mutate: unknown action "${action}"`);
  }
};
const send_email = async (args) => {
  const to = asString(args.to);
  const subject = asString(args.subject);
  const html = args.html ? asString(args.html) : "";
  const text = args.text ? asString(args.text) : "";
  if (!to || !subject) throw new Error('send_email: "to" and "subject" are required');
  if (!html && !text) throw new Error('send_email: either "html" or "text" is required');
  const body = html || `<pre style="font-family:monospace;white-space:pre-wrap">${text.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] || c)}</pre>`;
  const result = await sendEmail({
    to,
    subject,
    html: body,
    ...args.from ? { from: asString(args.from) } : {},
    ...args.replyTo ? { replyTo: asString(args.replyTo) } : {}
  });
  return result;
};
const run_js = async (args) => {
  var _a;
  const code = asString(args.code);
  if (!code) throw new Error('run_js: "code" is required');
  const input = (_a = args.input) != null ? _a : null;
  const logs = [];
  const sandbox = {
    input,
    JSON,
    console: {
      log: (..._args) => logs.push(_args.map((a) => asString(a)).join(" ")),
      error: (..._args) => logs.push("[error] " + _args.map((a) => asString(a)).join(" "))
    }
  };
  const context = vm.createContext(sandbox);
  const script = new vm.Script(`(async () => { ${code} })()`);
  try {
    const result = await script.runInContext(context, { timeout: 5e3 });
    return { result, logs };
  } catch (err) {
    throw new Error(`run_js: ${(err == null ? void 0 : err.message) || String(err)}`);
  }
};
const send_notification = async (args, ctx) => {
  const recipients = Array.isArray(args.recipients) ? args.recipients.map((r) => asString(r)).filter(Boolean) : args.recipientId ? [asString(args.recipientId)] : [];
  const orgId = asString(args.orgId);
  const type = asString(args.type);
  const title = asString(args.title);
  const message = asString(args.message);
  if (recipients.length === 0) throw new Error('send_notification: "recipientId" or "recipients[]" required');
  if (!orgId) throw new Error('send_notification: "orgId" is required');
  if (!type) throw new Error('send_notification: "type" is required');
  if (!title) throw new Error('send_notification: "title" is required');
  if (!message) throw new Error('send_notification: "message" is required');
  const db = useInstantAdmin();
  const now = Date.now();
  const orgName = args.orgName ? asString(args.orgName) : "";
  const actionUrl = args.actionUrl ? asString(args.actionUrl) : "";
  const icon = args.icon ? asString(args.icon) : "";
  const variant = args.variant ? asString(args.variant) : "default";
  const actorName = args.actorName ? asString(args.actorName) : "";
  const actorId = args.actorId ? asString(args.actorId) : ctx.agentId || "workflow";
  const metadata = asRecord(args.metadata);
  const skipEmail = args.skipEmail === true;
  const created = [];
  for (const recipientId of recipients) {
    try {
      const notifId = crypto.randomUUID();
      await db.transact(
        db.tx.notifications[notifId].update({
          recipientId,
          orgId,
          orgName,
          type,
          title,
          message,
          actionUrl,
          icon,
          variant,
          isRead: false,
          actorId,
          actorName,
          metadata,
          createdAt: now
        })
      );
      try {
        await db.transact(db.tx.organizations[orgId].link({ notifications: notifId }));
      } catch (linkErr) {
        console.warn(`[send_notification] org link failed for ${notifId} (non-fatal):`, linkErr == null ? void 0 : linkErr.message);
      }
      if (!skipEmail) {
        dispatchNotificationEmailAsync({
          recipientId,
          type,
          title,
          message,
          actionUrl: actionUrl || void 0,
          actorName: actorName || void 0,
          orgName: orgName || void 0,
          metadata
        });
      }
      created.push(notifId);
    } catch (err) {
      console.error(`[send_notification] create failed for ${recipientId}:`, (err == null ? void 0 : err.message) || err);
    }
  }
  return { ok: true, created: created.length, ids: created };
};
const workflowTools = {
  http_request,
  tql_query,
  tql_load_data,
  tql_mutate,
  send_email,
  send_notification,
  run_js
};
function listWorkflowTools() {
  return Object.keys(workflowTools);
}
async function invokeWorkflowTool(name, args, ctx = {}) {
  const handler = workflowTools[name];
  if (!handler) throw new Error(`Unknown workflow tool: ${name}`);
  return handler(args, ctx);
}

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || "gemma4:e4b";
function isGeminiModel(model) {
  return /^gemini-/i.test(model);
}
async function callOllama(params) {
  var _a;
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      system: params.system,
      stream: false
    })
  });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(`Ollama error: ${data.error}`);
  return (_a = data.response) != null ? _a : "";
}
async function callGemini(params) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: params.model,
    ...params.system ? { systemInstruction: params.system } : {}
  });
  const result = await model.generateContent(params.prompt);
  return result.response.text();
}
function createServerLLM(defaultModel = DEFAULT_MODEL) {
  return async (req) => {
    var _a, _b;
    const model = (_a = req.model) != null ? _a : defaultModel;
    const prompt = (_b = req.prompt) != null ? _b : "";
    if (model === "passthrough") return { text: prompt };
    const text = isGeminiModel(model) ? await callGemini({ model, system: req.system, prompt }) : await callOllama({ model, system: req.system, prompt });
    return { text };
  };
}
function createServerTools(workflowId, agentId) {
  const tools = {};
  for (const name of listWorkflowTools()) {
    tools[name] = async (args) => invokeWorkflowTool(name, args != null ? args : {}, {
      agentId,
      workflowId
    });
  }
  return tools;
}
function pluck(obj, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc == null || typeof acc !== "object") return void 0;
    return acc[key];
  }, obj);
}
function createGraphMemoryExecutors(tools) {
  const isGraphMode = (node) => {
    var _a;
    return ((_a = node.data) == null ? void 0 : _a.source) === "graph";
  };
  const tqlQuery = tools.tql_query;
  const tqlLoadData = tools.tql_load_data;
  const tqlMutate = tools.tql_mutate;
  if (!tqlQuery || !tqlLoadData || !tqlMutate) {
    throw new Error("Graph-memory executors require tql_query, tql_load_data, tql_mutate.");
  }
  const MemoryRead = async (node, state) => {
    var _a, _b, _c, _d;
    const data = node.data || {};
    const key = data.key || "";
    if (isGraphMode(node) && key) {
      try {
        let value;
        if (/^\s*FIND\s/i.test(key)) {
          const r = await tqlQuery({ eqls: key });
          value = (_a = r == null ? void 0 : r.rows) != null ? _a : [];
        } else {
          const r = await tqlLoadData({ entityId: key });
          value = (_b = r == null ? void 0 : r.data) != null ? _b : null;
        }
        state.memory || (state.memory = {});
        state.memory[key] = value;
        return { output: { ...state.output, memory: { [key]: value } }, next: "success" };
      } catch (err) {
        (_c = state.log) == null ? void 0 : _c.call(state, "error", `memory.read failed: ${err.message}`);
        return { output: state.output, next: "success" };
      }
    }
    const v = (_d = state.memory) == null ? void 0 : _d[key];
    return { output: { ...state.output, memory: { [key]: v } }, next: "success" };
  };
  const MemoryWrite = async (node, state) => {
    var _a;
    const data = node.data || {};
    const key = data.key || "";
    const from = data.from || "output.text";
    const val = pluck(state, from);
    if (isGraphMode(node) && key) {
      try {
        const fallbackType = data.entityType || "note";
        const entityData = val && typeof val === "object" && !Array.isArray(val) ? val : { type: fallbackType, content: val == null ? "" : String(val) };
        const existing = await tqlLoadData({ entityId: key });
        const action = (existing == null ? void 0 : existing.data) ? "updateNode" : "createNode";
        await tqlMutate({ action, entityId: key, type: "entity", data: entityData });
        state.memory || (state.memory = {});
        state.memory[key] = val;
        return { output: state.output, next: "success" };
      } catch (err) {
        (_a = state.log) == null ? void 0 : _a.call(state, "error", `memory.write failed: ${err.message}`);
        return { output: state.output, next: "success" };
      }
    }
    state.memory || (state.memory = {});
    state.memory[key] = val;
    return { output: state.output, next: "success" };
  };
  return { MemoryRead, MemoryWrite };
}
function safeCompileCondition(expr) {
  try {
    return new Function("s", `try { return !!(${expr}) } catch(e) { return false }`);
  } catch {
    return () => false;
  }
}
function addCompiledNode(graph, nodeDef) {
  var _a, _b, _c, _d, _e;
  const { id, kind, data } = nodeDef;
  switch (kind) {
    case "agent":
      graph.addNode({
        id,
        kind: "Agent",
        data: {
          system: (data == null ? void 0 : data.system) || void 0,
          prompt: (data == null ? void 0 : data.prompt) || "{{input}}",
          model: (data == null ? void 0 : data.model) || DEFAULT_MODEL,
          stream: Boolean(data == null ? void 0 : data.stream)
        }
      });
      break;
    case "tool": {
      const rawArgs = (_a = data == null ? void 0 : data.args) != null ? _a : [];
      const compiledArgs = {};
      for (const { key, value } of rawArgs) {
        if (key) compiledArgs[key] = value;
      }
      graph.addNode({
        id,
        kind: "Tool",
        data: { name: (data == null ? void 0 : data.toolName) || "run_js", args: compiledArgs }
      });
      break;
    }
    case "router": {
      const raw = (_b = data == null ? void 0 : data.routes) != null ? _b : [{ id: "default", label: "default", condition: "" }];
      const nonDefault = raw.filter((r) => r.id !== "default");
      const defaultRoute = raw.find((r) => r.id === "default");
      const routes = [
        ...nonDefault.map((r) => ({
          label: r.label,
          when: r.condition ? safeCompileCondition(r.condition) : () => false
        })),
        { label: (_c = defaultRoute == null ? void 0 : defaultRoute.label) != null ? _c : "default", when: () => true }
      ];
      graph.addNode({ id, kind: "Router", data: { routes } });
      break;
    }
    case "guard": {
      const mode = (_d = data == null ? void 0 : data.mode) != null ? _d : "allow";
      const condStr = (_e = data == null ? void 0 : data.condition) != null ? _e : "";
      const condFn = condStr ? safeCompileCondition(condStr) : () => true;
      const allow = mode === "block" ? (s) => !condFn(s) : condFn;
      graph.addNode({ id, kind: "Guard", data: { allow } });
      break;
    }
    case "memory-read":
      graph.addNode({
        id,
        kind: "MemoryRead",
        data: {
          key: (data == null ? void 0 : data.key) || "",
          source: (data == null ? void 0 : data.source) || "state"
        }
      });
      break;
    case "memory-write":
      graph.addNode({
        id,
        kind: "MemoryWrite",
        data: {
          key: (data == null ? void 0 : data.key) || "",
          from: (data == null ? void 0 : data.from) || void 0,
          source: (data == null ? void 0 : data.source) || "state",
          entityType: (data == null ? void 0 : data.entityType) || void 0
        }
      });
      break;
    case "end":
      graph.addNode({ id, kind: "End" });
      break;
  }
}
function compileGraph(wfGraph, options) {
  const graph = new Graph();
  const startDef = wfGraph.nodes.find((n) => n.kind === "start");
  if (!startDef) throw new Error("Workflow has no Start node");
  graph.addNode({
    id: startDef.id,
    kind: "Agent",
    data: { system: "Passthrough.", prompt: "{{input}}", model: "passthrough" }
  });
  for (const nodeDef of wfGraph.nodes) {
    if (nodeDef.kind === "start" || nodeDef.kind === "note") continue;
    addCompiledNode(graph, nodeDef);
  }
  const noteIds = new Set(wfGraph.nodes.filter((n) => n.kind === "note").map((n) => n.id));
  for (const e of wfGraph.edges) {
    if (noteIds.has(e.source) || noteIds.has(e.target)) continue;
    if (!wfGraph.nodes.some((n) => n.id === e.source) || !wfGraph.nodes.some((n) => n.id === e.target)) continue;
    graph.addEdge({
      id: e.id,
      from: e.source,
      to: e.target,
      label: e.sourceHandle || e.label || "default"
    });
  }
  const { MemoryRead, MemoryWrite } = createGraphMemoryExecutors(options.tools);
  const engine = new Engine(graph, {
    llm: options.llm,
    tools: options.tools,
    executors: { MemoryRead, MemoryWrite },
    maxSteps: 50,
    perNodeMs: 6e4
  });
  return { engine, startId: startDef.id };
}
const MAX_JSON_BYTES = 256 * 1024;
function safeStringify(value, maxBytes = MAX_JSON_BYTES) {
  if (value === void 0) return void 0;
  try {
    const s = JSON.stringify(value);
    if (s.length > maxBytes) {
      return JSON.stringify({ __truncated: true, __originalBytes: s.length, preview: s.slice(0, maxBytes) });
    }
    return s;
  } catch {
    return void 0;
  }
}
async function persistRun(run) {
  const kernel = useTqlKernel();
  const agentId = run.agentId || "workflow-server";
  const stored = {
    type: "workflow-run",
    title: `Run \xB7 ${run.workflowName || run.workflowId} \xB7 ${new Date(run.startedAt).toLocaleString()}`,
    workflowId: run.workflowId,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    stepCount: run.stepCount
  };
  if (run.workflowName) stored.workflowName = run.workflowName;
  if (run.agentId) stored.agentId = run.agentId;
  if (run.error) stored.error = run.error;
  const inputJson = safeStringify(run.input, 32 * 1024);
  if (inputJson) stored.inputJson = inputJson;
  const outputJson = safeStringify(run.output, 32 * 1024);
  if (outputJson) stored.outputJson = outputJson;
  const tracesJson = safeStringify(run.traces);
  if (tracesJson) stored.tracesJson = tracesJson;
  const stepOutputsJson = safeStringify(run.stepOutputs);
  if (stepOutputsJson) stored.stepOutputsJson = stepOutputsJson;
  await kernel.createNode(run.id, stored, "entity", { agentId });
  pushMutationLog({ action: "createNode", entityId: run.id, type: "entity", data: stored });
  emitMutation({ action: "createNode", entityId: run.id, type: "entity", agentId, data: stored });
}
function notifyWorkflowOwner(run, opts) {
  const isFailure = run.status === "failed";
  if (!isFailure && !opts.notifyOnSuccess) return;
  const db = (() => {
    try {
      return useInstantAdmin();
    } catch (err) {
      console.warn("[workflow-executor] InstantDB admin unavailable, skipping owner notify:", err == null ? void 0 : err.message);
      return null;
    }
  })();
  if (!db) return;
  const type = isFailure ? "workflow_failed" : "workflow_completed";
  const name = run.workflowName || run.workflowId;
  const title = isFailure ? `Workflow failed: ${name}` : `Workflow completed: ${name}`;
  const errSnippet = run.error ? run.error.slice(0, 200) : "";
  const message = isFailure ? errSnippet || "The run did not finish successfully." : `Ran ${run.stepCount} step${run.stepCount === 1 ? "" : "s"} in ${(run.durationMs / 1e3).toFixed(1)}s.`;
  const actionUrl = `/workflows/${encodeURIComponent(run.workflowId)}/runs/${encodeURIComponent(run.id)}`;
  const orgId = opts.orgId || "";
  const metadata = {
    workflowId: run.workflowId,
    workflowName: run.workflowName,
    runId: run.id,
    stepCount: run.stepCount,
    durationMs: run.durationMs
  };
  if (run.error) metadata.error = run.error;
  const notifId = crypto.randomUUID();
  const now = Date.now();
  db.transact(
    db.tx.notifications[notifId].update({
      recipientId: opts.ownerId,
      orgId,
      type,
      title,
      message,
      actionUrl,
      icon: isFailure ? "lucide:triangle-alert" : "lucide:check-circle-2",
      variant: isFailure ? "destructive" : "success",
      isRead: false,
      actorId: run.agentId || "workflow",
      actorName: "Trellis Workflows",
      metadata,
      createdAt: now
    })
  ).then(() => {
    if (orgId) {
      db.transact(db.tx.organizations[orgId].link({ notifications: notifId })).catch(() => {
      });
    }
  }).catch((err) => {
    console.warn("[workflow-executor] owner notification create failed (non-fatal):", (err == null ? void 0 : err.message) || err);
  });
  dispatchNotificationEmailAsync({
    recipientId: opts.ownerId,
    type,
    title,
    message,
    actionUrl,
    actorName: "Trellis Workflows",
    metadata
  });
}
function notifyWorkflowTrellis(run, notifyOnSuccess) {
  const isFailure = run.status === "failed";
  if (!isFailure && !notifyOnSuccess) return;
  const name = run.workflowName || run.workflowId;
  const title = isFailure ? `Workflow failed: ${name}` : `Workflow completed: ${name}`;
  const durationSec = (run.durationMs / 1e3).toFixed(1);
  const body = isFailure ? run.error ? run.error.slice(0, 200) : "Run did not finish successfully." : `${run.stepCount} step${run.stepCount === 1 ? "" : "s"} in ${durationSec}s`;
  const actionUrl = `/workflows/${encodeURIComponent(run.workflowId)}/runs/${encodeURIComponent(run.id)}`;
  createNotification(
    {
      title,
      body,
      kind: isFailure ? "error" : "success",
      source: "workflow",
      sourceId: `workflow-run:${run.id}`,
      priority: isFailure ? "high" : "normal",
      url: actionUrl,
      entityId: run.id,
      entityType: "workflow-run",
      actions: [
        { id: "open", kind: "link", label: "Open run", icon: "lucide:external-link", target: actionUrl },
        isFailure ? {
          id: "retry",
          kind: "api",
          label: "Retry",
          icon: "lucide:refresh-cw",
          apiPath: "/api/workflows/execute",
          apiMethod: "POST",
          apiBody: { workflowId: run.workflowId }
        } : { id: "dismiss", kind: "dismiss", label: "Dismiss", icon: "lucide:x" }
      ],
      metadata: {
        workflowId: run.workflowId,
        workflowName: run.workflowName,
        runId: run.id,
        stepCount: run.stepCount,
        durationMs: run.durationMs,
        ...run.error ? { error: run.error } : {}
      },
      groupKey: `workflow:${run.workflowId}`
    },
    { agentId: "workflow-server" }
  ).catch((err) => {
    console.warn("[workflow-executor] trellis notification failed (non-fatal):", (err == null ? void 0 : err.message) || err);
  });
}
async function executeWorkflow(opts) {
  var _a, _b, _c;
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const tStart = Date.now();
  const runId = `entity:run-${opts.workflowId}-${tStart}`;
  const agentId = opts.agentId || "workflow-server";
  const traces = [];
  const stepOutputs = {};
  let finalState = null;
  let errorMessage;
  try {
    const llm = createServerLLM(opts.defaultModel);
    const tools = createServerTools(opts.workflowId, agentId);
    const { engine, startId } = compileGraph(opts.graph, { llm, tools });
    for await (const step of engine.run(startId, (_a = opts.input) != null ? _a : {})) {
      traces.push(step.trace);
      stepOutputs[step.trace.nodeId] = step.state.output;
      finalState = step.state;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }
  const completedAt = (/* @__PURE__ */ new Date()).toISOString();
  const durationMs = Date.now() - tStart;
  const run = {
    id: runId,
    workflowId: opts.workflowId,
    workflowName: opts.workflowName,
    agentId,
    status: errorMessage ? "failed" : "completed",
    startedAt,
    completedAt,
    durationMs,
    stepCount: traces.length,
    input: (_b = opts.input) != null ? _b : {},
    output: (_c = finalState == null ? void 0 : finalState.output) != null ? _c : null,
    error: errorMessage,
    traces,
    stepOutputs
  };
  if (!opts.skipPersist) {
    try {
      await persistRun(run);
    } catch (err) {
      console.error("[workflow-executor] persistRun failed:", err);
    }
  }
  if (opts.ownerId) {
    try {
      notifyWorkflowOwner(run, {
        ownerId: opts.ownerId,
        orgId: opts.orgId,
        notifyOnSuccess: opts.notifyOnSuccess
      });
    } catch (err) {
      console.warn("[workflow-executor] notifyWorkflowOwner threw:", err);
    }
  }
  try {
    notifyWorkflowTrellis(run, opts.notifyOnSuccess);
  } catch (err) {
    console.warn("[workflow-executor] notifyWorkflowTrellis threw:", err);
  }
  return run;
}

const RANGES = {
  minute: [0, 59],
  hour: [0, 23],
  dayOfMonth: [1, 31],
  month: [1, 12],
  dayOfWeek: [0, 6]
};
function parseField(expr, field) {
  const [min, max] = RANGES[field];
  const out = /* @__PURE__ */ new Set();
  const parts = expr.split(",");
  for (const part of parts) {
    const [rangeStr, stepStr] = part.split("/");
    const step = stepStr ? Math.max(1, Number(stepStr)) : 1;
    if (!Number.isFinite(step)) throw new Error(`bad step in "${expr}"`);
    let lo = min;
    let hi = max;
    if (rangeStr && rangeStr !== "*") {
      const [a, b] = rangeStr.split("-").map((x) => Number(x));
      if (!Number.isFinite(a)) throw new Error(`bad value "${rangeStr}" in "${expr}"`);
      lo = a;
      hi = Number.isFinite(b) ? b : a;
    }
    if (field === "dayOfWeek") {
      if (lo === 7) lo = 0;
      if (hi === 7) hi = 0;
    }
    if (lo < min || hi > max || lo > hi) {
      throw new Error(`"${rangeStr}" out of range for ${field} (${min}-${max})`);
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}
function parseCron(expr) {
  const trimmed = expr.trim();
  if (!trimmed) throw new Error("empty cron expression");
  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`cron expression must have 5 fields, got ${fields.length}`);
  }
  const [m, h, dom, mo, dow] = fields;
  return {
    minute: parseField(m, "minute"),
    hour: parseField(h, "hour"),
    dayOfMonth: parseField(dom, "dayOfMonth"),
    month: parseField(mo, "month"),
    dayOfWeek: parseField(dow, "dayOfWeek"),
    raw: trimmed
  };
}
function cronMatches(parsed, date) {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dom = date.getDate();
  const month = date.getMonth() + 1;
  const dow = date.getDay();
  if (!parsed.minute.has(minute)) return false;
  if (!parsed.hour.has(hour)) return false;
  if (!parsed.month.has(month)) return false;
  const domFull = parsed.dayOfMonth.size === 31;
  const dowFull = parsed.dayOfWeek.size === 7;
  const domOk = parsed.dayOfMonth.has(dom);
  const dowOk = parsed.dayOfWeek.has(dow);
  if (domFull && dowFull) return true;
  if (domFull) return dowOk;
  if (dowFull) return domOk;
  return domOk || dowOk;
}
function isCronDue(expr, date = /* @__PURE__ */ new Date()) {
  try {
    return cronMatches(parseCron(expr), date);
  } catch {
    return false;
  }
}

const TICK_INTERVAL_MS = 60 * 1e3;
let _tickHandle = null;
let _tickRunning = false;
async function fireTrigger(trigger, input) {
  const agentId = trigger.agentId || `trigger:${trigger.kind}`;
  try {
    const run = await executeWorkflow({
      workflowId: trigger.workflowId,
      workflowName: trigger.workflowName,
      graph: trigger.graph,
      input,
      agentId,
      ownerId: trigger.ownerId,
      orgId: trigger.orgId,
      notifyOnSuccess: trigger.notifyOnSuccess
    });
    await recordTriggerFire(trigger.id, {
      runId: run.id,
      error: run.status === "failed" ? run.error || "run failed" : void 0
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[workflow-scheduler] trigger ${trigger.id} execution failed:`, msg);
    await recordTriggerFire(trigger.id, { error: msg }).catch(() => {
    });
  }
}
async function runTick(now = /* @__PURE__ */ new Date()) {
  if (_tickRunning) return;
  _tickRunning = true;
  try {
    const triggers = await listTriggers({ kind: "schedule", activeOnly: true });
    const due = triggers.filter((t) => t.cron && isCronDue(t.cron, now));
    if (due.length === 0) return;
    console.log(`[workflow-scheduler] tick ${now.toISOString()}: ${due.length} schedule trigger(s) due`);
    await Promise.all(
      due.map(
        (t) => fireTrigger(t, {
          trigger: { id: t.id, kind: "schedule", cron: t.cron, firedAt: now.toISOString() }
        })
      )
    );
  } catch (err) {
    console.error("[workflow-scheduler] tick failed:", err);
  } finally {
    _tickRunning = false;
  }
}
function matchesEntityChange(trigger, ev) {
  var _a, _b;
  if (trigger.watchAction && trigger.watchAction !== "any" && trigger.watchAction !== ev.action) {
    return false;
  }
  if (trigger.watchType) {
    const actualType = (_b = (_a = ev.data) == null ? void 0 : _a.type) != null ? _b : void 0;
    if (actualType !== trigger.watchType) return false;
  }
  if (trigger.watchAttribute) {
    const touched = ev.data ? Object.keys(ev.data) : [];
    if (!touched.includes(trigger.watchAttribute)) return false;
  }
  return true;
}
async function handleMutation(ev) {
  var _a, _b;
  if ((_a = ev.entityId) == null ? void 0 : _a.startsWith("entity:trigger-")) return;
  if ((_b = ev.entityId) == null ? void 0 : _b.startsWith("entity:run-")) return;
  if (!["createNode", "updateNode", "deleteNode"].includes(ev.action)) return;
  try {
    const triggers = await listTriggers({ kind: "entity-change", activeOnly: true });
    const matches = triggers.filter((t) => matchesEntityChange(t, ev));
    if (matches.length === 0) return;
    console.log(`[workflow-scheduler] entity-change ${ev.action} ${ev.entityId}: ${matches.length} trigger(s) matched`);
    for (const trigger of matches) {
      fireTrigger(trigger, {
        trigger: {
          id: trigger.id,
          kind: "entity-change",
          action: ev.action,
          entityId: ev.entityId,
          entityData: ev.data,
          agentId: ev.agentId,
          firedAt: ev.timestamp
        }
      }).catch(() => {
      });
    }
  } catch (err) {
    console.error("[workflow-scheduler] handleMutation failed:", err);
  }
}
const _Hxf4XUc3BMcNJIpthTkhY5LrzOAOxh637_gUYGCXTT4 = defineNitroPlugin((nitroApp) => {
  if (process.env.TRELLIS_DISABLE_BACKGROUND_JOBS === "1") return;
  const now = Date.now();
  const msUntilNextMinute = 6e4 - now % 6e4;
  setTimeout(() => {
    runTick().catch((err) => console.error("[workflow-scheduler] initial tick error:", err));
    _tickHandle = setInterval(() => {
      runTick().catch((err) => console.error("[workflow-scheduler] tick error:", err));
    }, TICK_INTERVAL_MS);
  }, msUntilNextMinute);
  const unsubMutations = onMutation((ev) => {
    handleMutation(ev).catch(() => {
    });
  });
  nitroApp.hooks.hook("close", () => {
    if (_tickHandle) {
      clearInterval(_tickHandle);
      _tickHandle = null;
    }
    unsubMutations();
  });
  console.log(
    `[workflow-scheduler] started \u2014 first tick in ${Math.round(msUntilNextMinute / 1e3)}s, interval ${TICK_INTERVAL_MS / 1e3}s`
  );
});

const plugins = [
  _YyUYKQLG1ZKcsJNFksJUzmv3yB_RmozPvjE0ui_jDg,
_rzZp72Qyl2YX1C4eUuvheNf0Qfuo20ehUkInmCeiQ,
_iwUtc5Rg7mxXrBrX38N4TJqcyxeVzAnPFr0Qh9JrMqk,
_Y2IHdpx4ctmptzQPP85_q0eqKN088oDJv5JHaxEcK48,
_WYZW_BQhPlZdIPl0TRT_ai74uMMb2gVqJE_1HKPEhtU,
_Hxf4XUc3BMcNJIpthTkhY5LrzOAOxh637_gUYGCXTT4
];

const assets = {
  "/favicon.ico": {
    "type": "image/vnd.microsoft.icon",
    "etag": "\"2eb9-UXUTrXFZGEie0kYYIlcp5vBnxnk\"",
    "mtime": "2026-05-03T19:23:43.384Z",
    "size": 11961,
    "path": "../public/favicon.ico"
  },
  "/favicon.png": {
    "type": "image/png",
    "etag": "\"2eb9-UXUTrXFZGEie0kYYIlcp5vBnxnk\"",
    "mtime": "2026-05-03T19:23:43.385Z",
    "size": 11961,
    "path": "../public/favicon.png"
  },
  "/favicon.svg": {
    "type": "image/svg+xml",
    "etag": "\"897-CiOtQczpT/40VO29AU0sW8WL09Y\"",
    "mtime": "2026-05-03T19:23:43.386Z",
    "size": 2199,
    "path": "../public/favicon.svg"
  },
  "/icon.png": {
    "type": "image/png",
    "etag": "\"2eb9-UXUTrXFZGEie0kYYIlcp5vBnxnk\"",
    "mtime": "2026-05-03T19:23:43.387Z",
    "size": 11961,
    "path": "../public/icon.png"
  },
  "/logo.png": {
    "type": "image/png",
    "etag": "\"2eb9-UXUTrXFZGEie0kYYIlcp5vBnxnk\"",
    "mtime": "2026-05-03T19:23:43.388Z",
    "size": 11961,
    "path": "../public/logo.png"
  },
  "/robots.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"17-btGtiJUUy/a7whls31sgntjUPk4\"",
    "mtime": "2026-05-03T19:23:43.388Z",
    "size": 23,
    "path": "../public/robots.txt"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-2b6sSnjYxe7zsLHAtjnQ_ZkOvoDa9jsCbDcV6zET8QE.woff": {
    "type": "font/woff",
    "etag": "\"2ad34-G4tXozYuHQ/GwxC+xJX8ZX1yvHg\"",
    "mtime": "2026-05-03T19:23:42.866Z",
    "size": 175412,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-2b6sSnjYxe7zsLHAtjnQ_ZkOvoDa9jsCbDcV6zET8QE.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-H22fSgC3Z0EKcpOiAuIUCTWEf1pAo2gvhcxsxyU5X1U.woff": {
    "type": "font/woff",
    "etag": "\"dab0-ZoBTYuIzdmO0kMveKBo/if3G1yk\"",
    "mtime": "2026-05-03T19:23:42.864Z",
    "size": 55984,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-H22fSgC3Z0EKcpOiAuIUCTWEf1pAo2gvhcxsxyU5X1U.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-1bHVjhbfIzLkmtBMpX_5ryAv3jiWu24UKKzDrdHWio8.woff": {
    "type": "font/woff",
    "etag": "\"68c38-spXQxX6N0EJg/lFoPw15KRT5fBo\"",
    "mtime": "2026-05-03T19:23:42.872Z",
    "size": 429112,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-1bHVjhbfIzLkmtBMpX_5ryAv3jiWu24UKKzDrdHWio8.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-EET4tMaTA8GkVL6yQZCPcXfH8ghJoa281w9tUU6SW8I.woff": {
    "type": "font/woff",
    "etag": "\"6fa58-Ww2ss5RVLvwI5oCeEwRpAO/IkEI\"",
    "mtime": "2026-05-03T19:23:42.869Z",
    "size": 457304,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-EET4tMaTA8GkVL6yQZCPcXfH8ghJoa281w9tUU6SW8I.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-OWAhkC9cYVczMBRDEGjgOzF9uwSTxBflwuaka5Xqmvo.woff": {
    "type": "font/woff",
    "etag": "\"14880-x19YSilMpFWD44a5f11guoDsLog\"",
    "mtime": "2026-05-03T19:23:42.866Z",
    "size": 84096,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-OWAhkC9cYVczMBRDEGjgOzF9uwSTxBflwuaka5Xqmvo.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-Li_iitzCeIdneX511ZXNt3uQKMF39zCZxuU-n5fXKBI.woff": {
    "type": "font/woff",
    "etag": "\"15700-nwlcbsN89M0M9FGntSCUt2n3TF8\"",
    "mtime": "2026-05-03T19:23:42.866Z",
    "size": 87808,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-Li_iitzCeIdneX511ZXNt3uQKMF39zCZxuU-n5fXKBI.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-XiuBZ8wdWwKJPIRE0F6UTJCiPlG8G4BSFbYLIzThBlk.woff": {
    "type": "font/woff",
    "etag": "\"cd38-/8CE30CufP40TXmA8HP8oyVKTG0\"",
    "mtime": "2026-05-03T19:23:42.868Z",
    "size": 52536,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-XiuBZ8wdWwKJPIRE0F6UTJCiPlG8G4BSFbYLIzThBlk.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-NZfE5ShDsD5hcGGf4N91wOA3JuB8GZXD2_lfCHg69fc.woff": {
    "type": "font/woff",
    "etag": "\"72b88-6TUL5MK2U18sz+nY7t4QwOgcWlQ\"",
    "mtime": "2026-05-03T19:23:42.873Z",
    "size": 469896,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-NZfE5ShDsD5hcGGf4N91wOA3JuB8GZXD2_lfCHg69fc.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-z4269tsqp9KjdmRIB3Um403sBivmhD2kbyK6gltkuCM.woff": {
    "type": "font/woff",
    "etag": "\"8aa8-MQZn27U+6bOGjrid4c6B97WX+vo\"",
    "mtime": "2026-05-03T19:23:42.873Z",
    "size": 35496,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-z4269tsqp9KjdmRIB3Um403sBivmhD2kbyK6gltkuCM.woff"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-UdLneiiHOQFjvWMCxZuHirptJVqZdE9st1qYZdCiadQ.woff": {
    "type": "font/woff",
    "etag": "\"7227c-NdDcToAJKOr9+8p9aADNktypQ54\"",
    "mtime": "2026-05-03T19:23:42.877Z",
    "size": 467580,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-UdLneiiHOQFjvWMCxZuHirptJVqZdE9st1qYZdCiadQ.woff"
  },
  "/_fonts/3e3wuf-V_7icWvlsSS3Ud6R1mFSymwsfz35VcqiVjOk-jnii4_jMs7YAJOhzZP3bGdrbXGt5dYv8_t_rhpHzpcQ.woff2": {
    "type": "font/woff2",
    "etag": "\"1f60-Z/1Q6BkLKKwu3x82+a2sOBk9/SU\"",
    "mtime": "2026-05-03T19:23:42.878Z",
    "size": 8032,
    "path": "../public/_fonts/3e3wuf-V_7icWvlsSS3Ud6R1mFSymwsfz35VcqiVjOk-jnii4_jMs7YAJOhzZP3bGdrbXGt5dYv8_t_rhpHzpcQ.woff2"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-xL2d6fO_P6WZu9M_lidjF81efWqr-3ybJmkz5li5cEQ.woff": {
    "type": "font/woff",
    "etag": "\"713b8-VH7fOkqC1BGQwjnNuZXNpxJN8Z8\"",
    "mtime": "2026-05-03T19:23:42.880Z",
    "size": 463800,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-xL2d6fO_P6WZu9M_lidjF81efWqr-3ybJmkz5li5cEQ.woff"
  },
  "/_fonts/27U_le6Qb4dIJG4XRWgLsAh9wpwdL33Jfbl1PGtBTE8-vuTjDYDaqR01jfGmDiBdqv4YeRnva7_Z5bM0bbVmWi4.woff2": {
    "type": "font/woff2",
    "etag": "\"1584-tBq06KeTaQoy3JrxoQOy+BrhT9s\"",
    "mtime": "2026-05-03T19:23:42.883Z",
    "size": 5508,
    "path": "../public/_fonts/27U_le6Qb4dIJG4XRWgLsAh9wpwdL33Jfbl1PGtBTE8-vuTjDYDaqR01jfGmDiBdqv4YeRnva7_Z5bM0bbVmWi4.woff2"
  },
  "/_fonts/7LZF9dSN4IV5chcL_PA8UFlH6UdlNcyyPXfqgcEkH4s-U0X1ZWpDGvjqR9lobtlrzPrFjSV8V_RxfGNQqFaREok.woff2": {
    "type": "font/woff2",
    "etag": "\"21e4-iQ2/MTBmlMZcVv4cq5nQX2GuhOI\"",
    "mtime": "2026-05-03T19:23:42.878Z",
    "size": 8676,
    "path": "../public/_fonts/7LZF9dSN4IV5chcL_PA8UFlH6UdlNcyyPXfqgcEkH4s-U0X1ZWpDGvjqR9lobtlrzPrFjSV8V_RxfGNQqFaREok.woff2"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-0jnhumLIekHAQT7G2DKKHITJUcczkG83Vp59_EkdcJU.woff": {
    "type": "font/woff",
    "etag": "\"7217c-OI/50e7WGDT1x3H1OxBcs45A9RM\"",
    "mtime": "2026-05-03T19:23:42.885Z",
    "size": 467324,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-0jnhumLIekHAQT7G2DKKHITJUcczkG83Vp59_EkdcJU.woff"
  },
  "/_fonts/4LdjPcFqWYNz-qWGY0XOln3KrgLXBiaex4cZY_aDHgA-FpuZwOB6l4bXW_Y7nYUKmLcxdvxgmD6NDPVzQqLl4Vg.woff2": {
    "type": "font/woff2",
    "etag": "\"4044-HTpkthfepsC62YNVPCURtua8CxU\"",
    "mtime": "2026-05-03T19:23:42.878Z",
    "size": 16452,
    "path": "../public/_fonts/4LdjPcFqWYNz-qWGY0XOln3KrgLXBiaex4cZY_aDHgA-FpuZwOB6l4bXW_Y7nYUKmLcxdvxgmD6NDPVzQqLl4Vg.woff2"
  },
  "/_fonts/9IZYb3o3tpRXPqjzNd4r3vIIohLuRBC5-h_ByvqRowU-ZgMUMfi6FcHpaV_ucYIWcBvLG6geajFq70Smps0DAj0.woff2": {
    "type": "font/woff2",
    "etag": "\"10cc-FtEpQtEvSrUBAfvsg6PNoB9EvOk\"",
    "mtime": "2026-05-03T19:23:42.878Z",
    "size": 4300,
    "path": "../public/_fonts/9IZYb3o3tpRXPqjzNd4r3vIIohLuRBC5-h_ByvqRowU-ZgMUMfi6FcHpaV_ucYIWcBvLG6geajFq70Smps0DAj0.woff2"
  },
  "/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-rwXUTZV1ktVJ7JQPggC_o_kH_55GPy2vsV9sgwJFf5I.woff": {
    "type": "font/woff",
    "etag": "\"71a20-hl81E5GRiBtTNvD0rZe52wLNIrg\"",
    "mtime": "2026-05-03T19:23:42.875Z",
    "size": 465440,
    "path": "../public/_fonts/1ZTlEDqU4DtwDJiND8f6qaugUpa0RIDvQl-v7iM6l54-rwXUTZV1ktVJ7JQPggC_o_kH_55GPy2vsV9sgwJFf5I.woff"
  },
  "/_fonts/3mk1pEYaO7RuhctnlpKcyb7yjVLICedncSfY13ffbM8-vJidvBvYJRk77_zQIyVpja44ymm1FQTiYKUcM_aD5Sg.woff2": {
    "type": "font/woff2",
    "etag": "\"1044-iSoosrkxepnDzL/zACmIitaHWYA\"",
    "mtime": "2026-05-03T19:23:42.878Z",
    "size": 4164,
    "path": "../public/_fonts/3mk1pEYaO7RuhctnlpKcyb7yjVLICedncSfY13ffbM8-vJidvBvYJRk77_zQIyVpja44ymm1FQTiYKUcM_aD5Sg.woff2"
  },
  "/_fonts/AA0_6TP-Ed9gQINhOsvbweBE3xLQgxmg6pXqHmvCwsM-egZLwYC5qVnfGWql7G5NfYTIiMP1PB_tQWIq5f7S-0k.woff2": {
    "type": "font/woff2",
    "etag": "\"1140-hLq1RE9T4XskknZhtx0rEjiZWKk\"",
    "mtime": "2026-05-03T19:23:42.879Z",
    "size": 4416,
    "path": "../public/_fonts/AA0_6TP-Ed9gQINhOsvbweBE3xLQgxmg6pXqHmvCwsM-egZLwYC5qVnfGWql7G5NfYTIiMP1PB_tQWIq5f7S-0k.woff2"
  },
  "/_fonts/CdBz3PG7SxvL_amFZwgaktWNbBEq8um2qfKIkVF0J-0-hNsCVgiFTWIt9ui6wQ3GTTSu0COwgZzc9BTsnXxtZwo.woff2": {
    "type": "font/woff2",
    "etag": "\"1920-Waa46MqeZTM/DVhWbdjmAdw3GlY\"",
    "mtime": "2026-05-03T19:23:42.878Z",
    "size": 6432,
    "path": "../public/_fonts/CdBz3PG7SxvL_amFZwgaktWNbBEq8um2qfKIkVF0J-0-hNsCVgiFTWIt9ui6wQ3GTTSu0COwgZzc9BTsnXxtZwo.woff2"
  },
  "/_fonts/DEMtyndeOJF9bXGLOW2KGg2ZQJqCpZ0SkM0r1pdtWgA-oNcFrt4IK2udVdKjsfp_T_RAlGcmBD0vE0MpYFy2Z50.woff2": {
    "type": "font/woff2",
    "etag": "\"7aa8-2KWB/kpeuzcKxTLy8n66r0WyQvM\"",
    "mtime": "2026-05-03T19:23:42.879Z",
    "size": 31400,
    "path": "../public/_fonts/DEMtyndeOJF9bXGLOW2KGg2ZQJqCpZ0SkM0r1pdtWgA-oNcFrt4IK2udVdKjsfp_T_RAlGcmBD0vE0MpYFy2Z50.woff2"
  },
  "/_fonts/Df7M9JXECnQBPeMk0JlWv5oI4E80OSjKvG82PCAX-MI-aXpKyr1n0W6NWbCApKANrm9O50H_fjFMdBzwfTY75iM.woff2": {
    "type": "font/woff2",
    "etag": "\"4a4-l1L+9019SIF7QSqAceiOP4DlUtc\"",
    "mtime": "2026-05-03T19:23:42.878Z",
    "size": 1188,
    "path": "../public/_fonts/Df7M9JXECnQBPeMk0JlWv5oI4E80OSjKvG82PCAX-MI-aXpKyr1n0W6NWbCApKANrm9O50H_fjFMdBzwfTY75iM.woff2"
  },
  "/_fonts/F00Bxq4ciZESODR5suhK3xDWcsQ9RLj9SyZQEevpEsw-BLNEvb6wAcL3fpb4n4d3zVEKUoa2hsUKxxkf3YdvJKc.woff2": {
    "type": "font/woff2",
    "etag": "\"1720-rZMbVy9H6vArhBJjnXeAoBGDSXE\"",
    "mtime": "2026-05-03T19:23:42.879Z",
    "size": 5920,
    "path": "../public/_fonts/F00Bxq4ciZESODR5suhK3xDWcsQ9RLj9SyZQEevpEsw-BLNEvb6wAcL3fpb4n4d3zVEKUoa2hsUKxxkf3YdvJKc.woff2"
  },
  "/_fonts/Ha3Ia-SJ6qVeHpQQ9klHcPpgNT8A-bU6F0NvJcYTX2c-YgOE_mVJJT55kHJ_UQCLKk8xbqlzNYR7IBdrMkaHGFk.woff2": {
    "type": "font/woff2",
    "etag": "\"7504-PGZkvzajiPTLdQ18R5Rvz206hZo\"",
    "mtime": "2026-05-03T19:23:42.882Z",
    "size": 29956,
    "path": "../public/_fonts/Ha3Ia-SJ6qVeHpQQ9klHcPpgNT8A-bU6F0NvJcYTX2c-YgOE_mVJJT55kHJ_UQCLKk8xbqlzNYR7IBdrMkaHGFk.woff2"
  },
  "/_fonts/KOrIgK47CByspZJWjOLg8AL2ADg9uFcNjZd9W78jrmM-dU37DP77KwUzMqqldljJHhSe3lJpaSfI9HPfiVAxPOM.woff2": {
    "type": "font/woff2",
    "etag": "\"14cc-574QUqD5VBNxZ0cmeeC5OLgazrE\"",
    "mtime": "2026-05-03T19:23:42.881Z",
    "size": 5324,
    "path": "../public/_fonts/KOrIgK47CByspZJWjOLg8AL2ADg9uFcNjZd9W78jrmM-dU37DP77KwUzMqqldljJHhSe3lJpaSfI9HPfiVAxPOM.woff2"
  },
  "/_fonts/TesEfzR8VA3TJnvei58vdk72fmHWkq_pvo9LQAG-0hE-eeYQdDABEnbHQh3_mZyvad3aaPGBVvyJ712kkMdFN6U.woff2": {
    "type": "font/woff2",
    "etag": "\"1644-3npi1aZmR6+hZVcI6uJ35mPYqjY\"",
    "mtime": "2026-05-03T19:23:42.879Z",
    "size": 5700,
    "path": "../public/_fonts/TesEfzR8VA3TJnvei58vdk72fmHWkq_pvo9LQAG-0hE-eeYQdDABEnbHQh3_mZyvad3aaPGBVvyJ712kkMdFN6U.woff2"
  },
  "/_fonts/NwLHmPccLrJlBVGp4QRXOLZaNI0M_K6XuSwyVjpr47g-jl4tqz8gcsgAJDPcbl5roY78zy31I6Rq51WBLpZngFg.woff2": {
    "type": "font/woff2",
    "etag": "\"56d4-jVH0j13GzaG+x5yZQONAXLblBTY\"",
    "mtime": "2026-05-03T19:23:42.879Z",
    "size": 22228,
    "path": "../public/_fonts/NwLHmPccLrJlBVGp4QRXOLZaNI0M_K6XuSwyVjpr47g-jl4tqz8gcsgAJDPcbl5roY78zy31I6Rq51WBLpZngFg.woff2"
  },
  "/_fonts/_N7rOIO9W08Ud2wyZjNnjQF3SiEitZhJMc1uL-qwytk-iBZwjnzQzv_B_SoN2K3cdsfMhzKYx4oMu8nTWMF7SCY.woff2": {
    "type": "font/woff2",
    "etag": "\"22bc-FciU4ga1IgifSReTnoX1LAtgClo\"",
    "mtime": "2026-05-03T19:23:42.881Z",
    "size": 8892,
    "path": "../public/_fonts/_N7rOIO9W08Ud2wyZjNnjQF3SiEitZhJMc1uL-qwytk-iBZwjnzQzv_B_SoN2K3cdsfMhzKYx4oMu8nTWMF7SCY.woff2"
  },
  "/_fonts/bUcXp2ExGsFoCjH4L_AiPGX0TLCAgnqR8nvW7SxSJYQ-kvm9UWc_MFZW_r85yX6uPdzXVmdcUOio_Wb1x_7QdXM.woff2": {
    "type": "font/woff2",
    "etag": "\"f48-tMtg1Xak+2Ri4RL9CpIVo25iEhU\"",
    "mtime": "2026-05-03T19:23:42.880Z",
    "size": 3912,
    "path": "../public/_fonts/bUcXp2ExGsFoCjH4L_AiPGX0TLCAgnqR8nvW7SxSJYQ-kvm9UWc_MFZW_r85yX6uPdzXVmdcUOio_Wb1x_7QdXM.woff2"
  },
  "/_fonts/f3COenLcoezM74LmVz7-HHQTyPKopVoMY6x2syLMzQE-shPZYE7IAjZWz4okT_CWn96WfGzoLhasK43_mhj3CZI.woff2": {
    "type": "font/woff2",
    "etag": "\"484-aTHN4e5w2umtBzCMb4Tfmf2VG7c\"",
    "mtime": "2026-05-03T19:23:42.882Z",
    "size": 1156,
    "path": "../public/_fonts/f3COenLcoezM74LmVz7-HHQTyPKopVoMY6x2syLMzQE-shPZYE7IAjZWz4okT_CWn96WfGzoLhasK43_mhj3CZI.woff2"
  },
  "/_fonts/_lyVj3lEzRng_G7gZNcCmL83BnMEos-Hf8bpHLMzGQI-zsVE1T2QbmkXlEbQhs2gb3j3VBOOGhzqyW_ZW_0s3F8.woff2": {
    "type": "font/woff2",
    "etag": "\"1cc8-9TcELrK3HQZCaYcHU2zGnm42U0k\"",
    "mtime": "2026-05-03T19:23:42.880Z",
    "size": 7368,
    "path": "../public/_fonts/_lyVj3lEzRng_G7gZNcCmL83BnMEos-Hf8bpHLMzGQI-zsVE1T2QbmkXlEbQhs2gb3j3VBOOGhzqyW_ZW_0s3F8.woff2"
  },
  "/_fonts/fVfdtAYaZ_QreOsrWAllIQhFlL153vnJfAfsZDp3vLg-0d5dw_0b1f2QYIMtACGWIkJq5QTvXcZsPQdwZnSkdac.woff2": {
    "type": "font/woff2",
    "etag": "\"264c-MBXQF62XZ7DOGhMYPZFz5/ulBEo\"",
    "mtime": "2026-05-03T19:23:42.882Z",
    "size": 9804,
    "path": "../public/_fonts/fVfdtAYaZ_QreOsrWAllIQhFlL153vnJfAfsZDp3vLg-0d5dw_0b1f2QYIMtACGWIkJq5QTvXcZsPQdwZnSkdac.woff2"
  },
  "/_fonts/oGrDIWlvKBNQty5xPWhPu6aPrsKxcKLzbrDffTJGwOo-x37V4RgCVbE_K_ITLBZGA8mpHXrH6129IGqI0HBvX7U.woff2": {
    "type": "font/woff2",
    "etag": "\"39c8-+WhYXBn4FLhKVitRGFDtSKi/MDM\"",
    "mtime": "2026-05-03T19:23:42.882Z",
    "size": 14792,
    "path": "../public/_fonts/oGrDIWlvKBNQty5xPWhPu6aPrsKxcKLzbrDffTJGwOo-x37V4RgCVbE_K_ITLBZGA8mpHXrH6129IGqI0HBvX7U.woff2"
  },
  "/_fonts/sqxfSu-14RfawvZSbzb3mPoBYaXxmTGIac1Kk0GVk_w-oe_5KiWXPVdvpURHWSiaIjA1N_zLqpjSzmfpwRHr7CQ.woff2": {
    "type": "font/woff2",
    "etag": "\"52dc-0IdyHQGcXGIjBXUGBwJKqror/wg\"",
    "mtime": "2026-05-03T19:23:42.883Z",
    "size": 21212,
    "path": "../public/_fonts/sqxfSu-14RfawvZSbzb3mPoBYaXxmTGIac1Kk0GVk_w-oe_5KiWXPVdvpURHWSiaIjA1N_zLqpjSzmfpwRHr7CQ.woff2"
  },
  "/_fonts/uvT3cuSbwceaIf6NfGXgcPSWSjvORhivNaaNZPAj1os-RBl_bFII4B0Xo81lzBOkHSRqo7t2u0dd5UlooqzO7TQ.woff2": {
    "type": "font/woff2",
    "etag": "\"422c-mTDzZdyBxc1Fg/WDpQVuGmSsC1o\"",
    "mtime": "2026-05-03T19:23:42.883Z",
    "size": 16940,
    "path": "../public/_fonts/uvT3cuSbwceaIf6NfGXgcPSWSjvORhivNaaNZPAj1os-RBl_bFII4B0Xo81lzBOkHSRqo7t2u0dd5UlooqzO7TQ.woff2"
  },
  "/_fonts/pxXkloUeh1BIcbUzrFsL9EFW0IBUskGRrZNrJsoHtAE-s799misX0hbRWUXnvlb0XywfNC5Y4rXjZ0_u7oZ8Ov4.woff2": {
    "type": "font/woff2",
    "etag": "\"1558-CVvUVqWuFXKbpk2ePNrSNuzP9wI\"",
    "mtime": "2026-05-03T19:23:42.882Z",
    "size": 5464,
    "path": "../public/_fonts/pxXkloUeh1BIcbUzrFsL9EFW0IBUskGRrZNrJsoHtAE-s799misX0hbRWUXnvlb0XywfNC5Y4rXjZ0_u7oZ8Ov4.woff2"
  },
  "/_fonts/wnpBVjNz72yqwZlphf2Uh7SJU_q_GZbHFCKk7IqNFbI-iqFJSGOtANwYhHSBF5qfA7vEiye14Jh5ZupiZYrX16s.woff2": {
    "type": "font/woff2",
    "etag": "\"254c-cNylU/DOcYp6V49CJiWQDne+E60\"",
    "mtime": "2026-05-03T19:23:42.883Z",
    "size": 9548,
    "path": "../public/_fonts/wnpBVjNz72yqwZlphf2Uh7SJU_q_GZbHFCKk7IqNFbI-iqFJSGOtANwYhHSBF5qfA7vEiye14Jh5ZupiZYrX16s.woff2"
  },
  "/sounds/notify.mp3": {
    "type": "audio/mpeg",
    "etag": "\"89fc-56/wjBVjfzX6WPpYwJqq1SfgUm8\"",
    "mtime": "2026-05-03T19:23:43.042Z",
    "size": 35324,
    "path": "../public/sounds/notify.mp3"
  },
  "/_nuxt/-1BR7PQd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"147d-w4A+TqLM20jENwq0Cb7hQawWins\"",
    "mtime": "2026-05-03T19:23:43.024Z",
    "size": 5245,
    "path": "../public/_nuxt/-1BR7PQd.js"
  },
  "/_nuxt/-4aliuZV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3064-LigGfDpup2+u3P9FUC7WRDyuUkM\"",
    "mtime": "2026-05-03T19:23:43.025Z",
    "size": 12388,
    "path": "../public/_nuxt/-4aliuZV.js"
  },
  "/_nuxt/-5LbtFhC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c3-cM6EWfa1kIIW6taO4nEPpIocHJ4\"",
    "mtime": "2026-05-03T19:23:43.025Z",
    "size": 195,
    "path": "../public/_nuxt/-5LbtFhC.js"
  },
  "/_nuxt/1nRYKZAO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d3-j6peI5PP05qom+0VFgejWmdxCRI\"",
    "mtime": "2026-05-03T19:23:42.933Z",
    "size": 211,
    "path": "../public/_nuxt/1nRYKZAO.js"
  },
  "/_nuxt/5-zMAHqv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2455-BUzhxOUyl09zik/XNiJ0jB63guI\"",
    "mtime": "2026-05-03T19:23:42.933Z",
    "size": 9301,
    "path": "../public/_nuxt/5-zMAHqv.js"
  },
  "/_nuxt/5G-VUvtc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"187-HjxV+ktQRDNvtvG+ES9PBqfBoS8\"",
    "mtime": "2026-05-03T19:23:42.934Z",
    "size": 391,
    "path": "../public/_nuxt/5G-VUvtc.js"
  },
  "/_nuxt/2-n8LB2K.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"23e-3Vd5siwXCY/mLO1eU6KFstbOAMU\"",
    "mtime": "2026-05-03T19:23:42.933Z",
    "size": 574,
    "path": "../public/_nuxt/2-n8LB2K.js"
  },
  "/_nuxt/46dAvWJk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e44-6I4fj/Uf4t15srYpk/x4NDSNhak\"",
    "mtime": "2026-05-03T19:23:42.933Z",
    "size": 3652,
    "path": "../public/_nuxt/46dAvWJk.js"
  },
  "/_nuxt/5QI_MfXG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9f7-QtRhH9mGQRxL2Sx4JWRrkJ2oJzY\"",
    "mtime": "2026-05-03T19:23:42.934Z",
    "size": 2551,
    "path": "../public/_nuxt/5QI_MfXG.js"
  },
  "/_nuxt/5s8y0gV8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b14-03wEd67LDFBr3Bq+TEf3I0Zba50\"",
    "mtime": "2026-05-03T19:23:42.934Z",
    "size": 2836,
    "path": "../public/_nuxt/5s8y0gV8.js"
  },
  "/_nuxt/6LTTiZsF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3c9-M2SC4EkZtdj+gaX0heKsHtZTU0A\"",
    "mtime": "2026-05-03T19:23:42.933Z",
    "size": 969,
    "path": "../public/_nuxt/6LTTiZsF.js"
  },
  "/_nuxt/1wE7SEzI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c2d-3iL7cnYewpWp1d8L3wosE7CprJQ\"",
    "mtime": "2026-05-03T19:23:42.930Z",
    "size": 11309,
    "path": "../public/_nuxt/1wE7SEzI.js"
  },
  "/_nuxt/A8r2HMM3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1457-Po1uB67Zz7+D3UxuKGFl0VvfALU\"",
    "mtime": "2026-05-03T19:23:42.934Z",
    "size": 5207,
    "path": "../public/_nuxt/A8r2HMM3.js"
  },
  "/_nuxt/AgentMessage.JRYXy8ie.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"50c-7lGYrX2vkQmonlicy+WHq7LUMbU\"",
    "mtime": "2026-05-03T19:23:42.934Z",
    "size": 1292,
    "path": "../public/_nuxt/AgentMessage.JRYXy8ie.css"
  },
  "/_nuxt/86uwAB1P.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"154-5EQkHMn2SVVYDTQtj97W2qbpGx0\"",
    "mtime": "2026-05-03T19:23:42.934Z",
    "size": 340,
    "path": "../public/_nuxt/86uwAB1P.js"
  },
  "/_nuxt/Aq-1zfCt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"127a-S3gu7SPl1mBiO11MLI5K1jDKkNY\"",
    "mtime": "2026-05-03T19:23:42.935Z",
    "size": 4730,
    "path": "../public/_nuxt/Aq-1zfCt.js"
  },
  "/_nuxt/AppSidebar.DaABc-g0.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"64c-PeHQKs2rRVcENNhdvgLMXk7il0w\"",
    "mtime": "2026-05-03T19:23:42.935Z",
    "size": 1612,
    "path": "../public/_nuxt/AppSidebar.DaABc-g0.css"
  },
  "/_nuxt/B-Lf8Nnk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d6-FH0Aazy+qepYJqbp2haCO6wZXeA\"",
    "mtime": "2026-05-03T19:23:42.936Z",
    "size": 214,
    "path": "../public/_nuxt/B-Lf8Nnk.js"
  },
  "/_nuxt/765gH0lE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30c4e-Kmol3Yutlly+c5xt3q6KavBO8oY\"",
    "mtime": "2026-05-03T19:23:42.937Z",
    "size": 199758,
    "path": "../public/_nuxt/765gH0lE.js"
  },
  "/_nuxt/B0VRuOhR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d0-BIyZc3VBZRWeexuks1g7fPAmRXU\"",
    "mtime": "2026-05-03T19:23:42.936Z",
    "size": 208,
    "path": "../public/_nuxt/B0VRuOhR.js"
  },
  "/_nuxt/B-pj1uj3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3766-5O2YzKcBDfk7U3g34adaZT/KxS0\"",
    "mtime": "2026-05-03T19:23:42.936Z",
    "size": 14182,
    "path": "../public/_nuxt/B-pj1uj3.js"
  },
  "/_nuxt/B-dksMZM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"176-FAATnZjnCwN/ZZH/TBgLKs+l6Yk\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 374,
    "path": "../public/_nuxt/B-dksMZM.js"
  },
  "/_nuxt/B1tuYaAG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"693-ZllPwNM3HHk0ldikkU2iWdvxbPA\"",
    "mtime": "2026-05-03T19:23:42.936Z",
    "size": 1683,
    "path": "../public/_nuxt/B1tuYaAG.js"
  },
  "/_nuxt/B7QiTDlO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d0-q7jykhHIA28YeQtTYigKTCUygb0\"",
    "mtime": "2026-05-03T19:23:42.937Z",
    "size": 208,
    "path": "../public/_nuxt/B7QiTDlO.js"
  },
  "/_nuxt/B11YamH-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"646-CpdTUdi4y7GESt4WbESAHJSpZMo\"",
    "mtime": "2026-05-03T19:23:42.936Z",
    "size": 1606,
    "path": "../public/_nuxt/B11YamH-.js"
  },
  "/_nuxt/B66DQp0K.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7b-3/0Geg208ez33k/nhMdBk0EP29A\"",
    "mtime": "2026-05-03T19:23:42.936Z",
    "size": 123,
    "path": "../public/_nuxt/B66DQp0K.js"
  },
  "/_nuxt/B8BmDtR2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e6-KiSYivYN5cyxsnAdrpFp65bPgRs\"",
    "mtime": "2026-05-03T19:23:42.937Z",
    "size": 486,
    "path": "../public/_nuxt/B8BmDtR2.js"
  },
  "/_nuxt/B8_nnX8j.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1708-gjGn5kEZM4bqoWJhzWGtEN68moY\"",
    "mtime": "2026-05-03T19:23:42.937Z",
    "size": 5896,
    "path": "../public/_nuxt/B8_nnX8j.js"
  },
  "/_fonts/vN5fxma9-krj-rmQrS1QeUWwlWm82kAFDh8EN2bAjIU-Jr_0XCTlam7FBqJ6i1_Ko7dF_OsBM1mMvV339ILVuHU.woff2": {
    "type": "font/woff2",
    "etag": "\"3be138-f9k+9YY5r8qmsnTtPNkyJb4Iono\"",
    "mtime": "2026-05-03T19:23:42.897Z",
    "size": 3924280,
    "path": "../public/_fonts/vN5fxma9-krj-rmQrS1QeUWwlWm82kAFDh8EN2bAjIU-Jr_0XCTlam7FBqJ6i1_Ko7dF_OsBM1mMvV339ILVuHU.woff2"
  },
  "/_nuxt/B97uG6vM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"34a-P0etyd5vUynFAeKFw/KHM7Cgb00\"",
    "mtime": "2026-05-03T19:23:42.938Z",
    "size": 842,
    "path": "../public/_nuxt/B97uG6vM.js"
  },
  "/_nuxt/B9g2J1I2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e6-kNjTGKUdB5w1jZsa7M0n06daakU\"",
    "mtime": "2026-05-03T19:23:42.939Z",
    "size": 486,
    "path": "../public/_nuxt/B9g2J1I2.js"
  },
  "/_nuxt/BBD7fFfU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d8d-FbcU3JfFZGk8SiwcsO9pjiN8ebQ\"",
    "mtime": "2026-05-03T19:23:42.939Z",
    "size": 3469,
    "path": "../public/_nuxt/BBD7fFfU.js"
  },
  "/_nuxt/BBJ8T-E5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"590-TaLTsm3HuL0YcKcaQmuZheS8Dgk\"",
    "mtime": "2026-05-03T19:23:42.939Z",
    "size": 1424,
    "path": "../public/_nuxt/BBJ8T-E5.js"
  },
  "/_nuxt/BAOmT1Fl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1aba-Tyl1RHzw8NoHuQEvcReN4646wFs\"",
    "mtime": "2026-05-03T19:23:42.939Z",
    "size": 6842,
    "path": "../public/_nuxt/BAOmT1Fl.js"
  },
  "/_nuxt/BCcNsYPR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7e6-ckoh6iPXWPhzsvdeGzu5UPq1x28\"",
    "mtime": "2026-05-03T19:23:42.941Z",
    "size": 2022,
    "path": "../public/_nuxt/BCcNsYPR.js"
  },
  "/_nuxt/BBVclN-D.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"20ef-2DGyJw/TuL4teBrpid5H/d+aKZA\"",
    "mtime": "2026-05-03T19:23:42.943Z",
    "size": 8431,
    "path": "../public/_nuxt/BBVclN-D.js"
  },
  "/_nuxt/BD332dxp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"eb2-LGKWsEau0V9v623Vle7fsYyQbHI\"",
    "mtime": "2026-05-03T19:23:42.941Z",
    "size": 3762,
    "path": "../public/_nuxt/BD332dxp.js"
  },
  "/_nuxt/BEvop3aN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"27f6-UGJewH+VlWx5A6A24xpSAZJ/Cnk\"",
    "mtime": "2026-05-03T19:23:42.943Z",
    "size": 10230,
    "path": "../public/_nuxt/BEvop3aN.js"
  },
  "/_nuxt/BELjKQcQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"116a-D465Nx/NyE9R3aj+9k6IOj49KVQ\"",
    "mtime": "2026-05-03T19:23:42.943Z",
    "size": 4458,
    "path": "../public/_nuxt/BELjKQcQ.js"
  },
  "/_nuxt/BKGcxMiZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"344-d7skziZV9/+sX6VwdWljkeAsRRc\"",
    "mtime": "2026-05-03T19:23:42.943Z",
    "size": 836,
    "path": "../public/_nuxt/BKGcxMiZ.js"
  },
  "/_nuxt/BLl7rHyt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"571-TIKoExJ6zITjAaA/dHqpaRef1aQ\"",
    "mtime": "2026-05-03T19:23:42.943Z",
    "size": 1393,
    "path": "../public/_nuxt/BLl7rHyt.js"
  },
  "/_nuxt/BOWL06q0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"64-e3Rp2higBW0SFHUH3zeuj7arbew\"",
    "mtime": "2026-05-03T19:23:42.943Z",
    "size": 100,
    "path": "../public/_nuxt/BOWL06q0.js"
  },
  "/_nuxt/BS2rfwUS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c4-ffZi7aG+VyXYCDPo+uR1d0gB20k\"",
    "mtime": "2026-05-03T19:23:42.943Z",
    "size": 196,
    "path": "../public/_nuxt/BS2rfwUS.js"
  },
  "/_nuxt/BP7Pi9PU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"57d5-+zK73NRm0Bgi0ALHTMEwyfc//Vk\"",
    "mtime": "2026-05-03T19:23:42.944Z",
    "size": 22485,
    "path": "../public/_nuxt/BP7Pi9PU.js"
  },
  "/_nuxt/BE6UNXN4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b7-VPmBgBauNgfpl1Tmb/SfamLipqc\"",
    "mtime": "2026-05-03T19:23:42.941Z",
    "size": 183,
    "path": "../public/_nuxt/BE6UNXN4.js"
  },
  "/_nuxt/BVKUmqXO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a36-4B8PH86I4Y7XNaNz6c+uc2RZ1IU\"",
    "mtime": "2026-05-03T19:23:42.944Z",
    "size": 2614,
    "path": "../public/_nuxt/BVKUmqXO.js"
  },
  "/_nuxt/BWy0wuEz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5fb-3v6H0wzXyWrCi1/1oqZ5Fpo0QH4\"",
    "mtime": "2026-05-03T19:23:42.944Z",
    "size": 1531,
    "path": "../public/_nuxt/BWy0wuEz.js"
  },
  "/_nuxt/BZ5Ukfd-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"879e-AZ+RlyezY27gkYDikaqcEDqXQzw\"",
    "mtime": "2026-05-03T19:23:42.944Z",
    "size": 34718,
    "path": "../public/_nuxt/BZ5Ukfd-.js"
  },
  "/_nuxt/BZiOEKxL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f06-XWINc0Pm066HI8gUbUzp0La+Tec\"",
    "mtime": "2026-05-03T19:23:42.944Z",
    "size": 3846,
    "path": "../public/_nuxt/BZiOEKxL.js"
  },
  "/_nuxt/B_ARfPUi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d4-Ej7sbintUFgxZWdCegzF/3UFID4\"",
    "mtime": "2026-05-03T19:23:42.944Z",
    "size": 212,
    "path": "../public/_nuxt/B_ARfPUi.js"
  },
  "/_nuxt/Bb1MRP7D.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"628b-fCMb+Ihl7EkSDe+lY6z3hLOBDi0\"",
    "mtime": "2026-05-03T19:23:42.944Z",
    "size": 25227,
    "path": "../public/_nuxt/Bb1MRP7D.js"
  },
  "/_nuxt/BbWG2GFn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"20e-weA8zkHSYv5sL9gURJwiV/yJvbc\"",
    "mtime": "2026-05-03T19:23:42.944Z",
    "size": 526,
    "path": "../public/_nuxt/BbWG2GFn.js"
  },
  "/_nuxt/BcNLv-Ga.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"400-jAX2BnVv3CJviDI88WsFqy/0UmQ\"",
    "mtime": "2026-05-03T19:23:42.945Z",
    "size": 1024,
    "path": "../public/_nuxt/BcNLv-Ga.js"
  },
  "/_nuxt/BdRiR0gx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5628-N9irj01b8sXYAE6AVZVyNy2++bQ\"",
    "mtime": "2026-05-03T19:23:42.945Z",
    "size": 22056,
    "path": "../public/_nuxt/BdRiR0gx.js"
  },
  "/_nuxt/BePm351Y.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"25b-ytsX9+1+GT2j+SY3IIHx+9Xtl2g\"",
    "mtime": "2026-05-03T19:23:42.945Z",
    "size": 603,
    "path": "../public/_nuxt/BePm351Y.js"
  },
  "/_nuxt/BeOfdbEU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f2f-yG85jwdmQgcjqGrB6eYIVdlbFRg\"",
    "mtime": "2026-05-03T19:23:42.945Z",
    "size": 3887,
    "path": "../public/_nuxt/BeOfdbEU.js"
  },
  "/_nuxt/Beh9z64k.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"187-MKhBR3EZ74HHSIL3bAoDhmGni5I\"",
    "mtime": "2026-05-03T19:23:42.945Z",
    "size": 391,
    "path": "../public/_nuxt/Beh9z64k.js"
  },
  "/_nuxt/BhbYv3_t.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"21f9-FSoChyo/xO85TKUYn+0sEEkbI+4\"",
    "mtime": "2026-05-03T19:23:42.945Z",
    "size": 8697,
    "path": "../public/_nuxt/BhbYv3_t.js"
  },
  "/_nuxt/Bj9qNvUf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5c6b-w2DAAdzB53C2Shv8BurXhQk9EN8\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 23659,
    "path": "../public/_nuxt/Bj9qNvUf.js"
  },
  "/_nuxt/BgX4aikW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11200-tGqHxAX3nixWauIVTstP1mVX1t4\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 70144,
    "path": "../public/_nuxt/BgX4aikW.js"
  },
  "/_nuxt/Bip1KCbg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3b36-NV8IXB4cJqWGtnxAEtPBVOSy+k0\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 15158,
    "path": "../public/_nuxt/Bip1KCbg.js"
  },
  "/_nuxt/Bk-6gFhs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10985-NYplKnLtkikYPmnCteWfxAS07fE\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 67973,
    "path": "../public/_nuxt/Bk-6gFhs.js"
  },
  "/_nuxt/BmYMoIXb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"39c-P6pT8Pj33l8cfjhZxeSZ0Zlo62g\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 924,
    "path": "../public/_nuxt/BmYMoIXb.js"
  },
  "/_nuxt/BqvTyTDV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"194-tZIPFjgGmkjjXqN+5oFLQkOpBgY\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 404,
    "path": "../public/_nuxt/BqvTyTDV.js"
  },
  "/_nuxt/Br0T3Mac.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"372-iC7rzKrF8KtPjVEAOgP6Wzt1Y7k\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 882,
    "path": "../public/_nuxt/Br0T3Mac.js"
  },
  "/_nuxt/BmT3X4fo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a6-6al/x5glfpdwIeoJVYbOKKwVTeA\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 166,
    "path": "../public/_nuxt/BmT3X4fo.js"
  },
  "/_nuxt/Bu2IeE9W.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17d-cSAqEIgYdIZUfD+sJHkusdde/TE\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 381,
    "path": "../public/_nuxt/Bu2IeE9W.js"
  },
  "/_nuxt/BtxD5apl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9172-2TKm2fbfeqImUeLDA3/9IV8/Nsw\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 37234,
    "path": "../public/_nuxt/BtxD5apl.js"
  },
  "/_nuxt/BvoggeOv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14f1-NLgZiaraNt+kgjxQvUwf4cneEqc\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 5361,
    "path": "../public/_nuxt/BvoggeOv.js"
  },
  "/_nuxt/BwYR6uTC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e0-y94UBSYmxYoqowZk3W37fv5qCis\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 224,
    "path": "../public/_nuxt/BwYR6uTC.js"
  },
  "/_nuxt/Bue61-hL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e6-a45uIoGs/WORh8y1I4j67cIlu3I\"",
    "mtime": "2026-05-03T19:23:42.946Z",
    "size": 486,
    "path": "../public/_nuxt/Bue61-hL.js"
  },
  "/_nuxt/BwZm8B-Z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b8-p8kn0Wv2J5tcxs3f7EZ4aXR4EUc\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 184,
    "path": "../public/_nuxt/BwZm8B-Z.js"
  },
  "/_nuxt/BxSE_8gg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4df9-82X9EUxPCXEFMGeYmXINTtJ5DPk\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 19961,
    "path": "../public/_nuxt/BxSE_8gg.js"
  },
  "/_nuxt/BxyukO0q.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d50-RMubdGlhH5ENsInR9syAHf4Rhfw\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 3408,
    "path": "../public/_nuxt/BxyukO0q.js"
  },
  "/_nuxt/Bz0x5Nny.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"536-zmCyrX/S6W/6CNsjxvZwVUQuuBE\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 1334,
    "path": "../public/_nuxt/Bz0x5Nny.js"
  },
  "/_nuxt/BxcnBOoR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6dcba-g8yveEK2N4hNNry8WCG3fJhpX8c\"",
    "mtime": "2026-05-03T19:23:42.951Z",
    "size": 449722,
    "path": "../public/_nuxt/BxcnBOoR.js"
  },
  "/_nuxt/BzLCLO6P.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"39-jl3QWSuCJnJb+Cxd6IGaDYir+7E\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 57,
    "path": "../public/_nuxt/BzLCLO6P.js"
  },
  "/_nuxt/BzTfBVO3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b04-NOpMifzBBXfRB8mJmG7N2HXQn/U\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 2820,
    "path": "../public/_nuxt/BzTfBVO3.js"
  },
  "/_nuxt/BznosjwE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d0-M6inNPPCC5JxvMDOkdZOd2NOCyc\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 208,
    "path": "../public/_nuxt/BznosjwE.js"
  },
  "/_nuxt/C-Ll6qlM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fe7-Nj4pP6d34FUzaQzwDT/ixLVbUvM\"",
    "mtime": "2026-05-03T19:23:42.947Z",
    "size": 4071,
    "path": "../public/_nuxt/C-Ll6qlM.js"
  },
  "/_nuxt/C14DZ8TV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"44c7-7EAUoauWQcftvmjlcaktTUbAytQ\"",
    "mtime": "2026-05-03T19:23:42.948Z",
    "size": 17607,
    "path": "../public/_nuxt/C14DZ8TV.js"
  },
  "/_nuxt/C1Q2EEE_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7623-cQnGv0EJA8AL9YwWLzqTcqPVj6g\"",
    "mtime": "2026-05-03T19:23:42.948Z",
    "size": 30243,
    "path": "../public/_nuxt/C1Q2EEE_.js"
  },
  "/_nuxt/C1WCVV0e.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d3-XfKZVEIW15zYW8D3Q3HLghAMYGE\"",
    "mtime": "2026-05-03T19:23:42.948Z",
    "size": 211,
    "path": "../public/_nuxt/C1WCVV0e.js"
  },
  "/_nuxt/C1eYTKAs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"70b0-Q0UWKZriPJN1P4fW4CvBQW8kYnk\"",
    "mtime": "2026-05-03T19:23:42.948Z",
    "size": 28848,
    "path": "../public/_nuxt/C1eYTKAs.js"
  },
  "/_nuxt/C3GhGDvK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a6ab-xK8gOJkFZlQNeAwrDPeJerCMh2w\"",
    "mtime": "2026-05-03T19:23:42.951Z",
    "size": 108203,
    "path": "../public/_nuxt/C3GhGDvK.js"
  },
  "/_nuxt/C3lhdtKV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c0-tyGg5wQREMZWuri9sFuv3Z6m9BQ\"",
    "mtime": "2026-05-03T19:23:42.949Z",
    "size": 192,
    "path": "../public/_nuxt/C3lhdtKV.js"
  },
  "/_nuxt/C47_elbY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"88-4GQi77rSdpvKbehNgX8kYgEX+Dg\"",
    "mtime": "2026-05-03T19:23:42.949Z",
    "size": 136,
    "path": "../public/_nuxt/C47_elbY.js"
  },
  "/_nuxt/C4LYQubL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d7-OL717Nof5P/fAQBfR+0UINeS5Fo\"",
    "mtime": "2026-05-03T19:23:42.948Z",
    "size": 471,
    "path": "../public/_nuxt/C4LYQubL.js"
  },
  "/_nuxt/C5fqYBVi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7bfb-gVXjACvOPXyeb4DLnKbSw6sFR5E\"",
    "mtime": "2026-05-03T19:23:42.954Z",
    "size": 31739,
    "path": "../public/_nuxt/C5fqYBVi.js"
  },
  "/_nuxt/C6Y5DYvq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"96c-DsWs/YDZYu1eTbvRO/s3sLy3mtc\"",
    "mtime": "2026-05-03T19:23:42.950Z",
    "size": 2412,
    "path": "../public/_nuxt/C6Y5DYvq.js"
  },
  "/_nuxt/C6eN3_EU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d2-l86k4xrwdjsh3d8gvRRrccAQSxI\"",
    "mtime": "2026-05-03T19:23:42.950Z",
    "size": 210,
    "path": "../public/_nuxt/C6eN3_EU.js"
  },
  "/_nuxt/C6osrNYp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7a-Uw7tN8CGcvtMcF+lQw3KMznrbkk\"",
    "mtime": "2026-05-03T19:23:42.951Z",
    "size": 122,
    "path": "../public/_nuxt/C6osrNYp.js"
  },
  "/_nuxt/C6sovDvd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18ec-yje9aW4Z4Ywav6WD6Wfy4ZI+JAE\"",
    "mtime": "2026-05-03T19:23:42.951Z",
    "size": 6380,
    "path": "../public/_nuxt/C6sovDvd.js"
  },
  "/_nuxt/C7Gohv-U.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b4-LcK3FPWY5je+FbfBjVXza2iL7tc\"",
    "mtime": "2026-05-03T19:23:42.951Z",
    "size": 180,
    "path": "../public/_nuxt/C7Gohv-U.js"
  },
  "/_nuxt/C7h6DJLk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"dd-DWyg2se6HCPxYgPVu3C4fzIGqL0\"",
    "mtime": "2026-05-03T19:23:42.951Z",
    "size": 221,
    "path": "../public/_nuxt/C7h6DJLk.js"
  },
  "/_nuxt/C8auDsm3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24a0-HoL1BPcr5jLwQfM4AvGNVQoE3jU\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 9376,
    "path": "../public/_nuxt/C8auDsm3.js"
  },
  "/_nuxt/C81HwpmU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"49c-jJtFXCUkMQY6r8hjT7/6ScfLQEU\"",
    "mtime": "2026-05-03T19:23:42.951Z",
    "size": 1180,
    "path": "../public/_nuxt/C81HwpmU.js"
  },
  "/_nuxt/CAc1AD-P.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"212-BRtwrcDIK6taJW3VBHEP5+9vC20\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 530,
    "path": "../public/_nuxt/CAc1AD-P.js"
  },
  "/_nuxt/CBLx1NE1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9b7-FvxJgZ/sOjH0mGFGhK7CoL9noW8\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 2487,
    "path": "../public/_nuxt/CBLx1NE1.js"
  },
  "/_nuxt/CBjHRWIH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"252-0tvXdgo+9f5dB5WkmPBxkCXVRY0\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 594,
    "path": "../public/_nuxt/CBjHRWIH.js"
  },
  "/_nuxt/CC4L7EtC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9d04-r5SeY1dHvw2a4R0YkqtBot4UM+8\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 40196,
    "path": "../public/_nuxt/CC4L7EtC.js"
  },
  "/_nuxt/CD8ohk-t.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"33f-ElroSYD8DnAdWWpVBAkh5+wJdiA\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 831,
    "path": "../public/_nuxt/CD8ohk-t.js"
  },
  "/_nuxt/CDAMKDoH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13f2f-V7mGyTxrNzzDigourt1tuhFtnyA\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 81711,
    "path": "../public/_nuxt/CDAMKDoH.js"
  },
  "/_nuxt/CF1TqebE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2200-Buyis8GoD70t8qtwKgSaAxagm2M\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 8704,
    "path": "../public/_nuxt/CF1TqebE.js"
  },
  "/_nuxt/CFfbCdji.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2b0d-GTL01mMd473ynCfu7B7OLU4+xiM\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 11021,
    "path": "../public/_nuxt/CFfbCdji.js"
  },
  "/_nuxt/CGp9Dgb0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3aa-BAs4Nyw8nq9+ak/I2Zlw0LKUygo\"",
    "mtime": "2026-05-03T19:23:42.952Z",
    "size": 938,
    "path": "../public/_nuxt/CGp9Dgb0.js"
  },
  "/_nuxt/CIAWroWC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"257f-kQ3XGHMO74V0W99xLwlgLIZ+UHo\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 9599,
    "path": "../public/_nuxt/CIAWroWC.js"
  },
  "/_nuxt/CJZsAj55.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ed-JX0QivcWIM8OMXZXY33H2i6V7Iw\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 493,
    "path": "../public/_nuxt/CJZsAj55.js"
  },
  "/_nuxt/CJkRZtJP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c0-nNJqsCaykf4LmXt2ZfK+81pFmZw\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 192,
    "path": "../public/_nuxt/CJkRZtJP.js"
  },
  "/_nuxt/CLh4trNd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ce-SYVOmidu7OX2wP1/tMo46inxYk0\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 206,
    "path": "../public/_nuxt/CLh4trNd.js"
  },
  "/_nuxt/CMnKJbh6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3ce9-iRBiCMVbbJ2QpHFyWNG9GPVZdYM\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 15593,
    "path": "../public/_nuxt/CMnKJbh6.js"
  },
  "/_nuxt/COuTdbiP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cca-WKaEhYZY79D+92evYycpAGjthVY\"",
    "mtime": "2026-05-03T19:23:42.956Z",
    "size": 3274,
    "path": "../public/_nuxt/COuTdbiP.js"
  },
  "/_nuxt/CPVusWVj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1532-Yg5IHbIA8efGeg8mCWUSyPr1wRs\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 5426,
    "path": "../public/_nuxt/CPVusWVj.js"
  },
  "/_nuxt/CPuAG7aM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2912-DddmkoULR1+5kOL9W6EmP/L9rcw\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 10514,
    "path": "../public/_nuxt/CPuAG7aM.js"
  },
  "/_nuxt/CQLlHNUn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1bc-C8WBRL3+/13njhM01hlDVGEZbp0\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 444,
    "path": "../public/_nuxt/CQLlHNUn.js"
  },
  "/_nuxt/CQjeIqAI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c1-7UpmYpXrumieXubApUcSztzlGQk\"",
    "mtime": "2026-05-03T19:23:42.953Z",
    "size": 449,
    "path": "../public/_nuxt/CQjeIqAI.js"
  },
  "/_nuxt/CRGbovUB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2298-WC7NxFW+X54rcQ3Y6zbTF7Uk26c\"",
    "mtime": "2026-05-03T19:23:42.954Z",
    "size": 8856,
    "path": "../public/_nuxt/CRGbovUB.js"
  },
  "/_nuxt/CRSAe7bH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1780-NM03RtAd9hOZ+G72i1mF8vW1j9M\"",
    "mtime": "2026-05-03T19:23:42.954Z",
    "size": 6016,
    "path": "../public/_nuxt/CRSAe7bH.js"
  },
  "/_nuxt/CRgFU9mn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d9a-8UdZ9+guVaNllrKwQoxOkD3Q3Sc\"",
    "mtime": "2026-05-03T19:23:42.954Z",
    "size": 3482,
    "path": "../public/_nuxt/CRgFU9mn.js"
  },
  "/_nuxt/CSQlrl-2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b9b-yEwDMXgt9+Aueo/orj2v6cuxuLY\"",
    "mtime": "2026-05-03T19:23:42.954Z",
    "size": 2971,
    "path": "../public/_nuxt/CSQlrl-2.js"
  },
  "/_nuxt/CTF5F02k.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ed-UKmtTJGmjYwq0UWQN4e+i3Y1BkI\"",
    "mtime": "2026-05-03T19:23:42.954Z",
    "size": 749,
    "path": "../public/_nuxt/CTF5F02k.js"
  },
  "/_nuxt/CTNyZiJJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"16ed-oUuXcnkQl+j4Ze3xziTonAw/LKQ\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 5869,
    "path": "../public/_nuxt/CTNyZiJJ.js"
  },
  "/_nuxt/CThrmPrA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10c2-QPLqeESIL3PfjM+JI3dr3ixloc4\"",
    "mtime": "2026-05-03T19:23:42.954Z",
    "size": 4290,
    "path": "../public/_nuxt/CThrmPrA.js"
  },
  "/_nuxt/CUJjupmE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d0-c6OdpCnpiGSEHDG39gWxmepd6Mk\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 208,
    "path": "../public/_nuxt/CUJjupmE.js"
  },
  "/_nuxt/CVT4rBgQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4818-DKqLP+JX7xGcJue71EKvU/qq/sM\"",
    "mtime": "2026-05-03T19:23:42.957Z",
    "size": 18456,
    "path": "../public/_nuxt/CVT4rBgQ.js"
  },
  "/_nuxt/CXmL-9k3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2369-Q8RaDcgcgRORHig8NLzcQLHhbxA\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 9065,
    "path": "../public/_nuxt/CXmL-9k3.js"
  },
  "/_nuxt/CX41a1qg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f058-0LDhKKsn6OEp9CXXwgeFw29EbIE\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 61528,
    "path": "../public/_nuxt/CX41a1qg.js"
  },
  "/_nuxt/CK3FuHHQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"147146-LBqwf46kcmX6NHb9OYO96d1trTE\"",
    "mtime": "2026-05-03T19:23:42.960Z",
    "size": 1339718,
    "path": "../public/_nuxt/CK3FuHHQ.js"
  },
  "/_nuxt/CZ6UJKFA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bbe-r8IYFSCPsFdqWyJnrmyaSxfQpk4\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 3006,
    "path": "../public/_nuxt/CZ6UJKFA.js"
  },
  "/_nuxt/C_FcZKQ-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1826-07lrwPYC6A719GE8wyvtq5ZL2bw\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 6182,
    "path": "../public/_nuxt/C_FcZKQ-.js"
  },
  "/_nuxt/C_GxhogI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"184-K56me2us4fkHCSkJ7sIE2nAFyDE\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 388,
    "path": "../public/_nuxt/C_GxhogI.js"
  },
  "/_nuxt/CalendarView.F0LqjH_B.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"1d2-lgsY2LstOZifyLjSqu5rucyvPpQ\"",
    "mtime": "2026-05-03T19:23:42.956Z",
    "size": 466,
    "path": "../public/_nuxt/CalendarView.F0LqjH_B.css"
  },
  "/_nuxt/CbiKQLNL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c5c-Py1V4fd8jNWJjqdm/WuyjngOFw0\"",
    "mtime": "2026-05-03T19:23:42.955Z",
    "size": 3164,
    "path": "../public/_nuxt/CbiKQLNL.js"
  },
  "/_nuxt/Cc3OSVma.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6d-PP/Q+W8lTuXYM84kRSCrh/fB35s\"",
    "mtime": "2026-05-03T19:23:42.956Z",
    "size": 109,
    "path": "../public/_nuxt/Cc3OSVma.js"
  },
  "/_nuxt/CcfLDMrx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c0-04x+DbNRhjp2neMFZYrPPef5hGg\"",
    "mtime": "2026-05-03T19:23:42.956Z",
    "size": 192,
    "path": "../public/_nuxt/CcfLDMrx.js"
  },
  "/_nuxt/Cd2hBrhI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d0-bLfX5hvdhiaOTA8TWrWlAYCv0No\"",
    "mtime": "2026-05-03T19:23:42.956Z",
    "size": 208,
    "path": "../public/_nuxt/Cd2hBrhI.js"
  },
  "/_nuxt/CeJy_QEn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10a9-wBDpjZj4x/9iFCHZw8x6wviLRso\"",
    "mtime": "2026-05-03T19:23:42.957Z",
    "size": 4265,
    "path": "../public/_nuxt/CeJy_QEn.js"
  },
  "/_nuxt/CezIMboO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b3-4vbR8YeF4r0isURrKhHexyi+IJE\"",
    "mtime": "2026-05-03T19:23:42.957Z",
    "size": 435,
    "path": "../public/_nuxt/CezIMboO.js"
  },
  "/_nuxt/ChuzLsGA.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d3-1GTn6Cs6dN9dOVz2TxSP24oVF0I\"",
    "mtime": "2026-05-03T19:23:42.958Z",
    "size": 211,
    "path": "../public/_nuxt/ChuzLsGA.js"
  },
  "/_nuxt/CgsfYSMQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"34030-5Dg4u2ekzN7bv9envM4JukPC3WM\"",
    "mtime": "2026-05-03T19:23:42.958Z",
    "size": 213040,
    "path": "../public/_nuxt/CgsfYSMQ.js"
  },
  "/_nuxt/Ci0mp3GK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2dcd-HJWDkOxViQFmPqH2VrFR8BVkvBw\"",
    "mtime": "2026-05-03T19:23:42.957Z",
    "size": 11725,
    "path": "../public/_nuxt/Ci0mp3GK.js"
  },
  "/_nuxt/CkT0BhXo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d0f-ow8I9NJd4IS1RXbdwjDatRT9dck\"",
    "mtime": "2026-05-03T19:23:42.957Z",
    "size": 7439,
    "path": "../public/_nuxt/CkT0BhXo.js"
  },
  "/_nuxt/Cm9GElyk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9a1-ZyTOWu1Oa+RGOfWVzXBncLMLn9I\"",
    "mtime": "2026-05-03T19:23:42.957Z",
    "size": 2465,
    "path": "../public/_nuxt/Cm9GElyk.js"
  },
  "/_nuxt/Cmnim2N0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d6-MgKAa6S8q+Qa5tvISA8AyDTz/XA\"",
    "mtime": "2026-05-03T19:23:42.958Z",
    "size": 214,
    "path": "../public/_nuxt/Cmnim2N0.js"
  },
  "/_nuxt/Co1Mu7CP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"230-tXAnFrpV+Bn0nBu9JjBYC5Qpz5Y\"",
    "mtime": "2026-05-03T19:23:42.958Z",
    "size": 560,
    "path": "../public/_nuxt/Co1Mu7CP.js"
  },
  "/_nuxt/Cp35CBuN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b23-IoIfZX29549u+IyjegxHYoiIaHE\"",
    "mtime": "2026-05-03T19:23:42.958Z",
    "size": 2851,
    "path": "../public/_nuxt/Cp35CBuN.js"
  },
  "/_nuxt/CpcAj1nu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1186a-C+M3xd5Kw8EeVBvVjt552Gy/ciY\"",
    "mtime": "2026-05-03T19:23:42.960Z",
    "size": 71786,
    "path": "../public/_nuxt/CpcAj1nu.js"
  },
  "/_nuxt/Cqodxulm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e6-iVGJUrj3njFveQsw2hAY9X3Qpkw\"",
    "mtime": "2026-05-03T19:23:42.959Z",
    "size": 486,
    "path": "../public/_nuxt/Cqodxulm.js"
  },
  "/_nuxt/Cqwx85Ee.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"56a-2ROvuIRUq0Fs1p4kbBGqOVuNbQs\"",
    "mtime": "2026-05-03T19:23:42.959Z",
    "size": 1386,
    "path": "../public/_nuxt/Cqwx85Ee.js"
  },
  "/_nuxt/Cs6Z59By.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2446b-UbJGeL/paXlpZhkSG8sLqTG9JAI\"",
    "mtime": "2026-05-03T19:23:42.961Z",
    "size": 148587,
    "path": "../public/_nuxt/Cs6Z59By.js"
  },
  "/_nuxt/CmKTTxBW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4a0-QhSTpwVjrC/PVWv/HHlzrTsQTiE\"",
    "mtime": "2026-05-03T19:23:42.975Z",
    "size": 1184,
    "path": "../public/_nuxt/CmKTTxBW.js"
  },
  "/_nuxt/CjaSWrgM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2e8-Ax9WdXkWAQ2Vs31tkobs2K4aVmU\"",
    "mtime": "2026-05-03T19:23:42.957Z",
    "size": 744,
    "path": "../public/_nuxt/CjaSWrgM.js"
  },
  "/_nuxt/Cu4olwBT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ea60c-UTRa0sbPkw6oUc8J1KZXIBPn2MQ\"",
    "mtime": "2026-05-03T19:23:42.967Z",
    "size": 960012,
    "path": "../public/_nuxt/Cu4olwBT.js"
  },
  "/_nuxt/Cuv_e-fj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b5-SUAfxfxgkgv59dFOeojVKXW59hc\"",
    "mtime": "2026-05-03T19:23:42.960Z",
    "size": 181,
    "path": "../public/_nuxt/Cuv_e-fj.js"
  },
  "/_nuxt/CvAYt5f9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17d-cSAqEIgYdIZUfD+sJHkusdde/TE\"",
    "mtime": "2026-05-03T19:23:42.960Z",
    "size": 381,
    "path": "../public/_nuxt/CvAYt5f9.js"
  },
  "/_nuxt/CxArFC30.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"526-KKJdXo49LJf+spB3kzev1+xqCM0\"",
    "mtime": "2026-05-03T19:23:42.961Z",
    "size": 1318,
    "path": "../public/_nuxt/CxArFC30.js"
  },
  "/_nuxt/CxK78PL1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b3-Z2cds1FlWtZ800tZLL4e2MhS4Xg\"",
    "mtime": "2026-05-03T19:23:42.961Z",
    "size": 179,
    "path": "../public/_nuxt/CxK78PL1.js"
  },
  "/_nuxt/Cy0RhBmT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e38-ttOM/nYlrUJKajvCUIECZzgNTcw\"",
    "mtime": "2026-05-03T19:23:42.961Z",
    "size": 3640,
    "path": "../public/_nuxt/Cy0RhBmT.js"
  },
  "/_nuxt/Cy6RdMfd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"179-xD6p3nR8bTziJEehk1eLKptur0Q\"",
    "mtime": "2026-05-03T19:23:42.961Z",
    "size": 377,
    "path": "../public/_nuxt/Cy6RdMfd.js"
  },
  "/_nuxt/CzpnFRnL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ac-Kp2f2x90MqryLLasA4lpdetYkAs\"",
    "mtime": "2026-05-03T19:23:42.962Z",
    "size": 172,
    "path": "../public/_nuxt/CzpnFRnL.js"
  },
  "/_nuxt/CyzDfPMH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7464-/GaQ1/PaX4GIaQdy0tc9bimwUps\"",
    "mtime": "2026-05-03T19:23:42.962Z",
    "size": 29796,
    "path": "../public/_nuxt/CyzDfPMH.js"
  },
  "/_nuxt/D-Vk1KAs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"161-Lo+h/kXsQf6yRcYG2H/E47YNG1A\"",
    "mtime": "2026-05-03T19:23:42.962Z",
    "size": 353,
    "path": "../public/_nuxt/D-Vk1KAs.js"
  },
  "/_nuxt/D-qNbU-1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2f4-2cFu4TmmGzfP5/t4qU+4Wn6dAHs\"",
    "mtime": "2026-05-03T19:23:42.962Z",
    "size": 756,
    "path": "../public/_nuxt/D-qNbU-1.js"
  },
  "/_nuxt/D0KLtJtd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f72-07b6G3JSj0mXnK2wiMvxurK2FmA\"",
    "mtime": "2026-05-03T19:23:42.962Z",
    "size": 8050,
    "path": "../public/_nuxt/D0KLtJtd.js"
  },
  "/_nuxt/D3SbWa7S.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6b0-Bmx731ni1yFJwAq4/lEbfdQmb2M\"",
    "mtime": "2026-05-03T19:23:42.962Z",
    "size": 1712,
    "path": "../public/_nuxt/D3SbWa7S.js"
  },
  "/_nuxt/D4rdnAI5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"37d-aUfMr4GXQP6ommVn572F1tm58Og\"",
    "mtime": "2026-05-03T19:23:42.963Z",
    "size": 893,
    "path": "../public/_nuxt/D4rdnAI5.js"
  },
  "/_nuxt/D6NACeck.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"58e-ck8uxumF5wdJItRlohovBBv2dJU\"",
    "mtime": "2026-05-03T19:23:42.963Z",
    "size": 1422,
    "path": "../public/_nuxt/D6NACeck.js"
  },
  "/_nuxt/D6OVEqCD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"191e-oIUu5bEVYYjZev0rJgGe1kERW2U\"",
    "mtime": "2026-05-03T19:23:42.963Z",
    "size": 6430,
    "path": "../public/_nuxt/D6OVEqCD.js"
  },
  "/_nuxt/D6dWcZ8J.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"16c-lcUaPmppGQb80YCg8FPDahi7+FY\"",
    "mtime": "2026-05-03T19:23:42.963Z",
    "size": 364,
    "path": "../public/_nuxt/D6dWcZ8J.js"
  },
  "/_nuxt/D6aSfE1f.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1130-KcsglZGCch9nkmj3RlmGiBF76ho\"",
    "mtime": "2026-05-03T19:23:42.963Z",
    "size": 4400,
    "path": "../public/_nuxt/D6aSfE1f.js"
  },
  "/_nuxt/D7dEVGYJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6ac-3sP37IiMItNwIXQhutZsd+QeyqE\"",
    "mtime": "2026-05-03T19:23:42.963Z",
    "size": 1708,
    "path": "../public/_nuxt/D7dEVGYJ.js"
  },
  "/_nuxt/D8XCqKmx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b209-dhp6ZI2G97QUD7YHi2uEF7Glp6g\"",
    "mtime": "2026-05-03T19:23:42.965Z",
    "size": 45577,
    "path": "../public/_nuxt/D8XCqKmx.js"
  },
  "/_nuxt/D93e8hA5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"398a-NqU5+JpIsN8un2yGclzyU4KHc0c\"",
    "mtime": "2026-05-03T19:23:42.964Z",
    "size": 14730,
    "path": "../public/_nuxt/D93e8hA5.js"
  },
  "/_nuxt/D9qrMTa9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e0-xKSQxfnLBWO3tWbnhLv/eROeibc\"",
    "mtime": "2026-05-03T19:23:42.968Z",
    "size": 224,
    "path": "../public/_nuxt/D9qrMTa9.js"
  },
  "/_nuxt/DBew4D97.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"22a8-Bbmu7nvY6fm+8DTw/8E/eiEofZQ\"",
    "mtime": "2026-05-03T19:23:42.964Z",
    "size": 8872,
    "path": "../public/_nuxt/DBew4D97.js"
  },
  "/_nuxt/DCBnttRX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d6f-NddvuyNhXZBxL+lYzRj0qYx/tF8\"",
    "mtime": "2026-05-03T19:23:42.965Z",
    "size": 3439,
    "path": "../public/_nuxt/DCBnttRX.js"
  },
  "/_nuxt/DCoEoLD7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24c4-6nbMTVxJkLGuOJLkuFxca0L96Q4\"",
    "mtime": "2026-05-03T19:23:42.965Z",
    "size": 9412,
    "path": "../public/_nuxt/DCoEoLD7.js"
  },
  "/_nuxt/DDM9mmbb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"67885-TugFvCO9UD1kSSuJDzblhObNbpo\"",
    "mtime": "2026-05-03T19:23:42.974Z",
    "size": 424069,
    "path": "../public/_nuxt/DDM9mmbb.js"
  },
  "/_nuxt/DDObQsbj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4fe-9/3f1yXPWkE3KvaTNqPNDbjwwsM\"",
    "mtime": "2026-05-03T19:23:42.969Z",
    "size": 1278,
    "path": "../public/_nuxt/DDObQsbj.js"
  },
  "/_nuxt/DEi78vSb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"921-zszHa1FXeeoshZ2LLBfEovU9uyY\"",
    "mtime": "2026-05-03T19:23:42.970Z",
    "size": 2337,
    "path": "../public/_nuxt/DEi78vSb.js"
  },
  "/_nuxt/DGWAGiq8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f9-WFZ+1jqj8ag7yVPVdX7jy7rWD/Q\"",
    "mtime": "2026-05-03T19:23:42.971Z",
    "size": 249,
    "path": "../public/_nuxt/DGWAGiq8.js"
  },
  "/_nuxt/DHA5kfUh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"250-HauRTQ5zZGYxBJwTyIgWAQ76u3U\"",
    "mtime": "2026-05-03T19:23:42.971Z",
    "size": 592,
    "path": "../public/_nuxt/DHA5kfUh.js"
  },
  "/_nuxt/DGU0YFZ5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f66-lmvPUmYUBxqLhGT0Lr4MkTiz4Hk\"",
    "mtime": "2026-05-03T19:23:42.971Z",
    "size": 3942,
    "path": "../public/_nuxt/DGU0YFZ5.js"
  },
  "/_nuxt/DHUQjdPy.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"182-r58vgIRWbac/8KtmAJpFirwiiIE\"",
    "mtime": "2026-05-03T19:23:42.971Z",
    "size": 386,
    "path": "../public/_nuxt/DHUQjdPy.js"
  },
  "/_nuxt/DHnH-o0R.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"abd-oCWN7LaVvxv1mBrAbWMMtGf9ooM\"",
    "mtime": "2026-05-03T19:23:42.971Z",
    "size": 2749,
    "path": "../public/_nuxt/DHnH-o0R.js"
  },
  "/_nuxt/DHxjRmSb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5bea-i8ohUmydbjjpVeIx16QOuQcZdIY\"",
    "mtime": "2026-05-03T19:23:42.972Z",
    "size": 23530,
    "path": "../public/_nuxt/DHxjRmSb.js"
  },
  "/_nuxt/DHYe2ZSG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5324-jPKvxBcDD4KCUztYhjeaP/tiHWs\"",
    "mtime": "2026-05-03T19:23:42.971Z",
    "size": 21284,
    "path": "../public/_nuxt/DHYe2ZSG.js"
  },
  "/_nuxt/DIB-P8rW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e0-EIRYCkIhGLUD8KyUA0k3thq7//M\"",
    "mtime": "2026-05-03T19:23:42.972Z",
    "size": 480,
    "path": "../public/_nuxt/DIB-P8rW.js"
  },
  "/_nuxt/DHMw6HUq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f3ed-ISU8kfMD/rcKaGb8lah9FB3dbDc\"",
    "mtime": "2026-05-03T19:23:42.974Z",
    "size": 259053,
    "path": "../public/_nuxt/DHMw6HUq.js"
  },
  "/_nuxt/DIBPfAi5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"146-RvBheseCRnWya6BExJq8yAQx8bc\"",
    "mtime": "2026-05-03T19:23:42.972Z",
    "size": 326,
    "path": "../public/_nuxt/DIBPfAi5.js"
  },
  "/_nuxt/DJ7-Q8h7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c51-vy7R85GWS4SgTQUI0+kbVpick28\"",
    "mtime": "2026-05-03T19:23:42.973Z",
    "size": 3153,
    "path": "../public/_nuxt/DJ7-Q8h7.js"
  },
  "/_nuxt/DJFZ2xPy.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"25fb-Ua8SnpUCK1BmMWPLsf8Jfn8QeSM\"",
    "mtime": "2026-05-03T19:23:42.974Z",
    "size": 9723,
    "path": "../public/_nuxt/DJFZ2xPy.js"
  },
  "/_nuxt/DLBdj2mh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"242-O8Q5E40AAcDBWuCkBHU0HZy4Sws\"",
    "mtime": "2026-05-03T19:23:42.974Z",
    "size": 578,
    "path": "../public/_nuxt/DLBdj2mh.js"
  },
  "/_nuxt/DIy2rXkW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17b2b-aCSyx2X5pLpocLUndsDo+VDPLN4\"",
    "mtime": "2026-05-03T19:23:42.977Z",
    "size": 97067,
    "path": "../public/_nuxt/DIy2rXkW.js"
  },
  "/_nuxt/DNtHd6Ji.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3a8-om3yD5m2vxiXtRUOpBEYwXJWIkw\"",
    "mtime": "2026-05-03T19:23:42.976Z",
    "size": 936,
    "path": "../public/_nuxt/DNtHd6Ji.js"
  },
  "/_nuxt/DOB_Bhkf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"184-xqtfP739AKsfRyHiMHPUmRMGnXA\"",
    "mtime": "2026-05-03T19:23:42.976Z",
    "size": 388,
    "path": "../public/_nuxt/DOB_Bhkf.js"
  },
  "/_nuxt/DLLIuhga.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b0e8-DPtQF7qMYGMlFPDnGxFhfh3JVkc\"",
    "mtime": "2026-05-03T19:23:42.977Z",
    "size": 45288,
    "path": "../public/_nuxt/DLLIuhga.js"
  },
  "/_nuxt/DOu-UlQd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"43-E+oOvETMLcdzyvfUWheb5ncXYt8\"",
    "mtime": "2026-05-03T19:23:42.978Z",
    "size": 67,
    "path": "../public/_nuxt/DOu-UlQd.js"
  },
  "/_nuxt/DPPsXgez.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bc-6sb31znEkj5nhBzRnXLOsAkBbpc\"",
    "mtime": "2026-05-03T19:23:42.977Z",
    "size": 188,
    "path": "../public/_nuxt/DPPsXgez.js"
  },
  "/_nuxt/DPIBgRvE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e6-HjK+6OHUFIQHvHBJb+sO8KBGxF8\"",
    "mtime": "2026-05-03T19:23:42.977Z",
    "size": 486,
    "path": "../public/_nuxt/DPIBgRvE.js"
  },
  "/_nuxt/DQvIWnhF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"21740-YESNty+9qwjNcuCAv/Db1Jp/NHg\"",
    "mtime": "2026-05-03T19:23:42.988Z",
    "size": 137024,
    "path": "../public/_nuxt/DQvIWnhF.js"
  },
  "/_nuxt/DRmHTUPo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"daa-vAvtOz1dqEE0V178G5kN4VRIcFM\"",
    "mtime": "2026-05-03T19:23:42.978Z",
    "size": 3498,
    "path": "../public/_nuxt/DRmHTUPo.js"
  },
  "/_nuxt/DSNGUOfu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1b7-UP7tB9ccghn9TfuBm1xwCReqDaI\"",
    "mtime": "2026-05-03T19:23:42.979Z",
    "size": 439,
    "path": "../public/_nuxt/DSNGUOfu.js"
  },
  "/_nuxt/DSZKbThQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5d78-aQ25SdDfig3jZfAqmMtb/QQqJ/4\"",
    "mtime": "2026-05-03T19:23:42.979Z",
    "size": 23928,
    "path": "../public/_nuxt/DSZKbThQ.js"
  },
  "/_nuxt/DSagHkh9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"298-NMm6FhdR6lh8WX3eFG1FDRbqsbs\"",
    "mtime": "2026-05-03T19:23:42.979Z",
    "size": 664,
    "path": "../public/_nuxt/DSagHkh9.js"
  },
  "/_nuxt/DWwIpOzb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"592-aho+7zFcr5o6dRzQW8C0eXBDTfM\"",
    "mtime": "2026-05-03T19:23:42.980Z",
    "size": 1426,
    "path": "../public/_nuxt/DWwIpOzb.js"
  },
  "/_nuxt/DVuoFgpX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fa-mBPWMtHivNxbR2A7oVyiIGhp9co\"",
    "mtime": "2026-05-03T19:23:42.980Z",
    "size": 250,
    "path": "../public/_nuxt/DVuoFgpX.js"
  },
  "/_nuxt/DX4tynVJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4bb-ttX2+WPCwm9VFkE8NyE4N9WHYH0\"",
    "mtime": "2026-05-03T19:23:42.980Z",
    "size": 1211,
    "path": "../public/_nuxt/DX4tynVJ.js"
  },
  "/_nuxt/DX6XiGOO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1250-LjI6IfAcZzcctOf7rt85nMdLTGw\"",
    "mtime": "2026-05-03T19:23:42.980Z",
    "size": 4688,
    "path": "../public/_nuxt/DX6XiGOO.js"
  },
  "/_nuxt/DXJXMhsS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2af-bTpFGpQ8QReHriu4/vMEsjw+Vvc\"",
    "mtime": "2026-05-03T19:23:42.981Z",
    "size": 687,
    "path": "../public/_nuxt/DXJXMhsS.js"
  },
  "/_nuxt/DXO-rmdD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"64fe-C6vng7/3xkAbsKCvsPxYiITrN+4\"",
    "mtime": "2026-05-03T19:23:42.981Z",
    "size": 25854,
    "path": "../public/_nuxt/DXO-rmdD.js"
  },
  "/_nuxt/DXnbfAXZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bb-0LrEUOckCqSPaq+eNiXlny4CkiQ\"",
    "mtime": "2026-05-03T19:23:42.981Z",
    "size": 187,
    "path": "../public/_nuxt/DXnbfAXZ.js"
  },
  "/_nuxt/DZleLAVx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2bde-XopQ6AUJZNbdwBvDXgCpoqJedUw\"",
    "mtime": "2026-05-03T19:23:42.981Z",
    "size": 11230,
    "path": "../public/_nuxt/DZleLAVx.js"
  },
  "/_nuxt/D_YeCLo3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2e2a-Y74nk+yQvqXlbJwkfBGKHSfyIgc\"",
    "mtime": "2026-05-03T19:23:42.982Z",
    "size": 11818,
    "path": "../public/_nuxt/D_YeCLo3.js"
  },
  "/_nuxt/DZJllNJT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d4c-6teXflw5i8t/2z109dxf5hF7uvg\"",
    "mtime": "2026-05-03T19:23:42.981Z",
    "size": 3404,
    "path": "../public/_nuxt/DZJllNJT.js"
  },
  "/_nuxt/DaXSSXI2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7a6-0MlyolKZl4FzBjOPrQyEPKSmXS0\"",
    "mtime": "2026-05-03T19:23:42.982Z",
    "size": 1958,
    "path": "../public/_nuxt/DaXSSXI2.js"
  },
  "/_nuxt/DXRpcmhI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"491d-DLDKhQhwwzka82h+770Zuzl3RJI\"",
    "mtime": "2026-05-03T19:23:42.981Z",
    "size": 18717,
    "path": "../public/_nuxt/DXRpcmhI.js"
  },
  "/_nuxt/DdieATi1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"191-B8pQ/DDyWpO1rXBq0LVU6RtCEoI\"",
    "mtime": "2026-05-03T19:23:42.982Z",
    "size": 401,
    "path": "../public/_nuxt/DdieATi1.js"
  },
  "/_nuxt/Dau1Pmq2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f37-hA2VFFNcU2RUXAVZJC//jnkRRV4\"",
    "mtime": "2026-05-03T19:23:42.983Z",
    "size": 16183,
    "path": "../public/_nuxt/Dau1Pmq2.js"
  },
  "/_nuxt/Dednz2EN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ba9-Qvg6YyO4gubQbKRXuSKCopZ4ggY\"",
    "mtime": "2026-05-03T19:23:42.982Z",
    "size": 2985,
    "path": "../public/_nuxt/Dednz2EN.js"
  },
  "/_nuxt/DgnhQSBy.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"176-+hWQehuAS48cEablO4z47hk93HQ\"",
    "mtime": "2026-05-03T19:23:42.983Z",
    "size": 374,
    "path": "../public/_nuxt/DgnhQSBy.js"
  },
  "/_nuxt/DhKXYpw_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3daf-Xca+2la5LsrzaSaS2i0nZyyUEcY\"",
    "mtime": "2026-05-03T19:23:42.983Z",
    "size": 15791,
    "path": "../public/_nuxt/DhKXYpw_.js"
  },
  "/_nuxt/DiBGJyZL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d6-19Xraxlisi41Oaz+b2C3ThDEoyE\"",
    "mtime": "2026-05-03T19:23:42.983Z",
    "size": 214,
    "path": "../public/_nuxt/DiBGJyZL.js"
  },
  "/_nuxt/DiZElEMb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9ef-xKeuveH9N38Rx6QEuKbeTHSwvco\"",
    "mtime": "2026-05-03T19:23:42.984Z",
    "size": 2543,
    "path": "../public/_nuxt/DiZElEMb.js"
  },
  "/_nuxt/D_R8Bg4C.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c4c8-9LtxHBv4AYZM5mNjX4UejYG8JnM\"",
    "mtime": "2026-05-03T19:23:42.984Z",
    "size": 181448,
    "path": "../public/_nuxt/D_R8Bg4C.js"
  },
  "/_nuxt/Dj87eWzN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ba-vNKypqiHJb+0viSN9DLANln2htU\"",
    "mtime": "2026-05-03T19:23:42.984Z",
    "size": 186,
    "path": "../public/_nuxt/Dj87eWzN.js"
  },
  "/_nuxt/DkOyvmE4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6bd6e-1Dl6uX7DgLoIm7dc3QphphJO8Zg\"",
    "mtime": "2026-05-03T19:23:42.988Z",
    "size": 441710,
    "path": "../public/_nuxt/DkOyvmE4.js"
  },
  "/_nuxt/DmOxUnWj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d0-H9HgPBx3XYEb7Yba5Ne4XldBR88\"",
    "mtime": "2026-05-03T19:23:42.984Z",
    "size": 208,
    "path": "../public/_nuxt/DmOxUnWj.js"
  },
  "/_nuxt/DnbaueKq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"654-ANdpCgKLftTEV9fKNMsknWkgGz8\"",
    "mtime": "2026-05-03T19:23:42.985Z",
    "size": 1620,
    "path": "../public/_nuxt/DnbaueKq.js"
  },
  "/_nuxt/DnlNHqh2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d82-ywmzMHQL05q9bhVXxfkHEsYfc/E\"",
    "mtime": "2026-05-03T19:23:42.985Z",
    "size": 7554,
    "path": "../public/_nuxt/DnlNHqh2.js"
  },
  "/_nuxt/DqlWxm5s.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"118e-YQOufaMytEafs3BEFowywbWkqFM\"",
    "mtime": "2026-05-03T19:23:42.985Z",
    "size": 4494,
    "path": "../public/_nuxt/DqlWxm5s.js"
  },
  "/_nuxt/DrFQhnbx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"218a-RjAT/VI/yegiPbclZteD+KvyVe0\"",
    "mtime": "2026-05-03T19:23:42.985Z",
    "size": 8586,
    "path": "../public/_nuxt/DrFQhnbx.js"
  },
  "/_nuxt/Ds0qFGro.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"947-SIjCyuP/1n+aRataIag+wNEQ8Cw\"",
    "mtime": "2026-05-03T19:23:42.985Z",
    "size": 2375,
    "path": "../public/_nuxt/Ds0qFGro.js"
  },
  "/_nuxt/DwoVdwtq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"569a6-2mtgYnRUIRvLptnPMRMyO5pUEoU\"",
    "mtime": "2026-05-03T19:23:42.989Z",
    "size": 354726,
    "path": "../public/_nuxt/DwoVdwtq.js"
  },
  "/_nuxt/Dx9FoDwu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"757b-5ByBqmmtAlR0QbE1SloRyxL1suw\"",
    "mtime": "2026-05-03T19:23:42.986Z",
    "size": 30075,
    "path": "../public/_nuxt/Dx9FoDwu.js"
  },
  "/_nuxt/DzOVz2WK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"22b3-hRZtunH5oCsNwO33fFKQd2k/5Cs\"",
    "mtime": "2026-05-03T19:23:42.985Z",
    "size": 8883,
    "path": "../public/_nuxt/DzOVz2WK.js"
  },
  "/_nuxt/EventContent.BIOF__oj.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"14c-39VXxyTUdphE3dsou+ygp7uqgH0\"",
    "mtime": "2026-05-03T19:23:42.986Z",
    "size": 332,
    "path": "../public/_nuxt/EventContent.BIOF__oj.css"
  },
  "/_nuxt/FrurzmN-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"68f-NEk6Tmi3sEY9KeUZEzRMbTiV7Uc\"",
    "mtime": "2026-05-03T19:23:42.986Z",
    "size": 1679,
    "path": "../public/_nuxt/FrurzmN-.js"
  },
  "/_nuxt/Gi6I4Gst.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"93-Ddd4j0nL7FejgC/2FVPkAQwObCg\"",
    "mtime": "2026-05-03T19:23:42.987Z",
    "size": 147,
    "path": "../public/_nuxt/Gi6I4Gst.js"
  },
  "/_nuxt/GraphView.C5fFsriS.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"2d-VHcJeTPL5NYNthzlgq62NYll/3I\"",
    "mtime": "2026-05-03T19:23:42.985Z",
    "size": 45,
    "path": "../public/_nuxt/GraphView.C5fFsriS.css"
  },
  "/_nuxt/HHbdrBvF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"184-xqtfP739AKsfRyHiMHPUmRMGnXA\"",
    "mtime": "2026-05-03T19:23:42.987Z",
    "size": 388,
    "path": "../public/_nuxt/HHbdrBvF.js"
  },
  "/_nuxt/IUrv7Lo2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6ceb-REtaJjYk9h4P4tfs3GwgBdqx51o\"",
    "mtime": "2026-05-03T19:23:43.000Z",
    "size": 27883,
    "path": "../public/_nuxt/IUrv7Lo2.js"
  },
  "/_nuxt/IconRail.C3-D49_K.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"35e-rQQeVi2TdQ81LroEJN0X7JwlVQg\"",
    "mtime": "2026-05-03T19:23:42.987Z",
    "size": 862,
    "path": "../public/_nuxt/IconRail.C3-D49_K.css"
  },
  "/_nuxt/JCf3zpgv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1269-eb7uv3cBIpqi962sz4OnXa2iwdo\"",
    "mtime": "2026-05-03T19:23:42.988Z",
    "size": 4713,
    "path": "../public/_nuxt/JCf3zpgv.js"
  },
  "/_nuxt/KaTeX_AMS-Regular.BQhdFMY1.woff2": {
    "type": "font/woff2",
    "etag": "\"6dac-NElHQ3Nv2nVxl9FvzGpuGnkxfIY\"",
    "mtime": "2026-05-03T19:23:42.992Z",
    "size": 28076,
    "path": "../public/_nuxt/KaTeX_AMS-Regular.BQhdFMY1.woff2"
  },
  "/_nuxt/KaTeX_AMS-Regular.DRggAlZN.ttf": {
    "type": "font/ttf",
    "etag": "\"f890-Hf0O5uMPihwjmZ2dll24cAtany4\"",
    "mtime": "2026-05-03T19:23:42.990Z",
    "size": 63632,
    "path": "../public/_nuxt/KaTeX_AMS-Regular.DRggAlZN.ttf"
  },
  "/_nuxt/KaTeX_AMS-Regular.DMm9YOAa.woff": {
    "type": "font/woff",
    "etag": "\"82ec-ma2i3jIA55UUPWOSMsNESwgBgjU\"",
    "mtime": "2026-05-03T19:23:42.989Z",
    "size": 33516,
    "path": "../public/_nuxt/KaTeX_AMS-Regular.DMm9YOAa.woff"
  },
  "/_nuxt/KaTeX_Caligraphic-Bold.ATXxdsX0.ttf": {
    "type": "font/ttf",
    "etag": "\"3050-j6tziha6j7fnACoHXwNqRVpFxug\"",
    "mtime": "2026-05-03T19:23:42.990Z",
    "size": 12368,
    "path": "../public/_nuxt/KaTeX_Caligraphic-Bold.ATXxdsX0.ttf"
  },
  "/_nuxt/KaTeX_Caligraphic-Bold.BEiXGLvX.woff": {
    "type": "font/woff",
    "etag": "\"1e24-3SOsD7CsRpsGJEhep41wD2NhQgM\"",
    "mtime": "2026-05-03T19:23:42.989Z",
    "size": 7716,
    "path": "../public/_nuxt/KaTeX_Caligraphic-Bold.BEiXGLvX.woff"
  },
  "/_nuxt/KaTeX_Caligraphic-Bold.Dq_IR9rO.woff2": {
    "type": "font/woff2",
    "etag": "\"1b00-W/pJysRs0derE1E4jTfBGvWbphU\"",
    "mtime": "2026-05-03T19:23:42.989Z",
    "size": 6912,
    "path": "../public/_nuxt/KaTeX_Caligraphic-Bold.Dq_IR9rO.woff2"
  },
  "/_nuxt/KaTeX_Caligraphic-Regular.CTRA-rTL.woff": {
    "type": "font/woff",
    "etag": "\"1de8-Gm85vXDJt0cTB431991hCPm604s\"",
    "mtime": "2026-05-03T19:23:42.990Z",
    "size": 7656,
    "path": "../public/_nuxt/KaTeX_Caligraphic-Regular.CTRA-rTL.woff"
  },
  "/_nuxt/KaTeX_Caligraphic-Regular.Di6jR-x-.woff2": {
    "type": "font/woff2",
    "etag": "\"1afc-n4B34LOKKQzZt7E2sKwpyDdegaY\"",
    "mtime": "2026-05-03T19:23:42.991Z",
    "size": 6908,
    "path": "../public/_nuxt/KaTeX_Caligraphic-Regular.Di6jR-x-.woff2"
  },
  "/_nuxt/KaTeX_Caligraphic-Regular.wX97UBjC.ttf": {
    "type": "font/ttf",
    "etag": "\"3038-JvJqE+an0KabSPYqzTGoGWvOf24\"",
    "mtime": "2026-05-03T19:23:42.991Z",
    "size": 12344,
    "path": "../public/_nuxt/KaTeX_Caligraphic-Regular.wX97UBjC.ttf"
  },
  "/_nuxt/KaTeX_Fraktur-Bold.BdnERNNW.ttf": {
    "type": "font/ttf",
    "etag": "\"4c80-TgjdADgxJOfNlpcMyw++NcnvqqM\"",
    "mtime": "2026-05-03T19:23:42.992Z",
    "size": 19584,
    "path": "../public/_nuxt/KaTeX_Fraktur-Bold.BdnERNNW.ttf"
  },
  "/_nuxt/KaTeX_Fraktur-Bold.BsDP51OF.woff": {
    "type": "font/woff",
    "etag": "\"33f0-W7r9UB8mIhlCavfyDBEDu0tzJZI\"",
    "mtime": "2026-05-03T19:23:42.992Z",
    "size": 13296,
    "path": "../public/_nuxt/KaTeX_Fraktur-Bold.BsDP51OF.woff"
  },
  "/_nuxt/KaTeX_Fraktur-Bold.CL6g_b3V.woff2": {
    "type": "font/woff2",
    "etag": "\"2c54-+Y+JJy7KEa5BdnLFmg+qaoiAWok\"",
    "mtime": "2026-05-03T19:23:42.991Z",
    "size": 11348,
    "path": "../public/_nuxt/KaTeX_Fraktur-Bold.CL6g_b3V.woff2"
  },
  "/_nuxt/KaTeX_Fraktur-Regular.CB_wures.ttf": {
    "type": "font/ttf",
    "etag": "\"4c74-F9tAiC3V8UBiXyjdlMQwReGJPpg\"",
    "mtime": "2026-05-03T19:23:42.992Z",
    "size": 19572,
    "path": "../public/_nuxt/KaTeX_Fraktur-Regular.CB_wures.ttf"
  },
  "/_nuxt/KaTeX_Fraktur-Regular.CTYiF6lA.woff2": {
    "type": "font/woff2",
    "etag": "\"2c34-pXZMbieE0CggwLkECJ8/rHmL5Po\"",
    "mtime": "2026-05-03T19:23:42.992Z",
    "size": 11316,
    "path": "../public/_nuxt/KaTeX_Fraktur-Regular.CTYiF6lA.woff2"
  },
  "/_nuxt/KaTeX_Fraktur-Regular.Dxdc4cR9.woff": {
    "type": "font/woff",
    "etag": "\"3398-b3VjdjYPCBW0SGL1f3let8HNTbI\"",
    "mtime": "2026-05-03T19:23:43.004Z",
    "size": 13208,
    "path": "../public/_nuxt/KaTeX_Fraktur-Regular.Dxdc4cR9.woff"
  },
  "/_nuxt/KaTeX_Main-Bold.Cx986IdX.woff2": {
    "type": "font/woff2",
    "etag": "\"62ec-MQUKGxsSP7LFnK0fdLff+Q3rj84\"",
    "mtime": "2026-05-03T19:23:42.993Z",
    "size": 25324,
    "path": "../public/_nuxt/KaTeX_Main-Bold.Cx986IdX.woff2"
  },
  "/_nuxt/KaTeX_Main-Bold.Jm3AIy58.woff": {
    "type": "font/woff",
    "etag": "\"74d8-9po2JQ6ubooCFzqZCapihCi6IGA\"",
    "mtime": "2026-05-03T19:23:42.992Z",
    "size": 29912,
    "path": "../public/_nuxt/KaTeX_Main-Bold.Jm3AIy58.woff"
  },
  "/_nuxt/KaTeX_Main-Bold.waoOVXN0.ttf": {
    "type": "font/ttf",
    "etag": "\"c888-QTqz3D/DpXUidbriyuZ+tY8rMvA\"",
    "mtime": "2026-05-03T19:23:42.993Z",
    "size": 51336,
    "path": "../public/_nuxt/KaTeX_Main-Bold.waoOVXN0.ttf"
  },
  "/_nuxt/KaTeX_Main-BoldItalic.DxDJ3AOS.woff2": {
    "type": "font/woff2",
    "etag": "\"418c-pKSQW4sSb5/9VT0hpyoMJOlIA0U\"",
    "mtime": "2026-05-03T19:23:42.993Z",
    "size": 16780,
    "path": "../public/_nuxt/KaTeX_Main-BoldItalic.DxDJ3AOS.woff2"
  },
  "/_nuxt/KaTeX_Main-BoldItalic.DzxPMmG6.ttf": {
    "type": "font/ttf",
    "etag": "\"80c8-umRk5EL9UK73Z4kkug8tlYHruwc\"",
    "mtime": "2026-05-03T19:23:42.993Z",
    "size": 32968,
    "path": "../public/_nuxt/KaTeX_Main-BoldItalic.DzxPMmG6.ttf"
  },
  "/_nuxt/KaTeX_Main-BoldItalic.SpSLRI95.woff": {
    "type": "font/woff",
    "etag": "\"4bd4-A4u9yIh6lzCtlBR/xXxv9N+0hBE\"",
    "mtime": "2026-05-03T19:23:42.993Z",
    "size": 19412,
    "path": "../public/_nuxt/KaTeX_Main-BoldItalic.SpSLRI95.woff"
  },
  "/_nuxt/KaTeX_Main-Italic.3WenGoN9.ttf": {
    "type": "font/ttf",
    "etag": "\"832c-HVZoorlK59vu/dfNaNmP6dWCXgc\"",
    "mtime": "2026-05-03T19:23:42.994Z",
    "size": 33580,
    "path": "../public/_nuxt/KaTeX_Main-Italic.3WenGoN9.ttf"
  },
  "/_nuxt/KaTeX_Main-Italic.BMLOBm91.woff": {
    "type": "font/woff",
    "etag": "\"4cdc-fIWJITvHAD4sIzS1HKQVKFiYer0\"",
    "mtime": "2026-05-03T19:23:42.994Z",
    "size": 19676,
    "path": "../public/_nuxt/KaTeX_Main-Italic.BMLOBm91.woff"
  },
  "/_nuxt/KaTeX_Main-Italic.NWA7e6Wa.woff2": {
    "type": "font/woff2",
    "etag": "\"425c-ybK1/9LyeqXGtvm6QaeytOZhAtM\"",
    "mtime": "2026-05-03T19:23:42.994Z",
    "size": 16988,
    "path": "../public/_nuxt/KaTeX_Main-Italic.NWA7e6Wa.woff2"
  },
  "/_nuxt/KaTeX_Main-Regular.B22Nviop.woff2": {
    "type": "font/woff2",
    "etag": "\"66a0-yIQIbCXOyFWBYLICb5Bu99o1cKw\"",
    "mtime": "2026-05-03T19:23:42.994Z",
    "size": 26272,
    "path": "../public/_nuxt/KaTeX_Main-Regular.B22Nviop.woff2"
  },
  "/_nuxt/KaTeX_Main-Regular.Dr94JaBh.woff": {
    "type": "font/woff",
    "etag": "\"7834-/crlS6HUY17oWlRizByX5SHP1RU\"",
    "mtime": "2026-05-03T19:23:42.994Z",
    "size": 30772,
    "path": "../public/_nuxt/KaTeX_Main-Regular.Dr94JaBh.woff"
  },
  "/_nuxt/KaTeX_Math-BoldItalic.B3XSjfu4.ttf": {
    "type": "font/ttf",
    "etag": "\"79dc-6AzEwjLSB192KlLUa+tP+9N6Xxo\"",
    "mtime": "2026-05-03T19:23:42.995Z",
    "size": 31196,
    "path": "../public/_nuxt/KaTeX_Math-BoldItalic.B3XSjfu4.ttf"
  },
  "/_nuxt/KaTeX_Main-Regular.ypZvNtVU.ttf": {
    "type": "font/ttf",
    "etag": "\"d14c-h0TbbvjDCePchfG76YBSCti3v9Q\"",
    "mtime": "2026-05-03T19:23:42.995Z",
    "size": 53580,
    "path": "../public/_nuxt/KaTeX_Main-Regular.ypZvNtVU.ttf"
  },
  "/_nuxt/KaTeX_Math-BoldItalic.CZnvNsCZ.woff2": {
    "type": "font/woff2",
    "etag": "\"4010-j8udLeZaxxoMT92YYXPbcwWS7Yo\"",
    "mtime": "2026-05-03T19:23:42.995Z",
    "size": 16400,
    "path": "../public/_nuxt/KaTeX_Math-BoldItalic.CZnvNsCZ.woff2"
  },
  "/_nuxt/KaTeX_Math-BoldItalic.iY-2wyZ7.woff": {
    "type": "font/woff",
    "etag": "\"48ec-1U5kgNbUBGxqVhmqODuqWXH7igw\"",
    "mtime": "2026-05-03T19:23:42.995Z",
    "size": 18668,
    "path": "../public/_nuxt/KaTeX_Math-BoldItalic.iY-2wyZ7.woff"
  },
  "/_nuxt/KaTeX_Math-Italic.DA0__PXp.woff": {
    "type": "font/woff",
    "etag": "\"493c-HBtIc54ctL4T3djAvCed3oUb26A\"",
    "mtime": "2026-05-03T19:23:42.995Z",
    "size": 18748,
    "path": "../public/_nuxt/KaTeX_Math-Italic.DA0__PXp.woff"
  },
  "/_nuxt/KaTeX_Math-Italic.flOr_0UB.ttf": {
    "type": "font/ttf",
    "etag": "\"7a4c-npoQ2Ppa2Iyez6SQKt3U2SWAsrw\"",
    "mtime": "2026-05-03T19:23:42.995Z",
    "size": 31308,
    "path": "../public/_nuxt/KaTeX_Math-Italic.flOr_0UB.ttf"
  },
  "/_nuxt/KaTeX_Math-Italic.t53AETM-.woff2": {
    "type": "font/woff2",
    "etag": "\"4038-20iD0M/5XstcA0EOMoOnN8Ue1gQ\"",
    "mtime": "2026-05-03T19:23:42.996Z",
    "size": 16440,
    "path": "../public/_nuxt/KaTeX_Math-Italic.t53AETM-.woff2"
  },
  "/_nuxt/KaTeX_SansSerif-Bold.CFMepnvq.ttf": {
    "type": "font/ttf",
    "etag": "\"5fb8-ILRfU0a2htUsRFdFOT0XB7uI7B0\"",
    "mtime": "2026-05-03T19:23:42.996Z",
    "size": 24504,
    "path": "../public/_nuxt/KaTeX_SansSerif-Bold.CFMepnvq.ttf"
  },
  "/_nuxt/KaTeX_SansSerif-Bold.D1sUS0GD.woff2": {
    "type": "font/woff2",
    "etag": "\"2fb8-iG5heXpSXUqvzgqvV0FP366huHM\"",
    "mtime": "2026-05-03T19:23:42.995Z",
    "size": 12216,
    "path": "../public/_nuxt/KaTeX_SansSerif-Bold.D1sUS0GD.woff2"
  },
  "/_nuxt/KaTeX_SansSerif-Bold.DbIhKOiC.woff": {
    "type": "font/woff",
    "etag": "\"3848-or7dyKPU0IAo1wd3btvU0k8uwPw\"",
    "mtime": "2026-05-03T19:23:42.996Z",
    "size": 14408,
    "path": "../public/_nuxt/KaTeX_SansSerif-Bold.DbIhKOiC.woff"
  },
  "/_nuxt/KaTeX_SansSerif-Italic.C3H0VqGB.woff2": {
    "type": "font/woff2",
    "etag": "\"2efc-PV+jyzCfjYO03L3SdyXycPYPPus\"",
    "mtime": "2026-05-03T19:23:42.996Z",
    "size": 12028,
    "path": "../public/_nuxt/KaTeX_SansSerif-Italic.C3H0VqGB.woff2"
  },
  "/_nuxt/KaTeX_SansSerif-Italic.DN2j7dab.woff": {
    "type": "font/woff",
    "etag": "\"3720-dWSjZrdv2DcEHCS+70xVgKWt1A4\"",
    "mtime": "2026-05-03T19:23:42.996Z",
    "size": 14112,
    "path": "../public/_nuxt/KaTeX_SansSerif-Italic.DN2j7dab.woff"
  },
  "/_nuxt/KaTeX_SansSerif-Italic.YYjJ1zSn.ttf": {
    "type": "font/ttf",
    "etag": "\"575c-mR+9wDFouxSkRHz6PlFfCabs/tw\"",
    "mtime": "2026-05-03T19:23:42.997Z",
    "size": 22364,
    "path": "../public/_nuxt/KaTeX_SansSerif-Italic.YYjJ1zSn.ttf"
  },
  "/_nuxt/KaTeX_SansSerif-Regular.CS6fqUqJ.woff": {
    "type": "font/woff",
    "etag": "\"301c-gEYQ9MsuLq2WlLjaLshOzo0Jw40\"",
    "mtime": "2026-05-03T19:23:42.996Z",
    "size": 12316,
    "path": "../public/_nuxt/KaTeX_SansSerif-Regular.CS6fqUqJ.woff"
  },
  "/_nuxt/KaTeX_SansSerif-Regular.BNo7hRIc.ttf": {
    "type": "font/ttf",
    "etag": "\"4bec-So4XoMtYqCKN1EF/vRuJnkHasEU\"",
    "mtime": "2026-05-03T19:23:42.997Z",
    "size": 19436,
    "path": "../public/_nuxt/KaTeX_SansSerif-Regular.BNo7hRIc.ttf"
  },
  "/_nuxt/KaTeX_SansSerif-Regular.DDBCnlJ7.woff2": {
    "type": "font/woff2",
    "etag": "\"2868-5F1fT0p/L/PcqfzMLxSOeB4j8pI\"",
    "mtime": "2026-05-03T19:23:42.997Z",
    "size": 10344,
    "path": "../public/_nuxt/KaTeX_SansSerif-Regular.DDBCnlJ7.woff2"
  },
  "/_nuxt/KaTeX_Script-Regular.C5JkGWo-.ttf": {
    "type": "font/ttf",
    "etag": "\"4108-xvZ12oGtKcvySyz3cPeVtNosZI4\"",
    "mtime": "2026-05-03T19:23:42.997Z",
    "size": 16648,
    "path": "../public/_nuxt/KaTeX_Script-Regular.C5JkGWo-.ttf"
  },
  "/_nuxt/KaTeX_Script-Regular.D3wIWfF6.woff2": {
    "type": "font/woff2",
    "etag": "\"25ac-Y7gJWfH8Voma4hugy7zTmmywg5A\"",
    "mtime": "2026-05-03T19:23:42.998Z",
    "size": 9644,
    "path": "../public/_nuxt/KaTeX_Script-Regular.D3wIWfF6.woff2"
  },
  "/_nuxt/KaTeX_Size1-Regular.C195tn64.woff": {
    "type": "font/woff",
    "etag": "\"1960-rv5mdKVlM2J8c5zXiWOY8USH4Bw\"",
    "mtime": "2026-05-03T19:23:42.997Z",
    "size": 6496,
    "path": "../public/_nuxt/KaTeX_Size1-Regular.C195tn64.woff"
  },
  "/_nuxt/KaTeX_Size1-Regular.Dbsnue_I.ttf": {
    "type": "font/ttf",
    "etag": "\"2fc4-MoC6y8sSRZcf4BAXtHTHbDN8EMk\"",
    "mtime": "2026-05-03T19:23:42.998Z",
    "size": 12228,
    "path": "../public/_nuxt/KaTeX_Size1-Regular.Dbsnue_I.ttf"
  },
  "/_nuxt/KaTeX_Size1-Regular.mCD8mA8B.woff2": {
    "type": "font/woff2",
    "etag": "\"155c-V/pZmXShvAs31fDlzIYCMC8CtXM\"",
    "mtime": "2026-05-03T19:23:42.997Z",
    "size": 5468,
    "path": "../public/_nuxt/KaTeX_Size1-Regular.mCD8mA8B.woff2"
  },
  "/_nuxt/KaTeX_Size2-Regular.B7gKUWhC.ttf": {
    "type": "font/ttf",
    "etag": "\"2cf4-+vc/8+eVGE5UMWZv+v64qg4og00\"",
    "mtime": "2026-05-03T19:23:42.998Z",
    "size": 11508,
    "path": "../public/_nuxt/KaTeX_Size2-Regular.B7gKUWhC.ttf"
  },
  "/_nuxt/KaTeX_Script-Regular.D5yQViql.woff": {
    "type": "font/woff",
    "etag": "\"295c-agXNyk8fcIXmB9w4vt71V1P4b9g\"",
    "mtime": "2026-05-03T19:23:42.997Z",
    "size": 10588,
    "path": "../public/_nuxt/KaTeX_Script-Regular.D5yQViql.woff"
  },
  "/_nuxt/KaTeX_Size2-Regular.oD1tc_U0.woff": {
    "type": "font/woff",
    "etag": "\"182c-RmmP8YGb0ngm/V0txLpOH2PKzfQ\"",
    "mtime": "2026-05-03T19:23:42.998Z",
    "size": 6188,
    "path": "../public/_nuxt/KaTeX_Size2-Regular.oD1tc_U0.woff"
  },
  "/_nuxt/KaTeX_Size2-Regular.Dy4dx90m.woff2": {
    "type": "font/woff2",
    "etag": "\"1458-7hhxNjSjvoyZcnaAhVKrGVpZj0M\"",
    "mtime": "2026-05-03T19:23:42.998Z",
    "size": 5208,
    "path": "../public/_nuxt/KaTeX_Size2-Regular.Dy4dx90m.woff2"
  },
  "/_nuxt/KaTeX_Size3-Regular.DgpXs0kz.ttf": {
    "type": "font/ttf",
    "etag": "\"1da4-MCphsuzfgtOeZ4D0K9B+5M5nuNU\"",
    "mtime": "2026-05-03T19:23:42.998Z",
    "size": 7588,
    "path": "../public/_nuxt/KaTeX_Size3-Regular.DgpXs0kz.ttf"
  },
  "/_nuxt/KaTeX_Size3-Regular.CTq5MqoE.woff": {
    "type": "font/woff",
    "etag": "\"1144-HaGQWm0dm8q5KwWd9ytSjepwi8s\"",
    "mtime": "2026-05-03T19:23:42.998Z",
    "size": 4420,
    "path": "../public/_nuxt/KaTeX_Size3-Regular.CTq5MqoE.woff"
  },
  "/_nuxt/KaTeX_Size4-Regular.BF-4gkZK.woff": {
    "type": "font/woff",
    "etag": "\"175c-j93bg1E+wiYjHr7gUHnsRfwBNXg\"",
    "mtime": "2026-05-03T19:23:42.998Z",
    "size": 5980,
    "path": "../public/_nuxt/KaTeX_Size4-Regular.BF-4gkZK.woff"
  },
  "/_nuxt/KaTeX_Size4-Regular.DWFBv043.ttf": {
    "type": "font/ttf",
    "etag": "\"287c-PY2d1YoDt6RtSX9XYeYNi4RKUZk\"",
    "mtime": "2026-05-03T19:23:43.001Z",
    "size": 10364,
    "path": "../public/_nuxt/KaTeX_Size4-Regular.DWFBv043.ttf"
  },
  "/_nuxt/KaTeX_Size4-Regular.Dl5lxZxV.woff2": {
    "type": "font/woff2",
    "etag": "\"1340-m+0X+5LyZQUB4imGLEDGQH4cVSg\"",
    "mtime": "2026-05-03T19:23:42.999Z",
    "size": 4928,
    "path": "../public/_nuxt/KaTeX_Size4-Regular.Dl5lxZxV.woff2"
  },
  "/_nuxt/KaTeX_Typewriter-Regular.C0xS9mPB.woff": {
    "type": "font/woff",
    "etag": "\"3e9c-9ecp+k/0ZvwH4MerGXmtcMRfpdU\"",
    "mtime": "2026-05-03T19:23:42.999Z",
    "size": 16028,
    "path": "../public/_nuxt/KaTeX_Typewriter-Regular.C0xS9mPB.woff"
  },
  "/_nuxt/KaTeX_Typewriter-Regular.CO6r4hn1.woff2": {
    "type": "font/woff2",
    "etag": "\"3500-egiIP//GlYxxzAGnWguZzKPktHU\"",
    "mtime": "2026-05-03T19:23:42.999Z",
    "size": 13568,
    "path": "../public/_nuxt/KaTeX_Typewriter-Regular.CO6r4hn1.woff2"
  },
  "/_nuxt/KaTeX_Typewriter-Regular.D3Ib7_Hf.ttf": {
    "type": "font/ttf",
    "etag": "\"6ba4-YpuZ+vGNl1KfIaGxAYCT5gvNBY8\"",
    "mtime": "2026-05-03T19:23:43.000Z",
    "size": 27556,
    "path": "../public/_nuxt/KaTeX_Typewriter-Regular.D3Ib7_Hf.ttf"
  },
  "/_nuxt/L36Zfy9-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f2-/y/Ponamh5P/8BEwztFePYjXx/s\"",
    "mtime": "2026-05-03T19:23:43.001Z",
    "size": 242,
    "path": "../public/_nuxt/L36Zfy9-.js"
  },
  "/_nuxt/LPt4JShQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9f0-nlKmVNJQ426uoMLVyp4/bh0Ap/w\"",
    "mtime": "2026-05-03T19:23:43.001Z",
    "size": 2544,
    "path": "../public/_nuxt/LPt4JShQ.js"
  },
  "/_nuxt/NEzCPd0_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7fb-W08BUoNifneODcH9k+YndN6XTM4\"",
    "mtime": "2026-05-03T19:23:43.000Z",
    "size": 2043,
    "path": "../public/_nuxt/NEzCPd0_.js"
  },
  "/_nuxt/Lh0-TNby.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5b8d-Gx8gAg5Rwm+S0b96mZs/khSPo+E\"",
    "mtime": "2026-05-03T19:23:43.002Z",
    "size": 23437,
    "path": "../public/_nuxt/Lh0-TNby.js"
  },
  "/_nuxt/ProsePre.D5orA6B_.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"1e-jczvRAVUXbzGL6yotozKFbyMO4s\"",
    "mtime": "2026-05-03T19:23:43.002Z",
    "size": 30,
    "path": "../public/_nuxt/ProsePre.D5orA6B_.css"
  },
  "/_nuxt/OpfURP3Z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6f5b-19nkFgg6HHDY8zk+ZwaOEuOXgQA\"",
    "mtime": "2026-05-03T19:23:43.001Z",
    "size": 28507,
    "path": "../public/_nuxt/OpfURP3Z.js"
  },
  "/_nuxt/PjGgHK8p.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"be-0yb2twOy0zzosLT6Pmbt0T80ouc\"",
    "mtime": "2026-05-03T19:23:43.003Z",
    "size": 190,
    "path": "../public/_nuxt/PjGgHK8p.js"
  },
  "/_nuxt/N_ZAJAZL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14aec-fccKj5kw+lOhgXdGRsbp1abWy5A\"",
    "mtime": "2026-05-03T19:23:43.002Z",
    "size": 84716,
    "path": "../public/_nuxt/N_ZAJAZL.js"
  },
  "/_nuxt/PxXH6w1v.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"dbf-7AwSGnbzML8SzmSAMpJbzBMSBt8\"",
    "mtime": "2026-05-03T19:23:43.003Z",
    "size": 3519,
    "path": "../public/_nuxt/PxXH6w1v.js"
  },
  "/_nuxt/Q-w0RoM0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e3b-/wHGB3ZnJLjM5UcsYc4A8Uvdm1s\"",
    "mtime": "2026-05-03T19:23:43.002Z",
    "size": 20027,
    "path": "../public/_nuxt/Q-w0RoM0.js"
  },
  "/_nuxt/S0aV2fph.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5f8d-5i4Y/ESf7Lp3dm4R07bD997rOm0\"",
    "mtime": "2026-05-03T19:23:43.002Z",
    "size": 24461,
    "path": "../public/_nuxt/S0aV2fph.js"
  },
  "/_nuxt/SPtIGHXB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d51-HGVwGKFLgig6qVIJAlL0/J6XiP4\"",
    "mtime": "2026-05-03T19:23:43.003Z",
    "size": 15697,
    "path": "../public/_nuxt/SPtIGHXB.js"
  },
  "/_nuxt/QwPmfbRP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17e0c-ql3ufkIWuMWEHvy6r+Pss2jriZY\"",
    "mtime": "2026-05-03T19:23:43.003Z",
    "size": 97804,
    "path": "../public/_nuxt/QwPmfbRP.js"
  },
  "/_nuxt/ScTyU-xG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"480-FO1LnIepswNqdHprLhj9nFEvEY4\"",
    "mtime": "2026-05-03T19:23:43.003Z",
    "size": 1152,
    "path": "../public/_nuxt/ScTyU-xG.js"
  },
  "/_nuxt/U0CatBKT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3683-M3uCEGZHp78uIVn88Lo2Rcso/ZI\"",
    "mtime": "2026-05-03T19:23:43.003Z",
    "size": 13955,
    "path": "../public/_nuxt/U0CatBKT.js"
  },
  "/_nuxt/_...CQduchpy.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"18a-fh6xk/UPLzsp7mGtRDE2RRhPBiI\"",
    "mtime": "2026-05-03T19:23:43.004Z",
    "size": 394,
    "path": "../public/_nuxt/_...CQduchpy.css"
  },
  "/_nuxt/XzK34etb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8dc7-0lOChe7O1VK7quoXPyKp5+5FKPI\"",
    "mtime": "2026-05-03T19:23:43.004Z",
    "size": 36295,
    "path": "../public/_nuxt/XzK34etb.js"
  },
  "/_nuxt/_channelId_.8h4jP46l.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"56a-fVDy66O0f22vM3x4flAdI/Rfvwo\"",
    "mtime": "2026-05-03T19:23:43.004Z",
    "size": 1386,
    "path": "../public/_nuxt/_channelId_.8h4jP46l.css"
  },
  "/_nuxt/Z_-oVHW2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"77b5-jfNtoFaCMkc29HDLM7R+9UTRcrk\"",
    "mtime": "2026-05-03T19:23:43.004Z",
    "size": 30645,
    "path": "../public/_nuxt/Z_-oVHW2.js"
  },
  "/_nuxt/UKyzwWE3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"df5-nQLrr9kEzxPZniOT6RWl+SfrPPA\"",
    "mtime": "2026-05-03T19:23:43.025Z",
    "size": 3573,
    "path": "../public/_nuxt/UKyzwWE3.js"
  },
  "/_nuxt/WQww-x5r.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d8c-yKgc4NenJ+uguQv8vm3OsDqkjxE\"",
    "mtime": "2026-05-03T19:23:43.003Z",
    "size": 3468,
    "path": "../public/_nuxt/WQww-x5r.js"
  },
  "/_nuxt/_id_.CCP5_K2T.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"3b5-8hzDMcJJ2vB1Czgyp/o2MvAta7o\"",
    "mtime": "2026-05-03T19:23:43.004Z",
    "size": 949,
    "path": "../public/_nuxt/_id_.CCP5_K2T.css"
  },
  "/_nuxt/_id_.CuhCacHm.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"962-o0EaSkLrUsa8TNXUlL9aH7NzG3U\"",
    "mtime": "2026-05-03T19:23:43.004Z",
    "size": 2402,
    "path": "../public/_nuxt/_id_.CuhCacHm.css"
  },
  "/_nuxt/_pageId_.TSmt3EE5.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"d04-ve9C0dr1f0x0jNzYvx+0pVDn6eM\"",
    "mtime": "2026-05-03T19:23:43.004Z",
    "size": 3332,
    "path": "../public/_nuxt/_pageId_.TSmt3EE5.css"
  },
  "/_nuxt/_slug_.ZyRvv2wr.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"1b8bc-QbVNnAHidtEPzfM5pcjRQPeMAzI\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 112828,
    "path": "../public/_nuxt/_slug_.ZyRvv2wr.css"
  },
  "/_nuxt/bjX6qDj3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f21-w/uJSuP5l7d456cdzAi/Zs3LB1U\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 7969,
    "path": "../public/_nuxt/bjX6qDj3.js"
  },
  "/_nuxt/default.DC0EPNt8.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"323-1QZoMMJ7GhNVqdMP92e1z2WHtm0\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 803,
    "path": "../public/_nuxt/default.DC0EPNt8.css"
  },
  "/_nuxt/dbnjjeMz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15f7-HCOdbr1lRmo/BaSsX5F2zyh6bV4\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 5623,
    "path": "../public/_nuxt/dbnjjeMz.js"
  },
  "/_nuxt/c1Ur5n1I.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ec1-AwyUsQaRn2UMk09brW0dSQAGZsM\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 3777,
    "path": "../public/_nuxt/c1Ur5n1I.js"
  },
  "/_nuxt/entry.BuZaOyRF.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"79811-kzPsK3OpYGuSVoG64I4dCsyGaU0\"",
    "mtime": "2026-05-03T19:23:43.011Z",
    "size": 497681,
    "path": "../public/_nuxt/entry.BuZaOyRF.css"
  },
  "/_nuxt/error-404.Cfot0e28.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"97e-w12XqNyjPwuukMCU4cHxhBAmCLg\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 2430,
    "path": "../public/_nuxt/error-404.Cfot0e28.css"
  },
  "/_nuxt/error-500.CfUHgHuq.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"773-MbZ+S3Avkt7B1kmiSMItihpZ6C0\"",
    "mtime": "2026-05-03T19:23:43.025Z",
    "size": 1907,
    "path": "../public/_nuxt/error-500.CfUHgHuq.css"
  },
  "/_nuxt/graph.CIOvrXpX.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"189-xxLUWEldzJO0pyzeojXAVpTH56o\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 393,
    "path": "../public/_nuxt/graph.CIOvrXpX.css"
  },
  "/_nuxt/epSzVYIv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"56-UXNngIfIQ8lgfxx0qkyeK7r3G8E\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 86,
    "path": "../public/_nuxt/epSzVYIv.js"
  },
  "/_nuxt/ds7CbTOS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1123c-/LExMVeGPZm4JPXDl2JMvK/TQE8\"",
    "mtime": "2026-05-03T19:23:43.007Z",
    "size": 70204,
    "path": "../public/_nuxt/ds7CbTOS.js"
  },
  "/_nuxt/index.CNjPp95z.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"b1-YG/qA0STMbSqo0M6ZQGtvkqoewM\"",
    "mtime": "2026-05-03T19:23:43.008Z",
    "size": 177,
    "path": "../public/_nuxt/index.CNjPp95z.css"
  },
  "/_nuxt/index.mhmSUvAP.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"c6-N5lSi4zPptzUyOiO0T5QiOroAqs\"",
    "mtime": "2026-05-03T19:23:43.008Z",
    "size": 198,
    "path": "../public/_nuxt/index.mhmSUvAP.css"
  },
  "/_nuxt/h9XEuvDi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e7c-w2IMBvG/NCqVqy1k2Fpxc0QcXOk\"",
    "mtime": "2026-05-03T19:23:43.005Z",
    "size": 3708,
    "path": "../public/_nuxt/h9XEuvDi.js"
  },
  "/_nuxt/hHQRftuo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e6-TLAVNts5F/OpOXazLldrBHfDVvU\"",
    "mtime": "2026-05-03T19:23:43.007Z",
    "size": 1254,
    "path": "../public/_nuxt/hHQRftuo.js"
  },
  "/_nuxt/iJ87EjaH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c3-iTztLapgMs2hbW6STwbjEE+I+/8\"",
    "mtime": "2026-05-03T19:23:43.007Z",
    "size": 707,
    "path": "../public/_nuxt/iJ87EjaH.js"
  },
  "/_nuxt/jcF97zxb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ec05-Lg/WU5ea9E9ZlPqp4OOOX1XrMPQ\"",
    "mtime": "2026-05-03T19:23:43.009Z",
    "size": 60421,
    "path": "../public/_nuxt/jcF97zxb.js"
  },
  "/_nuxt/kK522ATq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4a6f-H2Ww78iPBaq30R9r8EXFJkFOcNI\"",
    "mtime": "2026-05-03T19:23:43.009Z",
    "size": 19055,
    "path": "../public/_nuxt/kK522ATq.js"
  },
  "/_nuxt/kOzJRHvN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"341-+D8gBU2PCP7ypMKC9fA2bL9qpFY\"",
    "mtime": "2026-05-03T19:23:43.010Z",
    "size": 833,
    "path": "../public/_nuxt/kOzJRHvN.js"
  },
  "/_nuxt/kmRkaAut.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30ae-uhdiWupWAqr6aqyAG4YD/B2ce5Q\"",
    "mtime": "2026-05-03T19:23:43.010Z",
    "size": 12462,
    "path": "../public/_nuxt/kmRkaAut.js"
  },
  "/_nuxt/kbbIsuBX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4eec-TYIIUaW4uynZhDgFMtT2Jdd+JqI\"",
    "mtime": "2026-05-03T19:23:43.025Z",
    "size": 20204,
    "path": "../public/_nuxt/kbbIsuBX.js"
  },
  "/_nuxt/mv_9fgmW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2888-MYLFZwOeKw15zZNrGFCg4jPutFc\"",
    "mtime": "2026-05-03T19:23:43.010Z",
    "size": 10376,
    "path": "../public/_nuxt/mv_9fgmW.js"
  },
  "/_nuxt/nMGQmk4m.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"200d-AD53S6aqA8jbSnV67iqzImBKaZc\"",
    "mtime": "2026-05-03T19:23:43.010Z",
    "size": 8205,
    "path": "../public/_nuxt/nMGQmk4m.js"
  },
  "/_nuxt/SIUqfyIL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ad6ed-66JUcG+ZgBItXc3/i6WzPLIBZHQ\"",
    "mtime": "2026-05-03T19:23:43.026Z",
    "size": 2807533,
    "path": "../public/_nuxt/SIUqfyIL.js"
  },
  "/_nuxt/ndkjpHlW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b61-0ozHpE5eFCzrZADFQtVCmaGBR14\"",
    "mtime": "2026-05-03T19:23:43.010Z",
    "size": 2913,
    "path": "../public/_nuxt/ndkjpHlW.js"
  },
  "/_nuxt/oSO9mRNw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5c38-JT9fbQJzAdzfysj+Tlv4hhLnFEc\"",
    "mtime": "2026-05-03T19:23:43.011Z",
    "size": 23608,
    "path": "../public/_nuxt/oSO9mRNw.js"
  },
  "/_nuxt/onboarding.BG7ApHth.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"2c3-DB/DQxZIpn4r4EugUJvbL0ex5fU\"",
    "mtime": "2026-05-03T19:23:43.011Z",
    "size": 707,
    "path": "../public/_nuxt/onboarding.BG7ApHth.css"
  },
  "/_nuxt/onboarding.ey9BOFnf.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"398-BJWOuWTVFzrxYETX0eeilBrpIPw\"",
    "mtime": "2026-05-03T19:23:43.011Z",
    "size": 920,
    "path": "../public/_nuxt/onboarding.ey9BOFnf.css"
  },
  "/_nuxt/od-uhD62.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ba-Xw7OD5blxLEJwyaOElrb+mbq6Xs\"",
    "mtime": "2026-05-03T19:23:43.011Z",
    "size": 186,
    "path": "../public/_nuxt/od-uhD62.js"
  },
  "/_nuxt/qXJS63Fc.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5e13-ZXQlfCS8T7D29cCx3j9/G6YFVE4\"",
    "mtime": "2026-05-03T19:23:43.012Z",
    "size": 24083,
    "path": "../public/_nuxt/qXJS63Fc.js"
  },
  "/_nuxt/r49yGAm9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5050-n7CH6qw3zAS9g0v/TkQMwfiVuFA\"",
    "mtime": "2026-05-03T19:23:43.012Z",
    "size": 20560,
    "path": "../public/_nuxt/r49yGAm9.js"
  },
  "/_nuxt/sEFBKHbs.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3cd-wwNIK9S7BzIUVGm+P1mehfVUEqU\"",
    "mtime": "2026-05-03T19:23:43.012Z",
    "size": 973,
    "path": "../public/_nuxt/sEFBKHbs.js"
  },
  "/_nuxt/sqlite3-opfs-async-proxy-C_otN2ZJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24eb-/FBLK7guMdffqRNvJNbJgk4Zwss\"",
    "mtime": "2026-05-03T19:23:43.012Z",
    "size": 9451,
    "path": "../public/_nuxt/sqlite3-opfs-async-proxy-C_otN2ZJ.js"
  },
  "/_nuxt/sqlite3-worker1-bundler-friendly-Bv6ABw9v.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30103-GOxHNTh2sTNh/exLYlR0tZpazpY\"",
    "mtime": "2026-05-03T19:23:43.015Z",
    "size": 196867,
    "path": "../public/_nuxt/sqlite3-worker1-bundler-friendly-Bv6ABw9v.js"
  },
  "/_nuxt/t_0fm5Vi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1619-rZ6hqjIXXrbhOnd0cQyo20rP7sE\"",
    "mtime": "2026-05-03T19:23:43.017Z",
    "size": 5657,
    "path": "../public/_nuxt/t_0fm5Vi.js"
  },
  "/_nuxt/tinGLxe7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d6-7GDwXYfZg6vDPqR3w17AExcfYEc\"",
    "mtime": "2026-05-03T19:23:43.024Z",
    "size": 214,
    "path": "../public/_nuxt/tinGLxe7.js"
  },
  "/_nuxt/tv6RD-6E.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"187-8F36cCj7WWXP4RTdx1QN0zAOHjo\"",
    "mtime": "2026-05-03T19:23:43.024Z",
    "size": 391,
    "path": "../public/_nuxt/tv6RD-6E.js"
  },
  "/_nuxt/v8-BOyKD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3c28-53Hh6NjlHCKHf/OnkaF2ha5E9bU\"",
    "mtime": "2026-05-03T19:23:43.024Z",
    "size": 15400,
    "path": "../public/_nuxt/v8-BOyKD.js"
  },
  "/_nuxt/wx-5KP3r.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"842f-5JBxfxHpQQOGIPH2Q1DeQeKCiI4\"",
    "mtime": "2026-05-03T19:23:43.024Z",
    "size": 33839,
    "path": "../public/_nuxt/wx-5KP3r.js"
  },
  "/_nuxt/x--rFLnC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1440-saTo3ng8SZKGdbeBQPLVrHr+p4c\"",
    "mtime": "2026-05-03T19:23:43.024Z",
    "size": 5184,
    "path": "../public/_nuxt/x--rFLnC.js"
  },
  "/__nuxt_content/docs/sql_dump.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"76028-F86bn3AMkZEc6BN1AWORlnSOOHU\"",
    "mtime": "2026-05-03T19:23:39.714Z",
    "size": 483368,
    "path": "../public/__nuxt_content/docs/sql_dump.txt"
  },
  "/_nuxt/sqlite3-DBpDb1lf.wasm": {
    "type": "application/wasm",
    "etag": "\"d117f-DZ/FD4oW3SqSLEuDOEQ4+vXRNGQ\"",
    "mtime": "2026-05-03T19:23:43.022Z",
    "size": 856447,
    "path": "../public/_nuxt/sqlite3-DBpDb1lf.wasm"
  },
  "/_nuxt/sqlite3.DBpDb1lf.wasm": {
    "type": "application/wasm",
    "etag": "\"d117f-DZ/FD4oW3SqSLEuDOEQ4+vXRNGQ\"",
    "mtime": "2026-05-03T19:23:43.023Z",
    "size": 856447,
    "path": "../public/_nuxt/sqlite3.DBpDb1lf.wasm"
  },
  "/_nuxt/tfO458ux.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a966f-yuqQZaLWX5YNl7X+U7bYVMvs7AQ\"",
    "mtime": "2026-05-03T19:23:43.024Z",
    "size": 693871,
    "path": "../public/_nuxt/tfO458ux.js"
  },
  "/assets/backgrounds/chemical-plant.png": {
    "type": "image/png",
    "etag": "\"1abdd2-rNJpdaVPAwkjSBjXRzceyBKzKEU\"",
    "mtime": "2026-05-03T19:23:43.127Z",
    "size": 1752530,
    "path": "../public/assets/backgrounds/chemical-plant.png"
  },
  "/assets/backgrounds/bridge.png": {
    "type": "image/png",
    "etag": "\"1b77a1-nq4WV4seqWETgLifssYuw/86mKo\"",
    "mtime": "2026-05-03T19:23:43.129Z",
    "size": 1800097,
    "path": "../public/assets/backgrounds/bridge.png"
  },
  "/assets/icons/alarm-info.png": {
    "type": "image/png",
    "etag": "\"eeb1-YUuc2aX1OWWlNVdYyaEcodlJEyk\"",
    "mtime": "2026-05-03T19:23:43.111Z",
    "size": 61105,
    "path": "../public/assets/icons/alarm-info.png"
  },
  "/assets/icons/alarm-success.png": {
    "type": "image/png",
    "etag": "\"f2fe-GiW2tSky3Yv5Cs+hiDonhadbF9E\"",
    "mtime": "2026-05-03T19:23:43.205Z",
    "size": 62206,
    "path": "../public/assets/icons/alarm-success.png"
  },
  "/assets/icons/alarm-warning.png": {
    "type": "image/png",
    "etag": "\"f861-vzMjPy2lNR7fkAkA3hbooTUwvdQ\"",
    "mtime": "2026-05-03T19:23:43.203Z",
    "size": 63585,
    "path": "../public/assets/icons/alarm-warning.png"
  },
  "/assets/icons/calendar.png": {
    "type": "image/png",
    "etag": "\"227fd-0tzYYTpYzFHk2qAXquzDoOp4cKw\"",
    "mtime": "2026-05-03T19:23:43.206Z",
    "size": 141309,
    "path": "../public/assets/icons/calendar.png"
  },
  "/assets/icons/coal.png": {
    "type": "image/png",
    "etag": "\"b8aa-8rrjR87hqSPfRGkmDc1RJMPlHMc\"",
    "mtime": "2026-05-03T19:23:43.222Z",
    "size": 47274,
    "path": "../public/assets/icons/coal.png"
  },
  "/assets/icons/chemical.png": {
    "type": "image/png",
    "etag": "\"a59e-eo0+5NecbcV1tqX+MVpDfWTl0l8\"",
    "mtime": "2026-05-03T19:23:43.207Z",
    "size": 42398,
    "path": "../public/assets/icons/chemical.png"
  },
  "/assets/icons/corner.png": {
    "type": "image/png",
    "etag": "\"5636-NGsylvagMgU9gRPIcacglsi8mqQ\"",
    "mtime": "2026-05-03T19:23:43.207Z",
    "size": 22070,
    "path": "../public/assets/icons/corner.png"
  },
  "/assets/icons/crane.png": {
    "type": "image/png",
    "etag": "\"3dc22-H5kGsyjgkKerh2tgDuPlWYBdN8g\"",
    "mtime": "2026-05-03T19:23:43.226Z",
    "size": 252962,
    "path": "../public/assets/icons/crane.png"
  },
  "/assets/icons/drums-products.png": {
    "type": "image/png",
    "etag": "\"1af82-X++X8mXywT4v3Adn7Gm9SMWr2OE\"",
    "mtime": "2026-05-03T19:23:43.237Z",
    "size": 110466,
    "path": "../public/assets/icons/drums-products.png"
  },
  "/assets/icons/exceeding.png": {
    "type": "image/png",
    "etag": "\"b980-EwE+TlxgE8bGIxJHj3QjmPqucR8\"",
    "mtime": "2026-05-03T19:23:43.247Z",
    "size": 47488,
    "path": "../public/assets/icons/exceeding.png"
  },
  "/assets/backgrounds/crane-signal.png": {
    "type": "image/png",
    "etag": "\"2741fc-kJOjddFKjFaxxqsmkPnT/l3dh6Y\"",
    "mtime": "2026-05-03T19:23:43.135Z",
    "size": 2572796,
    "path": "../public/assets/backgrounds/crane-signal.png"
  },
  "/assets/icons/drum-storage.png": {
    "type": "image/png",
    "etag": "\"d50ad-f9KNCiMuXba7Ruu/qWz+UbynJKI\"",
    "mtime": "2026-05-03T19:23:43.243Z",
    "size": 872621,
    "path": "../public/assets/icons/drum-storage.png"
  },
  "/assets/icons/exemption.png": {
    "type": "image/png",
    "etag": "\"21901-Id613Eqwhndp6as3Ss76itEgf7E\"",
    "mtime": "2026-05-03T19:23:43.234Z",
    "size": 137473,
    "path": "../public/assets/icons/exemption.png"
  },
  "/assets/backgrounds/mining.png": {
    "type": "image/png",
    "etag": "\"1f366e-0U8wZEGMJjQbWqYUqvz2PT/EA9U\"",
    "mtime": "2026-05-03T19:23:43.200Z",
    "size": 2045550,
    "path": "../public/assets/backgrounds/mining.png"
  },
  "/assets/backgrounds/copper-smelter.png": {
    "type": "image/png",
    "etag": "\"37d876-nZ/ZwrjbFXfEZ2Pz0VRwwdX0G04\"",
    "mtime": "2026-05-03T19:23:43.143Z",
    "size": 3659894,
    "path": "../public/assets/backgrounds/copper-smelter.png"
  },
  "/assets/icons/chemical-plant.png": {
    "type": "image/png",
    "etag": "\"1abdd2-rNJpdaVPAwkjSBjXRzceyBKzKEU\"",
    "mtime": "2026-05-03T19:23:43.226Z",
    "size": 1752530,
    "path": "../public/assets/icons/chemical-plant.png"
  },
  "/assets/icons/bridge.png": {
    "type": "image/png",
    "etag": "\"1b77a1-nq4WV4seqWETgLifssYuw/86mKo\"",
    "mtime": "2026-05-03T19:23:43.219Z",
    "size": 1800097,
    "path": "../public/assets/icons/bridge.png"
  },
  "/assets/backgrounds/industrial-facility.png": {
    "type": "image/png",
    "etag": "\"2008d6-120ckIia5L01CyzDjnW5EMKhY+A\"",
    "mtime": "2026-05-03T19:23:43.184Z",
    "size": 2099414,
    "path": "../public/assets/backgrounds/industrial-facility.png"
  },
  "/assets/backgrounds/factory-by-river.png": {
    "type": "image/png",
    "etag": "\"2fc339-n8Fy3JZUARInWCSHU8tclR6QXIc\"",
    "mtime": "2026-05-03T19:23:43.154Z",
    "size": 3130169,
    "path": "../public/assets/backgrounds/factory-by-river.png"
  },
  "/assets/icons/furnace-molten.png": {
    "type": "image/png",
    "etag": "\"20a1e-QxjiMe5l0UODdBYWT+qJFRYCzjk\"",
    "mtime": "2026-05-03T19:23:43.240Z",
    "size": 133662,
    "path": "../public/assets/icons/furnace-molten.png"
  },
  "/assets/icons/gap-filling.png": {
    "type": "image/png",
    "etag": "\"15e4a-nVFRtnkg53BL3GNtgZm0MOLXq+k\"",
    "mtime": "2026-05-03T19:23:43.238Z",
    "size": 89674,
    "path": "../public/assets/icons/gap-filling.png"
  },
  "/assets/icons/man.png": {
    "type": "image/png",
    "etag": "\"ee62-N9Q+YkT7Ds+OdqpAMRk3dLpfH78\"",
    "mtime": "2026-05-03T19:23:43.246Z",
    "size": 61026,
    "path": "../public/assets/icons/man.png"
  },
  "/assets/backgrounds/power-plant.png": {
    "type": "image/png",
    "etag": "\"21dd97-ErZlHxSqFgvRSWRC87max6cSIhM\"",
    "mtime": "2026-05-03T19:23:43.226Z",
    "size": 2219415,
    "path": "../public/assets/backgrounds/power-plant.png"
  },
  "/assets/icons/man_icon.png": {
    "type": "image/png",
    "etag": "\"2031-/AVVQoTalj2ufLvj6OJTeUhfP40\"",
    "mtime": "2026-05-03T19:23:43.246Z",
    "size": 8241,
    "path": "../public/assets/icons/man_icon.png"
  },
  "/assets/icons/notexceeding.png": {
    "type": "image/png",
    "etag": "\"85b6-x/LMzvPlMEZNqdRvqe9wIaahHj4\"",
    "mtime": "2026-05-03T19:23:43.276Z",
    "size": 34230,
    "path": "../public/assets/icons/notexceeding.png"
  },
  "/assets/icons/crane-signal.png": {
    "type": "image/png",
    "etag": "\"2741fc-kJOjddFKjFaxxqsmkPnT/l3dh6Y\"",
    "mtime": "2026-05-03T19:23:43.229Z",
    "size": 2572796,
    "path": "../public/assets/icons/crane-signal.png"
  },
  "/assets/icons/progress.png": {
    "type": "image/png",
    "etag": "\"a74e-Gg64Gg7sHKEvh4lNWNRO5O1IjxA\"",
    "mtime": "2026-05-03T19:23:43.322Z",
    "size": 42830,
    "path": "../public/assets/icons/progress.png"
  },
  "/assets/icons/questionnaire.png": {
    "type": "image/png",
    "etag": "\"fd87-8+snwpGcJrea0T8RjypOUxGVyp0\"",
    "mtime": "2026-05-03T19:23:43.372Z",
    "size": 64903,
    "path": "../public/assets/icons/questionnaire.png"
  },
  "/assets/icons/regen-icon.png": {
    "type": "image/png",
    "etag": "\"1d395-hHvh5EA+TFRoJPHai1aJw0CWrMA\"",
    "mtime": "2026-05-03T19:23:43.309Z",
    "size": 119701,
    "path": "../public/assets/icons/regen-icon.png"
  },
  "/assets/icons/drums-below-threshold.png": {
    "type": "image/png",
    "etag": "\"2ddae8-0XzM66X1pW98dR3FgurtPrAIbz0\"",
    "mtime": "2026-05-03T19:23:43.294Z",
    "size": 3005160,
    "path": "../public/assets/icons/drums-below-threshold.png"
  },
  "/assets/icons/release-review.png": {
    "type": "image/png",
    "etag": "\"114b2-I6zVOw+Z35s3S09o7KwsyttNGsk\"",
    "mtime": "2026-05-03T19:23:43.332Z",
    "size": 70834,
    "path": "../public/assets/icons/release-review.png"
  },
  "/assets/icons/products-bg2.png": {
    "type": "image/png",
    "etag": "\"f8c57-/oxilu/wMM7EjxvOv4ezkVNg2Fw\"",
    "mtime": "2026-05-03T19:23:43.353Z",
    "size": 1018967,
    "path": "../public/assets/icons/products-bg2.png"
  },
  "/assets/icons/copper-smelter.png": {
    "type": "image/png",
    "etag": "\"37d876-nZ/ZwrjbFXfEZ2Pz0VRwwdX0G04\"",
    "mtime": "2026-05-03T19:23:43.275Z",
    "size": 3659894,
    "path": "../public/assets/icons/copper-smelter.png"
  },
  "/assets/icons/release.png": {
    "type": "image/png",
    "etag": "\"1a612-6loK3WY6VX1eg6R8xwdOMDtGOFo\"",
    "mtime": "2026-05-03T19:23:43.339Z",
    "size": 108050,
    "path": "../public/assets/icons/release.png"
  },
  "/assets/icons/review.png": {
    "type": "image/png",
    "etag": "\"22024-NPcEL0a+jIpBrt9BNmxC564fOeU\"",
    "mtime": "2026-05-03T19:23:43.346Z",
    "size": 139300,
    "path": "../public/assets/icons/review.png"
  },
  "/assets/icons/robothand.png": {
    "type": "image/png",
    "etag": "\"bb89-FLHDspIRaOY/IfjVH1RbkjvREh4\"",
    "mtime": "2026-05-03T19:23:43.348Z",
    "size": 48009,
    "path": "../public/assets/icons/robothand.png"
  },
  "/assets/icons/robothand_icon.png": {
    "type": "image/png",
    "etag": "\"199d-W79KMY3AJW1JlTeNj2ZkDj4FLkA\"",
    "mtime": "2026-05-03T19:23:43.352Z",
    "size": 6557,
    "path": "../public/assets/icons/robothand_icon.png"
  },
  "/assets/icons/sparkles.png": {
    "type": "image/png",
    "etag": "\"4f80-4q6qSGVy0nLg2AZROuH+U39pSOw\"",
    "mtime": "2026-05-03T19:23:43.353Z",
    "size": 20352,
    "path": "../public/assets/icons/sparkles.png"
  },
  "/assets/icons/mining.png": {
    "type": "image/png",
    "etag": "\"1f366e-0U8wZEGMJjQbWqYUqvz2PT/EA9U\"",
    "mtime": "2026-05-03T19:23:43.273Z",
    "size": 2045550,
    "path": "../public/assets/icons/mining.png"
  },
  "/assets/icons/sparkles2.png": {
    "type": "image/png",
    "etag": "\"29ea-jCTexUqfz6mlEliJenvFF3mnfkA\"",
    "mtime": "2026-05-03T19:23:43.354Z",
    "size": 10730,
    "path": "../public/assets/icons/sparkles2.png"
  },
  "/assets/icons/sparkles1.png": {
    "type": "image/png",
    "etag": "\"2653-TKqGUPd6NjRss0VZ8k2fv/FSnoo\"",
    "mtime": "2026-05-03T19:23:43.354Z",
    "size": 9811,
    "path": "../public/assets/icons/sparkles1.png"
  },
  "/assets/icons/ufo.png": {
    "type": "image/png",
    "etag": "\"13469-lCl4mtspr17qz2ASifVGb7tMhOM\"",
    "mtime": "2026-05-03T19:23:43.362Z",
    "size": 78953,
    "path": "../public/assets/icons/ufo.png"
  },
  "/assets/icons/threshold.png": {
    "type": "image/png",
    "etag": "\"25dbb-xpb7H51DcqlnDql/ABHP0J4UGD0\"",
    "mtime": "2026-05-03T19:23:43.367Z",
    "size": 155067,
    "path": "../public/assets/icons/threshold.png"
  },
  "/assets/icons/ufo_icon.png": {
    "type": "image/png",
    "etag": "\"2415-nzalCejRvZjE9sH4UgK4Znji/9g\"",
    "mtime": "2026-05-03T19:23:43.366Z",
    "size": 9237,
    "path": "../public/assets/icons/ufo_icon.png"
  },
  "/assets/icons/woman.png": {
    "type": "image/png",
    "etag": "\"ad1d-C34WQUZWsmhGw8WOQdzd0O8R4qg\"",
    "mtime": "2026-05-03T19:23:43.365Z",
    "size": 44317,
    "path": "../public/assets/icons/woman.png"
  },
  "/assets/icons/woman_icon.png": {
    "type": "image/png",
    "etag": "\"23e3-3xgmJ+CQBLR77vCdqk/CGeMmSOs\"",
    "mtime": "2026-05-03T19:23:43.355Z",
    "size": 9187,
    "path": "../public/assets/icons/woman_icon.png"
  },
  "/assets/icons/industrial-facility.png": {
    "type": "image/png",
    "etag": "\"2008d6-120ckIia5L01CyzDjnW5EMKhY+A\"",
    "mtime": "2026-05-03T19:23:43.426Z",
    "size": 2099414,
    "path": "../public/assets/icons/industrial-facility.png"
  },
  "/assets/icons/products-bg.png": {
    "type": "image/png",
    "etag": "\"25b5fc-gre2mp+sun6cEed9YemsGWl0sG4\"",
    "mtime": "2026-05-03T19:23:43.399Z",
    "size": 2471420,
    "path": "../public/assets/icons/products-bg.png"
  },
  "/assets/icons/woman_square.png": {
    "type": "image/png",
    "etag": "\"eddf-qRqOifh/HMs5kuT4lH+jdKchQik\"",
    "mtime": "2026-05-03T19:23:43.362Z",
    "size": 60895,
    "path": "../public/assets/icons/woman_square.png"
  },
  "/assets/icons/power-plant.png": {
    "type": "image/png",
    "etag": "\"21dd97-ErZlHxSqFgvRSWRC87max6cSIhM\"",
    "mtime": "2026-05-03T19:23:43.372Z",
    "size": 2219415,
    "path": "../public/assets/icons/power-plant.png"
  },
  "/sounds/sfx/.DS_Store": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1804-3y++sUAKzaCQmjLBz2v0kvESHgc\"",
    "mtime": "2026-05-03T19:23:43.042Z",
    "size": 6148,
    "path": "../public/sounds/sfx/.DS_Store"
  },
  "/sounds/sfx/Bing.wav": {
    "type": "audio/wav",
    "etag": "\"1b7cc-sZvOOby09ZeXGGcxj/8MPdGo6Dc\"",
    "mtime": "2026-05-03T19:23:43.044Z",
    "size": 112588,
    "path": "../public/sounds/sfx/Bing.wav"
  },
  "/sounds/sfx/Border.wav": {
    "type": "audio/wav",
    "etag": "\"61a0-vEvQfiTVaI7LqYuplw9vGqDwmJI\"",
    "mtime": "2026-05-03T19:23:43.043Z",
    "size": 24992,
    "path": "../public/sounds/sfx/Border.wav"
  },
  "/assets/icons/factory-by-river.png": {
    "type": "image/png",
    "etag": "\"2fc339-n8Fy3JZUARInWCSHU8tclR6QXIc\"",
    "mtime": "2026-05-03T19:23:43.285Z",
    "size": 3130169,
    "path": "../public/assets/icons/factory-by-river.png"
  },
  "/sounds/sfx/Controller.wav": {
    "type": "audio/wav",
    "etag": "\"794fc-1jSjh59cS4miHsKfdNrL2p5WQvg\"",
    "mtime": "2026-05-03T19:23:43.052Z",
    "size": 496892,
    "path": "../public/sounds/sfx/Controller.wav"
  },
  "/sounds/sfx/Dada 0.wav": {
    "type": "audio/wav",
    "etag": "\"78abc-iJh93UJHTGMfYDneNUxzV8CkfqA\"",
    "mtime": "2026-05-03T19:23:43.052Z",
    "size": 494268,
    "path": "../public/sounds/sfx/Dada 0.wav"
  },
  "/sounds/sfx/Dada 1.wav": {
    "type": "audio/wav",
    "etag": "\"50110-Is7bA+etu6BS6NsDqCx3sHNF5mg\"",
    "mtime": "2026-05-03T19:23:43.049Z",
    "size": 327952,
    "path": "../public/sounds/sfx/Dada 1.wav"
  },
  "/sounds/sfx/Dada 2.wav": {
    "type": "audio/wav",
    "etag": "\"7b194-5wBUjyhyayyym5C7QS+DzLIyP0A\"",
    "mtime": "2026-05-03T19:23:43.115Z",
    "size": 504212,
    "path": "../public/sounds/sfx/Dada 2.wav"
  },
  "/sounds/sfx/Dada 3.wav": {
    "type": "audio/wav",
    "etag": "\"58c78-tOywO4ShTvtp41TkxzxNsvrZ0Eg\"",
    "mtime": "2026-05-03T19:23:43.052Z",
    "size": 363640,
    "path": "../public/sounds/sfx/Dada 3.wav"
  },
  "/sounds/sfx/Error.wav": {
    "type": "audio/wav",
    "etag": "\"29a1c-Iz5AFH1+Jx9XUA/oeN+Vqg2Mask\"",
    "mtime": "2026-05-03T19:23:43.065Z",
    "size": 170524,
    "path": "../public/sounds/sfx/Error.wav"
  },
  "/sounds/sfx/Enter & Back.wav": {
    "type": "audio/wav",
    "etag": "\"15e54-BsbsSzO8zdrot8Auo3KorQSY5jY\"",
    "mtime": "2026-05-03T19:23:43.054Z",
    "size": 89684,
    "path": "../public/sounds/sfx/Enter & Back.wav"
  },
  "/sounds/sfx/Hello.wav": {
    "type": "audio/wav",
    "etag": "\"73074-5RwAFb1++QhHZIbCD79G+vAZvJ4\"",
    "mtime": "2026-05-03T19:23:43.071Z",
    "size": 471156,
    "path": "../public/sounds/sfx/Hello.wav"
  },
  "/sounds/sfx/Jig0.wav": {
    "type": "audio/wav",
    "etag": "\"268cc-jbVlheLRhpcN7fi/gzUtxSKS2sw\"",
    "mtime": "2026-05-03T19:23:43.066Z",
    "size": 157900,
    "path": "../public/sounds/sfx/Jig0.wav"
  },
  "/sounds/sfx/Icons.wav": {
    "type": "audio/wav",
    "etag": "\"230cc-IIH/2yX/mCvHn/orXLTUxUvcqqw\"",
    "mtime": "2026-05-03T19:23:43.065Z",
    "size": 143564,
    "path": "../public/sounds/sfx/Icons.wav"
  },
  "/sounds/sfx/Klick.wav": {
    "type": "audio/wav",
    "etag": "\"1b8c-2bl4EAcRnCVh2VAbdj4rgXL8Umc\"",
    "mtime": "2026-05-03T19:23:43.066Z",
    "size": 7052,
    "path": "../public/sounds/sfx/Klick.wav"
  },
  "/sounds/sfx/Jig1.wav": {
    "type": "audio/wav",
    "etag": "\"41d98-hu9nIA4aa7hjc6i+taVulzAgus8\"",
    "mtime": "2026-05-03T19:23:43.071Z",
    "size": 269720,
    "path": "../public/sounds/sfx/Jig1.wav"
  },
  "/sounds/sfx/MarcoPolo.wav": {
    "type": "audio/wav",
    "etag": "\"555b4-UE6osGmeIdCC8gq72HOX75N1Vn8\"",
    "mtime": "2026-05-03T19:23:43.075Z",
    "size": 349620,
    "path": "../public/sounds/sfx/MarcoPolo.wav"
  },
  "/sounds/sfx/Nock.wav": {
    "type": "audio/wav",
    "etag": "\"1d88-c0B5jT4NG1mvoLDY8GsTIa+pguY\"",
    "mtime": "2026-05-03T19:23:43.076Z",
    "size": 7560,
    "path": "../public/sounds/sfx/Nock.wav"
  },
  "/sounds/sfx/Dodo.wav": {
    "type": "audio/wav",
    "etag": "\"9d78c-o13z4BmxqA3EgwY4xQ0tDUI87ek\"",
    "mtime": "2026-05-03T19:23:43.057Z",
    "size": 645004,
    "path": "../public/sounds/sfx/Dodo.wav"
  },
  "/sounds/sfx/Popup + Run Title.wav": {
    "type": "audio/wav",
    "etag": "\"4f9c4-asI7RMMK8GPL1sAu3C/yZ6RnfxE\"",
    "mtime": "2026-05-03T19:23:43.080Z",
    "size": 326084,
    "path": "../public/sounds/sfx/Popup + Run Title.wav"
  },
  "/sounds/sfx/Eshop.wav": {
    "type": "audio/wav",
    "etag": "\"a8064-9PIKYeeQXaY0WVSQB6fhL63BQdU\"",
    "mtime": "2026-05-03T19:23:43.074Z",
    "size": 688228,
    "path": "../public/sounds/sfx/Eshop.wav"
  },
  "/sounds/sfx/Select.wav": {
    "type": "audio/wav",
    "etag": "\"fb44-x9ojogYBt3P/VMfuoo5fs9n0dzY\"",
    "mtime": "2026-05-03T19:23:43.078Z",
    "size": 64324,
    "path": "../public/sounds/sfx/Select.wav"
  },
  "/sounds/sfx/Settings.wav": {
    "type": "audio/wav",
    "etag": "\"51ac4-cManCnTTTJhc4pCCkZgHCsliN5k\"",
    "mtime": "2026-05-03T19:23:43.080Z",
    "size": 334532,
    "path": "../public/sounds/sfx/Settings.wav"
  },
  "/sounds/sfx/News.wav": {
    "type": "audio/wav",
    "etag": "\"82204-gp3PMQkhLBuUw+MVPuNmdJZDdDA\"",
    "mtime": "2026-05-03T19:23:43.076Z",
    "size": 532996,
    "path": "../public/sounds/sfx/News.wav"
  },
  "/sounds/sfx/Standby.wav": {
    "type": "audio/wav",
    "etag": "\"343a4-riAPbg5HWEhVp0R/2/62uyexRLY\"",
    "mtime": "2026-05-03T19:23:43.080Z",
    "size": 213924,
    "path": "../public/sounds/sfx/Standby.wav"
  },
  "/sounds/sfx/This One.wav": {
    "type": "audio/wav",
    "etag": "\"5b68-Pgc7HMca9V8SYdmbiNQ19nSClq0\"",
    "mtime": "2026-05-03T19:23:43.080Z",
    "size": 23400,
    "path": "../public/sounds/sfx/This One.wav"
  },
  "/sounds/sfx/Tick.wav": {
    "type": "audio/wav",
    "etag": "\"1fa4-StsnDK6PljqBmGztYZ73aY/7r1w\"",
    "mtime": "2026-05-03T19:23:43.081Z",
    "size": 8100,
    "path": "../public/sounds/sfx/Tick.wav"
  },
  "/sounds/sfx/Turn Off.wav": {
    "type": "audio/wav",
    "etag": "\"4774-Wuinq7H2Vvpr/jdA87NvGGpiQEQ\"",
    "mtime": "2026-05-03T19:23:43.081Z",
    "size": 18292,
    "path": "../public/sounds/sfx/Turn Off.wav"
  },
  "/sounds/sfx/Turn On.wav": {
    "type": "audio/wav",
    "etag": "\"462c-UHV498u4+Z99vz1utSxyo5Q/oR4\"",
    "mtime": "2026-05-03T19:23:43.081Z",
    "size": 17964,
    "path": "../public/sounds/sfx/Turn On.wav"
  },
  "/sounds/sfx/atmostphere-2.wav": {
    "type": "audio/wav",
    "etag": "\"6c258-UosDZpCWkw4modVPdkQwdlw5jqY\"",
    "mtime": "2026-05-03T19:23:43.089Z",
    "size": 442968,
    "path": "../public/sounds/sfx/atmostphere-2.wav"
  },
  "/sounds/sfx/button-1.wav": {
    "type": "audio/wav",
    "etag": "\"5a92-Y1G5piEoGGaZHa6C1jTJcNFHz8c\"",
    "mtime": "2026-05-03T19:23:43.082Z",
    "size": 23186,
    "path": "../public/sounds/sfx/button-1.wav"
  },
  "/sounds/sfx/button-2.wav": {
    "type": "audio/wav",
    "etag": "\"8a66-s1W89qYlvqZO6bKZ6EVcCLeuIK8\"",
    "mtime": "2026-05-03T19:23:43.083Z",
    "size": 35430,
    "path": "../public/sounds/sfx/button-2.wav"
  },
  "/sounds/sfx/atmosphere-1.wav": {
    "type": "audio/wav",
    "etag": "\"8c82c-NNrXr+/OlbCnoIPBt+ZJRtBTPMU\"",
    "mtime": "2026-05-03T19:23:43.087Z",
    "size": 575532,
    "path": "../public/sounds/sfx/atmosphere-1.wav"
  },
  "/sounds/sfx/Loading.wav": {
    "type": "audio/wav",
    "etag": "\"18f5dc-SoCjnbCqMsz1p84SyIzGKyin9zY\"",
    "mtime": "2026-05-03T19:23:43.083Z",
    "size": 1635804,
    "path": "../public/sounds/sfx/Loading.wav"
  },
  "/sounds/sfx/button-3.wav": {
    "type": "audio/wav",
    "etag": "\"a9ac-SSQGa0lSzcKME0B61ZFBdzm3z4c\"",
    "mtime": "2026-05-03T19:23:43.087Z",
    "size": 43436,
    "path": "../public/sounds/sfx/button-3.wav"
  },
  "/sounds/sfx/button-5.wav": {
    "type": "audio/wav",
    "etag": "\"6014-dzq0mb6FDumYkI8vmc1zHyizZ4U\"",
    "mtime": "2026-05-03T19:23:43.087Z",
    "size": 24596,
    "path": "../public/sounds/sfx/button-5.wav"
  },
  "/sounds/sfx/button-4.wav": {
    "type": "audio/wav",
    "etag": "\"6f14-BOID4mnrZNCi28MG4a+wroOAvoI\"",
    "mtime": "2026-05-03T19:23:43.086Z",
    "size": 28436,
    "path": "../public/sounds/sfx/button-4.wav"
  },
  "/sounds/sfx/button-6.wav": {
    "type": "audio/wav",
    "etag": "\"ab1e-loOkIPISZ9Ky0TdyUJzCxVr56D4\"",
    "mtime": "2026-05-03T19:23:43.088Z",
    "size": 43806,
    "path": "../public/sounds/sfx/button-6.wav"
  },
  "/sounds/sfx/fail.wav": {
    "type": "audio/wav",
    "etag": "\"5691a-r35uHGvwzgFgDNGzsN8HO4rGaYw\"",
    "mtime": "2026-05-03T19:23:43.092Z",
    "size": 354586,
    "path": "../public/sounds/sfx/fail.wav"
  },
  "/sounds/sfx/musical-tap-1.wav": {
    "type": "audio/wav",
    "etag": "\"4fa08-6qD1wez6cHfZMsab/YgAzt/MinI\"",
    "mtime": "2026-05-03T19:23:43.093Z",
    "size": 326152,
    "path": "../public/sounds/sfx/musical-tap-1.wav"
  },
  "/sounds/sfx/musical-tap-2.wav": {
    "type": "audio/wav",
    "etag": "\"4fa0a-x6XB+KZ/YmxKKqm7hIIf/Btz4WE\"",
    "mtime": "2026-05-03T19:23:43.094Z",
    "size": 326154,
    "path": "../public/sounds/sfx/musical-tap-2.wav"
  },
  "/sounds/sfx/musical-tap-3.wav": {
    "type": "audio/wav",
    "etag": "\"4fa0a-L/gSRa9d2JwF3KDWrSV2u4qmqcI\"",
    "mtime": "2026-05-03T19:23:43.094Z",
    "size": 326154,
    "path": "../public/sounds/sfx/musical-tap-3.wav"
  },
  "/sounds/sfx/natural-tap-1.wav": {
    "type": "audio/wav",
    "etag": "\"23342-BTPPSdiSpFHn+AAxS+YO/kB7hyM\"",
    "mtime": "2026-05-03T19:23:43.094Z",
    "size": 144194,
    "path": "../public/sounds/sfx/natural-tap-1.wav"
  },
  "/sounds/sfx/natural-tap-3.wav": {
    "type": "audio/wav",
    "etag": "\"2333c-CPOTXBJxmZOHstGZqfOZ/7CfEBk\"",
    "mtime": "2026-05-03T19:23:43.095Z",
    "size": 144188,
    "path": "../public/sounds/sfx/natural-tap-3.wav"
  },
  "/sounds/sfx/whoosh-1.wav": {
    "type": "audio/wav",
    "etag": "\"299f2-ThSCnZOaM4WVQ4JeyMVgMss/q9w\"",
    "mtime": "2026-05-03T19:23:43.096Z",
    "size": 170482,
    "path": "../public/sounds/sfx/whoosh-1.wav"
  },
  "/sounds/sfx/whoosh-2.wav": {
    "type": "audio/wav",
    "etag": "\"20a16-1i2Kv1a+SbDovWCMXlG+LrCTNeY\"",
    "mtime": "2026-05-03T19:23:43.096Z",
    "size": 133654,
    "path": "../public/sounds/sfx/whoosh-2.wav"
  },
  "/sounds/sfx/natural-tap-2.wav": {
    "type": "audio/wav",
    "etag": "\"2333c-BFTauKwaYMUixDWnmj/6+avXe/c\"",
    "mtime": "2026-05-03T19:23:43.094Z",
    "size": 144188,
    "path": "../public/sounds/sfx/natural-tap-2.wav"
  },
  "/sounds/sfx/success.wav": {
    "type": "audio/wav",
    "etag": "\"7596a-A/Be/xo0rS3LEqn/CcwdeWfkkrk\"",
    "mtime": "2026-05-03T19:23:43.098Z",
    "size": 481642,
    "path": "../public/sounds/sfx/success.wav"
  },
  "/sounds/sfx/custom/bing.wav": {
    "type": "audio/wav",
    "etag": "\"1dda4-Z7Bx/z3GYZ8vz80x5OnJ0j1L4cg\"",
    "mtime": "2026-05-03T19:23:43.102Z",
    "size": 122276,
    "path": "../public/sounds/sfx/custom/bing.wav"
  },
  "/sounds/sfx/custom/bloop2.wav": {
    "type": "audio/wav",
    "etag": "\"e490-FMOaP5emaChpPEYeO/9/hglSQKA\"",
    "mtime": "2026-05-03T19:23:43.097Z",
    "size": 58512,
    "path": "../public/sounds/sfx/custom/bloop2.wav"
  },
  "/sounds/sfx/custom/bloop.wav": {
    "type": "audio/wav",
    "etag": "\"17c08-//5ifroPso7bhdN+ZvzhCCdjFZk\"",
    "mtime": "2026-05-03T19:23:43.044Z",
    "size": 97288,
    "path": "../public/sounds/sfx/custom/bloop.wav"
  },
  "/sounds/sfx/custom/bloop3.wav": {
    "type": "audio/wav",
    "etag": "\"c9b0-Mce/nwu/bNcIuJVAwfmNs5H9FHE\"",
    "mtime": "2026-05-03T19:23:43.097Z",
    "size": 51632,
    "path": "../public/sounds/sfx/custom/bloop3.wav"
  },
  "/sounds/sfx/custom/bloop4.wav": {
    "type": "audio/wav",
    "etag": "\"a164-JtZMkkz9xHAVuJYS2GSFKdPSpus\"",
    "mtime": "2026-05-03T19:23:43.097Z",
    "size": 41316,
    "path": "../public/sounds/sfx/custom/bloop4.wav"
  },
  "/sounds/sfx/custom/bumpy.wav": {
    "type": "audio/wav",
    "etag": "\"19258-e5iYrf16hnWARfU3kn8ER6XDrAA\"",
    "mtime": "2026-05-03T19:23:43.098Z",
    "size": 103000,
    "path": "../public/sounds/sfx/custom/bumpy.wav"
  },
  "/sounds/sfx/custom/flutter.wav": {
    "type": "audio/wav",
    "etag": "\"16368-J+711ctOQbuHV6nYoeE1zI8dEY0\"",
    "mtime": "2026-05-03T19:23:43.098Z",
    "size": 90984,
    "path": "../public/sounds/sfx/custom/flutter.wav"
  },
  "/sounds/sfx/custom/grind.wav": {
    "type": "audio/wav",
    "etag": "\"1cd14-tIRbCUnmN593cLGPM6oloTL+fDs\"",
    "mtime": "2026-05-03T19:23:43.098Z",
    "size": 118036,
    "path": "../public/sounds/sfx/custom/grind.wav"
  },
  "/sounds/sfx/custom/knockknock.wav": {
    "type": "audio/wav",
    "etag": "\"10f08-VOPPCObU5uU1XuHPESNSc/gUKNk\"",
    "mtime": "2026-05-03T19:23:43.099Z",
    "size": 69384,
    "path": "../public/sounds/sfx/custom/knockknock.wav"
  },
  "/sounds/sfx/custom/off.wav": {
    "type": "audio/wav",
    "etag": "\"7b20c-hnhn3iHqXyjlE1vRXKE5pV9CO84\"",
    "mtime": "2026-05-03T19:23:43.102Z",
    "size": 504332,
    "path": "../public/sounds/sfx/custom/off.wav"
  },
  "/sounds/sfx/custom/ope.wav": {
    "type": "audio/wav",
    "etag": "\"5c80-nDAChV6ElNHb8MUAcY6uza1RBvo\"",
    "mtime": "2026-05-03T19:23:43.099Z",
    "size": 23680,
    "path": "../public/sounds/sfx/custom/ope.wav"
  },
  "/sounds/sfx/custom/plunk.wav": {
    "type": "audio/wav",
    "etag": "\"12ed8-blIBGQuyC98JjS9VS198u/1A1VU\"",
    "mtime": "2026-05-03T19:23:43.101Z",
    "size": 77528,
    "path": "../public/sounds/sfx/custom/plunk.wav"
  },
  "/sounds/sfx/custom/plunk2.wav": {
    "type": "audio/wav",
    "etag": "\"18d6c-NI97Wyh4tG3ZDQKE9jbD/+Jx/Ek\"",
    "mtime": "2026-05-03T19:23:43.101Z",
    "size": 101740,
    "path": "../public/sounds/sfx/custom/plunk2.wav"
  },
  "/sounds/sfx/custom/plunk3.wav": {
    "type": "audio/wav",
    "etag": "\"acec-BRdXqrcPriuj+hy//pEwJTF7dJY\"",
    "mtime": "2026-05-03T19:23:43.101Z",
    "size": 44268,
    "path": "../public/sounds/sfx/custom/plunk3.wav"
  },
  "/sounds/sfx/custom/rise.wav": {
    "type": "audio/wav",
    "etag": "\"279b4-I/zy4DUMYN1kpQGMd1VvAC+vTcs\"",
    "mtime": "2026-05-03T19:23:43.104Z",
    "size": 162228,
    "path": "../public/sounds/sfx/custom/rise.wav"
  },
  "/sounds/sfx/custom/submerged.wav": {
    "type": "audio/wav",
    "etag": "\"19fc8-4PB5W/e4i5lJy0wRHc5JgYC8nZc\"",
    "mtime": "2026-05-03T19:23:43.107Z",
    "size": 106440,
    "path": "../public/sounds/sfx/custom/submerged.wav"
  },
  "/sounds/sfx/custom/thump.wav": {
    "type": "audio/wav",
    "etag": "\"22bc-1IwJLhR4U7FUIQhM3Fx0iXEQnrY\"",
    "mtime": "2026-05-03T19:23:43.104Z",
    "size": 8892,
    "path": "../public/sounds/sfx/custom/thump.wav"
  },
  "/sounds/sfx/custom/standby.wav": {
    "type": "audio/wav",
    "etag": "\"57bb4-elHz8ZruTZSCknM1Pktupn97DGg\"",
    "mtime": "2026-05-03T19:23:43.104Z",
    "size": 359348,
    "path": "../public/sounds/sfx/custom/standby.wav"
  },
  "/sounds/sfx/custom/todo.wav": {
    "type": "audio/wav",
    "etag": "\"ecdc-Si/O3dPriYnj7I/822BNWhZ1z1s\"",
    "mtime": "2026-05-03T19:23:43.107Z",
    "size": 60636,
    "path": "../public/sounds/sfx/custom/todo.wav"
  },
  "/sounds/sfx/custom/woosh.wav": {
    "type": "audio/wav",
    "etag": "\"1b958-AWBey4teBHHeHmkneDjR7aR4dg4\"",
    "mtime": "2026-05-03T19:23:43.108Z",
    "size": 112984,
    "path": "../public/sounds/sfx/custom/woosh.wav"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const relative = function(from, to) {
  const _from = resolve(from).replace(_ROOT_FOLDER_RE, "$1").split("/");
  const _to = resolve(to).replace(_ROOT_FOLDER_RE, "$1").split("/");
  if (_to[0][1] === ":" && _from[0][1] === ":" && _from[0] !== _to[0]) {
    return _to.join("/");
  }
  const _fromCopy = [..._from];
  for (const segment of _fromCopy) {
    if (_to[0] !== segment) {
      break;
    }
    _from.shift();
    _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};
const basename = function(p, extension) {
  const segments = normalizeWindowsPath(p).split("/");
  let lastSegment = "";
  for (let i = segments.length - 1; i >= 0; i--) {
    const val = segments[i];
    if (val) {
      lastSegment = val;
      break;
    }
  }
  return extension && lastSegment.endsWith(extension) ? lastSegment.slice(0, -extension.length) : lastSegment;
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/_fonts/":{"maxAge":31536000},"/_nuxt/":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _W1V__e = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

function buildAssetsDir() {
  return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
  return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
  const app = useRuntimeConfig().app;
  const publicBase = app.cdnURL || app.baseURL;
  return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

const checksums = {
  "docs": "v3.5.0--NliNi6zHxTxoyBWH839qnpmPtpxgcg4Wf7XXNvkGjo8"
};
const checksumsStructure = {
  "docs": "quFkNIUZZFAwcn0ok74-KsIERem9u0p5DW-cqEgxrPA"
};
const tables = {
  "docs": "_content_docs",
  "info": "_content_info"
};
const contentManifest = {
  "docs": {
    "type": "page",
    "fields": {
      "id": "string",
      "title": "string",
      "body": "json",
      "description": "string",
      "extension": "string",
      "meta": "json",
      "navigation": "json",
      "path": "string",
      "seo": "json",
      "stem": "string"
    }
  },
  "info": {
    "type": "data",
    "fields": {}
  }
};

async function fetchContent(event, collection, path, options) {
  const headers = event ? getRequestHeaders(event) : {};
  const url = `/__nuxt_content/${collection}/${path}`;
  const fetchOptions = {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    },
    query: { v: checksums[String(collection)], t: void 0 }
  };
  return event ? await event.$fetch(url, fetchOptions) : await $fetch(url, fetchOptions);
}
async function fetchDatabase(event, collection) {
  return fetchContent(event, collection, "sql_dump.txt", {
    responseType: "text",
    headers: {
      "content-type": "text/plain"
    }
  });
}

const MODEL_FAST = "claude-haiku-4-5";
const MODEL_BALANCED = "anthropic/claude-sonnet-4.5";
const MODEL_DEEP = "anthropic/claude-opus-4.7";
const LOOKUP_SIGNALS = /\b(show me|list|find|what is|what are|how many|count|get my|which|search|look up|give me the)\b/i;
const REASONING_SIGNALS = /\b(plan|design|architect|strategy|analyze|analyse|recommend|compare|evaluate|reason|investigate|diagnose|pros and cons|trade[- ]offs?)\b/i;
const CREATIVE_SIGNALS = /\b(draft|write|compose|generate|summarize|summarise|outline|brainstorm|rewrite|rephrase)\b/i;
const ROUTING_THRESHOLDS = {
  maxLookupWords: 25,
  reasoningWordCount: 60
};
function classifyRequest(message) {
  const text = (message != null ? message : "").trim();
  const lower = text.toLowerCase();
  const wordCount = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;
  if (REASONING_SIGNALS.test(lower) || wordCount > ROUTING_THRESHOLDS.reasoningWordCount) {
    return {
      model: MODEL_DEEP,
      taskClass: "reasoning",
      rationale: wordCount > ROUTING_THRESHOLDS.reasoningWordCount ? `Long prompt (${wordCount} words). Routed to Sonnet for deeper reasoning.` : "Multi-step reasoning detected. Routed to Sonnet for depth."
    };
  }
  if (CREATIVE_SIGNALS.test(lower)) {
    return {
      model: MODEL_BALANCED,
      taskClass: "creative",
      rationale: "Generation/composition task. Routed to Sonnet for quality."
    };
  }
  if (LOOKUP_SIGNALS.test(lower) && wordCount <= ROUTING_THRESHOLDS.maxLookupWords) {
    return {
      model: MODEL_FAST,
      taskClass: "lookup",
      rationale: `Short factual query (${wordCount} words). Routed to Haiku for speed & cost.`
    };
  }
  return {
    model: MODEL_BALANCED,
    taskClass: "synthesis",
    rationale: "General synthesis task. Routed to Sonnet (balanced default)."
  };
}
function resolveRoutingDecision(message, explicitModel) {
  const trimmed = explicitModel == null ? void 0 : explicitModel.trim();
  if (trimmed) {
    return {
      model: trimmed,
      taskClass: "override",
      rationale: `Explicit model pinned via TOKENROUTER_MODEL env (${trimmed}).`
    };
  }
  return classifyRequest(message);
}

function formatValidationPath(path) {
  return path.length > 0 ? path.map(String).join(".") : "(root)";
}
function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    path: formatValidationPath(issue.path),
    message: issue.message,
    code: issue.code
  }));
}
function createApiValidationError(error, source) {
  const issues = formatZodIssues(error);
  const summary = issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
  throw createError$1({
    statusCode: 400,
    statusMessage: "Bad Request",
    message: summary ? `Invalid ${source}: ${summary}` : `Invalid ${source}`,
    data: {
      code: "VALIDATION_ERROR",
      source,
      issues
    }
  });
}
function validateApiInput(schema, input, source) {
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return createApiValidationError(err, source);
    }
    throw err;
  }
}
async function parseApiBody(event, schema) {
  const body = await readBody(event).catch(() => void 0);
  return validateApiInput(schema, body, "body");
}
function parseApiQuery(event, schema) {
  return validateApiInput(schema, getQuery(event), "query");
}
function parseApiRouterParams(event, schema) {
  var _a;
  return validateApiInput(schema, (_a = event.context.params) != null ? _a : {}, "params");
}

const SYSTEM_AGENTS = /* @__PURE__ */ new Set([
  "decision-capture",
  "campus-migration",
  "graph-notifier",
  "system",
  "browser",
  // default agentId when unset — user-driven, not an Agent entity
  ""
]);
function shouldCaptureDecision(input, captureRequested) {
  if (!captureRequested) return false;
  if (SYSTEM_AGENTS.has(input.agentId)) return false;
  if (input.entityType === "decision") return false;
  return true;
}
function buildDecisionData(input) {
  const slug = (input.entityId || "anon").replace(/^entity:/, "").replace(/[^a-z0-9-]/gi, "-").slice(0, 60);
  const decisionId = `entity:decision-${input.action}-${slug}-${Date.now().toString(36)}`;
  const titleParts = [input.action];
  if (input.entityId) titleParts.push(input.entityId);
  if (input.entityType) titleParts.push(`(${input.entityType})`);
  const data = {
    type: "decision",
    title: titleParts.join(" ").trim(),
    byAgent: input.agentId,
    inZone: input.zoneId,
    zoneId: input.zoneId,
    facilityId: input.facilityId,
    outcome: "executed",
    toolName: "api/graph/mutate",
    toolInput: JSON.stringify(input.toolInput),
    rationale: `Agent ${input.agentId} invoked ${input.action} in zone ${input.zoneId}`
  };
  if (input.action === "createNode" && input.entityType === "artifact" && input.entityId) {
    data.producesArtifact = input.entityId;
  }
  return { decisionId, data };
}
async function captureDecision(kernel, input) {
  const { decisionId, data } = buildDecisionData(input);
  try {
    await kernel.createNode(decisionId, data, "entity", { agentId: "decision-capture" });
    emitMutation({
      action: "createNode",
      entityId: decisionId,
      type: "entity",
      agentId: "decision-capture",
      zoneId: input.zoneId,
      facilityId: input.facilityId,
      data
    });
    return decisionId;
  } catch (err) {
    console.warn(`[decision-capture] failed for ${input.action} ${input.entityId || ""}:`, (err == null ? void 0 : err.message) || err);
    return null;
  }
}

function shouldAllowConnectionAccess(input) {
  const { callerUserId, connectionUserId } = input;
  if (callerUserId && connectionUserId) {
    if (callerUserId === connectionUserId) {
      return { allow: true, reason: "owner match" };
    }
    return {
      allow: false,
      reason: `caller ${callerUserId} is not the owner (${connectionUserId}) of this connection`
    };
  }
  if (callerUserId && !connectionUserId) {
    return { allow: true, reason: "legacy connection has no stored owner" };
  }
  if (!callerUserId && connectionUserId) {
    return {
      allow: false,
      reason: "connection has an owner but request is unauthenticated"
    };
  }
  return { allow: true, reason: "self-hosted / unauthenticated workspace" };
}
function getCallerUserId(event) {
  const raw = event.node.req.headers["x-user-id"] || event.node.req.headers["X-User-Id"] || null;
  if (!raw) return null;
  const trimmed = String(raw).trim();
  return trimmed || null;
}
async function getConnectionUserId(connectionId) {
  const { useTqlKernel } = await Promise.resolve().then(function () { return tql; });
  const kernel = useTqlKernel();
  const entityId = connectionId.startsWith("entity:") ? connectionId : `entity:${connectionId}`;
  const facts = kernel.getStore().getFactsByEntity(entityId);
  const fact = facts.find((f) => f.a === "userId");
  if (!fact) return null;
  const v = fact.v;
  return typeof v === "string" && v.length > 0 ? v : null;
}
async function requireConnectionOwner(event, connectionId) {
  const callerUserId = getCallerUserId(event);
  const connectionUserId = await getConnectionUserId(connectionId);
  const decision = shouldAllowConnectionAccess({
    callerUserId,
    connectionUserId
  });
  if (!decision.allow) {
    console.warn(
      `[connection-auth] DENY connectionId=${connectionId} caller=${callerUserId != null ? callerUserId : "anonymous"} reason="${decision.reason}"`
    );
    throw createError$1({
      statusCode: 403,
      statusMessage: "Forbidden",
      message: decision.reason
    });
  }
  if (decision.reason === "legacy connection has no stored owner") {
    console.warn(`[connection-auth] legacy connection has no owner fact: ${connectionId} \u2014 caller=${callerUserId}`);
  }
  return decision;
}

const StringRecordSchema$2 = z.record(z.string(), z.unknown());
const queryLimit = (value) => {
  const parsed = parseInt(String(value || "10"), 10);
  return Number.isNaN(parsed) || parsed < 0 ? 10 : parsed;
};
const GraphSummaryQuerySchema = z.object({
  limit: z.preprocess(queryLimit, z.number().int().min(0))
});
const GraphNodeParamsSchema = z.object({
  entityId: z.string().trim().min(1, "Missing entity ID")
});
const GraphNodesBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, 'Request body must include "ids" (string[])')
}).passthrough();
const GraphQueryBodySchema = z.object({
  query: z.string().trim().min(1).optional(),
  projection: z.string().trim().min(1).optional()
}).passthrough().superRefine((input, ctx) => {
  if (!input.query && !input.projection) {
    ctx.addIssue({
      code: "custom",
      path: ["query"],
      message: 'Request body must include "query" (EQL-S string) or "projection" (projection ID)'
    });
  }
});
z.enum(["createNode", "updateNode", "deleteNode", "link", "unlink"]);
const GraphMutationStringSchema = z.string().trim().min(1);
const GraphMutateBaseSchema = z.object({
  agentId: GraphMutationStringSchema.optional(),
  captureDecision: z.boolean().optional()
}).passthrough();
const GraphMutateBodySchema = z.discriminatedUnion("action", [
  GraphMutateBaseSchema.extend({
    action: z.literal("createNode"),
    entityId: GraphMutationStringSchema,
    data: StringRecordSchema$2.optional(),
    type: GraphMutationStringSchema
  }),
  GraphMutateBaseSchema.extend({
    action: z.literal("updateNode"),
    entityId: GraphMutationStringSchema,
    data: StringRecordSchema$2.optional(),
    type: GraphMutationStringSchema
  }),
  GraphMutateBaseSchema.extend({
    action: z.literal("deleteNode"),
    entityId: GraphMutationStringSchema
  }),
  GraphMutateBaseSchema.extend({
    action: z.literal("link"),
    e1: GraphMutationStringSchema,
    relation: GraphMutationStringSchema,
    e2: GraphMutationStringSchema
  }),
  GraphMutateBaseSchema.extend({
    action: z.literal("unlink"),
    e1: GraphMutationStringSchema,
    relation: GraphMutationStringSchema,
    e2: GraphMutationStringSchema
  })
]);
const GraphOntologyParamsSchema = z.object({
  ontologyId: z.string().trim().min(1, "Missing ontology ID")
});
const GraphOntologyFieldSchema = z.object({
  name: z.string().optional()
}).passthrough();
const GraphOntologySchemaBase = z.object({
  "@id": z.string().trim().min(1).optional(),
  "@type": z.string().optional(),
  version: z.string().trim().min(1),
  fields: z.array(GraphOntologyFieldSchema)
}).passthrough();
const GraphOntologyCreateBodySchema = z.object({
  schema: GraphOntologySchemaBase.extend({
    "@id": z.string().trim().min(1)
  }),
  agentId: z.string().trim().min(1).optional()
}).passthrough();
const GraphOntologyUpdateBodySchema = z.object({
  schema: GraphOntologySchemaBase,
  agentId: z.string().trim().min(1).optional()
}).passthrough();
const GraphOntologyDeleteBodySchema = z.object({
  agentId: z.string().trim().min(1).optional()
}).passthrough().default({});

const emptyToUndefined$1 = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
};
const RequiredStringSchema = z.string().trim().min(1);
const OptionalStringSchema = z.preprocess(emptyToUndefined$1, z.string().optional());
const DefaultScopeSchema = z.preprocess((value) => {
  var _a;
  return (_a = emptyToUndefined$1(value)) != null ? _a : "app";
}, z.string());
const StringRecordSchema$1 = z.record(z.string(), z.unknown());
const OptionalStringArraySchema = z.array(z.string().trim().min(1)).optional();
const PlatformOptionalAppQuerySchema = z.object({
  appId: OptionalStringSchema
});
const PlatformAppListQuerySchema = z.object({
  orgId: OptionalStringSchema
});
const PlatformContextQuerySchema = z.object({
  orgId: OptionalStringSchema,
  appId: OptionalStringSchema
});
const PlatformSettingGetQuerySchema = z.object({
  key: RequiredStringSchema,
  scope: DefaultScopeSchema
});
const PlatformSettingListQuerySchema = z.object({
  scope: DefaultScopeSchema
});
const PlatformOrgCreateBodySchema = z.object({
  name: RequiredStringSchema,
  slug: OptionalStringSchema,
  description: OptionalStringSchema,
  agentId: OptionalStringSchema
}).passthrough();
const PlatformAppCreateBodySchema = z.object({
  name: RequiredStringSchema,
  slug: OptionalStringSchema,
  orgId: OptionalStringSchema,
  icon: OptionalStringSchema,
  color: OptionalStringSchema,
  description: OptionalStringSchema,
  ontologies: z.array(z.unknown()).optional(),
  agentId: OptionalStringSchema
}).passthrough();
const PlatformUpdateBodySchema = z.object({
  data: StringRecordSchema$1.optional(),
  agentId: OptionalStringSchema
}).passthrough().default({});
const PlatformDeleteBodySchema = z.object({
  agentId: OptionalStringSchema
}).passthrough().default({});
const PlatformCollectionCreateBodySchema = z.object({
  name: RequiredStringSchema,
  slug: OptionalStringSchema,
  appId: OptionalStringSchema,
  type: OptionalStringSchema,
  description: OptionalStringSchema,
  schema: z.unknown().optional(),
  agentId: OptionalStringSchema
}).passthrough();
const PlatformPageCreateBodySchema = z.object({
  title: RequiredStringSchema,
  appId: OptionalStringSchema,
  dataSource: OptionalStringSchema,
  layout: OptionalStringSchema,
  defaultProjection: OptionalStringSchema,
  description: OptionalStringSchema,
  icon: OptionalStringSchema,
  agentId: OptionalStringSchema
}).passthrough();
const PlatformCommentAddBodySchema = z.object({
  entityId: RequiredStringSchema,
  content: RequiredStringSchema,
  commentType: OptionalStringSchema,
  authorId: OptionalStringSchema,
  authorName: OptionalStringSchema,
  metadata: z.unknown().optional(),
  agentId: OptionalStringSchema
}).passthrough();
const PlatformTagCreateBodySchema = z.object({
  name: RequiredStringSchema,
  color: OptionalStringSchema,
  description: OptionalStringSchema,
  agentId: OptionalStringSchema
}).passthrough();
const PlatformTagAssignBodySchema = z.object({
  entityId: RequiredStringSchema,
  tags: z.array(z.string().trim().min(1)),
  agentId: OptionalStringSchema
}).passthrough();
const PlatformBulkUpdateBodySchema = z.object({
  query: RequiredStringSchema,
  data: StringRecordSchema$1,
  agentId: OptionalStringSchema
}).passthrough();
const PlatformBulkDeleteBodySchema = z.object({
  query: RequiredStringSchema,
  agentId: OptionalStringSchema
}).passthrough();
const PlatformWorkflowCreateBodySchema = z.object({
  name: RequiredStringSchema,
  appId: OptionalStringSchema,
  trigger: z.unknown().optional(),
  graph: z.unknown().optional(),
  description: OptionalStringSchema,
  agentId: OptionalStringSchema
}).passthrough();
const PlatformSettingSetBodySchema = z.object({
  key: RequiredStringSchema,
  value: z.unknown().optional(),
  scope: OptionalStringSchema,
  agentId: OptionalStringSchema
}).passthrough();
const PlatformFileUploadBodySchema = z.object({
  entityId: OptionalStringSchema,
  field: OptionalStringSchema,
  fileBase64: RequiredStringSchema,
  filename: RequiredStringSchema,
  contentType: OptionalStringSchema,
  agentId: OptionalStringSchema
}).passthrough();
const PlatformInviteSendBodySchema = z.object({
  email: OptionalStringSchema,
  emails: OptionalStringArraySchema,
  role: OptionalStringSchema,
  orgId: OptionalStringSchema,
  orgName: OptionalStringSchema,
  agentId: OptionalStringSchema
}).passthrough().superRefine((input, ctx) => {
  var _a, _b;
  const emailCount = (_b = (_a = input.emails) == null ? void 0 : _a.length) != null ? _b : 0;
  if (!input.email && emailCount === 0) {
    ctx.addIssue({ code: "custom", path: ["email"], message: '"email" or "emails" is required' });
  }
});

const emptyToUndefined = (value) => {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
};
const OptionalQueryStringSchema = z.preprocess(emptyToUndefined, z.string().optional());
const QueryBooleanSchema = z.preprocess((value) => String(value || "").toLowerCase() === "true", z.boolean());
const StringRecordSchema = z.record(z.string(), z.unknown());
const WorkflowNodeKindSchema = z.enum([
  "start",
  "agent",
  "tool",
  "router",
  "guard",
  "memory-read",
  "memory-write",
  "end",
  "note"
]);
const WorkflowPositionSchema = z.object({
  x: z.number(),
  y: z.number()
});
const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  kind: WorkflowNodeKindSchema,
  position: WorkflowPositionSchema.optional(),
  label: z.string().optional(),
  data: StringRecordSchema.optional()
}).passthrough();
const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  condition: z.string().optional()
}).passthrough();
const WorkflowGraphSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema)
}).passthrough();
const WorkflowTriggerKindSchema = z.enum(["schedule", "webhook", "entity-change"]);
const WorkflowEntityChangeActionSchema = z.enum(["createNode", "updateNode", "deleteNode", "any"]);
const WorkflowTriggerIdParamsSchema = z.object({
  id: z.string().trim().min(1, '"id" required')
});
const WorkflowWebhookTokenParamsSchema = z.object({
  token: z.string().trim().min(1, '"token" required')
});
const WorkflowToolNameParamsSchema = z.object({
  name: z.string().trim().min(1, "tool name is required")
});
const WorkflowTriggerListQuerySchema = z.object({
  workflowId: OptionalQueryStringSchema,
  kind: z.preprocess(emptyToUndefined, WorkflowTriggerKindSchema.optional()),
  activeOnly: QueryBooleanSchema
});
const WorkflowTriggerDeleteQuerySchema = z.object({
  agentId: OptionalQueryStringSchema
});
const WorkflowTriggerCreateBodySchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  workflowId: z.string().min(1, '"workflowId" is required'),
  workflowName: z.string().optional(),
  graph: WorkflowGraphSchema,
  kind: WorkflowTriggerKindSchema,
  active: z.boolean().optional(),
  agentId: z.string().optional(),
  ownerId: z.string().optional(),
  orgId: z.string().optional(),
  notifyOnSuccess: z.boolean().optional(),
  cron: z.string().optional(),
  timezone: z.string().optional(),
  token: z.string().optional(),
  watchType: z.string().optional(),
  watchAction: WorkflowEntityChangeActionSchema.optional(),
  watchAttribute: z.string().optional()
}).passthrough().superRefine((input, ctx) => {
  if (input.kind === "schedule" && !input.cron) {
    ctx.addIssue({ code: "custom", path: ["cron"], message: 'schedule triggers require "cron"' });
  }
  if (input.kind === "entity-change" && !input.watchType) {
    ctx.addIssue({ code: "custom", path: ["watchType"], message: 'entity-change triggers require "watchType"' });
  }
});
const WorkflowTriggerUpdateBodySchema = z.object({
  title: z.string().optional(),
  workflowId: z.string().optional(),
  workflowName: z.string().optional(),
  graph: WorkflowGraphSchema.optional(),
  kind: WorkflowTriggerKindSchema.optional(),
  active: z.boolean().optional(),
  agentId: z.string().optional(),
  ownerId: z.string().optional(),
  orgId: z.string().optional(),
  notifyOnSuccess: z.boolean().optional(),
  cron: z.string().optional(),
  timezone: z.string().optional(),
  token: z.string().optional(),
  watchType: z.string().optional(),
  watchAction: WorkflowEntityChangeActionSchema.optional(),
  watchAttribute: z.string().optional(),
  lastFiredAt: z.string().optional(),
  lastRunId: z.string().optional(),
  fireCount: z.number().optional(),
  lastError: z.string().optional()
}).passthrough().default({});
const WorkflowTriggerFireBodySchema = z.object({
  input: z.unknown().optional(),
  agentId: z.string().optional()
}).passthrough().default({});
const WorkflowToolInvokeBodySchema = z.object({
  args: StringRecordSchema.optional(),
  agentId: z.string().optional(),
  workflowId: z.string().optional()
}).passthrough().default({});
const WorkflowExecuteBodySchema = z.object({
  workflowId: z.string().min(1, '"workflowId" is required'),
  workflowName: z.string().optional(),
  graph: WorkflowGraphSchema,
  input: z.unknown().optional(),
  agentId: z.string().optional(),
  skipPersist: z.boolean().optional(),
  defaultModel: z.string().optional(),
  ownerId: z.string().optional(),
  orgId: z.string().optional(),
  notifyOnSuccess: z.boolean().optional()
}).passthrough();
const WorkflowWebhookPayloadSchema = z.unknown();

const ROUTE_ZONE_RULES = [
  // ── Vault — credentials, integrations, admin (irreversible ops) ──
  { match: /^\/settings\/integrations/, zoneId: FOUNDER_VAULT_ZONE_ID },
  { match: /^\/admin/, zoneId: FOUNDER_VAULT_ZONE_ID },
  { match: /^\/permits/, zoneId: FOUNDER_VAULT_ZONE_ID },
  // ── Showroom — public/published surfaces ──
  { match: /^\/pages(\/|$)/, zoneId: FOUNDER_SHOWROOM_ZONE_ID },
  { match: /^\/collections(\/|$)/, zoneId: FOUNDER_SHOWROOM_ZONE_ID },
  // ── Workshop — multi-agent collaboration ──
  { match: /^\/agent(\/|$)/, zoneId: FOUNDER_WORKSHOP_ZONE_ID },
  { match: /^\/messages(\/|$)/, zoneId: FOUNDER_WORKSHOP_ZONE_ID },
  { match: /^\/members/, zoneId: FOUNDER_WORKSHOP_ZONE_ID },
  { match: /^\/workflows/, zoneId: FOUNDER_WORKSHOP_ZONE_ID },
  // ── Lobby — public front door, notifications, onboarding ──
  { match: /^\/notifications/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/invite/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/help/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/learn/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/docs(\/|$)/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/welcome/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/onboarding/, zoneId: FOUNDER_LOBBY_ZONE_ID }
  // Everything else (workspace/*, home/*, ontologies/*, database/*,
  // contacts/*, calendar/*, mail/*, query, ...) → Lab by default.
];
function zoneForPath(pathname) {
  for (const rule of ROUTE_ZONE_RULES) {
    if (rule.match.test(pathname)) {
      return {
        zoneId: rule.zoneId,
        facilityId: FOUNDER_FACILITY_ID,
        source: "route"
      };
    }
  }
  return {
    zoneId: FOUNDER_LAB_ZONE_ID,
    facilityId: FOUNDER_FACILITY_ID,
    source: "default"
  };
}
function zoneFromRequest(event) {
  const headerZone = getHeader$1(event, "x-trellis-zone");
  if (headerZone) {
    const headerFacility = getHeader$1(event, "x-trellis-facility") || FOUNDER_FACILITY_ID;
    return {
      zoneId: headerZone,
      facilityId: headerFacility,
      source: "header"
    };
  }
  const referer = getHeader$1(event, "referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return zoneForPath(url.pathname);
    } catch {
    }
  }
  return {
    zoneId: FOUNDER_LAB_ZONE_ID,
    facilityId: FOUNDER_FACILITY_ID,
    source: "default"
  };
}

const collections = {
};

const DEFAULT_ENDPOINT = "https://api.iconify.design";
const _ijeAzl = defineCachedEventHandler(async (event) => {
  const url = getRequestURL(event);
  if (!url)
    return createError$1({ status: 400, message: "Invalid icon request" });
  const options = useAppConfig().icon;
  const collectionName = event.context.params?.collection?.replace(/\.json$/, "");
  const collection = collectionName ? await collections[collectionName]?.() : null;
  const apiEndPoint = options.iconifyApiEndpoint || DEFAULT_ENDPOINT;
  const icons = url.searchParams.get("icons")?.split(",");
  if (collection) {
    if (icons?.length) {
      const data = getIcons(
        collection,
        icons
      );
      consola.debug(`[Icon] serving ${(icons || []).map((i) => "`" + collectionName + ":" + i + "`").join(",")} from bundled collection`);
      return data;
    }
  }
  if (options.fallbackToApi === true || options.fallbackToApi === "server-only") {
    const apiUrl = new URL("./" + basename(url.pathname) + url.search, apiEndPoint);
    consola.debug(`[Icon] fetching ${(icons || []).map((i) => "`" + collectionName + ":" + i + "`").join(",")} from iconify api`);
    if (apiUrl.host !== new URL(apiEndPoint).host) {
      return createError$1({ status: 400, message: "Invalid icon request" });
    }
    try {
      const data = await $fetch(apiUrl.href);
      return data;
    } catch (e) {
      consola.error(e);
      if (e.status === 404)
        return createError$1({ status: 404 });
      else
        return createError$1({ status: 500, message: "Failed to fetch fallback icon" });
    }
  }
  return createError$1({ status: 404 });
}, {
  group: "nuxt",
  name: "icon",
  getKey(event) {
    const collection = event.context.params?.collection?.replace(/\.json$/, "") || "unknown";
    const icons = String(getQuery(event).icons || "");
    return `${collection}_${icons.split(",")[0]}_${icons.length}_${hash$1(icons)}`;
  },
  swr: true,
  maxAge: 60 * 60 * 24 * 7
  // 1 week
});

const _oW_KxM = eventHandler(async (event) => {
  const collection = getRouterParam(event, "collection") || event.path?.split("/")?.[2] || "";
  setHeader(event, "Content-Type", "text/plain");
  const data = await useStorage().getItem(`build:content:database.compressed.mjs`) || "";
  if (data) {
    const lineStart = `export const ${collection} = "`;
    const content = String(data).split("\n").find((line) => line.startsWith(lineStart));
    if (content) {
      return content.substring(lineStart.length, content.length - 1);
    }
  }
  return await import('../build/database.compressed.mjs').then((m) => m[collection]);
});

const _SxA8c9 = defineEventHandler(() => {});

async function decompressSQLDump(base64Str, compressionType = "gzip") {
  let binaryData;
  if (typeof Buffer !== "undefined") {
    const buffer = Buffer.from(base64Str, "base64");
    binaryData = Uint8Array.from(buffer);
  } else if (typeof atob !== "undefined") {
    binaryData = Uint8Array.from(atob(base64Str), (c) => c.charCodeAt(0));
  } else {
    throw new TypeError("No base64 decoding method available");
  }
  const response = new Response(new Blob([binaryData]));
  const decompressedStream = response.body?.pipeThrough(new DecompressionStream(compressionType));
  const text = await new Response(decompressedStream).text();
  return JSON.parse(text);
}

function refineContentFields(sql, doc) {
  const fields = findCollectionFields(sql);
  const item = { ...doc };
  for (const key in item) {
    if (fields[key] === "json" && item[key] && item[key] !== "undefined") {
      item[key] = JSON.parse(item[key]);
    }
    if (fields[key] === "boolean" && item[key] !== "undefined") {
      item[key] = Boolean(item[key]);
    }
  }
  for (const key in item) {
    if (item[key] === "NULL") {
      item[key] = void 0;
    }
  }
  return item;
}
function findCollectionFields(sql) {
  const table = sql.match(/FROM\s+(\w+)/);
  if (!table) {
    return {};
  }
  const info = contentManifest[getCollectionName(table[1])];
  return info?.fields || {};
}
function getCollectionName(table) {
  return table.replace(/^_content_/, "");
}

class BoundableStatement {
	_statement;
	constructor(rawStmt) {
		this._statement = rawStmt;
	}
	bind(...params) {
		return new BoundStatement(this, params);
	}
}
class BoundStatement {
	#statement;
	#params;
	constructor(statement, params) {
		this.#statement = statement;
		this.#params = params;
	}
	bind(...params) {
		return new BoundStatement(this.#statement, params);
	}
	all() {
		return this.#statement.all(...this.#params);
	}
	run() {
		return this.#statement.run(...this.#params);
	}
	get() {
		return this.#statement.get(...this.#params);
	}
}

function sqliteConnector(opts) {
	let _db;
	const getDB = () => {
		if (_db) {
			return _db;
		}
		if (opts.name === ":memory:") {
			_db = new Database(":memory:");
			return _db;
		}
		const filePath = resolve$1(opts.cwd || ".", opts.path || `.data/${opts.name || "db"}.sqlite3`);
		mkdirSync(dirname$1(filePath), { recursive: true });
		_db = new Database(filePath);
		return _db;
	};
	return {
		name: "sqlite",
		dialect: "sqlite",
		getInstance: () => getDB(),
		exec: (sql) => getDB().exec(sql),
		prepare: (sql) => new StatementWrapper(() => getDB().prepare(sql)),
		dispose: () => {
			_db?.close?.();
			_db = undefined;
		}
	};
}
class StatementWrapper extends BoundableStatement {
	async all(...params) {
		return this._statement().all(...params);
	}
	async run(...params) {
		const res = this._statement().run(...params);
		return {
			success: res.changes > 0,
			...res
		};
	}
	async get(...params) {
		return this._statement().get(...params);
	}
}

let db;
function loadDatabaseAdapter(config) {
  const { database, localDatabase } = config;
  if (!db) {
    if (["nitro-prerender", "nitro-dev"].includes("node-server")) {
      db = sqliteConnector(refineDatabaseConfig(localDatabase));
    } else {
      db = sqliteConnector(refineDatabaseConfig(database));
    }
  }
  return {
    all: async (sql, params = []) => {
      return db.prepare(sql).all(...params).then((result) => (result || []).map((item) => refineContentFields(sql, item)));
    },
    first: async (sql, params = []) => {
      return db.prepare(sql).get(...params).then((item) => item ? refineContentFields(sql, item) : item);
    },
    exec: async (sql, params = []) => {
      return db.prepare(sql).run(...params);
    }
  };
}
const checkDatabaseIntegrity = /* @__PURE__ */ new Map();
const integrityCheckPromise = /* @__PURE__ */ new Map();
async function checkAndImportDatabaseIntegrity(event, collection, config) {
  if (checkDatabaseIntegrity.get(collection) !== false) {
    checkDatabaseIntegrity.set(collection, false);
    if (!integrityCheckPromise.has(collection)) {
      const _integrityCheck = _checkAndImportDatabaseIntegrity(event, collection, checksums[collection], checksumsStructure[collection], config).then((isValid) => {
        checkDatabaseIntegrity.set(collection, !isValid);
      }).catch((error) => {
        console.error("Database integrity check failed", error);
        checkDatabaseIntegrity.set(collection, true);
        integrityCheckPromise.delete(collection);
      });
      integrityCheckPromise.set(collection, _integrityCheck);
    }
  }
  if (integrityCheckPromise.has(collection)) {
    await integrityCheckPromise.get(collection);
  }
}
async function _checkAndImportDatabaseIntegrity(event, collection, integrityVersion, structureIntegrityVersion, config) {
  const db2 = loadDatabaseAdapter(config);
  const before = await db2.first(`SELECT * FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => null);
  if (before?.version && !String(before.version)?.startsWith(`${config.databaseVersion}--`)) {
    await db2.exec(`DROP TABLE IF EXISTS ${tables.info}`);
    before.version = "";
  }
  const unchangedStructure = before?.structureVersion === structureIntegrityVersion;
  if (before?.version) {
    if (before.version === integrityVersion) {
      if (before.ready) {
        return true;
      }
      await waitUntilDatabaseIsReady(db2, collection);
      return true;
    }
    await db2.exec(`DELETE FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]);
    if (!unchangedStructure) {
      await db2.exec(`DROP TABLE IF EXISTS ${tables[collection]}`);
    }
  }
  const dump = await loadDatabaseDump(event, collection).then(decompressSQLDump);
  const dumpLinesHash = dump.map((row) => row.split(" -- ").pop());
  let hashesInDb = /* @__PURE__ */ new Set();
  if (unchangedStructure) {
    const hashListFromTheDump = new Set(dumpLinesHash);
    const hashesInDbRecords = await db2.all(`SELECT __hash__ FROM ${tables[collection]}`).catch(() => []);
    hashesInDb = new Set(hashesInDbRecords.map((r) => r.__hash__));
    const hashesToDelete = hashesInDb.difference(hashListFromTheDump);
    if (hashesToDelete.size) {
      await db2.exec(`DELETE FROM ${tables[collection]} WHERE __hash__ IN (${Array(hashesToDelete.size).fill("?").join(",")})`, Array.from(hashesToDelete));
    }
  }
  await dump.reduce(async (prev, sql, index) => {
    await prev;
    const hash = dumpLinesHash[index];
    const statement = sql.substring(0, sql.length - hash.length - 4);
    if (unchangedStructure) {
      if (hash === "structure") {
        return Promise.resolve();
      }
      if (hashesInDb.has(hash)) {
        return Promise.resolve();
      }
    }
    await db2.exec(statement).catch((err) => {
      const message = err.message || "Unknown error";
      console.error(`Failed to execute SQL ${sql}: ${message}`);
    });
  }, Promise.resolve());
  const after = await db2.first(`SELECT version FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => ({ version: "" }));
  return after?.version === integrityVersion;
}
const REQUEST_TIMEOUT = 90;
async function waitUntilDatabaseIsReady(db2, collection) {
  let iterationCount = 0;
  let interval;
  await new Promise((resolve, reject) => {
    interval = setInterval(async () => {
      const row = await db2.first(`SELECT ready FROM ${tables.info} WHERE id = ?`, [`checksum_${collection}`]).catch(() => ({ ready: true }));
      if (row?.ready) {
        clearInterval(interval);
        resolve(0);
      }
      if (iterationCount++ > REQUEST_TIMEOUT) {
        clearInterval(interval);
        reject(new Error("Waiting for another database initialization timed out"));
      }
    }, 1e3);
  }).catch((e) => {
    throw e;
  }).finally(() => {
    if (interval) {
      clearInterval(interval);
    }
  });
}
async function loadDatabaseDump(event, collection) {
  return await fetchDatabase(event, collection).catch((e) => {
    console.error("Failed to fetch compressed dump", e);
    return "";
  });
}
function refineDatabaseConfig(config) {
  if (config.type === "d1") {
    return { ...config, bindingName: config.bindingName || config.binding };
  }
  if (config.type === "sqlite") {
    const _config = { ...config };
    if (config.filename === ":memory:") {
      return { name: ":memory:" };
    }
    if ("filename" in config) {
      const filename = isAbsolute(config?.filename || "") || config?.filename === ":memory:" ? config?.filename : new URL(config.filename, globalThis._importMeta_.url).pathname;
      _config.path = process.platform === "win32" && filename.startsWith("/") ? filename.slice(1) : filename;
    }
    return _config;
  }
  if (config.type === "pglite") {
    return {
      dataDir: config.dataDir,
      // Pass through any other PGlite-specific options
      ...config
    };
  }
  return config;
}

const SQL_COMMANDS = /SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|\$/i;
const SQL_COUNT_REGEX = /COUNT\((DISTINCT )?([a-z_]\w+|\*)\)/i;
const SQL_SELECT_REGEX = /^SELECT (.*) FROM (\w+)( WHERE .*)? ORDER BY (["\w,\s]+) (ASC|DESC)( LIMIT \d+)?( OFFSET \d+)?$/;
function assertSafeQuery(sql, collection) {
  if (!sql) {
    throw new Error("Invalid query: Query cannot be empty");
  }
  const cleanedupQuery = cleanupQuery(sql);
  if (cleanedupQuery !== sql) {
    throw new Error("Invalid query: SQL comments are not allowed");
  }
  const match = sql.match(SQL_SELECT_REGEX);
  if (!match) {
    throw new Error("Invalid query: Query must be a valid SELECT statement with proper syntax");
  }
  const [_, select, from, where, orderBy, order, limit, offset] = match;
  const columns = select?.trim().split(", ") || [];
  if (columns.length === 1) {
    if (columns[0] !== "*" && !columns[0]?.match(SQL_COUNT_REGEX) && !columns[0]?.match(/^"[a-z_]\w+"$/i)) {
      throw new Error(`Invalid query: Column '${columns[0]}' has invalid format. Expected *, COUNT(), or a quoted column name`);
    }
  } else if (!columns.every((column) => column.match(/^"[a-z_]\w+"$/i))) {
    throw new Error("Invalid query: Multiple columns must be properly quoted and alphanumeric");
  }
  if (from !== `_content_${collection}`) {
    const collection2 = String(from || "").replace(/^_content_/, "");
    throw new Error(`Invalid query: Collection '${collection2}' does not exist`);
  }
  if (where) {
    if (!where.startsWith(" WHERE (") || !where.endsWith(")")) {
      throw new Error("Invalid query: WHERE clause must be properly enclosed in parentheses");
    }
    const noString = cleanupQuery(where, { removeString: true });
    if (noString.match(SQL_COMMANDS)) {
      throw new Error("Invalid query: WHERE clause contains unsafe SQL commands");
    }
  }
  const _order = (orderBy + " " + order).split(", ");
  if (!_order.every((column) => column.match(/^("[a-zA-Z_]+"|[a-zA-Z_]+) (ASC|DESC)$/))) {
    throw new Error("Invalid query: ORDER BY clause must contain valid column names followed by ASC or DESC");
  }
  if (limit !== void 0 && !limit.match(/^ LIMIT \d+$/)) {
    throw new Error("Invalid query: LIMIT clause must be a positive number");
  }
  if (offset !== void 0 && !offset.match(/^ OFFSET \d+$/)) {
    throw new Error("Invalid query: OFFSET clause must be a positive number");
  }
  return true;
}
function cleanupQuery(query, options = { removeString: false }) {
  let inString = false;
  let stringFence = "";
  let result = "";
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const prevChar = query[i - 1];
    const nextChar = query[i + 1];
    if (char === "'" || char === '"') {
      if (!options?.removeString) {
        result += char;
        continue;
      }
      if (inString) {
        if (char !== stringFence || nextChar === stringFence || prevChar === stringFence) {
          continue;
        }
        inString = false;
        stringFence = "";
        continue;
      } else {
        inString = true;
        stringFence = char;
        continue;
      }
    }
    if (!inString) {
      if (char === "-" && nextChar === "-") {
        return result;
      }
      if (char === "/" && nextChar === "*") {
        i += 2;
        while (i < query.length && !(query[i] === "*" && query[i + 1] === "/")) {
          i += 1;
        }
        i += 2;
        continue;
      }
      result += char;
    }
  }
  return result;
}

const _amsIvJ = eventHandler(async (event) => {
  const { sql } = await readBody(event);
  const collection = getRouterParam(event, "collection") || event.path?.split("/")?.[2] || "";
  assertSafeQuery(sql, collection);
  const conf = useRuntimeConfig().content;
  if (conf.integrityCheck) {
    await checkAndImportDatabaseIntegrity(event, collection, conf);
  }
  return loadDatabaseAdapter(conf).all(sql);
});

const _lazy_uueIXC = () => import('../routes/api/admin/backfill-channel-links.post.mjs');
const _lazy_YzGX4S = () => import('../routes/api/admin/purge-seed-data.post.mjs');
const _lazy_Thk372 = () => import('../routes/api/agent/chat.post.mjs');
const _lazy_3_RxIT = () => import('../routes/api/chat/notify-message.post.mjs');
const _lazy_2Whbn6 = () => Promise.resolve().then(function () { return classifyEmailLlm_post$1; });
const _lazy_VS1ORH = () => import('../routes/api/enrich-entity-llm.post.mjs');
const _lazy_UNgMjh = () => import('../routes/api/enrich-file-llm.post.mjs');
const _lazy_GVSm9N = () => import('../routes/api/extract-entities-llm.post.mjs');
const _lazy_KUbyAR = () => import('../routes/api/extract-entities.get.mjs');
const _lazy_b5_dAG = () => import('../routes/api/graph/_...path_.mjs');
const _lazy_y9yBWt = () => import('../routes/api/graph/events.get.mjs');
const _lazy_CXmJvA = () => import('../routes/api/integrations/github/_credentials.mjs');
const _lazy_ZEznor = () => import('../routes/api/integrations/github/_shared.mjs');
const _lazy_J1lvGj = () => import('../routes/api/integrations/github/auth.get.mjs');
const _lazy_zgvhw4 = () => import('../routes/api/integrations/github/callback.get.mjs');
const _lazy_bTfS8G = () => import('../routes/api/integrations/github/issues.get.mjs');
const _lazy_za_aPC = () => import('../routes/api/integrations/github/prs.get.mjs');
const _lazy_utuJL5 = () => import('../routes/api/integrations/github/repos.get.mjs');
const _lazy_CBk5QE = () => import('../routes/api/integrations/github/revoke.post.mjs');
const _lazy_1STuPh = () => Promise.resolve().then(function () { return _credentials; });
const _lazy_TBg7Ng = () => import('../routes/api/integrations/gmail/auth.get.mjs');
const _lazy_bYUBXx = () => import('../routes/api/integrations/gmail/callback.get.mjs');
const _lazy_tgP5cD = () => import('../routes/api/integrations/gmail/labels.get.mjs');
const _lazy_5qPGw4 = () => import('../routes/api/integrations/gmail/labels.post.mjs');
const _lazy_8I_jn4 = () => import('../routes/api/integrations/gmail/messages.get.mjs');
const _lazy_lEI9wB = () => import('../routes/api/integrations/gmail/revoke.post.mjs');
const _lazy_zMMuyB = () => import('../routes/api/integrations/gmail/send.post.mjs');
const _lazy_MmcsQF = () => Promise.resolve().then(function () { return _credentials$1; });
const _lazy_I2f2R4 = () => import('../routes/api/integrations/google-calendar/auth.get.mjs');
const _lazy_uDb2nY = () => import('../routes/api/integrations/google-calendar/callback.get.mjs');
const _lazy_LK2422 = () => import('../routes/api/integrations/google-calendar/events.get.mjs');
const _lazy_w8Jje0 = () => import('../routes/api/integrations/google-calendar/revoke.post.mjs');
const _lazy_OxQKo9 = () => import('../routes/api/invite.post.mjs');
const _lazy_m3qdnR = () => import('../routes/api/invite/_token_.get.mjs');
const _lazy_V2Vgz2 = () => import('../routes/api/llm/embed.post.mjs');
const _lazy_r5iIx9 = () => import('../routes/api/llm/generate.post.mjs');
const _lazy_SWkSDQ = () => import('../routes/api/memberships.get.mjs');
const _lazy_08G08e = () => import('../routes/api/notifications/_id_.delete.mjs');
const _lazy_zcEo5O = () => import('../routes/api/notifications/_id_.patch.mjs');
const _lazy_ONbZbQ = () => import('../routes/api/index.post.mjs');
const _lazy_yTcDB1 = () => import('../routes/api/notify.post.mjs');
const _lazy_ctSa7G = () => import('../routes/api/platform/_...path_.mjs');
const _lazy_CM5FNz = () => import('../routes/api/resolve-invites.post.mjs');
const _lazy_4w2zyh = () => import('../routes/api/storage/init-local.post.mjs');
const _lazy_nhzRfL = () => import('../routes/api/storage/local-file.get.mjs');
const _lazy_02uqNC = () => import('../routes/api/storage/local-upload.post.mjs');
const _lazy_v0UZpt = () => import('../routes/api/storage/proxy-upload.post.mjs');
const _lazy_QkJtAX = () => import('../routes/api/storage/upload.post.mjs');
const _lazy_efqW84 = () => Promise.resolve().then(function () { return summarizeEntityLlm_post$1; });
const _lazy_sT8EPZ = () => import('../routes/api/test-email.post.mjs');
const _lazy_eMWHyk = () => import('../routes/api/transfer-ownership.post.mjs');
const _lazy_NKcWBs = () => import('../routes/api/unfurl.get.mjs');
const _lazy_5Yu8_Z = () => import('../routes/api/weather.get.mjs');
const _lazy_geTD7f = () => import('../routes/api/workflows/_debug.get.mjs');
const _lazy_7m0tsE = () => import('../routes/api/workflows/execute.post.mjs');
const _lazy_HcC139 = () => import('../routes/api/workflows/tool/_name_.post.mjs');
const _lazy_6JapAF = () => import('../routes/api/workflows/triggers/_id_.delete.mjs');
const _lazy_BbfKkg = () => import('../routes/api/workflows/triggers/_id_.get.mjs');
const _lazy_XjRY9u = () => import('../routes/api/workflows/triggers/_id_.patch.mjs');
const _lazy_UyTPyK = () => import('../routes/api/workflows/triggers/_id/fire.post.mjs');
const _lazy_ViRGBL = () => import('../routes/api/workflows/index.get.mjs');
const _lazy_YZZef6 = () => import('../routes/api/workflows/index.post.mjs');
const _lazy_CY9ujG = () => import('../routes/api/workflows/webhook/_token_.post.mjs');
const _lazy_WjOxdT = () => import('../routes/api/workspace-context.get.mjs');
const _lazy_mlf8Ua = () => import('../routes/api/youtube/transcript.post.mjs');
const _lazy_5EVSxT = () => import('../routes/renderer.mjs');

const handlers = [
  { route: '', handler: _W1V__e, lazy: false, middleware: true, method: undefined },
  { route: '/api/admin/backfill-channel-links', handler: _lazy_uueIXC, lazy: true, middleware: false, method: "post" },
  { route: '/api/admin/purge-seed-data', handler: _lazy_YzGX4S, lazy: true, middleware: false, method: "post" },
  { route: '/api/agent/chat', handler: _lazy_Thk372, lazy: true, middleware: false, method: "post" },
  { route: '/api/chat/notify-message', handler: _lazy_3_RxIT, lazy: true, middleware: false, method: "post" },
  { route: '/api/classify-email-llm', handler: _lazy_2Whbn6, lazy: true, middleware: false, method: "post" },
  { route: '/api/enrich-entity-llm', handler: _lazy_VS1ORH, lazy: true, middleware: false, method: "post" },
  { route: '/api/enrich-file-llm', handler: _lazy_UNgMjh, lazy: true, middleware: false, method: "post" },
  { route: '/api/extract-entities-llm', handler: _lazy_GVSm9N, lazy: true, middleware: false, method: "post" },
  { route: '/api/extract-entities', handler: _lazy_KUbyAR, lazy: true, middleware: false, method: "get" },
  { route: '/api/graph/**:path', handler: _lazy_b5_dAG, lazy: true, middleware: false, method: undefined },
  { route: '/api/graph/events', handler: _lazy_y9yBWt, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/github/_credentials', handler: _lazy_CXmJvA, lazy: true, middleware: false, method: undefined },
  { route: '/api/integrations/github/_shared', handler: _lazy_ZEznor, lazy: true, middleware: false, method: undefined },
  { route: '/api/integrations/github/auth', handler: _lazy_J1lvGj, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/github/callback', handler: _lazy_zgvhw4, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/github/issues', handler: _lazy_bTfS8G, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/github/prs', handler: _lazy_za_aPC, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/github/repos', handler: _lazy_utuJL5, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/github/revoke', handler: _lazy_CBk5QE, lazy: true, middleware: false, method: "post" },
  { route: '/api/integrations/gmail/_credentials', handler: _lazy_1STuPh, lazy: true, middleware: false, method: undefined },
  { route: '/api/integrations/gmail/auth', handler: _lazy_TBg7Ng, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/gmail/callback', handler: _lazy_bYUBXx, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/gmail/labels', handler: _lazy_tgP5cD, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/gmail/labels', handler: _lazy_5qPGw4, lazy: true, middleware: false, method: "post" },
  { route: '/api/integrations/gmail/messages', handler: _lazy_8I_jn4, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/gmail/revoke', handler: _lazy_lEI9wB, lazy: true, middleware: false, method: "post" },
  { route: '/api/integrations/gmail/send', handler: _lazy_zMMuyB, lazy: true, middleware: false, method: "post" },
  { route: '/api/integrations/google-calendar/_credentials', handler: _lazy_MmcsQF, lazy: true, middleware: false, method: undefined },
  { route: '/api/integrations/google-calendar/auth', handler: _lazy_I2f2R4, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/google-calendar/callback', handler: _lazy_uDb2nY, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/google-calendar/events', handler: _lazy_LK2422, lazy: true, middleware: false, method: "get" },
  { route: '/api/integrations/google-calendar/revoke', handler: _lazy_w8Jje0, lazy: true, middleware: false, method: "post" },
  { route: '/api/invite', handler: _lazy_OxQKo9, lazy: true, middleware: false, method: "post" },
  { route: '/api/invite/:token', handler: _lazy_m3qdnR, lazy: true, middleware: false, method: "get" },
  { route: '/api/llm/embed', handler: _lazy_V2Vgz2, lazy: true, middleware: false, method: "post" },
  { route: '/api/llm/generate', handler: _lazy_r5iIx9, lazy: true, middleware: false, method: "post" },
  { route: '/api/memberships', handler: _lazy_SWkSDQ, lazy: true, middleware: false, method: "get" },
  { route: '/api/notifications/:id', handler: _lazy_08G08e, lazy: true, middleware: false, method: "delete" },
  { route: '/api/notifications/:id', handler: _lazy_zcEo5O, lazy: true, middleware: false, method: "patch" },
  { route: '/api/notifications', handler: _lazy_ONbZbQ, lazy: true, middleware: false, method: "post" },
  { route: '/api/notify', handler: _lazy_yTcDB1, lazy: true, middleware: false, method: "post" },
  { route: '/api/platform/**:path', handler: _lazy_ctSa7G, lazy: true, middleware: false, method: undefined },
  { route: '/api/resolve-invites', handler: _lazy_CM5FNz, lazy: true, middleware: false, method: "post" },
  { route: '/api/storage/init-local', handler: _lazy_4w2zyh, lazy: true, middleware: false, method: "post" },
  { route: '/api/storage/local-file', handler: _lazy_nhzRfL, lazy: true, middleware: false, method: "get" },
  { route: '/api/storage/local-upload', handler: _lazy_02uqNC, lazy: true, middleware: false, method: "post" },
  { route: '/api/storage/proxy-upload', handler: _lazy_v0UZpt, lazy: true, middleware: false, method: "post" },
  { route: '/api/storage/upload', handler: _lazy_QkJtAX, lazy: true, middleware: false, method: "post" },
  { route: '/api/summarize-entity-llm', handler: _lazy_efqW84, lazy: true, middleware: false, method: "post" },
  { route: '/api/test-email', handler: _lazy_sT8EPZ, lazy: true, middleware: false, method: "post" },
  { route: '/api/transfer-ownership', handler: _lazy_eMWHyk, lazy: true, middleware: false, method: "post" },
  { route: '/api/unfurl', handler: _lazy_NKcWBs, lazy: true, middleware: false, method: "get" },
  { route: '/api/weather', handler: _lazy_5Yu8_Z, lazy: true, middleware: false, method: "get" },
  { route: '/api/workflows/_debug', handler: _lazy_geTD7f, lazy: true, middleware: false, method: "get" },
  { route: '/api/workflows/execute', handler: _lazy_7m0tsE, lazy: true, middleware: false, method: "post" },
  { route: '/api/workflows/tool/:name', handler: _lazy_HcC139, lazy: true, middleware: false, method: "post" },
  { route: '/api/workflows/triggers/:id', handler: _lazy_6JapAF, lazy: true, middleware: false, method: "delete" },
  { route: '/api/workflows/triggers/:id', handler: _lazy_BbfKkg, lazy: true, middleware: false, method: "get" },
  { route: '/api/workflows/triggers/:id', handler: _lazy_XjRY9u, lazy: true, middleware: false, method: "patch" },
  { route: '/api/workflows/triggers/:id/fire', handler: _lazy_UyTPyK, lazy: true, middleware: false, method: "post" },
  { route: '/api/workflows/triggers', handler: _lazy_ViRGBL, lazy: true, middleware: false, method: "get" },
  { route: '/api/workflows/triggers', handler: _lazy_YZZef6, lazy: true, middleware: false, method: "post" },
  { route: '/api/workflows/webhook/:token', handler: _lazy_CY9ujG, lazy: true, middleware: false, method: "post" },
  { route: '/api/workspace-context', handler: _lazy_WjOxdT, lazy: true, middleware: false, method: "get" },
  { route: '/api/youtube/transcript', handler: _lazy_mlf8Ua, lazy: true, middleware: false, method: "post" },
  { route: '/__nuxt_error', handler: _lazy_5EVSxT, lazy: true, middleware: false, method: undefined },
  { route: '/api/_nuxt_icon/:collection', handler: _ijeAzl, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs/sql_dump.txt', handler: _oW_KxM, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/info/sql_dump.txt', handler: _oW_KxM, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: _SxA8c9, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/docs/query', handler: _amsIvJ, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_content/info/query', handler: _amsIvJ, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_5EVSxT, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const nitroApp = useNitroApp();
const server = cert && key ? new Server({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$1(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const path = process.env.NITRO_UNIX_SOCKET;
const listener = server.listen(path ? { path } : { port, host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  if (typeof addressInfo === "string") {
    console.log(`Listening on unix socket ${addressInfo}`);
    return;
  }
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
const nodeServer = {};

export { PlatformDeleteBodySchema as $, GraphSummaryQuerySchema as A, GraphNodesBodySchema as B, GraphQueryBodySchema as C, GraphMutateBodySchema as D, GraphOntologyCreateBodySchema as E, GraphOntologyUpdateBodySchema as F, GraphNodeParamsSchema as G, GraphOntologyDeleteBodySchema as H, recordStrictRejection as I, onMutation as J, setCookie as K, sendRedirect as L, useRuntimeConfig as M, getCookie as N, deleteCookie as O, requireConnectionOwner as P, getValidAccessToken as Q, sendEmail as R, inviteEmailHtml as S, parseApiRouterParams as T, deleteNotification as U, updateNotificationStatus as V, createNotification as W, PlatformOrgCreateBodySchema as X, PlatformAppListQuerySchema as Y, PlatformAppCreateBodySchema as Z, PlatformUpdateBodySchema as _, resolveRoutingDecision as a, PlatformContextQuerySchema as a0, PlatformOptionalAppQuerySchema as a1, PlatformCollectionCreateBodySchema as a2, PlatformPageCreateBodySchema as a3, PlatformCommentAddBodySchema as a4, PlatformTagCreateBodySchema as a5, PlatformTagAssignBodySchema as a6, PlatformBulkUpdateBodySchema as a7, PlatformBulkDeleteBodySchema as a8, PlatformWorkflowCreateBodySchema as a9, WorkflowTriggerCreateBodySchema as aA, findWebhookTrigger as aB, getRequestHeaders as aC, WorkflowWebhookTokenParamsSchema as aD, WorkflowWebhookPayloadSchema as aE, buildAssetsURL as aF, getResponseStatusText as aG, getResponseStatus as aH, defineRenderHandler as aI, publicAssetsURL as aJ, destr as aK, getRouteRules as aL, hasProtocol as aM, relative as aN, joinURL as aO, useNitroApp as aP, nodeServer as aQ, PlatformSettingGetQuerySchema as aa, PlatformSettingSetBodySchema as ab, PlatformSettingListQuerySchema as ac, PlatformFileUploadBodySchema as ad, PlatformInviteSendBodySchema as ae, setResponseHeader as af, readMultipartFormData as ag, listTriggers as ah, isCronDue as ai, getListenerCount as aj, executeWorkflow as ak, WorkflowExecuteBodySchema as al, invokeWorkflowTool as am, listWorkflowTools as an, WorkflowToolNameParamsSchema as ao, WorkflowToolInvokeBodySchema as ap, deleteTrigger as aq, WorkflowTriggerIdParamsSchema as ar, WorkflowTriggerDeleteQuerySchema as as, getTrigger as at, updateTrigger as au, WorkflowTriggerUpdateBodySchema as av, recordTriggerFire as aw, WorkflowTriggerFireBodySchema as ax, WorkflowTriggerListQuerySchema as ay, createTrigger as az, sendStream as b, createError$1 as c, defineEventHandler as d, useTqlKernel as e, emitMutation as f, dispatchNotificationEmailAsync as g, getQuery as h, getZoneGuardStats as i, getZoneGuardMode as j, parseApiQuery as k, getMutationLog as l, useWorkspaceConfig as m, parseApiBody as n, getHeader$1 as o, pushMutationLog as p, checkMutation as q, readBody as r, setResponseHeaders as s, GraphOntologyParamsSchema as t, useInstantAdmin as u, validateApiInput as v, getRequestURL as w, shouldCaptureDecision as x, captureDecision as y, zoneFromRequest as z };
//# sourceMappingURL=nitro.mjs.map
