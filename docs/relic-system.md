# Relic System

## Current Damage Formula

공격 피해는 버킷별로 계산한 뒤 마지막에 합산한다. 모든 중간 scaled damage와 최종 피해는 `Math.round`로 반올림하고, 최종 피해는 최소 0으로 clamp한다.

```ts
baseScaledDamage = Math.round(baseAttack * (1 + typeBonus + stateBonus + speedBonus));
comboScaledDamage = Math.round(comboDamage * comboDamageMultiplier);
b2bScaledDamage = Math.round(b2bDamage * b2bDamageMultiplier);
perfectClearScaledDamage = Math.round(perfectClearDamage * perfectClearDamageMultiplier);

finalDamage = Math.max(
  0,
  Math.round(
    baseScaledDamage +
      comboScaledDamage +
      b2bScaledDamage +
      perfectClearScaledDamage +
      flatBonus +
      counterBonus,
  ),
);
```

| 필드 | 의미 |
| --- | --- |
| `baseAttack` | 라인 클리어/T-spin/All-spin 기본 피해 |
| `typeBonus` | 공격 종류 강화 보너스. 예: `typeBonusAdd: 0.25` |
| `stateBonus` | 상태 계열 baseAttack 전용 보너스 |
| `speedBonus` | fastChain 기반 baseAttack 전용 보너스 |
| `comboDamage` | 기존 ComboTable 구간형 콤보 피해 |
| `comboDamageMultiplier` | comboDamage에만 적용되는 배율. 기본값 1 |
| `b2bDamage` | B2B 대상 공격일 때 현재 B2B 스택 수만큼의 피해 |
| `b2bDamageMultiplier` | b2bDamage에만 적용되는 배율. 기본값 1 |
| `perfectClearDamage` | 기존 Perfect Clear 보너스 피해 |
| `perfectClearDamageMultiplier` | perfectClearDamage에만 적용되는 배율. 기본값 1 |
| `flatBonus` | 마지막 합산 단계에서 더하는 고정 피해. 예: `flatBonusAdd: 1` |
| `counterBonus` | 마지막 합산 단계에서 더하는 카운터 피해 |

B2B 기본 피해:

- B2B 대상 공격이면 `b2bDamage = b2bCount`다.
- B2B 스택 1/2/3은 각각 +1/+2/+3 피해가 된다.
- B2B 대상 공격이 아니면 `b2bDamage = 0`이다.
- `b2bCount`는 `ModifierContext`에 유지되어 유물 조건과 디버그에서 사용할 수 있다.
- 기존 B2B +1 고정 보너스 구조는 스택 기반 `b2bDamage` 구조로 대체한다.

Speed 기본 피해:

- `speedBonus = Math.min(fastChain, speedBonusCap) * speedBonusPerStack`
- 기본값은 `speedBonusPerStack = 0.01`, `speedBonusCap = 20`이다.
- fastChain 1당 `baseAttack` 피해 +1%, 최대 +20%다.
- speedBonus는 comboDamage, b2bDamage, perfectClearDamage, flatBonus, counterBonus에는 적용하지 않는다.
- `isFast`는 상태 표시와 기존 조건 호환용으로 유지하지만, Speed 유물 조건은 `fastChain`을 우선 사용한다.

nextAttackBuff:

- 저장 위치는 `player.nextAttackBuffs`이며 전투 시작 시 빈 배열이다.
- 적용 순서는 기본 공격 계산 -> 일반 유물 `onAttackCalculated` -> 저장된 nextAttackBuff 적용 -> 이번 공격으로 새 nextAttackBuff 생성이다.
- 이번 공격에서 생성된 buff는 같은 공격에 적용되지 않고 다음 공격부터 적용된다.
- 공격이 발생한 경우에만 기존 buff를 소비한다. 줄 제거가 없는 일반 lock에서는 소비하지 않는다.
- 같은 `sourceRelicId` buff는 1개만 유지하고, 같은 유물이 다시 발동하면 갱신한다.
- 서로 다른 `sourceRelicId` buff는 함께 적용되어 합산된다.

timedBuff:

- 저장 위치는 `player.timedAttackBuffs`이며 전투 시작 시 빈 배열이다.
- 현재 최소 구현은 공격형 timed buff의 `stateBonusAdd`만 지원한다.
- 적용 순서는 기본 공격 계산 -> 일반 유물 `onAttackCalculated` -> timedAttackBuffs -> nextAttackBuffs -> 이번 공격으로 새 buff 생성이다.
- timed buff는 공격해도 소비되지 않고, `TickCombatUseCase`에서 시간 경과만큼 `remainingMs`가 감소한다.
- `remainingMs <= 0`이 되면 제거된다.
- 같은 `sourceRelicId` timed buff가 다시 생성되면 중복 누적하지 않고 duration을 갱신한다.

Combo/Perfect Clear:

- ComboTable 구간형 값은 `comboDamage`로 본다: 0~1 = 0, 2~3 = 1, 4~5 = 2, 6~8 = 3, 9+ = 4.
- 기존 Perfect Clear 보너스는 `perfectClearDamage`로 본다.

Modifier 사용:

- `attackMultiplier`와 `addAttack`은 legacy 호환용이다. 기존 데이터 지원을 위해 유지하지만 새 유물에는 전용 필드를 우선 사용한다.
- legacy `attackMultiplier`는 `typeBonus += attackMultiplier - 1`로 해석한다.
- legacy `addAttack`은 `flatBonus += addAttack`으로 해석한다.
- 전용 필드는 `comboDamageAdd`, `comboDamageMultiplierAdd`, `b2bDamageAdd`, `b2bDamageMultiplierAdd`, `perfectClearDamageAdd`, `perfectClearDamageMultiplierAdd`, `flatBonusAdd`, `counterBonusAdd`를 사용할 수 있다.
- Tetris/T-spin처럼 공격 종류 자체를 강화하는 유물은 `attackMultiplier` 대신 `typeBonusAdd`를 사용한다. 예: +25%는 `typeBonusAdd: 0.25`.
- Danger/Hole/Fast/Garbage/Hold/Rule 리스크 보상처럼 상태 조건에 따른 공격 강화 유물은 `stateBonusAdd`를 사용한다. 예: +25%는 `stateBonusAdd: 0.25`.
- Combo 피해 증가는 `comboDamageAdd`, B2B 피해 증가는 `b2bDamageAdd` 또는 `b2bDamageMultiplierAdd`, 단순 추가타는 `flatBonusAdd`를 사용한다.
- Fast 유물은 기본 `speedBonus`의 스택당 효율(`speedBonusPerStackAdd`) 또는 상한(`speedBonusCapAdd`)을 늘리거나, 높은 `fastChain` 조건에서 combo/flat/type 버킷 보너스를 준다.
- TODO: Fast 유물의 새 임계값과 수치는 플레이 테스트 후 재검토가 필요하다.

이 문서는 현재 구현된 유물 시스템의 데이터 구조, 적용 흐름, 보상 풀 정책을 정리한다.
새 유물을 추가하거나 기존 유물을 조정할 때 이 문서를 기준으로 확인한다.

## 전체 구조 요약

