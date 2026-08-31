import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet, PrimaryButton } from '@/components/base';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type DateFieldProps = {
  value: string;
  onChange: (isoDate: string) => void;
  label?: string;
  confirmLabel?: string;
};

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDmy(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function DateField({ value, onChange, label, confirmLabel }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseIsoDate(value));
  const formatted = formatDmy(value);

  const openPicker = () => {
    setDraftDate(parseIsoDate(value));
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${formatted}`}
        accessibilityRole="button"
        onPress={openPicker}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}>
        <Text style={styles.value}>{formatted}</Text>
        <CalendarDays color={colors.content.secondary} size={18} strokeWidth={2} />
      </Pressable>

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          mode="date"
          onChange={(_event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              onChange(toIsoDate(selectedDate));
            }
          }}
          value={draftDate}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Sheet
          applyBottomInset={false}
          onClose={() => setShowPicker(false)}
          style={shadows.card}
          visible={showPicker}>
          <DateTimePicker
            display="inline"
            mode="date"
            onChange={(_event, selectedDate) => {
              if (selectedDate) {
                setDraftDate(selectedDate);
              }
            }}
            value={draftDate}
          />
          <PrimaryButton
            backgroundColor={colors.brand.primary}
            label={confirmLabel ?? ''}
            minHeight={50}
            onPress={() => {
              onChange(toIsoDate(draftDate));
              setShowPicker(false);
            }}
            style={styles.pickerConfirmSpacing}
          />
        </Sheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  fieldPressed: {
    backgroundColor: colors.surface.muted,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  pickerConfirmSpacing: {
    marginTop: spacing[3],
  },
  value: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
});
