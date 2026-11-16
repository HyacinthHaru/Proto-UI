# Bootstrap Dialog preview and Close ownership

The existing runtime recipe closure assertion reproduces the missing passive Surface and Text registrations on main `7780dba2`. The original four-host Close tests also reproduce invalid calls to subscription cleanup after source disposal. The repair aligns the manifest with the authored recipe and stops appearance projection on the source disconnect signal.

Five targeted files pass 117 cases. The Close tests exercise command ownership, real exposed State updates, disabled suppression, controlled and uncontrolled dismissal, and explicit subscription cleanup. The updated observer reads the real subscriptions from the committed public instance, including replacement during open.

A temporary Astro route uses the real PrototypePreviewer and one authored preview at each runtime's path. With pinned Chrome 156, WC, React, Vue 3 and Vue 2 each mount, open with Enter, render exactly one footer Close command, return focus on native Close click, then reopen and return focus on Escape. The open captures are byte-identical at 900 × 700 across the four runs. The included image shows the rendered modal and focused footer Close.

The first two fixture attempts recorded route and runtime query failures. The successful fixture passed the runtime through a static path on the localized route and used an explicit favicon. The full S4 matrix and the hosted cycle have separate acceptance requirements.
