# Brutalist original-workload repeat and scheduled main comparison

The second attempt of the owned fork run reused the historical product f58c7af3 and exact diagnostic carrier 416f8cb7. The original workflow still ran shards 1/8 and 3/8, with the same original suite lists and default CPU settings. The two jobs ended with wrapper exit 124. The artifact names, run attempt, source, ZIP SHA-256 and CRCs were checked independently. Chrome on shard 1 changed from 156.0.8078.79 to 157.0.8103.50. Runner image versions also changed.

| Source | Original poll verdict | Family write after poll | Renderer queue | Node query returned |
| --- | --: | --: | --: | --: |
| 26418fe1, historical | 1001.363 ms, rejected | 1257.381–1258.374 ms | 1655.801 ms | 2029.979 ms |
| f58c7af3, attempt 1 | 1000.579 ms, rejected | 1334.346–1335.152 ms | 1678.390 ms | 2084.207 ms |
| f58c7af3, attempt 2 | 1000.886 ms, rejected | 913.661–915.399 ms | 1152.738 ms | 1448.565 ms |
| 29a61c4, current | 1000.237 ms, rejected | 1191.745–1192.643 ms | 1546.668 ms | 1898.303 ms |

The repeat keeps the first two product revisions separate from the current candidate. Its fourth query entered Chrome, waited 1152.738 ms after forwarding, executed dispatch in 1.300 ms, then returned Brutalist to Node. The trace completed without reported loss. V8 sampled the active Button rectangle after the family write at f58c7af3. In three newer exact traces it sampled the Header root rectangle through Homepage publication and disclosure enhancement, also after the family write. The current trace samples the Typography anchor node getter during active Typography activation and computed palette property reads through both observer and active motion paths. The source binding describes the local generated-line reconstruction. Sample weights overlap renderer task intervals and do not establish causality or quantify time saved.

The repeat passed both named Contents and mobile-shell cases, all eight runtime switches, 24 ordered sidebar handbacks, and all eight Dialog cases. The historical narrow WC shadow failure is a separate observation. Its actual box shadow changed 46.9 ms after focus during a 150 ms transition. The current visual check keeps the original polling budget, ring width, offset and clipping assertions.

The latest scheduled upstream run on main 35195a6e has the same selected suite lists for the three compared shards. The exact main Shadcn React Contents case rejected at 1000 ms. Its first late sample at 1232.1 ms still showed WC Header and Contents. The next sample at 1676.1 ms showed React on both. The current fork's original check passed at 611 ms, and all eight switches and 24 handbacks were observed. Dialog passed 8/8 on both. The latest scheduled main Brutalist family wrote before its rejected poll and the fourth query returned at 1610.941 ms. Main still records Sidebar 4/7, Typography 7/34 and two S4 startup failures. Current hosted records Sidebar 7/7, Typography 33/34 and the zh-cn S4 startup failure, with no terminal English S4 receipt. These are observations on separately scheduled jobs.

[Historical exact repeat, attempt 2](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43198607525/attempts/2) · [Current exact hosted run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43390494372) · [Latest scheduled main](https://github.com/Proto-UI/Proto-UI/actions/runs/43375522817)
