import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import DialogHeader from '../../components/ui/dialog/DialogHeader';
import ShadowScrollView from '../../components/ui/ShadowScrollView';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import AppDropdown, { AppDropdownOption } from '../../components/ui/forms/AppDropdown';
import FontNumberInput from '../../components/ui/forms/FontNumberInput';
import FontTextInput from '../../components/ui/forms/FontTextInput';
import CustomCheckbox from '../../components/ui/CustomCheckbox';
import FontText from '../../components/ui/text/FontText';
import type { RenderInstruction } from './interpreter';

export interface ScriptRenderersProps {
  instructions: RenderInstruction[];
  state?: Record<string, string | undefined>;
  setState?: (state: Record<string, string | undefined>) => void;
  isInDialog?: boolean;
  renderMarkdown: (markdown: string, key: string) => React.ReactNode;
}

const optionFromValue = (value: unknown, index: number): AppDropdownOption => {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // Registry already produces { value, label, meta? } — pass through directly
    if (typeof record.value === 'string' || typeof record.value === 'number') {
      return {
        value: String(record.value),
        label: typeof record.label === 'string' ? record.label : String(record.value),
        meta: record.meta as AppDropdownOption['meta'],
      };
    }
    // Fallback: try common field names on raw objects
    const rawValue =
      record.realName ??
      record.role ??
      record.email ??
      record.userId ??
      record.name ??
      record.id ??
      index;
    const rawLabel = record.label ?? record.realName ?? record.role ?? record.name ?? rawValue;
    return { value: String(rawValue), label: String(rawLabel) };
  }
  return { value: String(value ?? ''), label: String(value ?? '') };
};

const parseSelections = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [value];
  } catch {
    return [value];
  }
};

const MultiSelectDropdown = ({
  options,
  selected,
  limit,
  placeholder,
  disabled,
  onChange,
}: {
  options: AppDropdownOption[];
  selected: string[];
  limit: number;
  placeholder: string;
  disabled: boolean;
  isInDialog: boolean;
  onChange: (next: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selectedCount = selected.length;
  const triggerLabel =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1
        ? (options.find((opt) => selected.includes(opt.value))?.label ?? placeholder)
        : `${selectedCount} selected`;

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else if (selected.length < limit) {
      onChange([...selected, value]);
    }
  };

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`bg-text/10 w-full flex-row items-center justify-between rounded-xl px-4 py-3 ${disabled ? 'opacity-60' : ''}`}>
        <FontText className={selectedCount === 0 ? 'opacity-50' : ''}>{triggerLabel}</FontText>
        <ChevronDown size={16} color="currentColor" />
      </Pressable>
      <ConvexDialog.Root isOpen={open} onOpenChange={setOpen}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm p-1">
            <DialogHeader text={placeholder} subtext={`Select up to ${limit}`} />
            <Column className="gap-1 p-4">
              <ShadowScrollView className="max-h-80" contentContainerStyle={{ gap: 0 }}>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  const atLimit = selected.length >= limit && !isSelected;
                  return (
                    <Pressable
                      key={option.value}
                      disabled={atLimit}
                      onPress={() => toggle(option.value)}
                      className={`flex-row items-center gap-3 rounded-lg px-3 py-2.5 ${isSelected ? 'bg-text/5' : atLimit ? 'opacity-40' : ''}`}>
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => toggle(option.value)}
                        monochrome
                      />
                      <FontText>{option.label}</FontText>
                    </Pressable>
                  );
                })}
              </ShadowScrollView>
              <Row className="justify-end pt-3">
                <Pressable onPress={() => setOpen(false)} className="px-3 py-1.5">
                  <FontText weight="medium" color="accent">
                    Done
                  </FontText>
                </Pressable>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

export const ScriptRenderers = ({
  instructions,
  state,
  setState,
  isInDialog = false,
  renderMarkdown,
}: ScriptRenderersProps) => {
  const update = (name: string, value: string) => setState?.({ ...(state ?? {}), [name]: value });

  return (
    <Column className="gap-3">
      {instructions.map((instruction, index) => {
        const key = `${instruction.key}-${index}`;
        const disabled = instruction.disabled || !setState;
        const value = state?.[instruction.key];

        if (instruction.kind === 'divider') {
          return <View key={key} className="bg-border h-px w-full opacity-60" />;
        }
        if (instruction.kind === 'markdown') {
          return (
            <React.Fragment key={key}>
              {renderMarkdown(instruction.markdown ?? '', key)}
            </React.Fragment>
          );
        }
        if (instruction.kind === 'checkbox') {
          const checked = value === undefined ? Boolean(instruction.value) : value === 'true';
          return (
            <Row
              key={key}
              className={`items-center gap-3 ${disabled ? 'opacity-60' : ''}`}
              pointerEvents={disabled ? 'none' : 'auto'}>
              <CustomCheckbox
                checked={checked}
                onChange={(next) => update(instruction.key, String(next))}
                monochrome
              />
              <FontText>{instruction.label ?? instruction.key}</FontText>
            </Row>
          );
        }
        if (instruction.kind === 'number') {
          return (
            <FontNumberInput
              key={key}
              value={value ?? (typeof instruction.value === 'number' ? instruction.value : '')}
              onChangeText={(displayValue) => update(instruction.key, displayValue)}
              minValue={instruction.min}
              maxValue={instruction.max}
              editable={!disabled}
              placeholder={instruction.placeholder ?? instruction.label ?? instruction.key}
              className="bg-text/10 w-full rounded-xl px-4 py-3"
            />
          );
        }
        if (instruction.kind === 'text') {
          return (
            <FontTextInput
              key={key}
              value={value ?? (typeof instruction.value === 'string' ? instruction.value : '')}
              onChangeText={(next) => update(instruction.key, next)}
              editable={!disabled}
              autoGrow
              placeholder={instruction.placeholder ?? instruction.label ?? instruction.key}
              className="bg-text/10 w-full rounded-xl px-4 py-3"
            />
          );
        }

        const options = (instruction.options ?? []).map(optionFromValue);
        const limit = Math.max(
          1,
          Math.floor(instruction.numberSelectable ?? (instruction.multiple ? options.length : 1))
        );
        if (limit > 1) {
          const selected = parseSelections(value);
          return (
            <MultiSelectDropdown
              key={key}
              options={options}
              selected={selected}
              limit={limit}
              placeholder={instruction.label ?? instruction.key}
              disabled={disabled}
              isInDialog={isInDialog}
              onChange={(next) => update(instruction.key, JSON.stringify(next))}
            />
          );
        }
        return (
          <AppDropdown
            key={key}
            options={options}
            value={value}
            onValueChange={(next) => update(instruction.key, next)}
            placeholder={instruction.placeholder ?? instruction.label ?? instruction.key}
            emptyText="No options available"
            triggerClassName="border-0 bg-text/10 hover:bg-text/5 rounded-xl"
            contentClassName="border-0"
            isInDialog={isInDialog}
            disabled={disabled}
          />
        );
      })}
    </Column>
  );
};
