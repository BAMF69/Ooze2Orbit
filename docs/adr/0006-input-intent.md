# 0006: Separate control intent from viewport layout

Date: 2026-11-13. Status: implemented first slice, authorized by BAMF69.

Use pointer capability for an initial default and deliberate input for Auto switching. Mouse movement
does not switch modes; one isolated touch tap does not displace keyboard/controller. A repeated tap or
drag signals touch intent. Active controller input changes prompts; a disconnected pad falls back to
the initial pointer capability. A saved Controls setting overrides detection without blocking devices.

One shared action path continues to drive gameplay. Virtual touch sources are independent of keyboard
and pad bindings and release on cancellation, pause, rotation, blur and stage exit. Default left-stick
directions supplement D-pad support without changing saved rebindings. Native dialogs are navigated
through their actual buttons, with a recursion guard for callbacks that inject gameplay actions.

Viewport sizing stays independent: a controller phone retains a small-screen layout. No scenes restart
when the scheme changes. Cell is the first touch adapter; existing other-stage native menus remain
available. No new dependency or user-agent sniffing. Settings version stays 1 with a validated additive
`input.scheme` defaulting to Auto for old files; golden vectors are regenerated from their reference.
