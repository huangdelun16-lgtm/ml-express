import {
  appendPackingAckToNotes,
  getPackingProfile,
  isValidPackingAck,
  notesWithoutPackingAck,
  packingAckLine,
  packingProfileIdForStoreType,
  parsePackingAckFromNotes,
} from './platformPackingGuide';

describe('platformPackingGuide', () => {
  it('maps restaurant and breakfast to food-safety packing', () => {
    expect(packingProfileIdForStoreType('restaurant')).toBe('food_safety');
    expect(packingProfileIdForStoreType('breakfast')).toBe('food_safety');
    expect(getPackingProfile('restaurant').title.zh).toBe('食品安全包装');
  });

  it('gives restaurant packing a four-panel visual spec', () => {
    const profile = getPackingProfile('restaurant');
    expect(profile.visualPanels).toHaveLength(4);
    expect(profile.visualPanels?.[0].title.zh).toBe('盖紧内盒');
    expect(profile.visualPanels?.[1].title.zh).toBe('二次封口');
    expect(profile.visualPanels?.[2].title.my).toContain('အိတ်ခွဲ');
    expect(profile.visualRider?.my).toContain('ပိတ်ပြီးသားအိတ်');
  });

  it('gives drinks, cake, flower, apparel and grocery the same four-panel spec', () => {
    const cases: Array<[string, string]> = [
      ['drinks_snacks', '扣紧杯盖'],
      ['cake_shop', '硬盒固定'],
      ['flower_shop', '花茎保水'],
      ['clothing_store', '叠平整'],
      ['grocery', '干湿分开'],
    ];
    for (const [storeType, firstTitle] of cases) {
      const profile = getPackingProfile(storeType);
      expect(profile.visualPanels).toHaveLength(4);
      expect(profile.visualPanels?.[0].title.zh).toBe(firstTitle);
      expect(profile.visualRider?.zh).toBeTruthy();
    }
  });

  it('maps drinks and tea shop to sealed drink packing', () => {
    expect(packingProfileIdForStoreType('drinks_snacks')).toBe('drinks_seal');
    expect(packingProfileIdForStoreType('tea_shop')).toBe('drinks_seal');
  });

  it('requires a matching profile before submit', () => {
    expect(isValidPackingAck('restaurant', 'food_safety', true)).toBe(true);
    expect(isValidPackingAck('restaurant', 'food_safety', false)).toBe(false);
    expect(isValidPackingAck('restaurant', 'drinks_seal', true)).toBe(false);
    expect(isValidPackingAck('clothing_store', 'apparel_bag', true)).toBe(true);
  });

  it('appends and parses the admin-facing ack line', () => {
    const profile = getPackingProfile('restaurant');
    const notes = appendPackingAckToNotes('靠近夜市', profile);
    expect(notes).toContain('靠近夜市');
    expect(parsePackingAckFromNotes(notes)).toBe('食品安全包装');
    expect(notesWithoutPackingAck(notes)).toBe('靠近夜市');
  });

  it('replaces an older ack line when the store type changes', () => {
    const first = appendPackingAckToNotes('', getPackingProfile('restaurant'));
    const next = appendPackingAckToNotes(first, getPackingProfile('flower_shop'));
    expect(next).toBe(packingAckLine(getPackingProfile('flower_shop')));
    expect(next).not.toContain('食品安全包装');
  });
});
