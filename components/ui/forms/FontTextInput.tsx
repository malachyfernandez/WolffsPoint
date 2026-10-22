import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { Platform, TextInput, TextInputProps, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';

type FontWeight = 'regular' | 'medium' | 'bold';

interface FontTextInputProps extends TextInputProps {
  ref?: React.Ref<TextInput>;
  className?: string;
  weight?: FontWeight;
  style?: TextStyle;
  autoGrow?: boolean;
  variant?: 'default' | 'styled';
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onSubmitEditing?: (event: any) => void;
  submitBehavior?: 'submit' | 'newline';
}

const WEIGHT_MAP: Record<FontWeight, '400' | '500' | '700'> = {
  regular: '400',
  medium: '500',
  bold: '700',
};

/** Walk up the DOM to find the nearest scrollable ancestor. */
const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
  if (!el) return null;
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const canScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
    if (canScroll && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

const FontTextInput = ({
  className = '',
  weight = 'regular',
  style,
  autoGrow = false,
  variant = 'default',
  onChangeText,
  onSelectionChange,
  value,
  placeholder,
  onKeyDown,
  onSubmitEditing,
  submitBehavior,
  onBlur,
  onFocus,
  autoFocus,
  selectTextOnFocus = false,
  editable,
  ref,
  ...props
}: FontTextInputProps) => {
  const [fontsLoaded] = useFonts({
    LibreBaskerville: require('../../../assets/fonts/Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf'),
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const setInputRef = useCallback(
    (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<TextInput | null>).current = node;
    },
    [ref]
  );

  useLayoutEffect(() => {
    if (!autoFocus || Platform.OS !== 'web' || typeof window === 'undefined') return;
    // Match the editor dialogs' focus timing: their portal/entry animation
    // is not yet focusable during React's initial autoFocus attempt.
    const timer = window.setTimeout(() => {
      (autoGrow ? textareaRef.current : inputRef.current)?.focus();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [autoFocus, autoGrow]);

  const resizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) {
      return;
    }

    // Preserve the parent scroll position while measuring. Setting
    // height to 0 momentarily collapses the textarea, which can cause
    // the scroll container to jump to the top. We restore it after.
    const scrollParent = findScrollParent(textarea);
    const savedScrollTop = scrollParent?.scrollTop ?? 0;
    const savedScrollLeft = scrollParent?.scrollLeft ?? 0;

    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;

    if (scrollParent) {
      scrollParent.scrollTop = savedScrollTop;
      scrollParent.scrollLeft = savedScrollLeft;
    }
  }, []);

  const getVariantClasses = () => {
    switch (variant) {
      case 'styled':
        return 'border-b-2 border-text/50 px-2 bg-text/5';
      default:
        return '';
    }
  };

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !autoGrow || !textareaRef.current) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      resizeTextarea(textareaRef.current);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [autoGrow, fontsLoaded, resizeTextarea, value]);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !autoGrow || !textareaRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    let width = textarea.getBoundingClientRect().width;
    const handleResize = () => resizeTextarea(textarea);
    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === width) {
        return;
      }

      width = entry.contentRect.width;
      handleResize();
    });
    resizeObserver.observe(textarea);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [autoGrow, resizeTextarea]);

  if (Platform.OS === 'web' && autoGrow) {
    return (
      <textarea
        ref={(el) => {
          textareaRef.current = el;
          if (typeof ref === 'function') {
            ref(el as unknown as TextInput);
          } else if (ref) {
            (ref as React.MutableRefObject<TextInput | null>).current = el as unknown as TextInput;
          }
        }}
        placeholder={placeholder}
        value={typeof value === 'string' ? value : ''}
        autoFocus={autoFocus}
        onFocus={(event) => {
          if (selectTextOnFocus) event.currentTarget.select();
          onFocus?.(event as unknown as Parameters<NonNullable<TextInputProps['onFocus']>>[0]);
        }}
        readOnly={editable === false}
        onBlur={
          onBlur
            ? () => onBlur({ nativeEvent: { text: typeof value === 'string' ? value : '' } } as any)
            : undefined
        }
        onChange={(event) => {
          resizeTextarea(event.currentTarget);
          onChangeText?.(event.target.value);
        }}
        onSelect={(event) => {
          onSelectionChange?.({
            nativeEvent: {
              selection: {
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              },
            },
          } as any);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (event.defaultPrevented) {
            return;
          }

          if (submitBehavior === 'submit' && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmitEditing?.({
              nativeEvent: {
                text: typeof value === 'string' ? value : '',
              },
            } as any);
          }
        }}
        rows={1}
        className={`${className} ${getVariantClasses()} resize-none overflow-hidden rounded focus:outline-none`}
        style={{
          fontFamily: fontsLoaded ? 'LibreBaskerville' : undefined,
          fontWeight: WEIGHT_MAP[weight] as '400' | '500' | '700',
          minHeight: 44,
          ...(style as React.CSSProperties),
        }}
      />
    );
  }

  return (
    <TextInput
      ref={setInputRef}
      className={`${className} ${getVariantClasses()} text-text rounded focus:outline-none`}
      style={{
        fontFamily: fontsLoaded ? 'LibreBaskerville' : undefined,
        fontWeight: WEIGHT_MAP[weight] as '400' | '500' | '700',
        // color: 'black',
        ...style,
      }}
      placeholderTextColor="rgb(0 0 0 / 0.3)"
      value={value}
      placeholder={placeholder}
      onChangeText={onChangeText}
      autoFocus={autoFocus}
      selectTextOnFocus={selectTextOnFocus}
      onFocus={onFocus}
      onBlur={onBlur}
      onSelectionChange={onSelectionChange}
      onSubmitEditing={onSubmitEditing}
      submitBehavior={submitBehavior}
      editable={editable}
      {...props}
    />
  );
};

export default FontTextInput;
