import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { tutorialService, Tutorial } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

const { width, height } = Dimensions.get('window');

interface TutorialModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function TutorialModal({ isVisible, onClose }: TutorialModalProps) {
  const { language } = useApp();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    if (isVisible) {
      loadTutorials();
    }
  }, [isVisible]);

  const loadTutorials = async () => {
    try {
      setLoading(true);
      const data = await tutorialService.getAllTutorials();
      setTutorials(data);
    } catch (error) {
      console.error('Failed to load tutorials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTranslation = (step: Tutorial, field: 'title' | 'content') => {
    if (field === 'title') {
      if (language === 'zh') return step.title_zh;
      if (language === 'en') return step.title_en || step.title_zh;
      if (language === 'my') return step.title_my || step.title_zh;
    } else {
      if (language === 'zh') return step.content_zh;
      if (language === 'en') return step.content_en || step.content_zh;
      if (language === 'my') return step.content_my || step.content_zh;
    }
    return '';
  };

  const t = {
    zh: {
      title: '如何使用',
      subtitle: '点击下方步骤查看详细图解',
      back: '返回列表',
      gotIt: '我知道了',
      loading: '正在加载教学内容...',
      noImage: '暂无说明图片'
    },
    en: {
      title: 'How to Use',
      subtitle: 'Tap a step to view details',
      back: 'Back to List',
      gotIt: 'Got It',
      loading: 'Loading tutorials...',
      noImage: 'No image available'
    },
    my: {
      title: 'အသုံးပြုနည်းလမ်းညွှန်',
      subtitle: 'အသေးစိတ်ကြည့်ရန် အဆင့်များကို နှိပ်ပါ',
      back: 'နောက်သို့',
      gotIt: 'နားလည်ပါပြီ',
      loading: 'ဒေတာများ ရယူနေသည်...',
      noImage: 'ပုံမရှိပါ'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    title: 'How to Use',
    subtitle: 'Tap a step to view details',
    back: 'Back',
    gotIt: 'Got It',
    loading: 'Loading...',
    noImage: 'No image'
  };

  const handleClose = () => {
    setActiveStep(null);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{activeStep === null ? t.title : tutorials[activeStep] ? getTranslation(tutorials[activeStep], 'title') : t.title}</Text>
              {activeStep === null && <Text style={styles.headerSubtitle}>{t.subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>{t.loading}</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeStep === null ? (
                /* List View */
                <View style={styles.stepList}>
                  {tutorials.map((step, index) => (
                    <TouchableOpacity
                      key={step.id || index}
                      style={styles.stepCard}
                      onPress={() => setActiveStep(index)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#3b82f6', '#2563eb']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.stepNumberBadge}
                      >
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </LinearGradient>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepTitle}>{getTranslation(step, 'title')}</Text>
                        <Text style={styles.stepPreview} numberOfLines={1}>
                          {getTranslation(step, 'content')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                /* Detail View */
                <View style={styles.detailView}>
                  <TouchableOpacity 
                    onPress={() => setActiveStep(null)}
                    style={styles.backButton}
                  >
                    <Ionicons name="arrow-back" size={20} color="#3b82f6" />
                    <Text style={styles.backButtonText}>{t.back}</Text>
                  </TouchableOpacity>

                  <View style={styles.detailContentCard}>
                    <Text style={styles.detailDescription}>
                      {getTranslation(tutorials[activeStep], 'content')}
                    </Text>
                  </View>

                  <View style={styles.imageGallery}>
                    {tutorials[activeStep].image_urls && tutorials[activeStep].image_urls!.length > 0 ? (
                      tutorials[activeStep].image_urls!.map((url, idx) => (
                        <View key={idx} style={styles.imageWrapper}>
                          <Image 
                            source={{ uri: url }} 
                            style={styles.stepImage}
                            resizeMode="contain"
                          />
                        </View>
                      ))
                    ) : tutorials[activeStep].image_url ? (
                      <View style={styles.imageWrapper}>
                        <Image 
                          source={{ uri: tutorials[activeStep].image_url }} 
                          style={styles.stepImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <View style={styles.noImageContainer}>
                        <Text style={styles.noImageText}>{t.noImage}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer Footer */}
          {activeStep === null && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={handleClose}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.doneButtonGradient}
                >
                  <Text style={styles.doneButtonText}>{t.gotIt}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.85,
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  stepList: {
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  stepPreview: {
    fontSize: 13,
    color: '#64748b',
  },
  detailView: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: '700',
    marginLeft: 4,
  },
  detailContentCard: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    fontWeight: '500',
  },
  imageGallery: {
    gap: 16,
    marginBottom: 40,
  },
  imageWrapper: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  stepImage: {
    width: '100%',
    height: 400,
  },
  noImageContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  doneButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  doneButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
