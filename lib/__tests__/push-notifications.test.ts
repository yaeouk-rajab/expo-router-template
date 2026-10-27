import { extractDeepLinkData, routeFor } from '../push-notifications';
import type { NotificationResponse } from 'expo-notifications';

// expo-notifications 58 installs a default notification handler as soon as it is
// imported, and jest-expo's native-module mock hands back subscriptions without
// remove(); the module under test then replaces that handler and throws. These
// tests only exercise the pure helpers, so the handler setup is stubbed out.
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));

function fakeResponse(data: Record<string, unknown> | undefined): NotificationResponse {
  return {
    notification: {
      date: Date.now(),
      request: {
        identifier: 'req-1',
        content: {
          title: 'Hello',
          subtitle: null,
          body: 'Something happened.',
          data,
          categoryIdentifier: null,
          sound: 'default',
        } as never,
        trigger: { type: 'push' },
      },
    },
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
  };
}

describe('extractDeepLinkData', () => {
  it('extracts an in-app route from the data payload', () => {
    expect(extractDeepLinkData(fakeResponse({ route: '/items/42' }))).toEqual({
      route: '/items/42',
    });
  });

  it('returns null when data is missing entirely', () => {
    expect(extractDeepLinkData(fakeResponse(undefined))).toBeNull();
  });

  it('returns null when route is missing', () => {
    expect(extractDeepLinkData(fakeResponse({ other: 'x' }))).toBeNull();
  });

  it('returns null when route is not a string', () => {
    expect(extractDeepLinkData(fakeResponse({ route: 42 }))).toBeNull();
  });

  it('returns null for an empty route', () => {
    expect(extractDeepLinkData(fakeResponse({ route: '' }))).toBeNull();
  });

  it('rejects routes that are not in-app absolute paths', () => {
    expect(extractDeepLinkData(fakeResponse({ route: 'items/42' }))).toBeNull();
    expect(extractDeepLinkData(fakeResponse({ route: '//evil.example.com/x' }))).toBeNull();
    expect(extractDeepLinkData(fakeResponse({ route: 'https://evil.example.com' }))).toBeNull();
    expect(extractDeepLinkData(fakeResponse({ route: '/redirect?to=https://evil.example.com' }))).toBeNull();
  });
});

describe('routeFor', () => {
  it('returns the route unchanged', () => {
    expect(routeFor({ route: '/items/42' })).toBe('/items/42');
  });
});
