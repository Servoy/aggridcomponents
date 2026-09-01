# Triage Report — SVY-21358

**Verdict:** NEEDS_INPUT

## Reported problem
When a Titanium client runs a **responsive** form containing an aggrid, this Sablo
error appears in the server console:

```
ERROR [Executor,uuid:e510185:2] org.sablo.specification.property.types.ObjectPropertyType
  - [default or 'object' type toJSONValue] unsupported value type:null
    for value: java.awt.Dimension[width=140,height=20] current json:  [ ]
java.lang.IllegalArgumentException: unsupported value type; see value in log entry
```

The ticket title tags it as a `[Sablo error]`. The reporter attached the test
solution (`aggrid_tst.servoy`) and a server log (`servoy_log.txt`).

The ticket carries **no proposed solution**. The only comments are from architects:
- Johan Compagner: "i think this should be fixed, but we can use this case to track down (E2E) failures like this."
- Andrei Costescu: "Check for more similar e2e problems."

User context for this triage: *"is there any error that is in the ng grid codebase for this ticket?"*

## Root-cause assessment
There are **two distinct errors** in the attached log, and **neither originates in this
aggrid (ng grid) repository**:

### Error 1 — the Sablo Dimension serialization error (the ticket's headline)
Log line 140–169. The full stack trace is entirely server-side framework code:

```
org.sablo.specification.property.types.ObjectPropertyType.getJSONAndClientSideType(ObjectPropertyType.java:281)
org.sablo.websocket.utils.JSONUtils.defaultToJSONValue(JSONUtils.java:165)
com.servoy.j2db.server.ngclient.property.types.NGConversions$FormElementToJSON.toJSONValue(NGConversions.java:349)
com.servoy.j2db.server.ngclient.ChildrenJSONGenerator.writeFormElement(ChildrenJSONGenerator.java:362)
com.servoy.j2db.server.ngclient.AngularFormGenerator.generateJS(AngularFormGenerator.java:270)
com.servoy.eclipse.designer.editor.rfb.DesignerWebsocketSession.executeMethod(DesignerWebsocketSession.java:229)
```

- The failure is `ObjectPropertyType.toJSONValue` refusing to serialize a
  `java.awt.Dimension[width=140,height=20]` because its `getJSONAndClientSideType`
  returned a `null` client-side type. This is Sablo/Servoy framework serialization
  logic (`org.sablo.*` and `com.servoy.j2db.server.ngclient.*`), which lives in the
  **servoy-eclipse / sablo** repositories, not here.
- The `DesignerWebsocketSession` frame shows this is triggered by the **RFB form
  designer** generating the Angular form (`AngularFormGenerator`), i.e. at design time
  in the developer, not from any TypeScript in `aggrid/projects/nggrids/`.
- **The `140x20` dimension does not come from this repo.** Every `dimension`-typed
  property in the specs has different defaults: `designsize` defaults to
  `{width:400,height:300}` (`datasettable.spec:21`, `groupingtable.spec:20`) and
  `editFormSize` defaults to `{width:300,height:200}` (`datasettable.spec:549`). A
  repo-wide grep for a `140`/`20` dimension default returns nothing. `140x20` is the
  Servoy platform default element size for a newly-created responsive element — a value
  set by the developer/framework, not by the grid component.

**Conclusion for Error 1:** this is a framework-side serialization defect (an `object`/
`dimension` property whose value is a `java.awt.Dimension` that Sablo can't convert to
JSON). The fix belongs in Sablo/servoy-eclipse, not in the aggrid package.

### Error 2 — the browser `setHeight` ExpressionChangedAfterItHasBeenChecked error
Log line 170 onward. This one **does** reference this repo's code:

```
setHeight@.../chunk-34TYITQ3.js:66879:11
svyOnChanges@.../chunk-34TYITQ3.js:201852:18
ngOnChanges@...
... throwErrorIfNoChangesMode ...
```

The `setHeight` frame maps to `NGGridDirective.setHeight()` (`nggrid.ts:214`), called
from `svyOnChanges` when `responsiveHeight` changes (`powergrid.ts:771`,
`datagrid.ts:962/1230`). `setHeight()` mutates `agGridElementRef.nativeElement.style.height`
during change detection, which can trip Angular's dev-mode
`ExpressionChangedAfterItHasBeenChecked` / no-changes assertion.

However, this is only in the log because the developer had the client in **dev mode**,
and Johan's comment ("i think this should be fixed") suggests it may already be handled
elsewhere. It is a *candidate* aggrid bug, but the ticket was not filed about it — it was
filed about the Sablo Dimension error.

