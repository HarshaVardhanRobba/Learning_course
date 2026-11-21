import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import sanitizeHtml from 'sanitize-html'

/**
 * One typographic style for both editor formats, so Markdown and rich text render the same way.
 * Applied with descendant selectors because both formats produce plain HTML elements.
 */
const prose = [
  'max-w-none text-[15px] leading-7 text-ink [overflow-wrap:anywhere] dark:text-cream/90',
  '[&>*:first-child]:mt-0',
  '[&_h1]:mt-8 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-semibold',
  '[&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold',
  '[&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold',
  '[&_p]:mt-4 [&_strong]:font-semibold [&_em]:italic',
  '[&_a]:font-medium [&_a]:text-[#8a6430] [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-gold-soft',
  '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1.5',
  '[&_blockquote]:mt-4 [&_blockquote]:border-l-4 [&_blockquote]:border-gold [&_blockquote]:pl-4 [&_blockquote]:text-taupe dark:[&_blockquote]:text-sand/70',
  '[&_code]:rounded [&_code]:bg-sand/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] dark:[&_code]:bg-cocoa',
  '[&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-espresso [&_pre]:p-4 [&_pre]:text-cream',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-cream',
  '[&_table]:mt-4 [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_td]:[overflow-wrap:normal] [&_th]:[overflow-wrap:normal] [&_th]:border [&_th]:border-sand [&_th]:px-3 [&_th]:py-2 [&_th]:text-left',
  '[&_td]:border [&_td]:border-sand [&_td]:px-3 [&_td]:py-2 dark:[&_td]:border-cocoa dark:[&_th]:border-cocoa',
  '[&_img]:mt-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_hr]:my-8 [&_hr]:border-sand dark:[&_hr]:border-cocoa',
].join(' ')

/** Rich text comes from an editor as HTML; only formatting tags survive, never scripts, styles or handlers. */
function sanitizeRichText(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'span',
    ],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'title'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'] },
    allowedSchemes: ['https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) },
  })
}

export function LessonContent({ content, format }: { content: string; format: 'markdown' | 'rich_text' }) {
  if (!content.trim()) return null
  if (format === 'rich_text') {
    return <div className={prose} dangerouslySetInnerHTML={{ __html: sanitizeRichText(content) }} />
  }
  return (
    <div className={prose}>
      {/* Raw HTML inside Markdown is not rendered; links open in a new tab. */}
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
      >
        {content}
      </Markdown>
    </div>
  )
}
