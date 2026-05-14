import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { defaultBlockParse } from 'simple-markdown';

const s = StyleSheet.create({
  body: { color: '#000', fontSize: 16, lineHeight: 26 },
  heading1: { fontSize: 22, fontWeight: '700', color: '#000', marginVertical: 4 },
  heading2: { fontSize: 20, fontWeight: '700', color: '#000', marginVertical: 4 },
  heading3: { fontSize: 18, fontWeight: '600', color: '#000', marginVertical: 4 },
  heading4: { fontSize: 16, fontWeight: '600', color: '#333', marginVertical: 2 },
  headingBlock: { marginVertical: 4 },
  paragraph: { marginVertical: 6 },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' as const },
  del: { textDecorationLine: 'line-through' as const },
  link: { color: '#007AFF' },
  inlineCode: {
    backgroundColor: '#F2F2F7',
    color: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
  blockQuote: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#F0F6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  codeBlock: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  codeBlockText: { fontSize: 14, fontFamily: 'monospace', color: '#333', lineHeight: 22 },
  hr: { backgroundColor: '#E0E0E0', height: 1, marginVertical: 12 },
  list: { marginVertical: 4 },
  listItem: { flexDirection: 'row', marginVertical: 2, paddingLeft: 4, overflow: 'visible' as const },
  listBullet: { fontSize: 16, color: '#000', width: 20, lineHeight: 26 },
  listText: { flex: 1, overflow: 'visible' as const },
});

/* ------------------------------------------------------------------ */
/*  INLINE rendering – returns ReactNodes that can live inside <Text>   */
/* ------------------------------------------------------------------ */

function renderInlines(nodes: any[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    if (typeof node === 'string') return node;

    // content can be a string (e.g. inlineCode), or an array, or a nested object
    const content = node.content;
    const key = `inl${i}`;

    switch (node.type) {
      case 'text':       return <Text key={key}>{typeof content === 'string' ? content.replace(/\n+$/, '') : content}</Text>;
      case 'strong':     return <Text key={key} style={s.strong}>{renderInlines(Array.isArray(content) ? content : [content])}</Text>;
      case 'em':         return <Text key={key} style={s.em}>{renderInlines(Array.isArray(content) ? content : [content])}</Text>;
      case 'del':        return <Text key={key} style={s.del}>{renderInlines(Array.isArray(content) ? content : [content])}</Text>;
      case 'link':       return <Text key={key} style={s.link}>{renderInlines(Array.isArray(content) ? content : [content])}</Text>;
      case 'inlineCode': return <Text key={key} style={s.inlineCode}>{content}</Text>;
      default:           return typeof content === 'string' ? content : null;
    }
  }).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  TEXT-BLOCK helper – single <Text> wrapping all inline children      */
/* ------------------------------------------------------------------ */

function TextBlock({ content: content, style }: { content: any; style?: any }) {
  const nodes = Array.isArray(content) ? content : [content];
  return <Text style={[s.body, style]}>{renderInlines(nodes)}</Text>;
}

const INLINE_TYPES = new Set(['text', 'strong', 'em', 'del', 'link', 'inlineCode']);

/** Group consecutive inline nodes into a single TextBlock;
 *  block-level children (list, codeBlock, etc.) render separately. */
function renderMixedContent(children: any[], keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let inlineBuffer: any[] = [];

  const flush = () => {
    if (inlineBuffer.length === 0) return;
    out.push(<TextBlock key={`${keyPrefix}-ib-${out.length}`} content={inlineBuffer} />);
    inlineBuffer = [];
  };

  for (const child of children) {
    if (!child || typeof child === 'string') {
      inlineBuffer.push(child);
    } else if (child.type === 'paragraph') {
      // paragraph content can mix inline + block nodes (e.g. nested lists)
      flush();
      out.push(...renderMixedContent(child.content, `${keyPrefix}-p-`));
    } else if (INLINE_TYPES.has(child.type)) {
      inlineBuffer.push(child);
    } else if (child.type === 'list') {
      flush();
      out.push(...renderBlocks([child], `${keyPrefix}-sublist-`));
    } else {
      // Other block types
      flush();
      out.push(...renderBlocks([child], `${keyPrefix}-block-`));
    }
  }
  flush();
  return out;
}

/* ------------------------------------------------------------------ */
/*  BLOCK rendering                                                    */
/* ------------------------------------------------------------------ */

function renderBlocks(nodes: any[], keyPrefix = ''): React.ReactNode[] {
  return nodes.map((node, i) => {
    if (!node?.type) return null;
    const key = `${keyPrefix}${i}`;

    switch (node.type) {
      case 'heading': {
        const styleKey = `heading${node.level || 1}`;
        const headingStyle = (s as any)[styleKey] || s.heading1;
        return (
          <View key={key} style={s.headingBlock}>
            <TextBlock content={node.content} style={headingStyle} />
          </View>
        );
      }

      case 'paragraph':
        return (
          <View key={key} style={s.paragraph}>
            <TextBlock content={node.content} />
          </View>
        );

      case 'blockQuote':
        return (
          <View key={key} style={s.blockQuote}>
            {renderBlocks(node.content, `${key}-`)}
          </View>
        );

      case 'codeBlock':
        return (
          <View key={key} style={s.codeBlock}>
            <Text style={s.codeBlockText}>{node.content}</Text>
          </View>
        );

      case 'hr':
        return <View key={key} style={s.hr} />;

      case 'list': {
        const ordered = node.ordered || false;
        const items: any[][] = node.items || [];
        return (
          <View key={key} style={s.list}>
            {items.map((item, idx) => (
              <View key={`${key}-li-${idx}`} style={s.listItem}>
                <Text style={s.listBullet}>
                  {ordered ? `${(node.start || 1) + idx}.` : '•'}
                </Text>
                <View style={s.listText}>
                  {renderMixedContent(item, `${key}-li-${idx}`)}
                </View>
              </View>
            ))}
          </View>
        );
      }

      default:
        return null;
    }
  }).filter(Boolean) as React.ReactNode[];
}

/* ------------------------------------------------------------------ */
/*  PUBLIC COMPONENT                                                   */
/* ------------------------------------------------------------------ */

interface Props {
  children: string;
}

export default function MarkdownRenderer({ children }: Props) {
  if (!children) return null;

  let ast: any[];
  try {
    ast = defaultBlockParse(children);
  } catch {
    return <Text style={s.body}>{children}</Text>;
  }

  return <View>{renderBlocks(ast)}</View>;
}
