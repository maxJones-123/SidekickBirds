import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ExplainCard {
  emoji: string;
  title: string;
  body: string;
}

const CARDS: ExplainCard[] = [
  {
    emoji: '⭐',
    title: 'Taking meds = Points',
    body: 'Earn points every time you take a dose. On-time doses earn more!',
  },
  {
    emoji: '👕',
    title: 'Use points to unlock',
    body: 'Spend your points in the shop to buy clothes, skins & home items for your bird.',
  },
  {
    emoji: '💎',
    title: 'Premium Perks',
    body: 'More items & discounts on themes unlock as you level up.',
  },
  {
    emoji: '📅',
    title: 'Perfect Week Reward',
    body: '7 days with no missed doses = 1 FREE premium item for your bird.',
  },
  {
    emoji: '🔒',
    title: 'No Cheating',
    body: 'We use smart checks to keep it fair and reward real consistency!',
  },
];

export default function HowItWorksScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {CARDS.map((card, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardEmoji}>{card.emoji}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardBody}>{card.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F9FA',
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EFF3',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0FBFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B3C',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    color: '#7A8B9A',
    lineHeight: 18,
  },
});
