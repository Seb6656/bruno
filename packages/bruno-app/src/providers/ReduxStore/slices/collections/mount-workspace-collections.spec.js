const { describe, it, expect, beforeEach } = require('@jest/globals');
const { configureStore } = require('@reduxjs/toolkit');

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const collectionsReducer = require('providers/ReduxStore/slices/collections').default;
const { mountWorkspaceCollections } = require('providers/ReduxStore/slices/collections/actions');

const WORKSPACE_UID = 'ws-1';
const WORKSPACE_PATH = '/workspaces/one';
const SCRATCH_UID = 'scratch-1';

const makeCollection = (name, mountStatus = 'unmounted') => ({
  uid: `uid-${name}`,
  name,
  pathname: `${WORKSPACE_PATH}/collections/${name}`,
  brunoConfig: {},
  mountStatus,
  collapsed: true,
  items: []
});

const OTHER_WORKSPACE_UID = 'ws-2';
const OTHER_WORKSPACE_PATH = '/workspaces/two';

const createStore = ({ enabled = true, collections, outsiders = [], otherWorkspaceCollections = [] }) => {
  // the scratch collection is deliberately listed too, so only the uid check can exclude it
  const workspaceCollections = collections.map((c) => ({ path: c.pathname }));
  const preloadedState = {
    app: { preferences: { beta: { 'load-all-collections': enabled }, cache: { file: { enabled: false } } } },
    workspaces: {
      activeWorkspaceUid: WORKSPACE_UID,
      workspaces: [
        {
          uid: WORKSPACE_UID,
          pathname: WORKSPACE_PATH,
          scratchCollectionUid: SCRATCH_UID,
          collections: workspaceCollections
        },
        {
          uid: OTHER_WORKSPACE_UID,
          pathname: OTHER_WORKSPACE_PATH,
          collections: otherWorkspaceCollections.map((c) => ({ path: c.pathname }))
        }
      ]
    },
    collections: {
      collectionSortOrder: 'default',
      collections: [...collections, ...outsiders, ...otherWorkspaceCollections],
      tempDirectories: {}
    }
  };
  return configureStore({
    reducer: {
      app: (state = preloadedState.app, action) => (action.type === 'test/setLoadAll'
        ? { preferences: { ...state.preferences, beta: { 'load-all-collections': action.payload } } }
        : state),
      workspaces: (state = preloadedState.workspaces, action) => {
        if (action.type === 'test/switch') {
          return { ...state, activeWorkspaceUid: action.payload };
        }
        if (action.type === 'test/addCollection') {
          return {
            ...state,
            workspaces: state.workspaces.map((w) => (w.uid === action.payload.workspaceUid
              ? { ...w, collections: [...w.collections, { path: action.payload.collection.pathname }] }
              : w))
          };
        }
        return state;
      },
      collections: (state, action) => (action.type === 'test/addCollection'
        ? { ...state, collections: [...state.collections, action.payload.collection] }
        : collectionsReducer(state, action))
    },
    preloadedState
  });
};

const statusOf = (store, uid) => store.getState().collections.collections.find((c) => c.uid === uid).mountStatus;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Mount IPC calls are held open until the test resolves/rejects them.
const installControllableIpc = () => {
  const pending = [];
  const calls = [];
  window.ipcRenderer = {
    invoke: jest.fn((channel, args) => {
      if (channel === 'renderer:mount-collection') {
        calls.push(args.collectionUid);
        return new Promise((resolve, reject) => pending.push({ uid: args.collectionUid, resolve, reject }));
      }
      return Promise.resolve(null);
    })
  };
  const settle = (uid, error) => {
    const entry = pending.splice(pending.findIndex((p) => p.uid === uid), 1)[0];
    return error ? entry.reject(error) : entry.resolve('/tmp/transient');
  };
  return { pending, calls, settle };
};

