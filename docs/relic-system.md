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
| `typeBonus` | 기존 `attackMultiplier` 호환 보너스. `attackMultiplier: 1.25`는 `typeBonus += 0.25`로 해석한다. |
| `stateBonus` | 상태 계열 baseAttack 전용 보너스 |
| `speedBonus` | fastChain 기반 baseAttack 전용 보너스 |
| `comboDamage` | 기존 ComboTable 구간형 콤보 피해 |
| `comboDamageMultiplier` | comboDamage에만 적용되는 배율. 기본값 1 |
| `b2bDamage` | B2B 대상 공격일 때 현재 B2B 스택 수만큼의 피해 |
| `b2bDamageMultiplier` | b2bDamage에만 적용되는 배율. 기본값 1 |
| `perfectClearDamage` | 기존 Perfect Clear 보너스 피해 |
| `perfectClearDamageMultiplier` | perfectClearDamage에만 적용되는 배율. 기본값 1 |
| `flatBonus` | 마지막 합산 단계에서 더하는 고정 피해. 기존 `addAttack`은 `flatBonus`로 해석한다. |
| `counterBonus` | 마지막 합산 단계에서 더하는 카운터 피해 |

B2B 기본 피해:

- B2B 대상 공격이면 `b2bDamage = b2bCount`다.
- B2B 스택 1/2/3은 각각 +1/+2/+3 피해가 된다.
- B2B 대상 공격이 아니면 `b2bDamage = 0`이다.
- `b2bCount`는 `ModifierContext`에 유지되어 유물 조건과 디버그에서 사용할 수 있다.
- 기존 B2B +1 고정 보너스 구조는 스택 기반 `b2bDamage` 구조로 대체한다.

Speed 기본 피해:

- `speedBonus = Math.min(fastChain, 10) * 0.05`
- fastChain 1당 `baseAttack` 피해 +5%, 최대 +50%다.
- speedBonus는 comboDamage, b2bDamage, perfectClearDamage, flatBonus, counterBonus에는 적용하지 않는다.
- `isFast`는 상태 표시와 기존 조건 호환용으로 유지하지만, Speed 유물 조건은 `fastChain`을 우선 사용한다.

Combo/Perfect Clear:

- ComboTable 구간형 값은 `comboDamage`로 본다: 0~1 = 0, 2~3 = 1, 4~5 = 2, 6~8 = 3, 9+ = 4.
- 기존 Perfect Clear 보너스는 `perfectClearDamage`로 본다.

Modifier 호환:

- 기존 `attackMultiplier`는 baseAttack 계열 보너스로 해석한다.
- 기존 `addAttack`은 `flatBonus`로 해석한다.
- 전용 필드는 `comboDamageAdd`, `comboDamageMultiplierAdd`, `b2bDamageAdd`, `b2bDamageMultiplierAdd`, `perfectClearDamageAdd`, `perfectClearDamageMultiplierAdd`, `flatBonusAdd`, `counterBonusAdd`를 사용할 수 있다.
- Tetris/T-spin처럼 공격 종류 자체를 강화하는 유물은 `attackMultiplier` 대신 `typeBonusAdd`를 사용한다. 예: +25%는 `typeBonusAdd: 0.25`.

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
current * attackMultiplier + addAttack
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

## 현재 구현된 유물 목록

### 전투 보상 유물

