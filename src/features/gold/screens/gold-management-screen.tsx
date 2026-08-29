// src/features/gold/screens/gold-management-screen.tsx
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  GoldActionPickerSheet,
  GoldBrandManageSheet,
  GoldCalendarModal,
  GoldDetailSheet,
  GoldFormSheet,
  GoldHistoryList,
  GoldOverviewCard,
  GoldTrashSheet,
  type GoldDropdownOption,
  type GoldHistoryItem,
} from '@/components/gold';
import { formatVnd } from '@/core/domain/finance/money';
import { GoldError, type GoldErrorCode } from '@/core/domain/gold/gold-error';
import { validateGoldLotInput, type GoldLotInput } from '@/core/domain/gold/gold-lot';
import {
  validateGoldSellTransactionInput,
  type GoldSellTransactionInput,
} from '@/core/domain/gold/gold-sell-transaction';
import { type GoldWeightUnit } from '@/core/domain/gold/gold-weight';
import { formatGoldWeight } from '@/features/gold/view-models/gold-presentation';
import type { GoldManagementViewModel } from '@/features/gold/view-models/use-gold-management';
import type { Translate, TranslationKey } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type GoldManagementScreenProps = GoldManagementViewModel & {
  t: Translate;
  onBack(): void;
};

type SheetKind = 'none' | 'actionPicker' | 'form' | 'brandManage' | 'detail' | 'trash';
type FormType = 'buy' | 'sell';
type DropdownKind = 'none' | 'brand' | 'unit' | 'lot';
type DetailTarget = { kind: 'lot' | 'sale'; id: string };

const UNITS: GoldWeightUnit[] = ['chi', 'luong', 'phan', 'gram'];

const GOLD_ERROR_KEY: Record<GoldErrorCode, TranslationKey> = {
  lotHasActiveSale: 'goldTrashBlockedMessage',
  lotNotFound: 'goldLotNotFoundError',
  lotNotAvailableToSell: 'goldLotAlreadySoldError',
  saleDateBeforePurchase: 'goldSaleDateBeforePurchaseError',
  lotNoLongerAvailable: 'goldRestoreUnavailableError',
};

