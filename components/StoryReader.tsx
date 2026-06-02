import React, { useState, useRef, useMemo } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Story } from '../shared/storyData';
import { countChars, parseChapters } from '../shared/storyData';

interface Props {
  story: Story;
  onClose: () => void;
}

export default function StoryReader({ story, onClose }: Props) {
  const [showUI, setShowUI] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showTOC, setShowTOC] = useState(false);
  const chapterOffsets = useRef<Record<number, number>>({});
  const scrollRef = useRef<ScrollView>(null);

  const charCount = countChars(story.content);
  const chapters = useMemo(() => parseChapters(story.content), [story.content]);
  const hasChapters = chapters.some(c => c.title !== null);

  const toggleUI = () => setShowUI(prev => !prev);

  const scrollToChapter = (index: number) => {
    setShowTOC(false);
    const y = chapterOffsets.current[index];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  };

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
          {hasChapters ? (
            <TouchableOpacity onPress={() => setShowTOC(true)} style={styles.tocBtn}>
              <Text style={styles.tocBtnText}>目录</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.charInfo}>{charCount} 字</Text>
          )}
        </View>
      )}

      {/* ── Reading Scroll ──────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.reader}
        contentContainerStyle={styles.readerContent}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const scrollable = contentSize.height - layoutMeasurement.height;
          if (scrollable > 0) {
            setProgress(Math.min(contentOffset.y / scrollable, 1));
          }
        }}
      >
        {/* Title page-style heading */}
        <Text style={styles.titleHeading}>{story.title || '未命名故事'}</Text>

        <Pressable onPress={toggleUI}>
          {/* Render chaptered content */}
          {chapters.length > 0 ? chapters.map((ch, idx) => (
            <View
              key={idx}
              onLayout={(e) => {
                // Record absolute Y of this chapter within the scroll content
                chapterOffsets.current[idx] = e.nativeEvent.layout.y;
              }}
            >
              {ch.title && (
                <Text style={styles.chapterTitle}>{ch.title}</Text>
              )}
              {ch.body.trim() ? (
                <Text style={styles.bodyText}>{ch.body.trim()}</Text>
              ) : (
                <Text style={styles.emptyChapter}>（本章暂无内容）</Text>
              )}
            </View>
          )) : (
            <Text style={styles.bodyText}>
              {story.content || '（还没有内容）\n\n返回编辑器开始写作吧。'}
            </Text>
          )}
        </Pressable>

        {/* End marker */}
        <Text style={styles.endMark}>— 全文 {charCount} 字 —</Text>
      </ScrollView>

      {/* ── Bottom Bar ──────────────────────── */}
      {showUI && (
        <View style={styles.bottomBar}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.bottomInfo}>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
            <Text style={styles.hintText}>点击文字隐藏界面</Text>
          </View>
        </View>
      )}

      {/* ── TOC Modal ───────────────────────── */}
      <Modal visible={showTOC} transparent animationType="fade" onRequestClose={() => setShowTOC(false)}>
        <TouchableOpacity
          style={styles.tocOverlay}
          activeOpacity={1}
          onPress={() => setShowTOC(false)}
        >
          <View style={styles.tocBox}>
            <Text style={styles.tocHeading}>目录</Text>
            <ScrollView style={styles.tocList} keyboardShouldPersistTaps="handled">
              {chapters.map((ch, idx) =>
                ch.title ? (
                  <TouchableOpacity
                    key={idx}
                    style={styles.tocItem}
                    onPress={() => scrollToChapter(idx)}
                  >
                    <Text style={styles.tocItemText}>{ch.title}</Text>
                  </TouchableOpacity>
                ) : null,
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  tocBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  tocBtnText: { fontSize: 14, color: ACCENT, fontWeight: '600' },

  reader: { flex: 1 },
  readerContent: {
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  titleHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 32,
  },
  chapterTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_DARK,
    marginTop: 36,
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 34,
    color: TEXT_DARK,
    textAlign: 'justify',
  },
  emptyChapter: {
    fontSize: 15,
    color: 'rgba(59,47,30,0.35)',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  endMark: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(59,47,30,0.35)',
    marginTop: 40,
    marginBottom: 20,
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
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(59,47,30,0.4)',
  },

  // TOC Modal
  tocOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  tocBox: {
    width: '100%',
    maxHeight: '60%',
    backgroundColor: PAGE_BG,
    borderRadius: 14,
    padding: 24,
  },
  tocHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 16,
    textAlign: 'center',
  },
  tocList: { maxHeight: 300 },
  tocItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,105,20,0.12)',
  },
  tocItemText: {
    fontSize: 16,
    color: TEXT_DARK,
  },
});
