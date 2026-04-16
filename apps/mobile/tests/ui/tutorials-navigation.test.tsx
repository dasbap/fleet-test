import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import TutorialsScreen from '../../app/tutoriels/index';
import TutorialPlayerScreen from '../../app/tutoriels/player';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: jest.fn(),
  },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'tuto-01' }),
}));

jest.mock('expo-image', () => {
  const ReactNative = require('react-native');
  return { Image: ReactNative.View };
});

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const ReactNative = require('react-native');
  return {
    FlashList: ({ data, renderItem }: { data: unknown[]; renderItem: ({ item }: { item: unknown }) => React.ReactNode }) =>
      React.createElement(
        ReactNative.View,
        null,
        data.map((item, index) => React.createElement(ReactNative.View, { key: index }, renderItem({ item }))),
      ),
  };
});

jest.mock('../../src/features/tutorials/storage', () => ({
  getCompletedTutorials: () => [],
  isDownloaded: jest.fn(async () => false),
  getLocalPath: async () => '',
  markCompleted: jest.fn(),
  downloadTutorial: jest.fn(),
}));

jest.mock('expo-av', () => ({
  ResizeMode: { CONTAIN: 'contain' },
  Video: () => null,
}));

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 'LANDSCAPE', PORTRAIT_UP: 'PORTRAIT_UP' },
  lockAsync: jest.fn(),
}));

const storageMock = jest.requireMock('../../src/features/tutorials/storage') as {
  downloadTutorial: jest.Mock;
  isDownloaded: jest.Mock;
};

describe('Smoke test navigation tutoriels -> player', () => {
  beforeEach(() => {
    mockPush.mockClear();
    storageMock.isDownloaded.mockResolvedValue(false);
    storageMock.downloadTutorial.mockReset();
    storageMock.downloadTutorial.mockResolvedValue('file://local/tuto-01.mp4');
  });

  it('rend la page tutoriels et déclenche la navigation', async () => {
    render(<TutorialsScreen />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('0/10 tutoriels terminés')).toBeTruthy();
    fireEvent.press(screen.getByText('Ouvrir un créneau'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/tutoriels/player',
      params: { id: 'tuto-01' },
    });
  });

  it('rend la page player avec le tutoriel ciblé', () => {
    render(<TutorialPlayerScreen />);
    expect(screen.getByText('Ouvrir un créneau')).toBeTruthy();
    expect(screen.getByText('Chapitres')).toBeTruthy();
  });

  it('affiche Téléchargement puis Disponible hors ligne', async () => {
    let resolveDownload: ((uri: string) => void) | null = null;
    storageMock.downloadTutorial.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveDownload = resolve;
        }),
    );

    render(<TutorialPlayerScreen />);
    fireEvent.press(screen.getByText('📥 Télécharger pour hors ligne'));
    expect(screen.getByText('Téléchargement 0%')).toBeTruthy();

    await act(async () => {
      resolveDownload?.('file://local/tuto-01.mp4');
      await Promise.resolve();
    });

    expect(screen.getByText('📥 Disponible hors ligne')).toBeTruthy();
  });

  it('simule la progression 10% -> 55% -> 100% puis finalise en hors ligne', async () => {
    let resolveDownload: ((uri: string) => void) | null = null;
    let reportProgress: ((value: number) => void) | null = null;

    storageMock.downloadTutorial.mockImplementation(
      (_tutorial: unknown, onProgress: (value: number) => void) => {
        reportProgress = onProgress;
        return new Promise<string>((resolve) => {
          resolveDownload = resolve;
        });
      },
    );

    render(<TutorialPlayerScreen />);
    fireEvent.press(screen.getByText('📥 Télécharger pour hors ligne'));

    await act(async () => {
      reportProgress?.(10);
      await Promise.resolve();
    });
    expect(screen.getByText('Téléchargement 10%')).toBeTruthy();

    await act(async () => {
      reportProgress?.(55);
      await Promise.resolve();
    });
    expect(screen.getByText('Téléchargement 55%')).toBeTruthy();

    await act(async () => {
      reportProgress?.(100);
      await Promise.resolve();
    });
    expect(screen.getByText('Téléchargement 100%')).toBeTruthy();

    await act(async () => {
      resolveDownload?.('file://local/tuto-01.mp4');
      await Promise.resolve();
    });
    expect(screen.getByText('📥 Disponible hors ligne')).toBeTruthy();
  });
});