| 파일 | 역할 |
| --- | --- |
| `src/data/relicDefinitions.ts` | 모든 유물 정의 데이터. 이름, 설명, 분류, 획득처, maxStacks, modifier를 관리한다. |
| `src/domain/relic/RelicDefinition.ts` | 유물 데이터 타입. `category`, `rarity`, `maxStacks`, `obtainSource`, `tags`, `modifiers`를 정의한다. |
| `src/domain/relic/Modifier.ts` | 공격/패시브 modifier 타입, 조건식 타입, 조건 판정 함수 `modifierApplies`를 정의한다. |
| `src/domain/relic/EffectResolver.ts` | 보유 유물의 modifier를 실제 공격값 또는 RuleSet에 적용한다. |
| `src/domain/relic/RelicInventory.ts` | 보유 유물 인스턴스 목록을 관리한다. `maxStacks` 초과 획득을 방어한다. |
| `src/data/rewardTables.ts` | `obtainSource` 기준으로 일반 전투 보상 풀과 상점 보상 풀을 만든다. |
| `src/domain/reward/RewardGenerator.ts` | 보상 후보를 셔플하고 count만큼 반환한다. inventory가 주어지면 `maxStacks` 도달 유물을 제외한다. |
| `src/application/ResolveLineClearUseCase.ts` | 실제 전투 피해 계산 경로. 공격 계산 직후 유물 공격 modifier를 적용한다. 전투 승리 보상도 생성한다. |
| `src/application/StartCombatUseCase.ts` | 전투 시작 시 scaled RuleSet을 만든 뒤 유물 RuleSet modifier를 적용한다. |

## 유물 적용 흐름

### 공격 유물 적용 흐름

1. `ResolveLineClearUseCase`에서 `AttackCalculator.calculate()`로 기본 `AttackResult.totalDamage`를 계산한다.
2. 같은 위치에서 보드/전투 상태를 읽어 `ModifierContext`를 구성한다.
3. `state.run.relicInventory.getDefinitions()`로 보유 유물 정의를 가져온다.
4. `EffectResolver.applyAttackModifiers(baseAttack.totalDamage, relics, context, { includeDetails: true })`를 호출한다.
5. 반환된 공격값으로 `AttackResult.totalDamage`를 대체한다.
6. 이후 garbage 상쇄, `DamageResolver`, 적 HP 감소, 피드백, 이벤트는 수정된 공격값을 사용한다.

공격 modifier는 현재 공격값에 순서대로 적용된다.

```ts
// legacy compatibility only
typeBonus += attackMultiplier - 1
flatBonus += addAttack
```

공격값은 `EffectResolver`에서 `NaN`, `Infinity`, 음수 피해가 나오지 않도록 정리된다.

### RuleSet 유물 적용 흐름

1. `StartCombatUseCase`에서 층/적 기준으로 `createScaledRuleSet`을 호출한다.
2. 그 결과를 base RuleSet으로 보고 `EffectResolver.resolveEffectiveRuleSet()`을 호출한다.
3. 반환된 effective RuleSet을 전투 상태에 저장한다.
4. 이후 보드, PieceQueue, Hold, Next preview, 입력/락 처리에서 effective RuleSet을 사용한다.

지원 중인 RuleSet modifier:

| 필드 | 의미 | 안전 제한 |
| --- | --- | --- |
| `gravityMsMultiplier` | `gravityMs` 배율 | 최소 50ms |
| `lockDelayMsAdd` | `lockDelayMs` 가산 | 최소 0ms |
| `nextPreviewCountAdd` | `nextPreviewCount` 가산 | 최소 1 |
| `holdEnabledOverride` | Hold 활성화 여부 override | boolean |
| `maxHoldSlots` | Hold 슬롯 절대값 상향 | `normalizeMaxHoldSlots` |
| `maxHoldSlotsAdd` | Hold 슬롯 가산 | `normalizeMaxHoldSlots` |

### 보상 후보 생성 흐름

1. `rewardTables.ts`가 `relicDefinitions`를 `obtainSource` 기준으로 필터링한다.
2. 일반 전투 보상은 `relicRewardTable`을 사용한다.
3. 상점 보상은 `shopRelicRewardTable`을 사용한다.
4. `RewardGenerator.generate(count, inventory?)`가 보상 후보를 생성한다.
5. inventory가 전달되면 `inventory.canAdd(relicId)`가 false인 후보는 제외된다.
6. 후보가 부족하면 가능한 만큼만 반환하고, 후보가 없으면 빈 배열을 반환한다.

### maxStacks 적용 흐름

`maxStacks`는 두 지점에서 적용된다.

1. 후보 생성 방어: `RewardGenerator.generate(count, inventory)`에서 이미 최대 스택인 유물을 제외한다.
2. 최종 획득 방어: `RelicInventory.add(definitionId)`에서 `canAdd()`가 false면 inventory를 그대로 반환한다.

`maxStacks <= 0` 또는 유효하지 않은 값은 획득 불가로 처리한다.

## RelicDefinition 필드

| 필드 | 설명 |
| --- | --- |
| `id` | 유물의 고유 ID. 보상, inventory, 이벤트에서 참조한다. |
| `name` | UI 표시용 이름. 현재 주요 유물은 한글 기획 명칭을 사용한다. |
| `description` | UI 표시용 설명. 실제 효과와 modifier가 일치해야 한다. |
| `category` | 유물 분류. 현재 보상 확률에는 사용하지 않는다. |
| `rarity` | 희귀도 메타데이터. 현재 확률 계산에는 사용하지 않는다. 모든 보상 후보는 동일 확률이다. |
| `maxStacks` | 같은 유물을 획득할 수 있는 최대 개수. 후보 생성과 획득 방어에 사용한다. |
| `obtainSource` | 일반 보상/상점/비활성 획득처 정책. |
| `tags` | 선택 필드. UI 필터, 디버그, 향후 검색용 메타데이터로 사용할 수 있다. |
| `modifiers` | 실제 효과 목록. 공격 modifier 또는 패시브 RuleSet modifier를 넣는다. |

## obtainSource 정책

| 값 | 일반 전투 보상 | 상점 보상 | 설명 |
| --- | --- | --- | --- |
| `combatReward` | 포함 | 제외 | 전투/이벤트 일반 보상 전용 |
| `shopOnly` | 제외 | 포함 | 상점 전용 |
| `both` | 포함 | 포함 | 양쪽 모두 등장 |
| `disabled` | 제외 | 제외 | legacy, test, 비활성 데이터 보존용 |

정책상 최초 기획안의 14번 `rule`, 15번 `nextHold`, 16번 `random` 계열은 상점 전용으로 둔다.
현재 구현된 `rule`, `nextHold` 유물은 `shopOnly`다.

## 현재 구현 상태

이 섹션은 `relicDefinitions.ts`에 이미 존재하는 구현 상태를 문서화한다. 이번 단계에서는 기존 modifier와 passive RuleSet 필드로 구현 가능한 항목만 반영했고, 새 이벤트 훅이나 새 ModifierContext가 필요한 항목은 보류했다.

### 현재 구현 상태 차이 요약

| 항목 | 현재 구현 | 메모 |
| --- | --- | --- |
| Danger형 | `obtainSource: "disabled"` | 새 조건/이벤트 없이 일단 보상 풀에서 제외 |
| Garbage형 | `obtainSource: "disabled"` | `canceledGarbageLines` 등 새 context 필요 항목은 보류 |
| Lock 감소 B2B 강화 | `obtainSource: "disabled"` | 조건부 RuleSet/효과 재검토 전까지 제외 |
| Hold 포기 | `no_hold_focus`로 통합 | Hold 비활성화 + 모든 공격 `flatBonusAdd: 2` |
| Hold 미사용 공격 강화 | `holdless_focus` disabled | Hold 포기로 통합 |
| B2B 공격 강화 1 | `b2b_pressure` | B2B 피해 +10% (`b2bDamageMultiplierAdd: 0.1`) |
| B2B 유지 강화 | `b2b_maintain_power` | `b2bCount >= 10`일 때 B2B 피해 +15% |
| 콤보 보너스 증가 | `combo_attack` | `combo >= 2` 조건으로 단순화 |
| 낮은 콤보 추가타 | `low_combo_bonus` | Combo 2~5 구간에서 `comboDamageAdd: 1` |
| Fast 효율 증가 | `fast_power`, `fast_tspin_power`, `fast_efficiency_3` | 각각 `speedBonusPerStackAdd: 0.005` |
| Fast 상한 증가 | `fast_chain_power`, `fast_combo_bonus`, `fast_line_bonus` | 각각 `speedBonusCapAdd: 10` |
| Fast 고속 추가타 | `fast_strong_attack` | Fast Chain 20 이상 `flatBonusAdd: 1` |
| Next 감소 공격 강화 | `compressed_preview` | Next -2, 공격 피해 +10% |
| 빠른 낙하 공격 강화 | `forced_speed` | gravity x0.75, 공격 피해 +10% |
| 빠른 고정 공격 강화 | `overheated_drop` | lock delay -300ms, 공격 피해 +20% |

