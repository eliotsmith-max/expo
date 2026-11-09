import ExpoMediaSession from '../ExpoMediaSession';
import { offerNowPlaying } from '../MediaSession';

jest.mock('../ExpoMediaSession', () => ({
  __esModule: true,
  default: {
    NowPlayingOwner: class {
      static instances: any[] = [];
      listeners = new Map<string, Function>();
      offer = jest.fn();
      update = jest.fn();
      withdraw = jest.fn();
      release = jest.fn();
      constructor() {
        (this.constructor as any).instances.push(this);
      }
      addListener(event: string, listener: Function) {
        this.listeners.set(event, listener);
        return { remove: () => this.listeners.delete(event) };
      }
    },
  },
}));

const nativeModule = ExpoMediaSession as jest.Mocked<typeof ExpoMediaSession>;

it('offerNowPlayingForwardsNativeCommandsToTheOwner', () => {
  const owner = {
    nowPlayingId: 'a',
    mediaType: 'audio' as const,
    isPlaying: true,
    handle: jest.fn(() => true),
  };
  const claim = offerNowPlaying(owner, { title: 'A' }, ['play', 'pause']);
  const native = (nativeModule.NowPlayingOwner as any).instances[0];

  expect(native.offer).toHaveBeenCalledWith({ title: 'A' }, ['play', 'pause'], true);
  native.listeners.get('command')({ kind: 'pause' });
  native.listeners.get('pauseForTakeover')();
  expect(owner.handle.mock.calls).toEqual([[{ kind: 'pause' }], [{ kind: 'pause' }]]);

  owner.isPlaying = false;
  claim.update({ title: 'A', elapsedTime: 3 });
  expect(native.update).toHaveBeenCalledWith({ title: 'A', elapsedTime: 3 }, null, false);

  claim.withdraw('ended');
  claim.withdraw('ended');
  expect(native.withdraw).toHaveBeenCalledTimes(1);
  expect(native.release).toHaveBeenCalledTimes(1);
  expect(native.listeners.size).toBe(0);
});
