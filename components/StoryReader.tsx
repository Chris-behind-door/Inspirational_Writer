import React, { useState, useRef } from 'react';
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

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StoryReader({ story, onClose }: Props) {
  const [showUI, setShowUI] = useState(true);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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

        {/* Tap target wrapper — toggles UI without interfering with scroll */}
        <Pressable onPress={toggleUI}>
          <Text style={styles.bodyText}>
            {story.content || '（还没有内容）\n\n返回编辑器开始写作吧。'}
          </Text>
        </Pressable>

        {/* End padding + marker */}
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
  bodyText: {
    fontSize: 18,
    lineHeight: 34,
    color: TEXT_DARK,
    textAlign: 'justify',
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
});
