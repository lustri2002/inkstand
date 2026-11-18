declare module 'markdown-it-task-lists';
declare module 'markdown-it-footnote' {
  import type { PluginSimple } from 'markdown-it';
  const footnote: PluginSimple;
  export default footnote;
}
declare module 'markdown-it-emoji' {
  import type { PluginWithOptions } from 'markdown-it';
  export const full: PluginWithOptions<{ shortcuts?: Record<string, string | string[]> }>;
}