describe('mountWorkspaceCollections', () => {
  let ipc;

  beforeEach(() => {
    ipc = installControllableIpc();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('does nothing when the preference is off', async () => {
    const store = createStore({ enabled: false, collections: [makeCollection('a')] });

    await store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));

    expect(ipc.calls).toEqual([]);
    expect(statusOf(store, 'uid-a')).toBe('unmounted');
  });

  it('skips mounted, mounting and scratch collections', async () => {
    const scratch = { ...makeCollection('scratch'), uid: SCRATCH_UID };
    const store = createStore({
      collections: [
        makeCollection('mounted', 'mounted'),
        makeCollection('mounting', 'mounting'),
        scratch,
        makeCollection('todo')
      ]
    });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    ipc.settle('uid-todo');
    await run;

    expect(ipc.calls).toEqual(['uid-todo']);
    expect(statusOf(store, 'uid-todo')).toBe('mounted');
  });

  it('ignores collections that do not belong to the workspace', async () => {
    const outsider = { ...makeCollection('outsider'), pathname: '/elsewhere/outsider' };
    const store = createStore({ collections: [makeCollection('a')], outsiders: [outsider] });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    ipc.settle('uid-a');
    await run;

    expect(ipc.calls).toEqual(['uid-a']);
  });

  it('never runs more than 2 mounts at once', async () => {
    const store = createStore({ collections: ['a', 'b', 'c', 'd', 'e'].map((n) => makeCollection(n)) });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    expect(ipc.pending.map((p) => p.uid)).toEqual(['uid-a', 'uid-b']);

    ipc.settle('uid-a');
    await flush();
    expect(ipc.pending.map((p) => p.uid)).toEqual(['uid-b', 'uid-c']);

    ipc.settle('uid-b');
    ipc.settle('uid-c');
    await flush();
    expect(ipc.pending.map((p) => p.uid)).toEqual(['uid-d', 'uid-e']);

    ipc.settle('uid-d');
    ipc.settle('uid-e');
    await run;

    expect(ipc.calls).toEqual(['uid-a', 'uid-b', 'uid-c', 'uid-d', 'uid-e']);
  });

  it('keeps going when one mount fails', async () => {
    const store = createStore({ collections: ['a', 'b', 'c'].map((n) => makeCollection(n)) });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    ipc.settle('uid-a', new Error('boom'));
    await flush();
    ipc.settle('uid-b');
    await flush();
    ipc.settle('uid-c');
    await run;

    expect(ipc.calls).toEqual(['uid-a', 'uid-b', 'uid-c']);
    expect(statusOf(store, 'uid-a')).toBe('unmounted');
    expect(statusOf(store, 'uid-b')).toBe('mounted');
    expect(statusOf(store, 'uid-c')).toBe('mounted');
    expect(console.error).toHaveBeenCalled();
  });

  it('skips a collection that was mounted by the user while the queue was running', async () => {
    const store = createStore({ collections: ['a', 'b', 'c'].map((n) => makeCollection(n)) });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    // user mounts "c" before the queue reaches it
    store.dispatch(require('providers/ReduxStore/slices/collections').updateCollectionMountStatus({
      collectionUid: 'uid-c',
      mountStatus: 'mounted'
    }));
    ipc.settle('uid-a');
    ipc.settle('uid-b');
    await run;

    expect(ipc.calls).toEqual(['uid-a', 'uid-b']);
  });

  it('stops starting new mounts once another workspace is active', async () => {
    const store = createStore({ collections: ['a', 'b', 'c', 'd'].map((n) => makeCollection(n)) });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    store.dispatch({ type: 'test/switch', payload: 'ws-other' });
    ipc.settle('uid-a');
    ipc.settle('uid-b');
    await run;

    expect(ipc.calls).toEqual(['uid-a', 'uid-b']);
  });

  it('mounts with skipTabRestore so saved tabs are not reopened', async () => {
    const store = createStore({ collections: [makeCollection('a')] });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    ipc.settle('uid-a');
    await run;

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:mount-collection',
      expect.objectContaining({ collectionUid: 'uid-a', workspacePathname: WORKSPACE_PATH })
    );
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith(
      'renderer:snapshot:get-tabs',
      expect.anything(),
      expect.anything()
    );
  });

  it('joins a run already in flight instead of starting a second pool, then reruns for new collections', async () => {
    const store = createStore({ collections: ['a', 'b', 'c'].map((n) => makeCollection(n)) });

    const first = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    const second = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    expect(ipc.pending.map((p) => p.uid)).toEqual(['uid-a', 'uid-b']);

    // a collection that opens after the first queue was built
    store.dispatch({ type: 'test/addCollection', payload: { workspaceUid: WORKSPACE_UID, collection: makeCollection('late') } });

    ipc.settle('uid-a');
    ipc.settle('uid-b');
    await flush();
    expect(ipc.pending.length).toBeLessThanOrEqual(2);
    ipc.settle('uid-c');
    await flush();
    expect(ipc.pending.map((p) => p.uid)).toEqual(['uid-late']);
    ipc.settle('uid-late');
    await Promise.all([first, second]);

    expect(ipc.calls).toEqual(['uid-a', 'uid-b', 'uid-c', 'uid-late']);
  });

  it('stops the old workspace on a switch and reruns for the new workspace', async () => {
    const store = createStore({
      collections: ['a', 'b', 'c'].map((n) => makeCollection(n)),
      otherWorkspaceCollections: [{ ...makeCollection('x'), pathname: `${OTHER_WORKSPACE_PATH}/collections/x` }]
    });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    store.dispatch({ type: 'test/switch', payload: OTHER_WORKSPACE_UID });
    store.dispatch(mountWorkspaceCollections(OTHER_WORKSPACE_UID));
    ipc.settle('uid-a');
    ipc.settle('uid-b');
    await flush();
    expect(ipc.pending.map((p) => p.uid)).toEqual(['uid-x']);
    ipc.settle('uid-x');
    await run;

    expect(ipc.calls).toEqual(['uid-a', 'uid-b', 'uid-x']);
  });

  it('stops starting new mounts when the preference is turned off mid-run', async () => {
    const store = createStore({ collections: ['a', 'b', 'c', 'd'].map((n) => makeCollection(n)) });

    const run = store.dispatch(mountWorkspaceCollections(WORKSPACE_UID));
    await flush();
    store.dispatch({ type: 'test/setLoadAll', payload: false });
    ipc.settle('uid-a');
    ipc.settle('uid-b');
    await run;

    expect(ipc.calls).toEqual(['uid-a', 'uid-b']);
  });
});
