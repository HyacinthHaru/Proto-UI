# Hosted demo matrix verification

Fork run 43366035646 covers exact `625d523` through diagnostic checkout `c89a3dc4` on the original 1/8, 2/8 and 3/8 browser workloads. The named Contents/mobile cases, Dialog 8/8 and Sidebar 7/7 pass. Typography remains 33/34 with the removed Overview route. The three containing jobs remain red.

The original Brutalist verdict on Chrome 157 rejected at +1001.534ms. The family write finished at +1297.491–1318.999ms. Chrome queued the fourth original query for 1736.205ms before renderer dispatch. Its matching Node result returned at +2097.192ms, with a complete trace and no reported data loss.

The zh-cn S4 artifact retains the startup failure and 18 owned-decoration page errors. No console errors for the two repaired recipes appear in that exact artifact. The en case has no terminal artifact before the wrapper ended. The separate local continuous paint producer hit its original 30-second Light Close click and produced no accepted frame result. The original two-second cleanup diagnostic also timed out. A post-failure-only observer was stopped after its renderer stayed busy before the Close call, and supplied no same-failure sample.

[Original fork workload](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43366035646) · [Local recipe controls and S4 limits](https://github.com/HyacinthHaru/Proto-UI/tree/17ee0ecc7f42f04e74816eadffa94941a6a40be8/evidence/2026-11-13/demo-admission-625d523)
