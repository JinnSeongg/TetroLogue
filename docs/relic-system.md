# Relic System

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
| `tetris_power` | 장대 강화 | `tetris` | `common` | Tetris 피해 +25% |
| `tetris_flat_bonus` | 완전 제거 보너스 | `tetris` | `common` | Tetris 추가 피해 +1 |
| `tetris_overwhelm` | 네 줄의 압도 | `tetris` | `rare` | Tetris 피해 +50% |
| `spin_pierce` | 회전 관통 | `spin` | `common` | T-spin 피해 +25% |
| `mini_spin_bonus` | 기술 보정 | `spin` | `common` | T-spin Mini 추가 피해 +1 |
| `b2b_flat_bonus` | 고급 공격술 | `b2b` | `common` | B2B 추가 피해 +1 |
| `b2b_pressure` | 연속 압박 | `b2b` | `uncommon` | B2B 피해 +25% |
| `combo_attack` | 연쇄 공격 | `combo` | `common` | Combo 2 이상 추가 피해 +1 |
| `long_combo_flow` | 끝없는 흐름 | `combo` | `rare` | Combo 9 이상 추가 피해 +2 |
| `danger_power` | 벼랑 끝 화력 | `danger` | `uncommon` | Danger 상태 공격 피해 +50% |
| `high_stack_counter` | 상단 반격 | `danger` | `uncommon` | Danger 상태 Tetris 피해 +25% |
| `hole_power` | 균열 활용 | `hole` | `common` | hole 3개 이상 공격 피해 +25% |
| `broken_field_power` | 망가진 전장 | `hole` | `rare` | hole 5개 이상 공격 피해 +50% |
| `fast_power` | 빠른 손 | `speed` | `common` | Fast 상태 공격 피해 +25% |
| `fast_chain_power` | 속도 누적 | `speed` | `uncommon` | Fast Chain 3 이상 공격 피해 +25% |
| `garbage_absorb` | 압박 흡수 | `garbage` | `common` | 대기 garbage 3줄 이상 공격 피해 +25% |
| `garbage_surge` | 압박 고조 | `garbage` | `rare` | 대기 garbage 6줄 이상 공격 피해 +35% |

### 상점 전용 유물

| id | name | category | rarity | 효과 요약 |
| --- | --- | --- | --- | --- |
| `gentle_fall` | 완만한 낙하 | `rule` | `common` | gravity 간격 x1.2 |
| `delayed_lock` | 지연 고정 | `rule` | `common` | lock delay +150ms |
| `compressed_preview` | 압축 전개 | `rule` | `uncommon` | Next preview -2, 최소 1 |
| `no_hold_focus` | 단기 집중 | `rule` | `rare` | Hold 비활성화 |
| `holdless_focus` | 미사용 집중 | `nextHold` | `uncommon` | Hold 미사용 시 공격 피해 +30% |

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

공격 modifier의 `when`은 AND 조건만 지원한다.
모든 조건이 true일 때 modifier가 적용된다.

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

### 미지원

OR 조건은 아직 지원하지 않는다.
예를 들어 "Tetris 또는 T-spin" 조건은 현재 하나의 modifier로 표현할 수 없다.

## 아직 구현하지 않은 것

- OR 조건
- 이벤트형 유물
- 다음 공격 강화
- B2B 끊김 방지
- 전투 시작 후 시간제 버프
- 사망 직전 생존
- `deepHoleCount` 실제 계산
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