### 전투 보상 유물

| id | name | category | rarity | 현재 효과 요약 | 메모 |
| --- | --- | --- | --- | --- | --- |
| `tetris_power` | 테트리스 강화 1 | `tetris` | `common` | Tetris 공격 피해 +25% | 구현 |
| `tetris_flat_bonus` | 테트리스 추가타 | `tetris` | `common` | Tetris 공격에 추가 피해 +1 | 구현 |
| `tetris_overwhelm` | 테트리스 강화 2 | `tetris` | `rare` | Tetris 공격 피해 +50% | 구현 |
| `tetris_focus_tradeoff` | Tetris 특화 강화 | `tetris` | `uncommon` | Tetris 공격 피해 +30%, T-spin 공격 피해 -30% | 구현 |
| `tetris_followup_power` | 테트리스 후속 강화 | `tetris` | `uncommon` | Tetris 성공 후 다음 공격 추가 피해 +2 | 구현 |
| `next_i_tetris_power` | Next I Tetris 강화 | `tetris` | `uncommon` | Next에 I 미노가 있으면 Tetris 공격 피해 +25% | 신규 구현 |
| `i_piece_line_bonus` | I 미노 추가타 | `tetris` | `uncommon` | I 미노로 줄 제거 시 추가 피해 +1 | 신규 구현 |
| `spin_pierce` | T-spin 강화 | `spin` | `common` | T-spin 공격 피해 +25% | 구현 |
| `mini_spin_bonus` | Mini Spin 추가타 | `spin` | `common` | T-spin Mini 공격에 추가 피해 +1 | 구현 |
| `tsd_tst_power` | TSD/TST 강화 | `spin` | `rare` | T-spin Double 또는 Triple 공격 피해 +25% | 구현 |
| `tspin_power_2` | T-spin 강화 2 | `spin` | `rare` | T-spin 공격 피해 +50% | 신규 구현 |
| `tspin_focus_tradeoff` | T-spin 특화 강화 | `spin` | `uncommon` | T-spin 공격 피해 +30%, Tetris 공격 피해 -30% | 신규 구현 |
| `tspin_followup_power` | T-spin 후속 강화 | `spin` | `uncommon` | T-spin 성공 후 다음 공격 추가 피해 +2 | 구현 |
| `next_t_tspin_power` | Next T T-spin 강화 | `spin` | `uncommon` | Next에 T 미노가 있으면 T-spin 공격 피해 +25% | 신규 구현 |
| `t_piece_line_power` | T 미노 줄제거 강화 | `spin` | `uncommon` | T 미노로 줄 제거 시 공격 피해 +15% | 신규 구현 |
| `b2b_flat_bonus` | B2B 추가타 | `b2b` | `common` | B2B 공격에 추가 피해 +1 | 구현 |
| `b2b_pressure` | B2B 공격 강화 1 | `b2b` | `uncommon` | B2B 공격 피해 +10% | 구현 |
| `b2b_maintain_power` | B2B 유지 강화 | `b2b` | `uncommon` | B2B 스택 10 이상이면 B2B 공격 피해 +15% | 구현 |
| `b2b_multiple_3_power` | B2B 3배수 강화 | `b2b` | `uncommon` | B2B 카운트 3의 배수 공격 기본 피해 +30% | 신규 구현 |
| `b2b_multiple_10_bonus` | B2B 10배수 추가타 | `b2b` | `rare` | B2B 카운트 10의 배수이면 B2B 피해 +10 | 신규 구현 |
| `combo_attack` | 콤보 보너스 증가 | `combo` | `common` | Combo 2 이상이면 comboDamage +1 | 구현 |
| `low_combo_bonus` | 낮은 콤보 추가타 | `combo` | `common` | Combo 2~5 구간에서 comboDamage +1 | 신규 구현 |
| `long_combo_flow` | 9콤보 보너스 증가 | `combo` | `rare` | Combo 9 이상 추가 피해 +2 | 구현 |
| `combo_4_bonus` | 4콤보 추가 보너스 | `combo` | `uncommon` | Combo 4 이상 추가 피해 +1 | 구현 |
| `combo_small_attack_bonus` | 콤보 중 소공격 추가타 | `combo` | `common` | Combo 중 Single 또는 Double 추가 피해 +1 | 구현 |
| `low_field_combo_bonus` | 낮은 필드 콤보 보너스 | `combo` | `uncommon` | 낮은 필드 Combo 추가 피해 +1 | 구현 |
| `hole_power` | Hole 보유 공격 강화 | `hole` | `common` | hole 3개 이상 공격 피해 +25% | 기존 유지 |
| `broken_field_power` | Hole 다수 공격 강화 | `hole` | `rare` | hole 5개 이상 공격 피해 +50% | 기존 유지 |
| `hole_tspin_power` | Hole T-spin 강화 | `hole` | `uncommon` | Hole 보유 상태 T-spin 공격 피해 +25% | 기존 유지 |
| `low_field_power` | 낮은 필드 공격 강화 | `perfectClear` | `uncommon` | 낮은 필드 공격 피해 +20% | 기존 유지 |
| `clean_field_power` | 안정 필드 공격 강화 | `perfectClear` | `uncommon` | Hole이 없고 낮은 필드면 공격 피해 +25% | 기존 유지 |
| `perfect_clear_flat_1` | Perfect Clear 추가타 1 | `perfectClear` | `common` | Perfect Clear 피해 +3 | 신규 구현 |
| `perfect_clear_flat_2` | Perfect Clear 추가타 2 | `perfectClear` | `uncommon` | Perfect Clear 피해 +5 | 신규 구현 |
| `perfect_clear_power_1` | Perfect Clear 강화 1 | `perfectClear` | `uncommon` | Perfect Clear 피해 +20% | 신규 구현 |
| `perfect_clear_power_2` | Perfect Clear 강화 2 | `perfectClear` | `rare` | Perfect Clear 피해 +30% | 신규 구현 |
| `pc_followup_bonus` | PC 후속 추가타 | `perfectClear` | `uncommon` | Perfect Clear 후 다음 공격 추가 피해 +3 | 구현 |
| `pc_timed_base_power` | PC 후 기본 피해 강화 | `perfectClear` | `rare` | Perfect Clear 후 20초 동안 기본 공격 피해 +20% | 구현 |
| `fast_power` | Fast 효율 증가 1 | `speed` | `common` | Fast Chain 1당 공격 피해 보너스 +0.5%p | 구현 |
| `fast_tspin_power` | Fast 효율 증가 2 | `speed` | `uncommon` | Fast Chain 1당 공격 피해 보너스 +0.5%p | 기존 Fast T-spin 강화 대체 |
| `fast_efficiency_3` | Fast 효율 증가 3 | `speed` | `rare` | Fast Chain 1당 공격 피해 보너스 +0.5%p | 신규 구현 |
| `fast_chain_power` | Fast 상한 증가 1 | `speed` | `uncommon` | Fast Chain 보너스 상한 +10 | 구현 |
| `fast_combo_bonus` | Fast 상한 증가 2 | `speed` | `uncommon` | Fast Chain 보너스 상한 +10 | 기존 Fast 콤보 보너스 대체 |
| `fast_line_bonus` | Fast 상한 증가 3 | `speed` | `common` | Fast Chain 보너스 상한 +10 | 기존 Fast 줄제거 추가타 대체 |
| `fast_strong_attack` | Fast 고속 추가타 | `speed` | `rare` | Fast Chain 20 이상 추가 피해 +1 | 구현 |
| `danger_power` | Danger 공격 강화 | `danger` | `uncommon` | disabled | 보상 풀 제외 |
| `high_stack_counter` | Danger 큰공격 강화 | `danger` | `uncommon` | disabled | 보상 풀 제외 |
| `danger_line_bonus` | Danger 줄제거 추가타 | `danger` | `common` | disabled | 보상 풀 제외 |
| `danger_combo_power` | Danger 콤보 강화 | `danger` | `uncommon` | disabled | 보상 풀 제외 |
| `garbage_absorb` | 대기 Garbage 강화 | `garbage` | `common` | disabled | 보상 풀 제외 |
| `garbage_surge` | 대기 Garbage 누적 강화 | `garbage` | `rare` | disabled | 보상 풀 제외 |

