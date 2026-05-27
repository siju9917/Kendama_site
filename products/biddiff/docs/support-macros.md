# Support Macros

Canned responses for common support questions. Edit before sending to
match the user's specifics; the macros are starting points, not scripts.

## #install-help

> Thanks for reaching out. BidDiff installs from the Chrome Web Store
> at the URL below. After install, click the BidDiff icon in your
> Chrome toolbar, then **Open side panel**. You can then drop the new
> and prior versions of the solicitation into the side panel and click
> **Compare versions**.
>
> If the icon isn't showing, pin it from Chrome's extension menu (the
> puzzle-piece icon).

## #docs-not-extracting

> Sorry you hit this. Two common causes:
>
> 1. The PDF is scanned (image-only). BidDiff needs the text layer to
>    read it. If you're OK with sending that one document to our OCR
>    endpoint, click the per-document opt-in button and BidDiff will
>    recover the text.
> 2. The PDF is password-protected. BidDiff doesn't open encrypted
>    PDFs — save an unprotected copy and try again.
>
> If neither applies, please reply with the (redacted) file and we'll
> look into it.

## #missed-a-change

> Thank you for flagging that. We treat misses as P0 bugs. Could you
> reply with:
>
> - the (redacted) prior and current versions, or just the relevant
>   section text;
> - what the change was and why you'd expect it to be flagged.
>
> We add every reported miss to our regression suite so it can't
> reappear in a later release.

## #license-not-activating

> Two things to check:
>
> 1. The license key is pasted into **Settings → License key** exactly
>    as we sent it (no extra spaces).
> 2. You're online for the first activation. After that, BidDiff
>    operates offline for up to 7 days; a periodic check happens when
>    you're back online.
>
> If both look right and it still won't activate, send the first 6
> characters of the key and we'll cross-check it on our side.

## #billing

> Billing is handled by our merchant-of-record. You can manage your
> subscription directly through the customer portal — click the link
> in **Settings → Billing portal**. From there you can update payment
> method, change tier, or cancel.

## #cancel

> You can cancel from the customer portal at any time. Cancellation
> takes effect at the end of your current billing period; you keep
> access until then.

## #feature-request

> Thank you — we read every one of these. Could you add a sentence
> about the workflow this would unblock? That helps us prioritize.
> Feature requests are tracked in our roadmap; we publish what's
> shipped per release in our changelog.

## #privacy

> Documents stay on your device. The only times anything leaves are:
>
> - License-key validation (no document content).
> - Anonymous usage statistics — opt out from Settings.
> - The per-document opt-in OCR path, where YOU click the consent
>   button for a specific scanned PDF.
>
> Full policy: <link to privacy policy>
