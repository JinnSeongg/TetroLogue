# Audio Mapping

Audio files are copied into project-owned public assets and referenced through `src/presentation/services/AudioRegistry.ts`.
The game never loads audio from the original local `C:\Users\JS\Web\Sound` folder.

## Event Mapping

| Event | File | Purpose | Fallback |
| --- | --- | --- | --- |
| `move` | `public/assets/audio/sfx/piece-move-2.mp3` | Updated movement sound matched by filename | No |
| `rotate` | `public/assets/audio/sfx/piece-rotate-2.mp3` | Updated rotation sound matched by filename | No |
| `softDrop` | `public/assets/audio/sfx/piece-move.mp3` | Soft drop movement feedback | No |
| `hardDrop` | - | Disabled by design | No |
| `lock` | `public/assets/audio/sfx/piece-lock.mp3` | Piece lock confirmation | No |
| `clear` | `public/assets/audio/sfx/clear-single.mp3` | Generic line clear fallback | No |
| `single` | `public/assets/audio/sfx/clear-single.mp3` | Single line clear | `clear` |
| `double` | `public/assets/audio/sfx/clear-double.mp3` | Double line clear | `clear` |
| `triple` | `public/assets/audio/sfx/clear-triple.mp3` | Triple line clear | `clear` |
| `tetris` | `public/assets/audio/sfx/clear-tetris.mp3` | Strong four-line clear success | `clear` |
| `tspin` | `public/assets/audio/sfx/t-spin.mp3` | Special spin clear success | `tetris` |
| `combo` | `public/assets/audio/sfx/combo-chain.mp3` | Combo chain reinforcement | No |
| `backToBack` | `public/assets/audio/sfx/combo-chain.mp3` | Back-to-back reinforcement using combo family tone | `combo` |
| `perfectClear` | `public/assets/audio/sfx/all-clear.mp3` | Perfect Clear / all clear payoff | `tetris` |
| `attack` | `public/assets/audio/sfx/hard-drop.mp3` | Short impact-like attack launch | No |
| `hit` | `public/assets/audio/sfx/piece-lock.mp3` | Enemy hit impact layer | No |
| `danger` | `public/assets/audio/sfx/garbage-rise.mp3` | Warning pulse for danger or garbage application | No |
| `garbageIncoming` | `public/assets/audio/sfx/garbage-rise.mp3` | Incoming garbage warning | `danger` |
| `menuHover` | - | Disabled by design | No |
| `menuClick` | `public/assets/audio/ui/ui-click.mp3` | General UI click | No |
| `confirm` | `public/assets/audio/ui/ui-click.mp3` | Confirm/select action using explicit UI click file | `menuClick` |
| `cancel` | `public/assets/audio/ui/ui-click.mp3` | Close/menu/cancel action using explicit UI click file | `menuClick` |
| `win` | `public/assets/audio/sfx/all-clear.mp3` | Victory success cue | `perfectClear` |
| `lose` | `public/assets/audio/sfx/garbage-rise.mp3` | Defeat pressure cue | `danger` |

## Copied Source Files

| Source file | Project file | Notes |
| --- | --- | --- |
| `all_clear.mp3` | `public/assets/audio/sfx/all-clear.mp3` | Normalized to kebab-case |
| `clear_double.mp3` | `public/assets/audio/sfx/clear-double.mp3` | Normalized to kebab-case |
| `clear_single.mp3` | `public/assets/audio/sfx/clear-single.mp3` | Normalized to kebab-case |
| `clear_tetris.mp3` | `public/assets/audio/sfx/clear-tetris.mp3` | Normalized to kebab-case |
| `clear_triple.mp3` | `public/assets/audio/sfx/clear-triple.mp3` | Normalized to kebab-case |
| `combo_chain.mp3` | `public/assets/audio/sfx/combo-chain.mp3` | Normalized to kebab-case |
| `garbage_rise.mp3` | `public/assets/audio/sfx/garbage-rise.mp3` | Normalized to kebab-case |
| `hard_drop.mp3` | `public/assets/audio/sfx/hard-drop.mp3` | Normalized to kebab-case |
| `piece_hold.mp3` | `public/assets/audio/sfx/piece-hold.mp3` | Copied for future hold-specific sound |
| `piece_lock.mp3` | `public/assets/audio/sfx/piece-lock.mp3` | Normalized to kebab-case |
| `piece_move.mp3` | `public/assets/audio/sfx/piece-move.mp3` | Normalized to kebab-case |
| `piece_move2.mp3` | `public/assets/audio/sfx/piece-move-2.mp3` | Normalized to kebab-case and mapped to `move` |
| `piece_rotate.mp3` | `public/assets/audio/sfx/piece-rotate.mp3` | Normalized to kebab-case |
| `piece_rotate2.mp3` | `public/assets/audio/sfx/piece-rotate-2.mp3` | Normalized to kebab-case and mapped to `rotate` |
| `t_spin.mp3` | `public/assets/audio/sfx/t-spin.mp3` | Normalized to kebab-case |
| `ui_click.mp3` | `public/assets/audio/ui/ui-click.mp3` | Normalized to kebab-case |

## Unused Files

- `Readme.txt` was not copied into runtime assets.
- `creatorshome-low-button-click-331780.mp3` and `soundshelfstudio-ui-radio-select-518051.mp3` were intentionally excluded because their original source filenames are long/noisy and do not map cleanly to game event names.
- `piece-hold.mp3` is copied but currently reserved because `hold` is not a public sound event key yet.