### 상점 전용 유물

| id | name | category | rarity | 현재 효과 요약 | 메모 |
| --- | --- | --- | --- | --- | --- |
| `gentle_fall` | 느린 낙하 | `rule` | `common` | 블록 낙하 속도 20% 감소 | 구현 |
| `delayed_lock` | Lock Delay 증가 | `rule` | `common` | lock delay +200ms | 구현 |
| `instant_soft_drop` | 소프트드랍 즉시 낙하 | `rule` | `rare` | Soft Drop 입력 순간 ghost 위치까지 이동, 즉시 lock 아님 | 구현 |
| `compressed_preview` | Next 감소 공격 강화 | `rule` | `uncommon` | Next preview -2, 공격 피해 +10% | 구현 |
| `wide_next` | Next +1 | `nextHold` | `common` | Next preview +1 | 구현 |
| `deep_next` | Next +2 | `nextHold` | `rare` | Next preview +2 | 구현 |
| `no_hold_focus` | Hold 포기 | `rule` | `rare` | Hold 비활성화, 모든 공격 추가 피해 +2 | 통합 구현 |
| `forced_speed` | 빠른 낙하 공격 강화 | `rule` | `uncommon` | gravity 간격 x0.75, 공격 피해 +10% | 구현 |
| `overheated_drop` | 빠른 고정 공격 강화 | `rule` | `rare` | lock delay -300ms, 공격 피해 +20% | 구현 |
| `quick_judgement` | Lock 감소 B2B 강화 | `rule` | `uncommon` | disabled | 보상 풀 제외 |
| `holdless_focus` | Hold 미사용 공격 강화 | `nextHold` | `uncommon` | disabled | Hold 포기로 통합 |
### disabled legacy 유물

아래 유물은 삭제하지 않고 `obtainSource: "disabled"`로 보존한다. 일반 보상과 상점 보상에는 등장하지 않는다.

- `relic_tetris_power`
- `relic_single_line_chip`
- `relic_b2b_focus`
- `relic_double_blade`
- `relic_triple_lance`
- `relic_clean_four`
- `relic_chip_engine`
- `relic_guard_breaker`
- `relic_b2b_reactor`
- `relic_column_prism`
- `relic_quadra_core`
- `relic_line_spark`
- `relic_twin_hold`


## 최신 유물 기획 확정안

표 공통 열은 `이름 / 최신 효과 / 획득처 / 처리 상태 / 구현 버킷 또는 필요 기반`이다. 처리 상태는 `유지`, `확정`, `개편 예정`, `신규 예정`, `보류`, `임시 비활성화 예정`, `통합 예정`, `폐기`, `미구현`, `추가 예정`을 사용한다.

### 1. 테트리스형

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| 테트리스 강화 1 | Tetris 공격 피해 +25% | 전투 보상 | 확정 | typeBonusAdd |
| 테트리스 추가타 | Tetris 공격 추가 피해 +1 | 전투 보상 | 확정 | flatBonusAdd |
| 테트리스 강화 2 | Tetris 공격 피해 +50% | 전투 보상 | 확정 | typeBonusAdd |
| Tetris 특화 강화 | Tetris 공격 피해 +30%, T-spin 공격 피해 -30% | 전투 보상 | 확정 | typeBonusAdd |
| 테트리스 후속 강화 | Tetris 성공 후 다음 공격 추가 피해 +2 | 전투 보상 | 구현 | nextAttackBuff |
| 연속 테트리스 강화 | 연속 Tetris 횟수 기반 강화 | 전투 보상 | 보류 | consecutiveTetrisCount 필요 |
| 테트리스 상쇄 보너스 | Tetris로 garbage 상쇄 시 보너스 | 전투 보상 | 보류 | canceledGarbageLines 필요 |
| Next I 테트리스 강화 | Next에 I가 있으면 Tetris 강화 | 전투 보상 | 구현 | typeBonusAdd, hasNextPieceI |
| I 미노 추가타 | I 미노 줄제거 추가 피해 | 전투 보상 | 구현 | flatBonusAdd, usedPieceType |
| 보스 테트리스 강화 | 보스전 Tetris 공격 피해 +25% | 전투 보상 | 구현 | typeBonusAdd, isBoss |

폐기:
- 테트리스 B2B 장전
- 이유: 이벤트형 B2B 저장/장전 구조를 만들지 않고 Tetris 특화 강화로 대체

---

### 2. 스핀형

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| T-spin 강화 1 | T-spin 공격 피해 +25% | 전투 보상 | 확정 | typeBonusAdd |
| Mini Spin 추가타 | T-spin Mini 추가 피해 +1 | 전투 보상 | 확정 | flatBonusAdd |
| T-spin 강화 2 | T-spin 공격 피해 +50% | 전투 보상 | 구현 | typeBonusAdd |
| TSD/TST 강화 | T-spin Double/Triple 피해 +25% | 전투 보상 | 확정 | typeBonusAdd |
| T-spin 특화 강화 | T-spin 공격 피해 +30%, Tetris 공격 피해 -30% | 전투 보상 | 구현 | typeBonusAdd |
| Next T T-spin 강화 | Next에 T가 있으면 T-spin 강화 | 전투 보상 | 구현 | typeBonusAdd, hasNextPieceT |
| T-spin 후속 강화 | T-spin 성공 후 다음 공격 추가 피해 +2 | 전투 보상 | 구현 | nextAttackBuff |
| 연속 T-spin 강화 | 연속 T-spin 횟수 기반 강화 | 전투 보상 | 보류 | consecutiveTSpinCount 필요 |
| 연속 T-spin 추가타 | 연속 T-spin 추가 피해 | 전투 보상 | 보류 | consecutiveTSpinCount 필요 |
| T-spin 상쇄 보너스 | T-spin으로 garbage 상쇄 시 보너스 | 전투 보상 | 보류 | canceledGarbageLines 필요 |
| T 미노 줄제거 강화 | T 미노 줄제거 공격 강화 | 전투 보상 | 구현 | stateBonusAdd, usedPieceType |
| 보스 T-spin 강화 | 보스전 T-spin 공격 피해 +25% | 전투 보상 | 구현 | typeBonusAdd, isBoss |

폐기:
- T-spin Hold 교체
- 이유: Hold 교체형 대신 Next T T-spin 강화로 대체

---

