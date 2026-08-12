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
import { copilotApi, ConversationListItem, renderStreamingText } from '../services/copilotApi';
import { useBackend } from '../context/BackendContext';

const { width } = Dimensions.get('window');

// ─── Types ───
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: any[];
  failed?: boolean;
  streaming?: boolean;
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
  const { isBackendConnected, isChecking } = useBackend();
  const { items: compareItems, addToCompare, removeFromCompare, isInCompare, count: compareCount, clearCompare } = useCompare();
  const [mode, setMode] = useState<'discover' | 'compare'>('discover');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'assistant', text: "Hi! I'm your shopping copilot 🤖\nAsk me about phones, laptops, tablets, cameras, or audio gear!" },
  ]);
  const [compareMessages, setCompareMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationSkip, setConversationSkip] = useState(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [compareTable, setCompareTable] = useState<string[][] | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const compareFlatRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const loadConversationList = async (reset = false) => {
    if (!isBackendConnected) return;
    if (loadingConversations || (!reset && !hasMoreConversations)) return;
    setLoadingConversations(true);
    try {
      const skip = reset ? 0 : conversationSkip;
      const page = await copilotApi.listConversations(skip);
      setConversations(previous => reset ? page : [...previous, ...page]);
      setConversationSkip(skip + page.length);
      setHasMoreConversations(page.length === 20);
      return page;
    } finally {
      setLoadingConversations(false);
    }
  };

  const switchConversation = async (id: string) => {
    if (!isBackendConnected || id === conversationId) return;
    setLoading(true);
    try {
      const conversation = await copilotApi.loadConversation(id);
      setConversationId(id);
      setMessages(conversation.messages.map(message => ({
        id: message.id,
        role: message.role,
        text: message.content,
      })));
      setLastFailedQuery(null);
    } catch {
      Alert.alert('Unable to load chat', 'Please try again when you are online.');
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    if (!isBackendConnected) return;
    setLoading(true);
    try {
      const conversation = await copilotApi.createConversation();
      setConversationId(conversation.id);
      setMessages([{ id: 'welcome', role: 'assistant', text: "Hi! I'm your shopping copilot 🤖\nAsk me about phones, laptops, tablets, cameras, or audio gear!" }]);
      setConversations(previous => [{ id: conversation.id, title: conversation.title, message_count: 0, updated_at: new Date().toISOString() }, ...previous]);
    } catch {
      Alert.alert('Unable to create chat', 'Please try again when the backend is available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isChecking || !isBackendConnected) return;
    void (async () => {
      const page = await loadConversationList(true);
      if (page?.[0]) await switchConversation(page[0].id);
      else await startNewConversation();
    })();
  }, [isBackendConnected, isChecking]);

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

  const handleDiscoverSend = async (forcedQuery?: string | null, skipPersistUser = false) => {
    const query = typeof forcedQuery === 'string' ? forcedQuery.trim() : input.trim();
    if (!query || loading || typing) return;
    if (!isBackendConnected) {
      setLastFailedQuery(query);
      Alert.alert('You are offline', 'Reconnect to send this message.');
      return;
    }

    const localUserId = `local-${Date.now()}`;
    if (!skipPersistUser) setMessages(previous => [...previous, { id: localUserId, role: 'user', text: query }]);
    setInput('');
    setLoading(true);
    setLastFailedQuery(null);

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const conversation = await copilotApi.createConversation();
        activeConversationId = conversation.id;
        setConversationId(activeConversationId);
      }
      if (!activeConversationId) throw new Error('Conversation creation failed');
      if (!skipPersistUser) await copilotApi.saveMessage(activeConversationId, 'user', query);

      const data = await copilotApi.legacyChat(query, messages.slice(-4).map(message => message.text));
      const assistantId = `stream-${Date.now()}`;
      setMessages(previous => [...previous, { id: assistantId, role: 'assistant', text: '', products: data.products ?? [], streaming: true }]);
      setTyping(true);
      await renderStreamingText(data.message ?? 'Here are some products.', text => {
        setMessages(previous => previous.map(message => message.id === assistantId ? { ...message, text, streaming: true } : message));
      });
      setMessages(previous => previous.map(message => message.id === assistantId ? { ...message, streaming: false } : message));
      const productIds = (data.products ?? []).map((product: any) => Number(product.id)).filter((id: number) => Number.isFinite(id));
      await copilotApi.saveMessage(activeConversationId, 'assistant', data.message ?? 'Here are some products.', productIds);
      await loadConversationList(true);
    } catch (error) {
      console.log('Copilot error:', error);
      setLastFailedQuery(query);
      setMessages(previous => previous.map(message => message.id === localUserId ? { ...message, failed: true } : message));
    } finally {
      setTyping(false);
      setLoading(false);
    }
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
          {item.streaming && <Text style={[s.streamingLabel, { color: colors.textMuted }]}>Typing…</Text>}
          {item.failed && (
            <TouchableOpacity style={[s.messageAction, { borderColor: colors.error }]} onPress={() => item.text && handleDiscoverSend(item.text, true)}>
              <Text style={[s.messageActionText, { color: colors.error }]}>Retry</Text>
            </TouchableOpacity>
          )}
          {!isUser && !item.streaming && item.text.length > 0 && (
            <TouchableOpacity style={[s.messageAction, { borderColor: colors.primary }]} onPress={() => {
              const index = messages.findIndex(message => message.id === item.id);
              const previousUser = messages.slice(0, index).reverse().find(message => message.role === 'user');
              if (previousUser) handleDiscoverSend(previousUser.text, true);
            }}>
              <Text style={[s.messageActionText, { color: colors.primary }]}>Regenerate</Text>
            </TouchableOpacity>
          )}
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

const suggestions =
  mode === 'discover'
    ? [
 'Gaming phones',
 'Best laptops',
 'Camera products',
 'Wireless earbuds',
 'Phones',
 'Student laptops',
 'Audio gear',
 'Premium phones',
]
    : [
        'Best for gaming?',
        'Best value pick?',
        'Best camera?',
        'Battery comparison',
      ];

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

      {mode === 'discover' && (
        <View style={s.conversationBar}>
          <TouchableOpacity style={[s.newChatButton, { backgroundColor: colors.primary }]} onPress={startNewConversation} disabled={loading || !isBackendConnected}>
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
          <FlatList
            horizontal
            data={conversations}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            onEndReached={() => { void loadConversationList(); }}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { void switchConversation(item.id); }} style={[s.conversationChip, { backgroundColor: item.id === conversationId ? colors.primaryGlow : colors.card, borderColor: item.id === conversationId ? colors.primary : colors.border }]}>
                <Text numberOfLines={1} style={[s.conversationChipText, { color: colors.text }]}>{item.title}</Text>
              </TouchableOpacity>
            )}
            ListFooterComponent={loadingConversations ? <ActivityIndicator size="small" color={colors.primary} style={{ marginHorizontal: 8 }} /> : null}
          />
        </View>
      )}

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
              <Text style={[s.loadingText, { color: colors.textMuted }]}>{typing ? 'Writing response...' : 'Finding products...'}</Text>
            </View>
          ) : lastFailedQuery ? (
            <TouchableOpacity style={[s.retryBanner, { backgroundColor: colors.errorBg, borderColor: colors.error }]} onPress={() => handleDiscoverSend(lastFailedQuery, true)}>
              <Text style={[s.retryBannerText, { color: colors.error }]}>Message failed. Tap to retry.</Text>
            </TouchableOpacity>
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

      <View style={s.suggestionSection}>
  <View style={s.suggestionHeader}>
    <Ionicons
      name="sparkles"
      size={14}
      color={colors.primary}
    />
    <Text
      style={[
        s.suggestionTitle,
        { color: colors.textMuted },
      ]}
    >
      Try asking
    </Text>
  </View>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={
      s.suggestionContainer
    }
  >
    {suggestions.map((s2, i) => (
      <TouchableOpacity
        key={i}
        activeOpacity={0.85}
        disabled={loading || !isBackendConnected}
        style={[
          s.aiChip,
          {
            backgroundColor:
              colors.card,
            borderColor:
              colors.border,
            opacity:
              loading || !isBackendConnected ? 0.5 : 1,
          },
        ]}
        onPress={() => {
          setInput(s2);

          setTimeout(() => {
            handleDiscoverSend(s2);
          }, 50);
        }}
      >
        <Text style={s.chipEmoji}>
          {i === 0
            ? '🎮'
            : i === 1
            ? '💰'
            : i === 2
            ? '📸'
            : i === 3
            ? '🎧'
            : '✨'}
        </Text>

        <Text
          style={[
            s.aiChipText,
            { color: colors.text },
          ]}
        >
          {s2}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

      {/* Input Bar */}
      <View style={[s.inputBar, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <TextInput
          style={[s.input, { color: colors.text, backgroundColor: colors.input }]}
          placeholder={mode === 'discover' ? "Ask me about products..." : "Ask a follow-up question..."}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => mode === 'discover' ? void handleDiscoverSend() : handleCompareSend()}
          returnKeyType="send"
          editable={mode === 'compare' || isBackendConnected}
        />
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: colors.primary, opacity: input.trim() ? 1 : 0.5 }]}
          onPress={() => mode === 'discover' ? void handleDiscoverSend() : handleCompareSend()}
          disabled={!input.trim() || loading || !isBackendConnected}
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
  conversationBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  newChatButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  conversationChip: { maxWidth: 150, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, marginRight: 8 },
  conversationChipText: { fontSize: 12, fontWeight: '700' },
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
  streamingLabel: { fontSize: 11, fontStyle: 'italic', marginTop: 6 },
  messageAction: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 8 },
  messageActionText: { fontSize: 11, fontWeight: '700' },
  retryBanner: { borderWidth: 1, borderRadius: 12, padding: 10, marginLeft: 38, marginVertical: 8 },
  retryBannerText: { fontSize: 12, fontWeight: '700' },
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
suggestRow: {
  minHeight: 44,
  maxHeight: 44,
  marginBottom: 4,
},
  suggestChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 , marginRight: 6,shadowOpacity: 0.08,
elevation: 2},
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

  suggestionSection: {
  paddingTop: 10,
  marginBottom: 8,
},

suggestionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 16,
  marginBottom: 10,
},

suggestionTitle: {
  fontSize: 13,
  fontWeight: '600',
},

suggestionContainer: {
  paddingHorizontal: 16,
  gap: 10,
},

aiChip: {
  minWidth: 140,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderRadius: 20,
  borderWidth: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  elevation: 2,
},

chipEmoji: {
  fontSize: 18,
},

aiChipText: {
  fontSize: 13,
  fontWeight: '700',
  flexShrink: 1,
},
});
