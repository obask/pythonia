import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';

hljs.registerLanguage('python', python);

function highlight(code: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`;
    } catch {
      /* fall through to escaped */
    }
  }
  const escaped = md.utils.escapeHtml(code);
  return `<pre class="hljs"><code>${escaped}</code></pre>`;
}

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  highlight
});

export function renderMarkdown(input: string): string {
  return md.render(input);
}
