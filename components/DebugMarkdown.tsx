import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { defaultBlockParse } from 'simple-markdown';
import MarkdownRenderer from './MarkdownRenderer';

interface Props {
  children: string;
}

export default function DebugMarkdown({ children }: Props) {
  const [showAst, setShowAst] = useState(false);

  if (!children) return null;

  let ast: any;
  try {
    ast = defaultBlockParse(children);
  } catch (e: any) {
    return <Text style={{ color: 'red' }}>Parse error: {String(e)}</Text>;
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setShowAst(!showAst)}
      >
        <Text style={styles.toggleText}>
          {showAst ? '🔙 返回渲染' : '🔍 查看解析树'}
        </Text>
      </TouchableOpacity>
      {showAst ? (
        <View style={styles.astWrap}>
          <ScrollView horizontal style={styles.astHScroll}>
            <Text style={styles.astText} selectable>{JSON.stringify(ast, null, 2)}</Text>
          </ScrollView>
        </View>
      ) : (
        <MarkdownRenderer>{children}</MarkdownRenderer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    alignSelf: 'flex-end',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 12,
    color: '#007AFF',
  },
  astWrap: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    minHeight: 400,
  },
  astHScroll: {
    flex: 1,
  },
  astText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#333',
  },
});
