import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ScrollView, Image, Dimensions, Animated, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCompare } from '../context/CompareContext';
import GradientBackground from '../components/GradientBackground';

const { width } = Dimensions.get('window');
const API_BASE = 'http://192.168.29.222:8000';

// ─── Types ───
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: any[];
}

// ─── Mock AI responses for Discover ───
const DISCOVER_RESPONSES: Record<string, { text: string; query: string }> = {
  'phone': { text: "Here are the top smartphones I'd recommend:", query:
'products/category/1' },
  'laptop': { text: "Check out these amazing laptops:", query:
'products/category/2' },
  'tablet': { text: "Here are the best tablets for you:",query:
'products/category/3'},
  'camera': { text: "Great camera picks for you:", query:
'products/category/4' },
  'audio': { text: "Here are top audio products:", query:
'products/category/5' },
  'headphone': { text: "Check out these headphones:", query:
'products/category/1' },
  'gaming': { text: "Here are the best gaming devices:",query:
'products/category/1' },
  'budget': { text: "Great value picks under budget:", query:
'products/category/1' },
  'flagship': { text: "Premium flagship products:",query:
'products/category/1' },
};

function matchQuery(input: string): { text: string; query: string } {
  const lower = input.toLowerCase();
  for (const [key, val] of Object.entries(DISCOVER_RESPONSES)) {
    if (lower.includes(key)) return val;
  }
  return { text: "Here are some products you might like:", query: 'products?_limit=8' };
}

// ─── AI Comparison Generator ───
function generateComparisonTable(products: any[]): string[][] {
  if (products.length === 0) return [];
  const specs = products[0].specs || {};
  const keys = Object.keys(specs).filter(k => typeof specs[k] === 'string');
  const rows: string[][] = [['Feature', ...products.map(p => p.name)]];
  rows.push(['Brand', ...products.map(p => p.brand)]);
  rows.push(['Price', ...products.map(p => `$${p.price}`)]);
  rows.push(['Rating', ...products.map(p => `${p.rating} ★`)]);
  keys.forEach(key => {
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    rows.push([label, ...products.map(p => {
      const v = p.specs?.[key];
      return Array.isArray(v) ? v.join(', ') : (v ?? '—');
    })]);
  });
  return rows;
}

