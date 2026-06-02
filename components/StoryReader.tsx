import React, { useState, useMemo, useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Story } from '../shared/storyData';
import { countChars } from '../shared/storyData';

interface Props {
  story: Story;
  onClose: () => void;
}

// Approximate chars per page based on screen width & reasonable font size.
// We split by paragraphs to keep natural reading rhythm.
const CHARS_PER_PAGE = 380;

export default function StoryReader({ story, onClose }: Props) {
  const [showUI, setShowUI] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Split content into pages by paragraphs
  const pages = useMemo(() => {
    if (!story.content?.trim()) {
      return ['（还没有内容）\n\n返回编辑器开始写作吧。'];
    }

    const paragraphs = story.content.split(/\n\n+/);
    const result: string[] = [];
    let buf = '';

    for (const para of paragraphs) {
      if ((buf + '\n\n' + para).length > CHARS_PER_PAGE && buf) {
        result.push(buf);
        buf = para;
      } else {
        buf = buf ? buf + '\n\n' + para : para;
      }
    }
    if (buf) result.push(buf);

    return result.length > 0 ? result : ['（内容太短，无法分页）'];
  }, [story.content]);

  const totalPages = pages.length;
  const progress = totalPages > 0 ? (currentPage + 1) / totalPages : 0;
  const charCount = countChars(story.content);

  const toggleUI = () => setShowUI(prev => !prev);

  const renderPage = useCallback(({ item }: { item: string }) => (
    <View style={styles.page}>
      <Text style={styles.pageText}>{item}</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <StatusBar hidden={!showUI} />

      {/* ── Top Bar (toggleable) ──────────────── */}
      {showUI && (
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>← 退出</Text>
          </TouchableOpacity>
          <Text style={styles.bookTitle} numberOfLines={1}>{story.title || '未命名故事'}</Text>
          <Text style={styles.charInfo}>{charCount} 字</Text>
        </View>
      )}

      {/* ── Page List ────────────────────────── */}
      <FlatList
        data={pages}
        renderItem={renderPage}
        keyExtractor={(_, idx) => String(idx)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
          setCurrentPage(page);
        }}
        getItemLayout={(_, index) => ({
          length: Dimensions.get('window').width,
          offset: Dimensions.get('window').width * index,
          index,
        })}
      />

      {/* ── Tap-to-toggle overlay (transparent) ── */}
      <TouchableOpacity
        style={styles.tapZone}
        onPress={toggleUI}
        activeOpacity={1}
      />

      {/* ── Bottom Bar (toggleable) ────────────── */}
      {showUI && (
        <View style={styles.bottomBar}>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.bottomInfo}>
            <Text style={styles.pageIndicator}>
              {currentPage + 1} / {totalPages}
            </Text>
            <Text style={styles.hintText}>左右滑动翻页 · 点击隐藏界面</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const PAGE_BG = '#F5E6C8';   // warm parchment
const TEXT_DARK = '#3B2F1E';  // dark brown
const ACCENT = '#8B6914';     // antique gold

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,   // safe area
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: PAGE_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,105,20,0.15)',
  },
  backBtn: { paddingVertical: 6, paddingRight: 8 },
  backText: { fontSize: 16, color: ACCENT },
  bookTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  charInfo: { fontSize: 13, color: 'rgba(59,47,30,0.5)' },

  // Pages
  page: {
    width: Dimensions.get('window').width,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  pageText: {
    fontSize: 18,
    lineHeight: 34,
    color: TEXT_DARK,
    textAlign: 'justify',
    fontFamily: undefined,  // fallback to system serif if available
  },

  // Transparent tap zone (covers the page area for UI toggle)
  tapZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Only catches taps that aren't handled by the FlatList
    zIndex: -1,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,  // safe area
    backgroundColor: PAGE_BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,105,20,0.15)',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(139,105,20,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(59,47,30,0.4)',
  },
});
