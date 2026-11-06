import {
  CAPACITY,
  clearDeliveryTimings,
  deliveryTimings,
  recordDelivery,
} from 'viz/deliveryTimings';

const timing = (i: number) => ({
  path: `p/${i}`,
  ts: i,
  receivedAt: i + 1,
  arrivedAt: i + 2,
});

describe('the delivery timings', () => {
  beforeEach(() => clearDeliveryTimings());

  it('keeps the three times of each sample, oldest first', () => {
    recordDelivery(timing(1));
    recordDelivery(timing(2));

    expect(deliveryTimings()).toEqual([timing(1), timing(2)]);
  });

  it('keeps only the last samples once full', () => {
    for (let i = 0; i < CAPACITY + 3; i += 1) recordDelivery(timing(i));

    const kept = deliveryTimings();
    expect(kept).toHaveLength(CAPACITY);
    expect(kept[0]).toEqual(timing(3));
    expect(kept[CAPACITY - 1]).toEqual(timing(CAPACITY + 2));
  });

  it('starts again from none when cleared', () => {
    recordDelivery(timing(1));
    clearDeliveryTimings();

    expect(deliveryTimings()).toEqual([]);
  });
});