### 3. B2B형

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| B2B 추가타 | B2B 공격 추가 피해 +1 | 전투 보상 | 유지 | b2bDamageAdd |
| B2B 공격 강화 1 | B2B 피해 +10% | 전투 보상 | 개편 예정 | b2bDamageMultiplierAdd +0.1 |
| B2B 공격 강화 2 | B2B 피해 +20% | 전투 보상 | 신규 예정 / 누적 강화 대체 | b2bDamageMultiplierAdd +0.2 |
| B2B 10회 이하 강화 | b2bCount <= 10일 때 B2B 피해 +20% | 전투 보상 | 신규 예정 / 3회 강화 대체 | b2bDamageMultiplierAdd +0.2, b2bCount |
| B2B 3배수 강화 | b2bCount가 3의 배수일 때 base 피해 +30% | 전투 보상 | 구현 | stateBonusAdd, isB2BMultipleOf3 |
| B2B 10배수 추가타 | b2bCount가 10의 배수이면 B2B 추가 피해 +10 | 전투 보상 | 구현 | b2bDamageAdd, isB2BMultipleOf10 |
| B2B 유지 강화 | b2bCount >= 10일 때 B2B 피해 +15% | 전투 보상 | 개편 예정 | b2bDamageMultiplierAdd +0.15 |
| B2B 끊김 방지 | B2B 끊김 1회 방지 | 전투 보상 | 보류 | B2B break hook 필요 |
| B2B 상쇄 보너스 | B2B 공격으로 garbage 상쇄 시 보너스 | 전투 보상 | 보류 | canceledGarbageLines 필요 |
| 보스 B2B 강화 | 보스전 B2B 피해 +20% | 전투 보상 | 구현 | b2bDamageMultiplierAdd, isBoss |

---

### 4. 콤보형

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| 콤보 보너스 증가 | Combo 2 이상이면 추가 피해 +1 | 전투 보상 | 개편 예정 | comboDamageAdd |
| 4콤보 추가 보너스 | Combo 4 이상이면 추가 피해 +1 | 전투 보상 | 유지 | comboDamageAdd |
| 9콤보 보너스 증가 | Combo 9 이상이면 추가 피해 +2 | 전투 보상 | 유지 | comboDamageAdd |
| 콤보 중 소공격 추가타 | Combo 중 Single/Double 공격 추가 피해 +1 | 전투 보상 | 유지 | flatBonusAdd 또는 comboDamageAdd |
| 낮은 콤보 추가타 | Combo 2~5 구간에서 추가 피해 +1 | 전투 보상 | 신규 예정 / 3연속 줄제거 추가타 대체 | comboDamageAdd |
| 낮은 필드 콤보 보너스 | 낮은 필드에서 Combo 공격 추가 피해 +1 | 전투 보상 | 유지 / 재검토 | comboDamageAdd |
| Garbage 콤보 보너스 | 큐 쓰레기 1줄 제거마다 추가 피해 +1 | 전투 보상 | 보류 | garbage형 임시 비활성화 정책상 보류, canceledGarbageLines 필요 |
| 콤보 끊김 방지 | Combo 끊김 1회 방지 | 전투 보상 | 보류 | combo break hook 필요 |
| 콤보 종료 폭발 | Combo 종료 시 피해 | 전투 보상 | 보류 | combo end event 필요 |
| 보스 콤보 강화 | 보스전 Combo 2 이상이면 comboDamage +1 | 전투 보상 | 구현 | comboDamageAdd, isBoss |

---

### 5. 위험 고필드형

위험 고필드형은 전부 임시 비활성화 예정으로 정리한다.
이후 안정형/초보자형/방어형으로 흡수 가능하다고 적는다.

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| Danger 공격 강화 | Danger 공격 피해 증가 | 전투 보상 | 임시 비활성화 예정 | - |
| Danger 큰공격 강화 | Danger 상태 큰공격 강화 | 전투 보상 | 임시 비활성화 예정 | - |
| Danger 줄제거 추가타 | Danger 줄제거 추가 피해 | 전투 보상 | 임시 비활성화 예정 | - |
| Danger 콤보 강화 | Danger 콤보 추가 피해 | 전투 보상 | 임시 비활성화 예정 | - |
| Danger 상쇄 보너스 | Danger garbage 상쇄 보너스 | 전투 보상 | 임시 비활성화 예정 | - |
| Danger 고위험 강화 | Danger 리스크 보상 | 전투 보상 | 임시 비활성화 예정 | - |
| 사망 직전 정리 | top out 직전 정리 | 전투 보상 | 임시 비활성화 예정 | top out hook 필요 |
| Danger 후속 추가타 | Danger 후 다음 공격 추가타 | 전투 보상 | 임시 비활성화 예정 | nextAttackBuff 필요 |
| Danger 탈출 보너스 | Danger 탈출 보너스 | 전투 보상 | 임시 비활성화 예정 | state transition hook 필요 |
| 보스 Danger 강화 | 보스전 Danger 강화 | 전투 보상 | 임시 비활성화 예정 | isBoss 필요 |

---

### 6. Hole형

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| Hole 잔줄 추가타 1 | hole 3개 이상일 때 Single/Double 피해 +1 | 전투 보상 | 개편 예정 | flatBonusAdd, holeCount |
| Hole 잔줄 추가타 2 | hole 5개 이상일 때 Single/Double 피해 +2 | 전투 보상 | 개편 예정 | flatBonusAdd, holeCount |
| Hole 낙하 완화 | hole 1개 이상이면 gravity 간격 +10% | 전투 보상 | 신규 예정 | 조건부 RuleSet 필요 |
| Deep Hole 낙하 완화 | Deep Hole 존재 시 gravity 간격 +20% | 전투 보상 | 보류 | deepHoleCount 실제 계산 필요 |
| Hole 제거 피해 | Hole 제거 시 1 피해 | 전투 보상 | 보류 | clearedHoleCount 필요 |
| Hole 정리 후속 추가타 | Hole 정리 후 다음 공격 +1 피해 | 전투 보상 | 보류 | nextAttackBuff, clearedHoleCount 필요 |
| Hole 낙하 완화 2 | hole 10개 이상이면 gravity 간격 +30% | 전투 보상 | 신규 예정 / Hole 2개 이상 제거 추가타 대체 | 조건부 RuleSet 필요 |
| Hole 상쇄 보너스 | Hole을 지우면 큐 대기 garbage 1줄 추가 제거 | 전투 보상 | 보류 | clearedHoleCount, queue cancel hook 필요 |
| Hole Lock Delay 증가 | hole 3개 이상 존재 시 lock delay +100ms | 전투 보상 | 신규 예정 | 조건부 RuleSet 필요 |
| 보스 Hole 제거 추가타 | 보스전 Hole 제거 시 +1 피해 | 전투 보상 | 보류 | isBoss, clearedHoleCount 필요 |

---

### 7. Perfect Clear형

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| Perfect Clear 추가타 1 | PC 피해 +3 | 전투 보상 | 구현 | perfectClearDamageAdd, isPerfectClear |
| Perfect Clear 추가타 2 | PC 피해 +5 | 전투 보상 | 구현 | perfectClearDamageAdd, isPerfectClear |
| Perfect Clear 강화 1 | PC 피해 +20% | 전투 보상 | 구현 | perfectClearDamageMultiplierAdd, isPerfectClear |
| Perfect Clear 강화 2 | PC 피해 +30% | 전투 보상 | 구현 | perfectClearDamageMultiplierAdd, isPerfectClear |
| PC 후 기본 피해 강화 | PC 후 20초간 base 피해 +20% | 전투 보상 | 구현 | timedAttackBuff, stateBonusAdd |
| PC Garbage 제거 | PC 시 garbage queue 모두 제거 | 전투 보상 | 보류 | PC trigger + queue clear 필요 |
| PC 후속 추가타 | PC 후 다음 공격 +3 피해 | 전투 보상 | 구현 | nextAttackBuff |
| 안정 필드 상쇄 보너스 1 | 안정 필드일 때 Garbage 상쇄 보너스 +1 | 전투 보상 | 보류 | canceledGarbageLines 필요 |
| 안정 필드 상쇄 보너스 2 | 안정 필드일 때 Garbage 상쇄 보너스 +2 | 전투 보상 | 보류 | canceledGarbageLines 필요 |
| PC 누적 강화 | PC 할 때마다 PC 피해 +10% | 전투 보상 | 보류 | PC count 저장 필요 |