## Ticket premise check
The ticket is framed as a Sablo error and (implicitly) as something to fix, but it
contains no proposed approach. Given the user's explicit question — *"is there any error
that is in the ng grid codebase for this ticket?"* — the honest answer is:

- The **headline error (Sablo Dimension)** is **not** in the ng grid codebase. It is a
  framework serialization issue in sablo / servoy-eclipse.
- A **secondary error (`setHeight` change-detection)** *does* touch ng grid code
  (`nggrid.ts:214`), but it is a different problem, was not the reported symptom, and may
  already be addressed per Johan's comment.

So the ticket's premise ("this is an aggrid case") only partially holds, and it is
ambiguous which of the two errors this repo is expected to act on.

## Approaches considered
1. **Fix nothing in this repo; route the Sablo Dimension error to sablo/servoy-eclipse.**
   - Pros: matches the actual stack trace; the defect is genuinely framework-side.
   - Cons: leaves the fixVersion (2026.9.0) on this package unaddressed if the intent was
     for aggrid to change.
2. **Harden `NGGridDirective.setHeight()` to avoid the change-detection error** (defer the
   style mutation, e.g. run outside the checked phase / after render).
   - Pros: removes the second, ng-grid-owned error from the log; small, local change.
   - Cons: this is not the error the ticket names; risks fixing the wrong thing without
     confirmation.
3. **No code change — expected/dev-mode noise.**
   - Pros: the `setHeight` error only appears in dev mode; the Sablo error is a separate
     component/repo's responsibility. Honest evaluation: from *this repo's* standpoint
     there may be nothing to fix.
   - Cons: leaves a real framework-side defect untracked if no one re-routes it.

## Recommendation
Because the divergence test trips — the ticket names one error (Sablo Dimension, which
is **not** in this repo) while the log also contains a second, ng-grid-owned error
(`setHeight`), and there is no way from the ticket alone to know which one this package
is expected to fix — a human decision is required before writing a spec. See the
questions below.

Preliminary finding for the user's direct question: **the headline Sablo Dimension error
is not in the ng grid codebase** (it is server-side sablo/servoy-eclipse serialization).
The only ng-grid-owned error in the log is the secondary `setHeight`
ExpressionChangedAfterItHasBeenChecked warning at `nggrid.ts:214`.

## Git history findings
- `datasettable.spec:21` / `groupingtable.spec:20` (`designsize`, dimension, default
  400x300) — last touched by commit `02d8a613` (Johan Compagner, 2026-08-18): "make
  designsize property private (hidden from properties view)". Making `designsize`
  `serveronly`/private is a plausible neighbour of the reported area, but its default is
  400x300, not the 140x20 in the error, so it is not the source of the failing value.
- `datasettable.spec:549` (`editFormSize`, dimension, default 300x200) — commit
  `7ec67ff5` (Johan Compagner, 2026-08-18). Also not 140x20.
- No commit in this repo introduces a `140x20` dimension; that value is the platform's
  default responsive element size, set outside this package.

## Questions for the reporter (NEEDS_INPUT only)
1. This case is tagged as an aggrid issue, but the `java.awt.Dimension[140x20]` Sablo
   error's stack trace is entirely server-side framework code
   (`org.sablo.specification.property.types.ObjectPropertyType`,
   `com.servoy.j2db.server.ngclient.AngularFormGenerator`,
   `com.servoy.eclipse.designer.editor.rfb.DesignerWebsocketSession`) with no aggrid
   component code involved. Should this be handled in sablo / servoy-eclipse rather than
   in the nggrids package? If a change is expected in the nggrids package specifically,
   which property or behaviour do you believe produces the `140x20` value?
2. The attached log also contains a separate browser error — an Angular
   `ExpressionChangedAfterItHasBeenChecked` triggered by `setHeight()` in the grid base
   directive (`nggrid.ts`) when `responsiveHeight` changes on a responsive form. Is *this*
   the error you actually want addressed in the nggrids package, or is it unrelated
   dev-mode noise? Johan's comment ("i think this should be fixed") suggests it may already
   be resolved — can you confirm the current status?
3. Can you provide exact reproduction steps with the attached `aggrid_tst.servoy` (which
   responsive form, which grid — Power Grid or Data Grid — and whether the error appears
   in the RFB form designer, at client runtime, or both)? This determines whether the
   relevant code path is design-time form generation (framework) or runtime component
   behaviour (this package).
