import React, { useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '../../services/chatService';

const TEAL = '#2C98A6';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string | null;
  emptyText: string;
  inputPlaceholder: string;
  messages: ChatMessage[];
  currentUserId?: string | null;
  inputText: string;
  sending?: boolean;
  isDarkMode?: boolean;
  onChangeInput: (text: string) => void;
  onSend: () => void;
  onClose: () => void;
};

export default function CourierChatModal({
  visible,
  title,
  subtitle,
  emptyText,
  inputPlaceholder,
  messages,
  currentUserId,
  inputText,
  sending,
  isDarkMode,
  onChangeInput,
  onSend,
  onClose,
}: Props) {
  const flatListRef = useRef<FlatList>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.chatModalContent, isDarkMode && styles.darkChatModal]}>
          <View style={[styles.chatHeader, isDarkMode && styles.darkChatHeader]}>
            <View>
              <Text style={[styles.chatTitle, isDarkMode && styles.darkText]}>{title}</Text>
              {subtitle ? <Text style={styles.chatSubtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.chatCloseBtn}>
              <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#1e293b'} />
            </TouchableOpacity>
          </View>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={[styles.messageList, isDarkMode && styles.darkMessageList]}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={(
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>{emptyText}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isMine = item.sender_id === currentUserId;
              return (
                <View style={[
                  styles.messageWrapper,
                  isMine ? styles.myMessageWrapper : styles.otherMessageWrapper,
                ]}>
                  <View style={[
                    styles.messageBubble,
                    isMine ? styles.myBubble : styles.otherBubble,
                    isDarkMode && !isMine && styles.darkOtherBubble,
                  ]}>
                    <Text style={[
                      styles.messageText,
                      isMine ? styles.myMessageText : (isDarkMode ? styles.darkText : styles.otherMessageText),
                    ]}>
                      {item.message}
                    </Text>
                  </View>
                  <Text style={styles.messageTime}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
          <View style={[styles.chatInputContainer, isDarkMode && styles.darkChatHeader]}>
            <TextInput
              style={[styles.chatInput, isDarkMode && styles.darkChatInput]}
              placeholder={inputPlaceholder}
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              value={inputText}
              onChangeText={onChangeInput}
              multiline
            />
            <TouchableOpacity
              disabled={!inputText.trim() || sending}
              onPress={onSend}
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  chatModalContent: {
    height: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  darkChatModal: {
    backgroundColor: '#0f172a',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  darkChatHeader: {
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  darkText: {
    color: '#f8fafc',
  },
  chatSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  chatCloseBtn: {
    padding: 4,
  },
  messageList: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  darkMessageList: {
    backgroundColor: '#020617',
  },
  emptyChat: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyChatText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: TEAL,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  darkOtherBubble: {
    backgroundColor: '#1e293b',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#1e293b',
  },
  darkChatInput: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
