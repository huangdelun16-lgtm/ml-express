import { useMemo, useState } from 'react';
import {
  formatSpec,
  formatUnit,
  formatWeight,
  parseSpec,
  parseUnit,
  parseWeight,
} from '../utils/itemFieldFormat';

export type ItemFormValues = {
  barcode: string;
  name: string;
  specL: string;
  specW: string;
  specH: string;
  unitN: string;
  weightN: string;
  note: string;
};

export function useItemFormState(initial?: Partial<ItemFormValues>) {
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [specL, setSpecL] = useState(initial?.specL ?? '');
  const [specW, setSpecW] = useState(initial?.specW ?? '');
  const [specH, setSpecH] = useState(initial?.specH ?? '');
  const [unitN, setUnitN] = useState(initial?.unitN ?? '1');
  const [weightN, setWeightN] = useState(initial?.weightN ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const specStr = useMemo(
    () => formatSpec({ l: specL, w: specW, h: specH }),
    [specL, specW, specH],
  );
  const unitStr = useMemo(() => formatUnit({ n: unitN }), [unitN]);
  const weightStr = useMemo(() => formatWeight({ n: weightN }), [weightN]);

  const loadFromStored = (input: {
    barcode: string;
    name: string;
    spec: string;
    unit: string;
    weight: string;
    note: string;
  }) => {
    const spec = parseSpec(input.spec);
    const unit = parseUnit(input.unit);
    const weight = parseWeight(input.weight);
    setBarcode(input.barcode);
    setName(input.name);
    setSpecL(spec.l);
    setSpecW(spec.w);
    setSpecH(spec.h);
    setUnitN(unit.n);
    setWeightN(weight.n);
    setNote(input.note);
  };

  const reset = (next?: Partial<ItemFormValues>) => {
    setBarcode(next?.barcode ?? '');
    setName(next?.name ?? '');
    setSpecL(next?.specL ?? '');
    setSpecW(next?.specW ?? '');
    setSpecH(next?.specH ?? '');
    setUnitN(next?.unitN ?? '1');
    setWeightN(next?.weightN ?? '');
    setNote(next?.note ?? '');
  };

  const payload = useMemo(
    () => ({
      barcode: barcode.trim(),
      name: name.trim(),
      spec: specStr,
      unit: unitStr,
      weight: weightStr,
      note: note.trim(),
    }),
    [barcode, name, specStr, unitStr, weightStr, note],
  );

  return {
    barcode,
    setBarcode,
    name,
    setName,
    specL,
    setSpecL,
    specW,
    setSpecW,
    specH,
    setSpecH,
    unitN,
    setUnitN,
    weightN,
    setWeightN,
    note,
    setNote,
    specStr,
    unitStr,
    weightStr,
    payload,
    loadFromStored,
    reset,
  };
}
