import React, { memo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface AutocompleteSuggestionItemProps {
  suggestion: {
    main_text: string;
    secondary_text?: string;
    typeIcon?: string;
  };
  index: number;
  totalCount: number;
  onPress: () => void;
  styles: any;
}

const AutocompleteSuggestionItem = memo<AutocompleteSuggestionItemProps>(({
  suggestion,
  index,
  totalCount,
  onPress,
  styles,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.suggestionItem,
        index < totalCount - 1 && styles.suggestionItemBorder
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 20, marginRight: 12 }}>
          {suggestion.typeIcon || '📍'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.suggestionMainText}>{suggestion.main_text}</Text>
          {suggestion.secondary_text && (
            <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
              {suggestion.secondary_text}
            </Text>
          )}
        </View>
      </View>
      <Text style={{ fontSize: 20, color: '#9ca3af', marginLeft: 8 }}>›</Text>
    </TouchableOpacity>
  );
});

AutocompleteSuggestionItem.displayName = 'AutocompleteSuggestionItem';

export default AutocompleteSuggestionItem;

