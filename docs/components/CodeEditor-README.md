# CodeEditor Component

Monaco-based code editor component for Vue 3 with auto theme detection and variants.

## Installation

Packages installing:

- `@guolao/vue-monaco-editor` - Monaco editor wrapper for Vue
- `clsx` - Class utility
- `class-variance-authority` - Variant styling

## Basic Usage

```vue
<script setup>
  import { CodeEditor } from '~/components/CodeEditor';

  const code = ref('console.log("Hello, World!")');
</script>

<template>
  <CodeEditor v-model="code" language="javascript" height="400px" />
</template>
```

## Props

| Prop          | Type                                             | Default        | Description                               |
| ------------- | ------------------------------------------------ | -------------- | ----------------------------------------- |
| `modelValue`  | `string`                                         | `''`           | Editor content (v-model)                  |
| `language`    | `string`                                         | `'javascript'` | Language mode (js, json, html, css, etc.) |
| `theme`       | `'vs' \| 'vs-dark' \| 'hc-black' \| 'auto'`      | `'auto'`       | Editor theme (auto follows dark mode)     |
| `height`      | `string \| number`                               | `'300px'`      | Editor height                             |
| `width`       | `string \| number`                               | `'100%'`       | Editor width                              |
| `readonly`    | `boolean`                                        | `false`        | Read-only mode                            |
| `lineNumbers` | `boolean`                                        | `true`         | Show line numbers                         |
| `minimap`     | `boolean`                                        | `false`        | Show minimap                              |
| `wordWrap`    | `'on' \| 'off' \| 'wordWrapColumn' \| 'bounded'` | `'on'`         | Word wrap behavior                        |
| `fontSize`    | `number`                                         | `14`           | Font size                                 |
| `tabSize`     | `number`                                         | `2`            | Tab size                                  |
| `options`     | `Record<string, any>`                            | `{}`           | Additional Monaco options                 |
| `variant`     | `'default' \| 'ghost' \| 'outline'`              | `'default'`    | Style variant                             |

## Variants

### Default

```vue
<CodeEditor variant="default" v-model="code" />
```

Standard bordered card with background.

### Ghost

```vue
<CodeEditor variant="ghost" v-model="code" />
```

No border, transparent background.

### Outline

```vue
<CodeEditor variant="outline" v-model="code" />
```

Border only, transparent background.

## Events

| Event                | Payload  | Description                |
| -------------------- | -------- | -------------------------- |
| `@update:modelValue` | `string` | Emitted on content change  |
| `@change`            | `string` | Emitted on content change  |
| `@mount`             | `editor` | Emitted when editor mounts |

## Examples

### JSON-LD Editor

```vue
<CodeEditor
  v-model="jsonLdContent"
  language="json"
  height="100%"
  variant="ghost"
  :options="{
    formatOnPaste: true,
    formatOnType: true,
  }"
/>
```

### Read-only Code Display

```vue
<CodeEditor
  :model-value="readonlyCode"
  language="typescript"
  :readonly="true"
  :minimap="true"
  variant="outline"
/>
```

### Auto-save with Debounce

```vue
<script setup>
  const code = ref('');
  const saveCode = useDebounceFn(async (newCode) => {
    await api.save(newCode);
  }, 1000);
</script>

<template>
  <CodeEditor v-model="code" @change="saveCode" />
</template>
```

## Supported Languages

Common languages:

- `javascript` / `typescript`
- `json` / `jsonld`
- `html` / `css`
- `markdown`
- `python` / `java` / `go`
- `sql` / `yaml` / `xml`

[Full list in Monaco docs](https://microsoft.github.io/monaco-editor/monarch.html)
