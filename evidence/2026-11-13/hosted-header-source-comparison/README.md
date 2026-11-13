# Header geometry attribution in original hosted failures

The November 12 pair of original-shard traces on `26418fe1` and `f58c7af3` remain historical comparators. Their weighted V8 samples reconstruct to the actual Button anchor read, at 119.685ms and 111.658ms. Two November 13 original runs on `87fe36ac` and `298ed4b` still show that same source call, at 86.532ms and 89.717ms.

After `dbe246b` removes the compact Button rect read, the sampled rectangle in all three subsequent original Chrome 156 failures reconstructs to the Header root, at 75.586ms, 86.967ms and 102.826ms. The exact source blob and trace hashes, generated line and V8 sample positions are retained. The Vite 6.4.1 local reconstruction of the f58 file byte-matches the previous generated transform. Compact 390px and 430px fixtures measured the Button rect count falling from three to zero.

All named samples still reject the original one-second check. Some family writes finish before the verdict and others after it. The source attribution identifies which geometry remains in the failing interval. Sample weights, runner variation and distinct queries do not establish a causal latency saving.
