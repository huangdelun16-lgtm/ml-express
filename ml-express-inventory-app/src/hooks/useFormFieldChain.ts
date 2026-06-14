import { useCallback, useRef, type Ref } from 'react';
import type { TextInput, TextInputProps } from 'react-native';

type ChainKey = string;

export type FormFieldChainProps = Pick<
  TextInputProps,
  'returnKeyType' | 'onSubmitEditing' | 'blurOnSubmit'
> & {
  inputRef: Ref<TextInput>;
};

/**
 * 串联表单输入框：键盘 Enter / Next 跳到下一项，最后一项为 Done 并收起键盘。
 */
export function useFormFieldChain(keys: readonly ChainKey[]) {
  const inputs = useRef<Record<string, TextInput | null>>({});

  const assignRef = useCallback((key: ChainKey) => {
    return (node: TextInput | null) => {
      inputs.current[key] = node;
    };
  }, []);

  const focus = useCallback((key: ChainKey) => {
    inputs.current[key]?.focus();
  }, []);

  const propsFor = useCallback(
    (key: ChainKey, options?: { multiline?: boolean }): FormFieldChainProps => {
      const idx = keys.indexOf(key);
      const isLast = idx === keys.length - 1;
      const isMultiline = options?.multiline ?? false;

      return {
        inputRef: assignRef(key),
        returnKeyType: isLast ? 'done' : 'next',
        blurOnSubmit: isMultiline || isLast,
        onSubmitEditing: () => {
          if (!isLast && idx >= 0) {
            focus(keys[idx + 1]);
          }
        },
      };
    },
    [keys, assignRef, focus],
  );

  return { assignRef, focus, propsFor };
}