---

### 8. 속도형

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| Fast 효율 증가 1 | Fast Chain 1당 보너스 +0.5%p | 전투 보상 | 개편 예정 | speedBonusPerStackAdd +0.005 |
| Fast 효율 증가 2 | Fast Chain 1당 보너스 +0.5%p | 전투 보상 | 신규 예정 / Fast T-spin 강화 대체 | speedBonusPerStackAdd +0.005 |
| Fast 효율 증가 3 | Fast Chain 1당 보너스 +0.5%p | 전투 보상 | 신규 예정 / Fast 고위험 강화 대체 | speedBonusPerStackAdd +0.005 |
| 보스 Fast 효율 증가 | 보스전 Fast Chain 1당 보너스 +1%p | 전투 보상 | 보류 | 조건부 passive 미지원 |
| Fast 상한 증가 1 | Fast Chain 보너스 상한 +10 | 전투 보상 | 개편 예정 | speedBonusCapAdd +10 |
| Fast 상한 증가 2 | Fast Chain 보너스 상한 +10 | 전투 보상 | 신규 예정 / Fast 콤보 보너스 대체 | speedBonusCapAdd +10 |
| Fast 상한 증가 3 | Fast Chain 보너스 상한 +10 | 전투 보상 | 신규 예정 / Fast 줄제거 추가타 대체 | speedBonusCapAdd +10 |
| Fast 고속 추가타 | Fast Chain 20 이상이면 추가 피해 +1 | 전투 보상 | 개편 예정 | flatBonusAdd |
| Fast 상쇄 보너스 | 공격 시 쓰레기줄 상쇄 +1 | 전투 보상 | 보류 / Hard Drop 추가타 대체 | garbage cancel bonus 필요 |
| Fast 종료 피해 | Fast가 끊긴 시점의 스택 수 // 10 만큼 피해 | 전투 보상 | 보류 | fast break event 필요 |

---

### 9. Garbage형

Garbage형은 전부 임시 비활성화 예정으로 정리한다.

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| 대기 Garbage 강화 | 대기 garbage 3줄 이상 공격 피해 증가 | 전투 보상 | 임시 비활성화 예정 | - |
| 대기 Garbage 누적 강화 | 대기 garbage 6줄 이상 공격 피해 증가 | 전투 보상 | 임시 비활성화 예정 | - |
| Garbage 수신 후 강화 | Garbage 수신 후 공격 강화 | 전투 보상 | 임시 비활성화 예정 | garbage received event 필요 |
| Garbage 제거 추가타 | Garbage 제거 시 추가 피해 | 전투 보상 | 임시 비활성화 예정 | garbage cleared context 필요 |
| 상쇄량 피해 | 상쇄량만큼 피해 | 전투 보상 | 임시 비활성화 예정 | canceledGarbageLines 필요 |
| Garbage 지연 | Garbage 도착 지연 | 전투 보상 | 임시 비활성화 예정 | garbage delay modifier 필요 |
| Garbage 제거 후 강화 | Garbage 제거 후 다음 공격 강화 | 전투 보상 | 임시 비활성화 예정 | nextAttackBuff 필요 |
| Garbage 제거 보호 | Garbage 제거 시 보호 효과 | 전투 보상 | 임시 비활성화 예정 | defense event 필요 |
| Garbage 제거 콤보 보너스 | Garbage 제거 시 combo 보너스 | 전투 보상 | 임시 비활성화 예정 | garbage cleared + combo context 필요 |
| 보스 Garbage 반격 | 보스전 Garbage 반격 | 전투 보상 | 임시 비활성화 예정 | isBoss 필요 |

---

### 10. 안정 / 초보자 / 잔줄형

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| 안정 Lock Delay 증가 | lock delay +150ms | 전투 보상 | 추가 예정 | lockDelayMsAdd |
| 안정 Gravity Lock 증가 | gravity 간격 +15%, lock delay +100ms | 전투 보상 | 추가 예정 | gravityMsMultiplier, lockDelayMsAdd |
| Next 감소 추가타 | Next -1, 모든 공격 추가 피해 +1 | 상점 | 추가 예정 | nextPreviewCountAdd, flatBonusAdd |
| Next 감소 잔줄 추가타 | Next -1, Single/Double 추가 피해 +1 | 상점 | 추가 예정 | nextPreviewCountAdd, flatBonusAdd |
| Hold 포기 | Hold 비활성화, 모든 공격 추가 피해 +2 | 상점 | 통합 예정 | holdEnabledOverride, flatBonusAdd |
| 잔줄 추가타 | Single/Double 추가 피해 +1 | 전투 보상 | 추가 예정 | flatBonusAdd |
| Double 추가타 | Double 추가 피해 +1 | 전투 보상 | 추가 예정 | flatBonusAdd |
| 잔줄 강화 Tetris 약화 | Single/Double +1, Tetris 피해 -20% | 전투 보상 | 추가 예정 | flatBonusAdd, typeBonusAdd -0.2 |
| 잔줄 강화 T-spin 약화 | Single/Double +1, T-spin 피해 -20% | 전투 보상 | 추가 예정 | flatBonusAdd, typeBonusAdd -0.2 |
| 기본 줄제거 강화 | Single/Double/Triple +1, T-spin 피해 -30% | 전투 보상 | 추가 예정 | flatBonusAdd, typeBonusAdd -0.3 |
| Garbage 적용량 감소 | ready garbage 1회 적용량 -1 | 전투 보상 | 미구현 | garbage apply config 필요 |
| Garbage 도착 지연 | enemy garbage ready 시간 +2초 | 전투 보상 | 미구현 | garbage delay modifier 필요 |

---

### 11. 룰 수치 변형형 / 상점 전용

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| 느린 낙하 | gravity 간격 +20% | 상점 | 유지 | gravityMsMultiplier |
| Lock Delay 증가 | lock delay +200ms | 상점 | 유지 | lockDelayMsAdd |
| 빠른 낙하 공격 강화 | gravity 간격 x0.75, 공격 피해 +10% | 상점 | 개편 예정 | gravityMsMultiplier, stateBonusAdd +0.1 |
| 빠른 고정 공격 강화 | lock delay -300ms, 공격 피해 +20% | 상점 | 개편 예정 | lockDelayMsAdd, stateBonusAdd +0.2 |
| Next 감소 공격 강화 | Next -2, 공격 피해 +10% | 상점 | 개편 예정 | nextPreviewCountAdd, stateBonusAdd +0.1 |
| Lock 감소 B2B 강화 | lock delay -300ms, B2B 공격 피해 +25% | 상점 | 임시 비활성화 예정 | - |
| Hold 금지 공격 강화 | Hold 비활성화, 공격 피해 +50% | 상점 | Hold 포기로 통합 예정 | Hold 포기: flatBonusAdd +2 |
| 전투 초반 Gravity 감소 | 전투 초반 gravity 감소 | 상점 | 임시 비활성화 예정 | timed rule 필요 |
| Danger 빠른 낙하 강화 | Danger 상태 낙하/공격 강화 | 상점 | 임시 비활성화 예정 | conditional rule 필요 |
| 고정 후 생성 지연 | 고정 후 다음 미노 생성 지연 | 상점 | 임시 비활성화 예정 | spawnDelayMs 필요 |
| 소프트드랍 즉시 낙하 | Soft Drop 입력 시 즉시 바닥까지 내려감 | 상점 | 구현 | `instantSoftDrop` passive RuleSet flag |

