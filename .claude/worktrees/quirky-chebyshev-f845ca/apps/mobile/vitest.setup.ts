import { vi } from 'vitest';
import React from 'react';

function createPrimitive(name: string) {
  return ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement(name, props, children);
}

vi.mock('react-native', () => ({
  View: createPrimitive('View'),
  Text: createPrimitive('Text'),
  ScrollView: createPrimitive('ScrollView'),
  TouchableOpacity: createPrimitive('TouchableOpacity'),
  Pressable: createPrimitive('Pressable'),
  ActivityIndicator: createPrimitive('ActivityIndicator'),
  StyleSheet: {
    create: <T extends object>(styles: T) => styles,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844 }),
  },
}));

vi.mock('expo-image', () => ({
  Image: ({ children }: { children?: React.ReactNode }) => React.createElement('Image', null, children),
}));

vi.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data,
    renderItem,
  }: {
    data: Array<unknown>;
    renderItem: ({ item, index }: { item: unknown; index: number }) => React.ReactNode;
  }) =>
    React.createElement(
      'FlashList',
      null,
      data.map((item, index) => React.createElement('FlashListItem', { key: index }, renderItem({ item, index }))),
    ),
}));

