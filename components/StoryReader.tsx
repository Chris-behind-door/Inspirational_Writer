import React, { useState, useMemo } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
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

// Layout constants — measured from styles below
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOP_BAR_H = 81;    // paddingTop(44) + content(~26) + paddingBottom(10) + border(1)
const BOTTOM_BAR_H = 71; // paddingTop(10) + content(~26) + paddingBottom(34) + border(1)
const PAGE_PAD_H = 72;   // paddingVertical(36) × 2
const LINE_HEIGHT = 34;
const FONT_SIZE = 18;
// Approximate CJK char width ≈ font size
const CHARS_PER_LINE = Math.floor((SCREEN_WIDTH - 56) / FONT_SIZE); // 56 = paddingHorizontal(28)×2
const AVAILABLE_HEIGHT = SCREEN_HEIGHT - TOP_BAR_H - BOTTOM_BAR_H - PAGE_PAD_H;
const LINES_PER_PAGE = Math.floor(AVAILABLE_HEIGHT / LINE_HEIGHT);
const CHARS_PER_PAGE = Math.max(CHARS_PER_LINE * LINES_PER_PAGE, 100);

export default function StoryReader({ story, onClose }: Props) {
  const [showUI, setShowUI] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

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

  return (
    <View style={styles.container}>
      <StatusBar hidden={!showUI} />

      {/* ── Top Bar ─────────────────────────── */}
      {showUI && (
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>← 退出</Text>
          </TouchableOpacity>
          <Text style={styles.bookTitle} numberOfLines={1}>{story.title || '未命名故事'}</Text>
          <Text style={styles.charInfo}>{charCount} 字</Text>
        </View>
      )}

      {/* ── Horizontal Paged ScrollView ─────── */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          if (page !== currentPage) setCurrentPage(page);
        }}
      >
        {pages.map((text, idx) => (
          <Pressable
            key={idx}
            style={styles.page}
            onPress={toggleUI}
          >
            <Text style={styles.pageText}>{text}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Bottom Bar ──────────────────────── */}
      {showUI && (
        <View style={styles.bottomBar}>
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

const PAGE_BG = '#F5E6C8';
const TEXT_DARK = '#3B2F1E';
const ACCENT = '#8B6914';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
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

  page: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  pageText: {
    fontSize: 18,
    lineHeight: 34,
    color: TEXT_DARK,
    textAlign: 'justify',
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
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