소프트드랍 즉시 낙하 정책:
- Soft Drop 입력 순간 현재 미노를 ghost 위치까지 내린다.
- Hard Drop처럼 즉시 lock하지 않는다.
- 기존 lock delay는 유지한다.
- 즉, “즉시 바닥 접촉” 유물이지 “즉시 고정” 유물이 아니다.

---

### 12. Next / Hold형 / 상점 전용

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| Next +1 | Next preview +1 | 상점 | 유지 | nextPreviewCountAdd |
| Next +2 | Next preview +2 | 상점 | 유지 | nextPreviewCountAdd |
| Hold 포기 | Hold 비활성화, 모든 공격 추가 피해 +2 | 상점 | 통합 예정 | holdEnabledOverride, flatBonusAdd |
| Hold 미사용 공격 강화 | Hold 미사용 시 공격 피해 +30% | 상점 | 통합/비활성화 예정 | Hold 포기로 통합 |
| Hold 금지 공격 강화 | Hold 비활성화, 공격 피해 +50% | 상점 | 통합/비활성화 예정 | Hold 포기로 통합 |
| Hold 슬롯 +1 | Hold 슬롯 +1 | 상점 | 임시 비활성화 유지 | 다중 Hold 미구현 |
| Hold 후 공격 강화 | Hold 후 다음 공격 강화 | 상점 | 임시 비활성화 예정 | nextAttackBuff 필요 |
| Hold 상쇄 보너스 | Hold 사용 시 Garbage 상쇄 보너스 | 상점 | 임시 비활성화 예정 | canceledGarbageLines 필요 |
| Hold 후 추가타 | Hold 후 다음 공격 추가타 | 상점 | 임시 비활성화 예정 | nextAttackBuff 필요 |

---

### 13. 랜덤형 / 상점 전용

| 이름 | 최신 효과 | 획득처 | 처리 상태 | 구현 버킷 / 필요 기반 |
| --- | --- | --- | --- | --- |
| 랜덤 피해 배율 | 공격마다 랜덤 피해 배율 | 상점 | 미구현 | random roll 필요 |
| 확률 추가타 | 확률로 추가 피해 | 상점 | 미구현 | random roll 필요 |
| 확률 2배 공격 | 확률로 최종 피해 2배 | 상점 | 미구현 | random roll 필요 |
| 확률 Garbage 감소 | 확률로 Garbage 감소 | 상점 | 미구현 | garbage hook + random 필요 |
| 랜덤 유형 강화 | 전투 시작 시 랜덤 유형 강화 | 상점 | 미구현 | battle start random effect 필요 |
| 랜덤 미노 추가타 | 랜덤 미노 조건 추가타 | 상점 | 미구현 | usedPieceType + random target 필요 |
| 공격 강화 Garbage 증가 | 공격 강화 대신 Garbage 리스크 | 상점 | 미구현 | receive garbage modifier 필요 |
| 확률 B2B 유지 | 확률로 B2B 유지 | 상점 | 미구현 | B2B break hook + random 필요 |
| 콤보 강화 실패 페널티 | 콤보 강화 + 실패 페널티 | 상점 | 미구현 | combo break hook 필요 |
| 확률 생존 | 사망 직전 확률 생존 | 상점 | 미구현 | top out hook + random 필요 |

---

## 구현 전 필요한 기반 업데이트

문서의 “아직 구현하지 않은 것”에 아래 기반을 추가/정리하면 된다.

| 기반 | 필요한 유물 |
|---|---|
| `hasNextPieceT` | Next T T-spin 강화 |
| `hasNextPieceI` | Next I 테트리스 강화 |
| `usedPieceType` | I/T 미노 줄제거 강화 |
| `isBoss` | 보스 계열 |
| `isPerfectClear` | Perfect Clear형 |
| `isB2BMultipleOf3` | B2B 3배수 강화 |
| `isB2BMultipleOf10` | B2B 10배수 추가타 |
| `consecutiveTetrisCount` | 연속 테트리스 강화 |
| `consecutiveTSpinCount` | 연속 T-spin 강화 |
| `nextAttackBuff` | 후속 강화류 |
| `timedBuff` | PC 후 20초 버프 |
| `canceledGarbageLines` | 상쇄 보너스, Garbage 콤보 |
| `clearedHoleCount` | Hole 제거 피해, Hole 상쇄 |
| 조건부 RuleSet 재평가 | Hole 낙하 완화, Hole Lock Delay |
| `instantSoftDrop` | 소프트드랍 즉시 낙하 |
| `fastBreakEvent` | Fast 종료 피해 |
| `spawnDelayMs` | 고정 후 생성 지연 |
| random roll system | 랜덤형 전반 |

---

## 임시 비활성화 대상 요약

| 대상 | 처리 |
| --- | --- |
| Garbage형 전체 | 임시 비활성화 예정 |
| 위험 고필드형 전체 | 임시 비활성화 예정 |
| Lock 감소 B2B 강화 | 임시 비활성화 예정 |
| Hold 후 공격 강화 | 임시 비활성화 예정 |
| Hold 상쇄 보너스 | 임시 비활성화 예정 |
| Hold 후 추가타 | 임시 비활성화 예정 |
| 전투 초반 Gravity 감소 | 임시 비활성화 예정 |
| Danger 빠른 낙하 강화 | 임시 비활성화 예정 |
| 고정 후 생성 지연 | 임시 비활성화 예정 |
| Hold 슬롯 +1 | 다중 Hold 미구현으로 비활성화 유지 |

## 구현 우선순위 메모

1. 이미 버킷이 존재하는 확정/개편 예정 유물부터 정리한다: `typeBonusAdd`, `flatBonusAdd`, `comboDamageAdd`, `b2bDamageAdd`, `b2bDamageMultiplierAdd`, `speedBonusPerStackAdd`, `speedBonusCapAdd`, `gravityMsMultiplier`, `lockDelayMsAdd`, `nextPreviewCountAdd`, `holdEnabledOverride`.
2. 이후 `ModifierContext`만 확장하면 되는 조건형을 처리한다: `hasNextPieceT`, `hasNextPieceI`, `usedPieceType`, `isBoss`, `isPerfectClear`, B2B 배수 조건.
3. 마지막으로 이벤트/상태 저장/전투 중 RuleSet 재평가가 필요한 보류 유물을 처리한다: 상쇄 보너스, Hole 제거, 랜덤형.


## ModifierContext에서 지원하는 값

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `linesCleared` | number | 이번 공격의 줄 제거 수 |
| `backToBackActive` | boolean | 공격 계산 시점의 B2B 활성 여부 |
| `attack` | number | 현재 modifier 적용 중인 공격값 |
| `isDanger` | boolean | 필드가 Danger 또는 Critical 상태인지 |
| `fieldHeight` | number | 필드 최대 높이 |
| `holdUsedThisBattle` | boolean | 이번 전투에서 Hold를 성공적으로 사용했는지 |
| `pendingGarbageLines` | number | 대기 중인 garbage 총량 |
| `isFast` | boolean | Fast 상태 여부 |
| `fastChain` | number | Fast Chain 수 |
| `holeCount` | number | 필드 hole 수 |
| `deepHoleCount` | number | 깊은 hole 수. 현재 실제 계산은 TODO |
| `isTSpin` | boolean | T-spin 여부 |
| `isTSpinMini` | boolean | T-spin Mini 여부 |
| `isTSpinFull` | boolean | Mini가 아닌 T-spin 여부 |
| `combo` | number | 공격 계산 후 combo 값 |
| `comboBonus` | number | 기본 공격 계산의 combo bonus |
| `attackKind` | string | 공격 종류 문자열 |