function describeGoldError(caught: unknown, t: Translate): string {
  if (caught instanceof GoldError) {
    return t(GOLD_ERROR_KEY[caught.code]);
  }
  return caught instanceof Error ? caught.message : String(caught);
}

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDmy(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * `heldLots`/`trashedLots`/`trashedSales` below are the view-model's
 * presentation rows (`LotHistoryRow`/`SaleHistoryRow` — id/title/subtitle/
 * amountLabel), NOT the raw `GoldLot`/`GoldSellTransaction` domain records.
 * `overview.heldLots` (inside `GoldOverview`) IS the raw `GoldLot[]` domain
 * list — the two "heldLots" names refer to different shapes; this screen
 * only ever needs the presentation rows, so `overview` is read solely for
 * its `totalQuantityGrams`/`totalCostBasis` numbers.
 */
export function GoldManagementScreen(props: GoldManagementScreenProps) {
  const {
    t,
    onBack,
    overview,
    heldLots,
    trashedLots,
    trashedSales,
    activeSales,
    brands,
    loading,
    error,
  } = props;

  const [sheet, setSheet] = useState<SheetKind>('none');
  const [formType, setFormType] = useState<FormType>('buy');
  const [formSession, setFormSession] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<DropdownKind>('none');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => Number(todayIso().slice(0, 4)));
  const [calendarMonth, setCalendarMonth] = useState(() => Number(todayIso().slice(5, 7)) - 1);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [draftDate, setDraftDate] = useState(todayIso());
  const [draftBrandId, setDraftBrandId] = useState<string | null>(null);
  const [draftLotId, setDraftLotId] = useState<string | null>(null);
  const [draftQuantity, setDraftQuantity] = useState('1');
  const [draftUnit, setDraftUnit] = useState<GoldWeightUnit>('chi');
  const [draftTotalAmount, setDraftTotalAmount] = useState<number | null>(null);
  const [newBrandName, setNewBrandName] = useState('');

  const brandNameById = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand.name] as const)),
    [brands],
  );
  const trashedLotById = useMemo(
    () => new Map(trashedLots.map((lot) => [lot.id, lot] as const)),
    [trashedLots],
  );
  const trashedSaleById = useMemo(
    () => new Map(trashedSales.map((sale) => [sale.id, sale] as const)),
    [trashedSales],
  );
  const activeSaleById = useMemo(
    () => new Map(activeSales.map((sale) => [sale.id, sale] as const)),
    [activeSales],
  );

  useEffect(() => {
    if (actionError !== null) {
      Alert.alert(actionError);
      setActionError(null);
    }
  }, [actionError]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>{t('dashboardLoading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const historyItems: GoldHistoryItem[] = [
    ...heldLots.map((lot) => ({
      kind: 'lot' as const,
      id: lot.id,
      title: lot.title,
      subtitle: lot.subtitle,
      amountLabel: lot.amountLabel,
      amountTone: 'neutral' as const,
    })),
    ...activeSales.map((sale) => ({
      kind: 'sale' as const,
      id: sale.id,
      title: sale.title,
      subtitle: sale.subtitle,
      amountLabel: sale.amountLabel,
      amountTone: 'positive' as const,
    })),
  ];

  function resetForm() {
    setDraftDate(todayIso());
    setDraftBrandId(brands[0]?.id ?? null);
    setDraftLotId(heldLots[0]?.id ?? null);
    setDraftQuantity('1');
    setDraftUnit('chi');
    setDraftTotalAmount(null);
    setFormError(null);
    setOpenDropdown('none');
  }

  function openBuyForm() {
    resetForm();
    setFormType('buy');
    setFormSession((session) => session + 1);
    setSheet('form');
  }

  function openSellForm() {
    if (heldLots.length === 0) return;
    resetForm();
    setFormType('sell');
    setFormSession((session) => session + 1);
    setSheet('form');
  }

  function closeAllSheets() {
    setSheet('none');
    setOpenDropdown('none');
    setCalendarOpen(false);
    setDetailTarget(null);
    setDetailError(null);
  }

  async function handleSave() {
    setFormError(null);
    try {
      if (formType === 'buy') {
        if (!draftBrandId) {
          setFormError(t('goldBrandRequiredError'));
          return;
        }
        if (draftTotalAmount === null) {
          setFormError(t('goldAmountRequiredError'));
          return;
        }
        const input: GoldLotInput = {
          brandId: draftBrandId,
          purchaseDate: draftDate,
          quantity: Number(draftQuantity),
          unit: draftUnit,
          totalAmount: draftTotalAmount,
        };
        validateGoldLotInput(input);
        await props.createLot(input);
      } else {
        if (!draftLotId) {
          setFormError(t('goldLotRequiredError'));
          return;
        }
        if (draftTotalAmount === null) {
          setFormError(t('goldAmountRequiredError'));
          return;
        }
        const input: GoldSellTransactionInput = {
          lotId: draftLotId,
          saleDate: draftDate,
          totalAmount: draftTotalAmount,
        };
        validateGoldSellTransactionInput(input);
        await props.sellLot(input);
      }
      closeAllSheets();
    } catch (caught) {
      setFormError(describeGoldError(caught, t));
    }
  }

  function openDetailForLot(id: string) {
    setDetailError(null);
    setDetailTarget({ kind: 'lot', id });
    setSheet('detail');
  }

  function openDetailForSale(id: string) {
    setDetailError(null);
    setDetailTarget({ kind: 'sale', id });
    setSheet('detail');
  }

  /**
   * `GoldManagementViewModel` has no per-lot "does this lot have an active
   * sale" lookup, so the trash-blocked rule (a lot with an active sale
   * cannot be trashed — enforced by `TrashGoldLot`) is surfaced by
   * attempting the trash action and showing the backend's rejection
   * message, rather than a client-side pre-check.
   */
  async function handleMoveToTrash() {
    if (!detailTarget) return;
    setDetailError(null);
    try {
      if (detailTarget.kind === 'lot') {
        await props.trashLot(detailTarget.id);
      } else {
        await props.trashSale(detailTarget.id);
      }
      closeAllSheets();
    } catch (caught) {
      setDetailError(describeGoldError(caught, t));
    }
  }

  function confirmPurge(run: () => Promise<void>) {
    Alert.alert(t('goldPurgeConfirmMessage'), undefined, [
      { text: t('goldCloseLabel'), style: 'cancel' },
      { text: t('goldPurgeLabel'), style: 'destructive', onPress: () => void run() },
    ]);
  }

  const brandOptions: GoldDropdownOption[] = brands.map((brand) => ({
    key: brand.id,
    label: brand.name,
    isActive: brand.id === draftBrandId,
  }));
  const unitOptions: GoldDropdownOption[] = UNITS.map((unit) => ({
    key: unit,
    label: formatGoldWeight(1, unit, t).replace(/^1 /, ''),
    isActive: unit === draftUnit,
  }));
  const lotOptions: GoldDropdownOption[] = heldLots.map((lot) => ({
    key: lot.id,
    label: `${lot.title} · ${lot.subtitle}`,
    isActive: lot.id === draftLotId,
  }));

  const detailLotRow =
    detailTarget?.kind === 'lot'
      ? (heldLots.find((row) => row.id === detailTarget.id) ??
        trashedLotById.get(detailTarget.id) ??
        null)
      : null;
  const detailSaleRow =
    detailTarget?.kind === 'sale'
      ? (activeSaleById.get(detailTarget.id) ?? trashedSaleById.get(detailTarget.id) ?? null)
      : null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('goldBackLabel')}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('settingsManageGold')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <GoldOverviewCard
          costBasisLabel={t('goldCostBasisLabel')}
          costBasisValue={overview ? formatVnd(overview.totalCostBasis) : formatVnd(0)}
          quantityLabel={t('goldQuantityLabel')}
          quantityValue={
            overview
              ? formatGoldWeight(overview.totalQuantityGrams, 'gram', t)
              : formatGoldWeight(0, 'gram', t)
          }
          subtitle={t('goldOverviewSubtitle')}
          title={t('goldOverviewTitle')}
        />

        <View style={styles.section}>
          <GoldHistoryList
            emptyLabel={t('goldEmptyHistory')}
            historyTitle={t('goldHistoryTitle')}
            items={historyItems}
            onOpenTrash={() => setSheet('trash')}
            onSelectItem={(item) =>
              item.kind === 'lot' ? openDetailForLot(item.id) : openDetailForSale(item.id)
            }
            trashLabel={t('goldTrashLabel')}
          />
        </View>
      </ScrollView>

      <View style={styles.ctaWrapper}>
        <Pressable
          accessibilityLabel={t('goldAddTransactionTitle')}
          accessibilityRole="button"
          onPress={() => setSheet('actionPicker')}
          style={styles.cta}>
          <View>
            <Text style={styles.ctaTitle}>{t('goldAddTransactionTitle')}</Text>
            <Text style={styles.ctaSubtitle}>{t('goldAddTransactionSubtitle')}</Text>
          </View>
          <Text style={styles.ctaIcon}>+</Text>
        </Pressable>
      </View>

      <GoldActionPickerSheet
        buySubtitle={t('goldBuyActionSubtitle')}
        buyTitle={t('goldBuyActionTitle')}
        closeLabel={t('goldCloseLabel')}
        onClose={closeAllSheets}
        onSelectBuy={openBuyForm}
        onSelectSell={openSellForm}
        sellDisabled={heldLots.length === 0}
        sellDisabledHint={t('goldSellDisabledHint')}
        sellSubtitle={t('goldSellActionSubtitle')}
        sellTitle={t('goldSellActionTitle')}
        subtitle={t('goldAddTransactionSubtitle')}
        title={t('goldAddTransactionTitle')}
        visible={sheet === 'actionPicker'}
      />

      <GoldFormSheet
        key={`${formType}-${formSession}`}
        addNewBrandLabel={t('goldAddNewBrandOption')}
        brandDropdownOpen={openDropdown === 'brand'}
        brandFieldLabel={t('goldBrandFieldLabel')}
        brandOptions={brandOptions}
        brandValueLabel={
          draftBrandId ? (brandNameById.get(draftBrandId) ?? '') : t('goldBrandFieldLabel')
        }
        closeLabel={t('goldCloseLabel')}
        dateLabel={t('goldDateFieldLabel')}
        dateValueLabel={formatDmy(draftDate)}
        errorMessage={formError}
        formType={formType}
        lotDropdownOpen={openDropdown === 'lot'}
        lotFieldLabel={t('goldLotFieldLabel')}
        lotOptions={lotOptions}
        lotValueLabel={
          draftLotId
            ? (lotOptions.find((option) => option.key === draftLotId)?.label ?? '')
            : t('goldLotFieldLabel')
        }
        onChangeQuantity={setDraftQuantity}
        onChangeTotalAmount={setDraftTotalAmount}
        onClose={closeAllSheets}
        onOpenCalendar={() => setCalendarOpen(true)}
        onSave={handleSave}
        onSelectAddNewBrand={() => {
          setOpenDropdown('none');
          setSheet('brandManage');
        }}
        onSelectBrand={(key) => {
          setDraftBrandId(key);
          setOpenDropdown('none');
        }}
        onSelectLot={(key) => {
          setDraftLotId(key);
          setOpenDropdown('none');
        }}
        onSelectUnit={(key) => {
          setDraftUnit(key as GoldWeightUnit);
          setOpenDropdown('none');
        }}
        onToggleBrandDropdown={() => setOpenDropdown(openDropdown === 'brand' ? 'none' : 'brand')}
        onToggleLotDropdown={() => setOpenDropdown(openDropdown === 'lot' ? 'none' : 'lot')}
        onToggleUnitDropdown={() => setOpenDropdown(openDropdown === 'unit' ? 'none' : 'unit')}
        quantityLabel={t('goldQuantityFieldLabel')}
        quantityValue={draftQuantity}
        saveLabel={formType === 'buy' ? t('goldSaveBuyLabel') : t('goldSaveSellLabel')}
        subtitle={t('settingsManageGold')}
        title={formType === 'buy' ? t('goldBuyFormTitle') : t('goldSellFormTitle')}
        totalAmount={draftTotalAmount}
        totalInvalidMessage={t('goldAmountRequiredError')}
        totalLabel={formType === 'buy' ? t('goldBuyTotalLabel') : t('goldSellTotalLabel')}
        totalPlaceholder="0"
        unitDropdownOpen={openDropdown === 'unit'}
        unitFieldLabel={t('goldUnitFieldLabel')}
        unitOptions={unitOptions}
        unitValueLabel={formatGoldWeight(1, draftUnit, t).replace(/^1 /, '')}
        visible={sheet === 'form'}
      />

      <GoldCalendarModal
        month={calendarMonth}
        onClose={() => setCalendarOpen(false)}
        onNextMonth={() => {
          if (calendarMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(calendarYear + 1);
          } else {
            setCalendarMonth(calendarMonth + 1);
          }
        }}
        onPrevMonth={() => {
          if (calendarMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(calendarYear - 1);
          } else {
            setCalendarMonth(calendarMonth - 1);
          }
        }}
        onSelectDate={(iso) => {
          setDraftDate(iso);
          setCalendarOpen(false);
        }}
        selectedDate={draftDate}
        titleLabel={t('goldDateFieldLabel')}
        visible={calendarOpen}
        weekdayLabels={['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']}
        year={calendarYear}
      />

      <GoldBrandManageSheet
        addBrandLabel={t('goldAddBrandLabel')}
        addBrandPlaceholder={t('goldAddBrandPlaceholder')}
        addDisabled={newBrandName.trim() === ''}
        brands={brands}
        closeLabel={t('goldCloseLabel')}
        deleteBrandLabel={t('goldDeleteBrandLabel')}
        newBrandName={newBrandName}
        onAddBrand={() => {
          const name = newBrandName.trim();
          if (!name) return;
          void props
            .addBrand(name)
            .then(() => setNewBrandName(''))
            .catch((caught) => setActionError(describeGoldError(caught, t)));
        }}
        onChangeNewBrandName={setNewBrandName}
        onClose={() => setSheet('none')}
        onDeleteBrand={(id) =>
          void props.removeBrand(id).catch((caught) => setActionError(describeGoldError(caught, t)))
        }
        saveBrandLabel={t('goldSaveBrandLabel')}
        subtitle={t('goldManageBrandsSubtitle')}
        title={t('goldManageBrandsTitle')}
        visible={sheet === 'brandManage'}
      />

      <GoldDetailSheet
        blockedMessage={detailError}
        closeLabel={t('goldCloseLabel')}
        deleteDisabled={detailTarget === null}
        deleteLabel={t('goldTrashLabel')}
        extraLabel={
          detailTarget?.kind === 'sale' ? t('goldRealizedGainLabel') : t('goldRemainingLabel')
        }
        extraValue={
          detailTarget?.kind === 'sale'
            ? (detailSaleRow?.amountLabel ?? '')
            : (detailLotRow?.subtitle ?? '')
        }
        onClose={closeAllSheets}
        onMoveToTrash={handleMoveToTrash}
        subtitle={detailLotRow?.title ?? detailSaleRow?.title ?? ''}
        title={detailTarget?.kind === 'sale' ? t('goldSellFormTitle') : t('goldBuyFormTitle')}
        totalLabel={
          detailTarget?.kind === 'sale' ? t('goldSellTotalLabel') : t('goldCostBasisLabel')
        }
        totalValue={detailLotRow?.amountLabel ?? detailSaleRow?.amountLabel ?? ''}
        visible={sheet === 'detail'}
        weightLabel={t('goldQuantityLabel')}
        weightValue={detailLotRow?.subtitle ?? detailSaleRow?.subtitle ?? ''}
      />

      <GoldTrashSheet
        closeLabel={t('goldCloseLabel')}
        onClose={() => setSheet('none')}
        onPurgeLot={(id) => confirmPurge(() => props.purgeLot(id))}
        onPurgeSale={(id) => confirmPurge(() => props.purgeSale(id))}
        onRestoreLot={(id) =>
          void props.restoreLot(id).catch((caught) => setActionError(describeGoldError(caught, t)))
        }
        onRestoreSale={(id) =>
          void props.restoreSale(id).catch((caught) => setActionError(describeGoldError(caught, t)))
        }
        purgeLabel={t('goldPurgeLabel')}
        restoreLabel={t('goldRestoreLabel')}
        subtitle={t('goldTrashSheetSubtitle')}
        title={t('goldTrashSheetTitle')}
        trashedLots={trashedLots}
        trashedSales={trashedSales}
        visible={sheet === 'trash'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadows.card,
  },
  backButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    gap: spacing[6],
    padding: spacing[4],
    paddingBottom: 140,
  },
  cta: {
    ...shadows.fab,
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: spacing[4],
  },
  ctaIcon: {
    color: colors.content.inverse,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  ctaSubtitle: {
    color: colors.border.strong,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  ctaTitle: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  ctaWrapper: {
    bottom: 0,
    left: 0,
    padding: spacing[4],
    position: 'absolute',
    right: 0,
  },
  errorText: {
    color: colors.status.negative,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    padding: spacing[4],
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: 58,
  },
  headerTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
  loadingText: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  screen: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  section: {
    gap: spacing[2],
  },
});