| id | name | category | rarity | 효과 요약 |
| --- | --- | --- | --- | --- |
| `tetris_power` | 테트리스 강화 | `tetris` | `common` | Tetris 공격 피해 +25% |
| `tetris_flat_bonus` | 테트리스 추가타 | `tetris` | `common` | Tetris 공격에 추가 피해 +1 |
| `tetris_overwhelm` | 강한 테트리스 | `tetris` | `rare` | Tetris 공격 피해 +50% |
| `spin_pierce` | T-spin 강화 | `spin` | `common` | T-spin 공격 피해 +25% |
| `mini_spin_bonus` | Mini Spin 추가타 | `spin` | `common` | T-spin Mini 공격에 추가 피해 +1 |
| `tsd_tst_power` | TSD/TST 강화 | `spin` | `rare` | T-spin Double 또는 Triple 공격 피해 +25% |
| `b2b_flat_bonus` | B2B 추가타 | `b2b` | `common` | B2B 공격에 추가 피해 +1 |
| `b2b_pressure` | B2B 공격 강화 | `b2b` | `uncommon` | B2B 공격 피해 +25% |
| `b2b_maintain_power` | B2B 유지 강화 | `b2b` | `uncommon` | B2B 유지 중 공격 피해 +15% |
| `combo_attack` | 콤보 보너스 증가 | `combo` | `common` | Combo 2 이상 또는 comboBonus 1 이상 추가 피해 +1 |
| `long_combo_flow` | 9콤보 보너스 증가 | `combo` | `rare` | Combo 9 이상 추가 피해 +2 |
| `combo_4_bonus` | 4콤보 추가 보너스 | `combo` | `uncommon` | Combo 4 이상 추가 피해 +1 |
| `combo_small_attack_bonus` | 콤보 중 소공격 추가타 | `combo` | `common` | Combo 중 Single 또는 Double 추가 피해 +1 |
| `low_field_combo_bonus` | 낮은 필드 콤보 보너스 | `combo` | `uncommon` | 낮은 필드 Combo 추가 피해 +1 |
| `danger_power` | Danger 공격 강화 | `danger` | `uncommon` | Danger 상태 공격 피해 +50% |
| `high_stack_counter` | Danger 큰공격 강화 | `danger` | `uncommon` | Danger 상태의 Tetris 또는 T-spin 공격 피해 +25% |
| `danger_line_bonus` | Danger 줄제거 추가타 | `danger` | `common` | Danger 상태 줄 제거 추가 피해 +1 |
| `danger_combo_power` | Danger 콤보 강화 | `danger` | `uncommon` | Danger 상태 Combo 추가 피해 +1 |
| `hole_power` | Hole 보유 공격 강화 | `hole` | `common` | hole 3개 이상 공격 피해 +25% |
| `broken_field_power` | Hole 다수 공격 강화 | `hole` | `rare` | hole 5개 이상 공격 피해 +50% |
| `hole_tspin_power` | Hole T-spin 강화 | `hole` | `uncommon` | Hole 보유 상태 T-spin 공격 피해 +25% |
| `low_field_power` | 낮은 필드 공격 강화 | `perfectClear` | `uncommon` | 낮은 필드 공격 피해 +20% |
| `clean_field_power` | 안정 필드 공격 강화 | `perfectClear` | `uncommon` | Hole이 없고 낮은 필드면 공격 피해 +25% |
| `fast_power` | Fast 공격 강화 | `speed` | `common` | Fast 상태 공격 피해 +25% |
| `fast_chain_power` | FastChain 누적 강화 | `speed` | `uncommon` | Fast Chain 3 이상 공격 피해 +25% |
| `fast_strong_attack` | Fast 강공격 | `speed` | `rare` | Fast 상태 공격 피해 +35% |
| `fast_combo_bonus` | Fast 콤보 보너스 | `speed` | `uncommon` | Fast 상태 Combo 추가 피해 +1 |
| `fast_line_bonus` | Fast 줄제거 추가타 | `speed` | `common` | Fast 상태 줄 제거 추가 피해 +1 |
| `fast_tspin_power` | Fast T-spin 강화 | `speed` | `uncommon` | Fast 상태 T-spin 공격 피해 +25% |
| `garbage_absorb` | 대기 Garbage 강화 | `garbage` | `common` | 대기 garbage 3줄 이상 공격 피해 +25% |
| `garbage_surge` | 대기 Garbage 누적 강화 | `garbage` | `rare` | 대기 garbage 6줄 이상 공격 피해 +35% |

### 상점 전용 유물

| id | name | category | rarity | 효과 요약 |
| --- | --- | --- | --- | --- |
| `gentle_fall` | 느린 낙하 | `rule` | `common` | 블록 낙하 속도 20% 감소 |
| `delayed_lock` | Lock Delay 증가 | `rule` | `common` | lock delay +200ms |
| `compressed_preview` | Next 감소 공격 강화 | `rule` | `uncommon` | Next preview -2, 공격 피해 +20% |
| `wide_next` | Next +1 | `nextHold` | `common` | Next preview +1 |
| `deep_next` | Next +2 | `nextHold` | `rare` | Next preview +2 |
| `no_hold_focus` | Hold 금지 공격 강화 | `rule` | `rare` | Hold 비활성화, 공격 피해 +50% |
| `forced_speed` | 빠른 낙하 공격 강화 | `rule` | `uncommon` | gravity 간격 x0.75, 공격 피해 +25% |
| `overheated_drop` | 빠른 고정 공격 강화 | `rule` | `rare` | lock delay -300ms, 공격 피해 +35% |
| `quick_judgement` | Lock 감소 B2B 강화 | `rule` | `uncommon` | lock delay -300ms, B2B 공격 피해 +25% |
| `holdless_focus` | Hold 미사용 공격 강화 | `nextHold` | `uncommon` | Hold 미사용 시 공격 피해 +30% |

### disabled legacy 유물

아래 유물은 삭제하지 않고 `obtainSource: "disabled"`로 보존한다.
일반 보상과 상점 보상에는 등장하지 않는다.

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
  attackMultiplier: 1.25,
  when: { linesCleared: 4 }
}
```

### equals / notEquals

```ts
{
  trigger: "onAttackCalculated",
  attackMultiplier: 1.5,
  when: { isDanger: { equals: true } }
}
```

```ts
{
  trigger: "onAttackCalculated",
  attackMultiplier: 1.3,
  when: { holdUsedThisBattle: { notEquals: true } }
}
```

### gt / gte / lt / lte

```ts
{
  trigger: "onAttackCalculated",
  addAttack: 1,
  when: { combo: { gte: 2 } }
}
```

```ts
{
  trigger: "onAttackCalculated",
  attackMultiplier: 1.25,
  when: { fieldHeight: { lte: 4 } }
}
```

### AND 조건

```ts
{
  trigger: "onAttackCalculated",
  attackMultiplier: 1.25,
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
  attackMultiplier: 1.25,
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
  attackMultiplier: 1.25,
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
- 이벤트형/다음 공격 버프 유물: 이벤트 훅과 next attack buff 저장소 필요. 테트리스/T-spin 후속 강화, Hold 후 공격 강화, Hold 후 추가타, 콤보 끊김 방지, 콤보 종료 폭발, B2B 끊김 방지, 첫 B2B 강화.
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
      attackMultiplier: 1.25,
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
      addAttack: 1,
      when: { combo: { gte: 2 } },
    },
  ],
}
```

`maxStacks`를 올리면 `RelicInventory.add()`와 `RewardGenerator.generate()`가 같은 값을 기준으로 동작한다.
