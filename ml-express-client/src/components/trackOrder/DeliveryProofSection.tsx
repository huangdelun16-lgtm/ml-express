import React from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { formatTrackDate } from '../../screens/trackOrder/trackOrderUtils';

type Photo = {
  photo_url?: string;
  upload_time?: string;
};

type Props = {
  photos: Photo[];
  styles: any;
  isDarkMode?: boolean;
  title: string;
  viewPhotoLabel: string;
};

export default function DeliveryProofSection({
  photos,
  styles,
  isDarkMode,
  title,
  viewPhotoLabel,
}: Props) {
  if (!photos.length) return null;
  return (
    <View style={[styles.card, isDarkMode && styles.darkCard]}>
      <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>📸 {title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              Alert.alert(viewPhotoLabel);
            }}
          >
            <Image
              source={{ uri: photo.photo_url }}
              style={styles.proofImage}
              resizeMode="cover"
            />
            <Text style={styles.proofTime}>{formatTrackDate(photo.upload_time)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
