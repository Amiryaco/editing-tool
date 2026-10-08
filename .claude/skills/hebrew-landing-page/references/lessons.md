# Lessons from the first project (AY Digital Marketing)

These are the user's notes, roughly in order, each with the rule it became. Read this once before building, and again when feedback feels vague: the same notes will come back from the next business owner.

| What the user said | The rule |
|---|---|
| "I don't want a design similar to my current page, or even its copy. It's just so you understand." | Study the existing material for **facts** (offer, audience, proof), and build fresh. |
| The page wasn't right-to-left. | RTL from the first line of HTML. Check the reading order in every screenshot. |
| "The text goes over the animation. It's not professional." | Text never sits over moving footage. Reserve a copy zone, and scale the visual to the space left. |
| "Show the Ads Manager image first, then leads and money, then a 'full breakdown' button." | Proof that can be inspected: image, then key figure, then detail on demand. |
| "The transitions between the video clips lose the effect… no black screen that stops the transition… when it ends the text should enter nicely, not jump." | One smooth motion per chapter, no holds inside motions, and the text fades in while the motion settles. |
| "Write '5 sample results' so they don't think these are our only results." | Frame proof as a sample. |
| "Add an average ROI of ×5 with a number." Later: "show estimated revenue (×5 of spend) at first glance." | The money figure goes on the card, labelled as an estimate, and is disclaimed in the terms. |
| "It should look more alive and less AI." | Real platform icons and screens, specific copy, a quieter label font, no generic gradients and sparkles. |
| "From the very first scroll the animation must move, no delays. That's the wow." | Ease-out from story vh 0. |
| Gave the exact hero headline. | Use the user's wording verbatim. Fix only grammar. |
| "We also do Google. It's important everywhere on the page." | Every platform they work with appears everywhere: hero, FAQ, method, quiz. |
| "The icons look AI. Make them more branded." | Draw clean, brand-coloured marks; avoid stock "AI" icon styles. |
| "Don't use the ₪ sign, just write 'millions'." | Don't decorate a vague number with precision symbols. |
| "Fix grammar like no ו after a comma." | Proofread Hebrew punctuation: no comma before ו, and a comma where the reader pauses. |
| "Use a more professional font for the small labels." | Eyebrows and labels in IBM Plex Sans Hebrew; Rubik for display and body. |
| "On desktop the animation should be wide too." / "I widened the screen and it didn't change." | A separate 16:9 sequence on desktop, switched live on resize. |
| "It's cut at the top." | Fit the visual to the space between header and copy, on short screens too. |
| "The button blends into the background." | CTAs over busy areas need an outline, a fill tint or a shadow. Check contrast in context. |
| "In each result, merge the numbers into one figure like the first one." | Present each card the same way: one combined figure. |
| "No cookie banner, most sites don't. Put it in the policy only. One checkbox for privacy, like my site." | Respect the business choice, implement it cleanly, and state the legal trade-off once (see forms-pixels-legal.md). |
| "If someone gets marketing they can reply 'remove'." | Write the removal path into the policy and into every message. |
| "The privacy link doesn't open" (inside the preview). | The preview can't navigate: embed the legal pages and open them in a dialog. |
| "My thumbnail is pixelated." | Use photos sharp at 2× DPR. Pick a better source if needed. |
| "New deployment, does it delete the old one?" | Explain Cloudflare deployments simply: each one replaces the site with the full folder, and old ones can be rolled back. |
| "Zoom on WhatsApp is broken, the animation is small, the text is late." (a bug video) | Scan the whole page on real device sizes after every round, not just the part that changed. |
| "Can we make better scroll videos? I saw a course page that looks amazing." | A vector / CSS-3D scene in the page beat the AI video: sharper, lighter, on-brand, with real UI. |
| "A smart calculator… research what agencies do." → "Which platform to advertise on, by niche, budget and social presence." | A quiz lead magnet that gives a real answer, with all the answers sent with the lead. |
| "The first question should have few options or free text. It makes the page long." | Free text plus chips; one question per screen. |
| "More realistic: real Facebook, TikTok, Instagram, Google icons and images. Wow." | Real UI in the scene: app icons, an Instagram post, a TikTok, a Google ad, Ads Manager. |
| "Skip doesn't work. The ball is too fast and passes 3 times." | Check the layering with pointer events. Anything on a path passes once, slowly. |
| "Add 3D, a lot." → "Short 3D moves. It should be impressive, like the laptop turning ~130° from almost upside down." | Big, complementary 3D moves, not wobbles. |
| "The social graph flat with no 3D, then the 3D is a surprise. The laptop looks weird." | Hold the 3D back. Give 3D objects real thickness. |
| "Should we drop the small text in the animation?" → "Yes: keep the first and last paragraphs, enlarge the headlines." | Middle chapters are headlines only, bigger. |
| "Three centred lines, ״פרסם״ a bit bigger." | Short lines, the key word biggest. |
| "The first section should look like a static landing page, then scrolling starts the animation." | The hero is calm at first glance; the first scroll bursts it open. |
| "Do something else so they don't think they need to click 'Publish'. Make the emblem bigger, elegant, tied to our niche." | Nothing non-clickable may look like a button. The hero visual is the brand mark plus the platforms. |
| "Leave it as is, it's good." | When the user says stop, stop. Don't keep polishing. |
| "I need an accessibility plugin, super important. Research and build it." → "Why at the top? Is it legal? What's the risk?" | Build it self-hosted. Explain placement and the law in plain words. Never leave a vague "risk" hanging. |

## Working habits that helped

- **Show, then ask.** Ask one AskUserQuestion with a recommended option only when the choice is truly theirs (e.g. "keep the circle size or +15%?"); otherwise pick and say why.
- **Keep the old version switchable** when trying something bold (`STORY_MODE`), and say "if it isn't good we'll go back".
- **Pending items:** list them at the end of every round. Revenue figures, original screenshots, pixel IDs and DNS access stayed open for days, and each reminder kept them visible.
- **If a tool or host is blocked** (e.g. a CDN returning 403), say so, use a placeholder that looks finished, and give the user the one action that unblocks it.
