# Proto UI 0.2.0-rc.4

> 已于 2026 年 7 月 24 日通过 npm `next` channel 发布。全部 37 个公开 package、`v0.2.0-rc.4` tag、GitHub prerelease 与不可变 spec snapshot 共享这一精确发行身份。

## 已修正

### Web Component Tabs Content 重物化

- Web Component Tabs Content 现在可以在已经访问过的 panel 经历默认 `current -> inactive -> current` L1 生命周期后重新正常显示。
- 受影响的 Proto instance 与 `current` state 原本已被正确保留；panel 消失是因为新 view epoch 揭示时，持久 custom-element owner 上仍残留旧的原生 `hidden` 属性。
- Web Component a11y projection 现在可以在重物化宿主仍受 reveal barrier 保护时投射最新 semantic snapshot；focus projection 仍需等待宿主真正可交互。
- 通用 L1 a11y replay 测试与 Shadcn Tabs `A -> B -> A` Web Component 集成测试分别保护生命周期边界和本次人工试用路径。

## 仍在验证

- `0.2.0-rc.4` 发布后试用继续发现的安装、运行时、CSS、a11y、bundle、组合与 API 问题将进入后续 release train。