## 조건식 문법

공격 modifier는 `when`과 `whenAny`로 조건을 표현한다.

- `when`은 AND 조건이다. 모든 조건이 true일 때 통과한다.
- `whenAny`는 OR 조건이다. 배열 안의 조건 묶음 중 하나 이상이 true일 때 통과한다.
- `when`과 `whenAny`가 같이 있으면 `when AND whenAny`로 판정한다.
- `when`과 `whenAny`가 모두 없으면 항상 적용된다.

### primitive exact match

```ts
{
  trigger: "onAttackCalculated",
  typeBonusAdd: 0.25,
  when: { linesCleared: 4 }
}
```

### equals / notEquals

```ts
{
  trigger: "onAttackCalculated",
  stateBonusAdd: 0.5,
  when: { isDanger: { equals: true } }
}
```

```ts
{
  trigger: "onAttackCalculated",
  stateBonusAdd: 0.3,
  when: { holdUsedThisBattle: { notEquals: true } }
}
```

### gt / gte / lt / lte

```ts
{
  trigger: "onAttackCalculated",
  comboDamageAdd: 1,
  when: { combo: { gte: 2 } }
}
```

```ts
{
  trigger: "onAttackCalculated",
  stateBonusAdd: 0.25,
  when: { fieldHeight: { lte: 4 } }
}
```

### AND 조건

```ts
{
  trigger: "onAttackCalculated",
  stateBonusAdd: 0.25,
  when: {
    isDanger: true,
    linesCleared: 4
  }
}
```

### OR 조건

```ts
{
  trigger: "onAttackCalculated",
  typeBonusAdd: 0.25,
  whenAny: [
    { linesCleared: 4 },
    { isTSpin: true }
  ]
}
```

### AND + OR 조건

```ts
{
  trigger: "onAttackCalculated",
  stateBonusAdd: 0.25,
  when: { isDanger: true },
  whenAny: [
    { linesCleared: 4 },
    { isTSpin: true }
  ]
}
```

위 예시는 `isDanger`가 true이고, 동시에 Tetris 또는 T-spin 조건 중 하나를 만족해야 적용된다.

## 아직 구현하지 않은 것

- 보스 조건 유물: `isBoss` ModifierContext 필요. `boss_tetris_power`, `boss_tspin_power`, `boss_b2b_power`, `boss_combo_power`, `boss_danger_power`, `boss_fast_power`, `boss_garbage_counter`.
- 미노 종류 조건 유물: `usedPieceType` 또는 `pieceType` ModifierContext 필요. `i_piece_line_bonus`, `t_piece_line_power`, `hard_drop_bonus` 일부.
- B2B 카운트 조건 유물: `b2bCount` ModifierContext 필요. `b2b_3_power`, `b2b_bonus_plus`, B2B 누적 스케일형.
- Perfect Clear 조건 유물: `isPerfectClear` ModifierContext 필요. `perfect_clear_power` 및 PC 후속/누적/보스 유물.
- 이벤트형/다음 공격 버프 유물: Tetris/T-spin/Perfect Clear 후속 공격은 `nextAttackBuff`로 구현됨. PC 후 기본 피해 강화는 `timedAttackBuff`로 구현됨. Hold/Garbage/Hole 후속, 콤보 끊김 방지, 콤보 종료 폭발, B2B 끊김 방지, 첫 B2B 강화는 보류.
- Garbage 상쇄/수신형 유물: `canceledGarbageLines`, garbage received event, counterBonus modifier 필요. 테트리스/T-spin/Danger/Hole/안정 필드 상쇄 보너스, Garbage 수신 후 강화, 상쇄량 피해.
- 시간제/전투 중 조건부 RuleSet 유물: 전투 중 조건부 RuleSet 재평가 또는 시간제 버프 필요. 초반 Gravity 감소, Danger Lock Delay 증가, Danger 빠른 낙하 강화, 전투 시작 후 시간제 버프.
- spawn delay 유물: `spawnDelayMs` RuleSet modifier 필요. 고정 후 생성 지연.
- 랜덤/확률형 유물: 확률 판정 시스템과 랜덤 효과 정의 필요. 랜덤 피해 배율, 확률 추가타, 확률 2배 공격, 확률 Garbage 감소, 랜덤 유형 강화, 랜덤 미노 추가타, 공격 강화 Garbage 증가, 확률 B2B 유지, 콤보 강화 실패 페널티, 확률 생존.
- 사망 직전 생존형 유물: top out 직전 생존 이벤트 훅 필요.
- `extra_hold_slot` / Hold 슬롯 +1 재활성화. 현재 Hold 도메인, 입력, UI가 다중 슬롯을 완전 지원하지 않아 `obtainSource: "disabled"`로 임시 비활성화되어 있다. 추후 Hold 구조를 다중 슬롯 기준으로 확장한 뒤 재활성화한다.
- `deepHoleCount` 실제 계산. Deep Hole 제거 추가타 및 관련 Hole 유물은 계산 기반 필요.
- rarity 확률 가중치

`rarity`는 현재 의도적으로 확률에 사용하지 않는다.
모든 보상 후보는 동일 확률로 처리한다.

## 유물 추가 방법 예시

### 공격 유물 추가 예시

```ts
new_attack_relic: {
  id: "new_attack_relic",
  name: "새 공격 유물",
  description: "Tetris 공격 피해가 25% 증가합니다.",
  ...combatRelic("tetris", "common"),
  tags: ["attack", "tetris"],
  modifiers: [
    {
      trigger: "onAttackCalculated",
      typeBonusAdd: 0.25,
      when: { linesCleared: 4 },
    },
  ],
}
```

### RuleSet 유물 추가 예시

```ts
new_rule_relic: {
  id: "new_rule_relic",
  name: "새 룰 유물",
  description: "lock delay가 100ms 증가합니다.",
  ...shopRelic("rule", "common"),
  tags: ["rule", "shop", "lockDelay"],
  modifiers: [
    {
      trigger: "passive",
      lockDelayMsAdd: 100,
    },
  ],
}
```

### 상점 전용 유물 추가 예시

상점 전용 유물은 `shopRelic(category, rarity)`를 사용한다.

```ts
new_shop_relic: {
  id: "new_shop_relic",
  name: "새 상점 유물",
  description: "상점에서만 등장합니다.",
  ...shopRelic("nextHold", "uncommon"),
  tags: ["shop"],
  modifiers: [
    {
      trigger: "passive",
      nextPreviewCountAdd: -1,
    },
  ],
}
```

### maxStacks 설정 예시

기본 helper는 `maxStacks: 1`을 넣는다.
스택 가능한 유물이 필요하면 helper spread 뒤에 `maxStacks`를 명시해 override한다.

```ts
stackable_relic: {
  id: "stackable_relic",
  name: "중첩 유물",
  description: "최대 2번 획득할 수 있습니다.",
  ...combatRelic("combo", "common"),
  maxStacks: 2,
  tags: ["attack", "combo"],
  modifiers: [
    {
      trigger: "onAttackCalculated",
      comboDamageAdd: 1,
      when: { combo: { gte: 2 } },
    },
  ],
}
```

`maxStacks`를 올리면 `RelicInventory.add()`와 `RewardGenerator.generate()`가 같은 값을 기준으로 동작한다.
