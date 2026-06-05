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
> 1. The PDF is scanned (image-only). BidDiff reads the text layer and
>    runs fully on your device, so it can't OCR an image-only PDF. Run the
>    file through your own OCR first — in Word or Acrobat, use
>    "make searchable" / export to text — then drop in the resulting
>    text-layer PDF or .docx.
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

## #pricing

> BidDiff is free — there's no account, license key, trial, or paid tier.
> Install it from the Chrome Web Store and every feature is available.
> Because it runs entirely on your device, there's nothing to meter or bill.

## #feature-request

> Thank you — we read every one of these. Could you add a sentence
> about the workflow this would unblock? That helps us prioritize.
> Feature requests are tracked in our roadmap; we publish what's
> shipped per release in our changelog.

## #privacy

> Your documents stay on your device — BidDiff parses and compares them in
> your browser, and there is no BidDiff server. The only network activity is
> downloading an attachment from SAM.gov when you click "Compare with
> BidDiff" on an opportunity page. No telemetry, no accounts, no tracking.
>
> Full policy: <link to privacy policy>