function generateCompareVerdict(products: any[], question?: string): string {
  if (products.length < 2) return 'Add at least 2 products to compare.';
  const sorted = [...products].sort((a, b) => b.rating - a.rating);
  const best = sorted[0];
  const cheapest = [...products].sort((a, b) => a.price - b.price)[0];
  if (question) {
    const q = question.toLowerCase();
    if (q.includes('gaming')) {
      const gaming = products.find(p => p.tags?.some((t: string) => t.toLowerCase().includes('gaming')));
      if (gaming) return `For gaming, I'd recommend the ${gaming.name} — it has features specifically designed for gaming performance.`;
      return `Among these, the ${best.name} offers the best overall performance for gaming with its ${best.specs?.chipset || 'powerful hardware'}.`;
    }
    if (q.includes('budget') || q.includes('cheap') || q.includes('value')) {
      return `For the best value, go with the ${cheapest.name} at $${cheapest.price}. It offers solid specs for its price point.`;
    }
    if (q.includes('camera') || q.includes('photo')) {
      const cam = products.find(p => p.specs?.camera);
      return cam ? `For photography, the ${cam.name} excels with its ${cam.specs.camera} camera setup.` : `The ${best.name} has the best overall camera system.`;
    }
    if (q.includes('battery')) {
      return `Looking at battery life, check the battery specs in the comparison table above. The ${best.name} offers a great balance of performance and battery.`;
    }
    return `Based on your question, I'd recommend the ${best.name} (rated ${best.rating}★). It offers the best overall package among the compared products.`;
  }
  return `🏆 Top Pick: ${best.name} (${best.rating}★) — Best overall.\n💰 Best Value: ${cheapest.name} at $${cheapest.price}.`;
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════
export default function CopilotScreen() {
  const { colors } = useTheme();
  const { items: compareItems, addToCompare, removeFromCompare, isInCompare, count: compareCount, clearCompare } = useCompare();
  const [mode, setMode] = useState<'discover' | 'compare'>('discover');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'assistant', text: "Hi! I'm your shopping copilot 🤖\nAsk me about phones, laptops, tablets, cameras, or audio gear!" },
  ]);
  const [compareMessages, setCompareMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [compareTable, setCompareTable] = useState<string[][] | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const compareFlatRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (compareCount > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [compareCount]);

  // Generate comparison when switching to compare mode
  useEffect(() => {
    if (mode === 'compare' && compareItems.length >= 2) {
      const table = generateComparisonTable(compareItems);
      setCompareTable(table);
      const verdict = generateCompareVerdict(compareItems);
      setCompareMessages([
        { id: 'c0', role: 'assistant', text: `Comparing ${compareItems.length} products...\n\n${verdict}` },
      ]);
    } else if (mode === 'compare' && compareItems.length < 2) {
      setCompareTable(null);
      setCompareMessages([
        { id: 'c0', role: 'assistant', text: 'Add at least 2 products from Discover mode to start comparing!' },
      ]);
    }
  }, [mode, compareItems]);

  // ─── Discover send ───
  const handleDiscoverSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const match = matchQuery(input);
      const res = await fetch(`${API_BASE}/${match.query}`);
      const products = await res.json();
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        text: match.text, products: Array.isArray(products) ? products : [],
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Sorry, I had trouble fetching products. Please try again!' }]);
    }
    setLoading(false);
  };

  // ─── Compare follow-up ───
  const handleCompareSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input.trim() };
    const answer = generateCompareVerdict(compareItems, input.trim());
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', text: answer };
    setCompareMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  // ─── Product Card (Discover) ───
  const renderProductCard = (item: any) => {
    const inCompare = isInCompare(item.id);
    return (
      <View key={item.id} style={[s.prodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Image source={{ uri: item.image }} style={s.prodImg} />
        <View style={s.prodInfo}>
          <Text style={[s.prodBrand, { color: colors.textMuted }]}>{item.brand}</Text>
          <Text style={[s.prodName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={s.prodRow}>
            <Ionicons name="star" size={11} color={colors.star} />
            <Text style={[s.prodRating, { color: colors.text }]}>{item.rating}</Text>
            <Text style={[s.prodPrice, { color: colors.primary }]}>${item.price}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.compareBtn, { backgroundColor: inCompare ? colors.success + '20' : colors.primaryGlow, borderColor: inCompare ? colors.success : colors.primary + '40' }]}
          onPress={() => inCompare ? removeFromCompare(item.id) : addToCompare(item)}
        >
          <Ionicons name={inCompare ? 'checkmark-circle' : 'add-circle-outline'} size={14} color={inCompare ? colors.success : colors.primary} />
          <Text style={[s.compareBtnText, { color: inCompare ? colors.success : colors.primary }]}>
            {inCompare ? 'Added' : 'Compare'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Chat Bubble ───
  const renderChatBubble = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.bubbleRow, isUser && s.bubbleRowUser]}>
        {!isUser && (
          <View style={[s.avatar, { backgroundColor: colors.primary }]}>
            <FontAwesome5 name="robot" size={12} color="#fff" />
          </View>
        )}
        <View style={[s.bubble, isUser ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[s.bubbleText, { color: isUser ? '#fff' : colors.text }]}>{item.text}</Text>
          {item.products && item.products.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.prodScroll}>
              {item.products.map(renderProductCard)}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  // ─── Comparison Table ───
  const renderCompareTable = () => {
    if (!compareTable || compareTable.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={s.tableScroll}>
        <View style={s.tableWrap}>
          {compareTable.map((row, ri) => (
            <View key={ri} style={[s.tableRow, ri === 0 && { backgroundColor: colors.primary + '15' }, ri > 0 && ri % 2 === 0 && { backgroundColor: colors.bgSecondary }]}>
              {row.map((cell, ci) => (
                <View key={ci} style={[s.tableCell, ci === 0 && s.tableLabelCell, { borderColor: colors.border }]}>
                  <Text style={[s.tableCellText, ci === 0 && s.tableLabelText, ri === 0 && s.tableHeaderText, { color: ri === 0 ? colors.primary : ci === 0 ? colors.textSecondary : colors.text }]} numberOfLines={2}>
                    {cell}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // ─── Compare Product Chips ───
  const renderCompareChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsCont}>
      {compareItems.map(item => (
        <View key={item.id} style={[s.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image source={{ uri: item.image }} style={s.chipImg} />
          <Text style={[s.chipName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity onPress={() => removeFromCompare(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      {compareItems.length > 0 && (
        <TouchableOpacity style={[s.clearBtn, { borderColor: colors.error + '40' }]} onPress={clearCompare}>
          <Text style={[s.clearBtnText, { color: colors.error }]}>Clear All</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // ─── Suggestion Chips ───
  const suggestions = mode === 'discover'
    ? ['Show me phones', 'Best laptops', 'Gaming devices', 'Top cameras', 'Audio gear']
    : ['Which is better for gaming?', 'Best value pick?', 'Best camera?', 'Battery comparison'];

  return (
    <GradientBackground>
    <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={[s.headerIcon, { backgroundColor: colors.primary }]}>
            <FontAwesome5 name="robot" size={16} color="#fff" />
          </View>
          <Text style={[s.headerTitle, { color: colors.text }]}>AI Copilot</Text>
        </View>
        {compareCount > 0 && (
          <Animated.View style={[s.trayBadge, { backgroundColor: colors.primary, transform: [{ scale: pulseAnim }] }]}>
            <Text style={s.trayBadgeText}>{compareCount}</Text>
          </Animated.View>
        )}
      </View>

      {/* Toggle */}
      <View style={[s.toggle, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[s.toggleBtn, mode === 'discover' && { backgroundColor: colors.primary }]}
          onPress={() => setMode('discover')}
        >
          <Ionicons name="compass-outline" size={16} color={mode === 'discover' ? '#fff' : colors.textMuted} />
          <Text style={[s.toggleText, { color: mode === 'discover' ? '#fff' : colors.textMuted }]}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, mode === 'compare' && { backgroundColor: colors.primary }]}
          onPress={() => setMode('compare')}
        >
          <MaterialCommunityIcons name="scale-balance" size={16} color={mode === 'compare' ? '#fff' : colors.textMuted} />
          <Text style={[s.toggleText, { color: mode === 'compare' ? '#fff' : colors.textMuted }]}>Compare</Text>
          {compareCount > 0 && mode !== 'compare' && (
            <View style={[s.dotBadge, { backgroundColor: colors.accentPink }]}>
              <Text style={s.dotBadgeText}>{compareCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ════ DISCOVER MODE ════ */}
      {mode === 'discover' && (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderChatBubble}
          contentContainerStyle={s.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.loadingText, { color: colors.textMuted }]}>Finding products...</Text>
            </View>
          ) : null}
        />
      )}

      {/* ════ COMPARE MODE ════ */}
      {mode === 'compare' && (
        <ScrollView style={s.compareScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {renderCompareChips()}
          {compareTable && (
            <View style={s.tableSection}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>
                <MaterialCommunityIcons name="table" size={16} color={colors.primary} /> Comparison Table
              </Text>
              {renderCompareTable()}
            </View>
          )}
          {compareMessages.map(msg => (
            <View key={msg.id} style={[s.bubbleRow, msg.role === 'user' && s.bubbleRowUser]}>
              {msg.role !== 'user' && (
                <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                  <FontAwesome5 name="robot" size={12} color="#fff" />
                </View>
              )}
              <View style={[s.bubble, msg.role === 'user' ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[s.bubbleText, { color: msg.role === 'user' ? '#fff' : colors.text }]}>{msg.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Suggestion Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {suggestions.map((s2, i) => (
          <TouchableOpacity key={i} style={[s.suggestChip, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '30' }]}
            onPress={() => { setInput(s2); }}>
            <Text style={[s.suggestText, { color: colors.primary }]}>{s2}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input Bar */}
      <View style={[s.inputBar, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <TextInput
          style={[s.input, { color: colors.text, backgroundColor: colors.input }]}
          placeholder={mode === 'discover' ? "Ask me about products..." : "Ask a follow-up question..."}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={mode === 'discover' ? handleDiscoverSend : handleCompareSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: colors.primary, opacity: input.trim() ? 1 : 0.5 }]}
          onPress={mode === 'discover' ? handleDiscoverSend : handleCompareSend}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </GradientBackground>
  );
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  trayBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  trayBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  // Toggle
  toggle: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 14, padding: 4, borderWidth: 1, marginBottom: 8 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  toggleText: { fontSize: 14, fontWeight: '700' },
  dotBadge: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  dotBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  // Chat
  chatList: { paddingHorizontal: 16, paddingBottom: 8 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  bubble: { maxWidth: width * 0.78, borderRadius: 16, padding: 12 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 38, paddingVertical: 8 },
  loadingText: { fontSize: 13 },
  // Product cards
  prodScroll: { marginTop: 10 },
  prodCard: { width: 160, borderRadius: 14, overflow: 'hidden', marginRight: 10, borderWidth: 1 },
  prodImg: { width: '100%', height: 100, resizeMode: 'contain', backgroundColor: 'rgba(0,0,0,0.03)' },
  prodInfo: { padding: 8 },
  prodBrand: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  prodName: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  prodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  prodRating: { fontSize: 11, fontWeight: '700' },
  prodPrice: { fontSize: 14, fontWeight: '800', marginLeft: 'auto' },
  compareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderTopWidth: 1 },
  compareBtnText: { fontSize: 11, fontWeight: '700' },
  // Suggestions
  suggestRow: { maxHeight: 44, marginBottom: 4 },
  suggestChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  suggestText: { fontSize: 12, fontWeight: '600' },
  // Input
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 80, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, height: 42, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
  sendBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  // Compare
  compareScroll: { flex: 1, paddingHorizontal: 16 },
  chipsScroll: { maxHeight: 56, marginBottom: 8 },
  chipsCont: { gap: 8, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  chipImg: { width: 32, height: 32, borderRadius: 8, resizeMode: 'contain' },
  chipName: { fontSize: 12, fontWeight: '600', maxWidth: 100 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  clearBtnText: { fontSize: 12, fontWeight: '700' },
  // Table
  tableSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  tableScroll: { marginBottom: 12 },
  tableWrap: { minWidth: width - 32 },
  tableRow: { flexDirection: 'row' },
  tableCell: { width: 120, paddingVertical: 8, paddingHorizontal: 8, borderWidth: 0.5 },
  tableLabelCell: { width: 90 },
  tableCellText: { fontSize: 11, lineHeight: 16 },
  tableLabelText: { fontWeight: '600' },
  tableHeaderText: { fontWeight: '800', fontSize: 12 },
});