import { beforeEach, describe, expect, it } from '@jest/globals';
import { PeerEvents, Subscription } from 'src/fsm/subscriptions';
import { NoticeKind } from 'src/peers/peers';

const PEER = 'hospital-2';

const FULL: Subscription = {
  peer: PEER,
  when: { state: 'full' },
  event: 'neighbour-full',
};

const DOWN: Subscription = {
  peer: PEER,
  when: { online: false },
  event: 'neighbour-down',
};

// The data of a state document of the peer in the state
const inState = (state: string, command: string) => ({
  id: PEER,
  machine: { state, status: 'running', entry: 1, events: [] },
  parameters: {},
  command: { name: command, status: 'running' },
});

type Notice = [NoticeKind, unknown];

// The worked example of the issue: what hospital-2 publishes
const EXAMPLE: Notice[] = [
  ['presence', { online: true, descriptor: { id: PEER } }],
  ['state', inState('open', 'open')],
  ['state', inState('open', 'admit')],
  ['state', inState('open', 'admit')],
  ['state', inState('open', 'admit')],
  ['state', inState('full', 'full')],
  ['state', inState('full', 'full')],
  ['state', inState('full', 'discharge')],
  ['state', inState('open', 'open')],
  ['presence', { online: false }],
];

describe('PeerEvents', () => {
  let raised: string[];
  let events: PeerEvents;

  // The events raised by each notice
  const replay = (notices: Notice[], peer = PEER) =>
    notices.map(([kind, data]) => {
      raised = [];
      events.see(peer, kind, data);
      return raised;
    });

  beforeEach(() => {
    raised = [];
    events = new PeerEvents(({ event }) => raised.push(event));
    events.declare([FULL, DOWN]);
  });

  it('Should raise one event per change of interest in the example', () => {
    expect(replay(EXAMPLE)).toEqual([
      [],
      [],
      [],
      [],
      [],
      ['neighbour-full'],
      [],
      [],
      [],
      ['neighbour-down'],
    ]);
  });

  it('Should raise for a first notice that holds', () => {
    expect(replay([['state', inState('full', 'full')]])).toEqual([
      ['neighbour-full'],
    ]);
  });

  it('Should raise nothing for a duplicate delivery', () => {
    const offline: Notice = ['presence', { online: false }];

    expect(replay([offline, offline])).toEqual([['neighbour-down'], []]);
  });

  it('Should leave a state record alone on a presence notice', () => {
    expect(
      replay([
        ['state', inState('full', 'full')],
        ['presence', { online: true }],
        ['state', inState('full', 'full')],
      ]),
    ).toEqual([['neighbour-full'], [], []]);
  });

  it('Should hold no state for a null machine or an empty payload', () => {
    expect(
      replay([
        ['state', { id: PEER, machine: null }],
        ['state', null],
        ['presence', null],
        ['state', inState('full', 'full')],
      ]),
    ).toEqual([[], [], [], ['neighbour-full']]);
  });

  it('Should raise the events of one notice in file order', () => {
    const again = { ...DOWN, event: 'neighbour-gone' };
    events.declare([DOWN, FULL, again]);

    expect(replay([['presence', { online: false }]])).toEqual([
      ['neighbour-down', 'neighbour-gone'],
    ]);
  });

  it('Should count the next notice as the first after forget', () => {
    const full: Notice = ['state', inState('full', 'full')];
    replay([full]);
    events.forget(PEER);

    expect(replay([full])).toEqual([['neighbour-full']]);
  });

  it('Should ignore the notices of another peer, and forget no other', () => {
    const full: Notice = ['state', inState('full', 'full')];
    replay([full]);
    events.forget('hospital-3');

    expect(replay([full], 'hospital-3')).toEqual([[]]);
    expect(replay([full])).toEqual([[]]);
  });

  it('Should start from unknown on a new declare', () => {
    const full: Notice = ['state', inState('full', 'full')];
    replay([full]);
    events.declare([FULL]);

    expect(replay([full])).toEqual([['neighbour-full']]);
  });
});
