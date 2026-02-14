---
name: ujust-bazzite-admin
description: Use when performing system administration, configuration, troubleshooting, or installing software on a Bazzite (immutable Fedora atomic) host. Use when user mentions ujust, system updates, boot logs, GRUB, SSH, Tailscale, snapshots, NVIDIA drivers, virtualization, audio fixes, or gaming setup on Bazzite.
---

# ujust — Bazzite System Administration

## Overview

`ujust` is Bazzite's built-in command runner (based on `just`) providing 100+ pre-built recipes for system administration, hardware configuration, gaming setup, and troubleshooting. **Always prefer ujust over manual systemctl/rpm-ostree/dnf commands** — recipes handle edge cases, SELinux, firewall, and immutable-OS constraints automatically.

## Critical: Non-Interactive Mode

Many ujust recipes launch interactive menus by default. **Claude Code cannot interact with menus.** Always pass the ACTION parameter directly:

```bash
# WRONG — launches interactive menu, hangs in Claude Code
ujust toggle-ssh
ujust configure-grub
ujust configure-snapshots

# CORRECT — skips menu, executes directly
ujust toggle-ssh enable
ujust configure-grub show
ujust configure-snapshots enable
```

To discover available actions for any recipe: `ujust <recipe> help`

## Autonomy Rules

**Do freely (read-only / safe):**
- `ujust --list` — list all recipes
- `ujust <recipe> help` — show recipe options
- `ujust logs-this-boot`, `ujust logs-last-boot` — view logs
- `ujust bios-info`, `ujust device-info` — system info
- `ujust changelogs` — view changelogs
- `ujust benchmark` — run benchmark
- `ujust get-logs` — collect logs to pastebin

**Confirm with user first:**
- `ujust update` — full system update (flatpaks, containers, system)
- `ujust clean-system` — prunes podman, flatpak, rpm-ostree, brew
- `ujust bios` — reboots into BIOS
- Any `configure-*`, `toggle-*`, `setup-*`, `enable-*`, `install-*` recipe
- Any recipe that requires reboot to take effect

## Quick Reference — System

| Task | Command | Notes |
|------|---------|-------|
| Update everything | `ujust update` | System + flatpaks + containers + brew |
| Clean unused packages | `ujust clean-system` | Podman + flatpak + rpm-ostree + brew |
| Boot logs (current) | `ujust logs-this-boot` | journalctl wrapper |
| Boot logs (previous) | `ujust logs-last-boot` | journalctl wrapper |
| Collect debug logs | `ujust get-logs` | Pastebins + clipboard |
| BIOS info | `ujust bios-info` | Manufacturer, version, date |
| Reboot to BIOS | `ujust bios` | EFI systems only |
| Device info pastebin | `ujust device-info` | rpm-ostree + sysinfo + flatpaks |
| View changelog | `ujust changelogs` | Stable channel |
| System benchmark | `ujust benchmark` | 1 minute |

## Quick Reference — Configuration

| Task | Command | Actions |
|------|---------|---------|
| GRUB visibility | `ujust configure-grub <action>` | `show`, `hide`, `unhide`, `help` |
| Home snapshots | `ujust configure-snapshots <action>` | `enable`, `disable`, `wipe`, `help` |
| Watchdog | `ujust configure-watchdog <action>` | `enable`, `disable`, `help` |
| BTRFS dedup (beesd) | `ujust configure-beesd <action>` | Pass `help` for options |
| Regenerate GRUB | `ujust regenerate-grub` | For dual-boot OS detection |
| BTRFS deduplication | `ujust enable-deduplication` | One-time enable |

## Quick Reference — Network

| Task | Command | Actions |
|------|---------|---------|
| SSH | `ujust toggle-ssh <action>` | `enable`, `disable`, `help` |
| Tailscale | `ujust enable-tailscale` | Enables + starts tailscaled |
| Wake-on-LAN | `ujust toggle-wol <action>` | `enable`, `disable` |
| IWD (replace wpa_supplicant) | `ujust toggle-iwd` | Toggle |

## Quick Reference — Hardware & Drivers

| Task | Command | Actions |
|------|---------|---------|
| NVIDIA driver | `ujust configure-nvidia <action>` | Pass `help` for options |
| NVIDIA Optimus | `ujust configure-nvidia-optimus <action>` | Pass `help` for options |
| Switch NVIDIA/NVK | `ujust toggle-nvk` | Toggle between drivers |
| Secure boot key | `ujust enroll-secure-boot-key` | Password: "universalblue" |
| Broadcom WiFi | `ujust configure-broadcom-wl <action>` | `enable`, `disable` |
| Intel sleep fix | `ujust toggle-i915-sleep-fix` | 7th/8th gen Intel |
| Input group | `ujust add-user-to-input-group` | For controller drivers |
| Framework fan | `ujust enable-framework-fan-control` | Framework laptops |

## Quick Reference — Audio

| Task | Command | Notes |
|------|---------|-------|
| Fix audio issues | `ujust restart-pipewire` | Fixes crackling/no sound |
| Virtual channels | `ujust setup-virtual-channels <action>` | Game/Voice/Browser/Music sinks |
| Virtual surround | `ujust setup-virtual-surround <action>` | 7.1 for headphones |
| Bluetooth mic toggle | `ujust toggle-bt-mic` | Prevents poor-quality headset mode |

## Quick Reference — Gaming

| Task | Command | Notes |
|------|---------|-------|
| Decky Loader | `ujust setup-decky <action>` | For handheld game mode |
| Sunshine streaming | `ujust setup-sunshine <action>` | Game streaming host |
| Fix proton hang | `ujust fix-proton-hang` | Kills wine/proton processes |
| Reset Steam | `ujust fix-reset-steam` | Fresh state, keeps games |
| EmuDeck | `ujust install-emudeck` | Emulation suite |
| SteamCMD | `ujust install-steamcmd` | Dedicated server tool |
| Streaming apps | `ujust get-media-app` | Add streaming to Steam |
| DLSS toggle | `ujust toggle-global-dlss <action>` | Proton DLSS upgrade |
| FSR4 (RDNA4) | `ujust toggle-global-fsr4 <action>` | FSR 3.1+ to FSR4 |
| Steam desktop icons | `ujust steam-icons <action>` | `list`, `enable`, `disable`, `remove` |

## Quick Reference — Apps & Virtualization

| Task | Command | Notes |
|------|---------|-------|
| Virtualization | `ujust setup-virtualization <action>` | `virt-on`, `virt-off`, `group`, `vfio-on`, `vfio-off`, `help` |
| Waydroid (Android) | `ujust setup-waydroid <action>` | Android container |
| DaVinci Resolve | `ujust install-resolve` | Video editor |
| JetBrains Toolbox | `ujust install-jetbrains-toolbox` | IDE manager |
| CoolerControl | `ujust install-coolercontrol` | Fan/sensor GUI |
| OpenRGB | `ujust install-openrgb` | RGB lighting |
| OpenRazer | `ujust install-openrazer` | Razer hardware |

## Quick Reference — Automounting

| Task | Command |
|------|---------|
| Enable all automounting | `ujust enable-automount-all` |
| Disable all automounting | `ujust disable-automount-all` |
| BTRFS/EXT4 automount on | `ujust enable-automounting` |
| BTRFS/EXT4 automount off | `ujust disable-automounting` |
| SteamOS automount on | `ujust enable-steamos-automount` |
| SteamOS automount off | `ujust disable-steamos-automount` |

## Quick Reference — Other

| Task | Command | Notes |
|------|---------|-------|
| Bazzite CLI tools | `ujust bazzite-cli` | Bluefin-style CLI experience |
| Password asterisks | `ujust toggle-password-feedback <action>` | `enable`, `disable` |
| Terminal transparency | `ujust ptyxis-transparency 0.85` | 0.0–1.0, default 0.95 |
| MOTD toggle | `ujust toggle-user-motd` | Terminal greeting |
| Boot to Windows | `ujust setup-boot-windows-steam` | Dual-boot Steam shortcut |
| LUKS TPM unlock | `ujust setup-luks-tpm-unlock` | Auto-unlock on boot |
| LUKS TPM remove | `ujust remove-luks-tpm-unlock` | Disable auto-unlock |
| Idle power draw | `ujust check-idle-power-draw` | Measure power |
| CEC sleep toggle | `ujust toggle-cec-sleep <action>` | TV standby on sleep |

## Common Patterns

Check available actions before running:
```bash
ujust configure-grub help
ujust toggle-ssh help
ujust setup-virtualization help
```

Troubleshooting workflow:
```bash
ujust logs-this-boot          # Check current boot
ujust logs-last-boot          # Check previous boot
ujust device-info             # System info pastebin
ujust get-logs                # Collect all logs
```

Full maintenance:
```bash
ujust update                  # Update everything
ujust clean-system            # Clean unused resources
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running `ujust toggle-ssh` without action | Always pass: `ujust toggle-ssh enable` |
| Using `systemctl enable sshd` directly | Use `ujust toggle-ssh enable` — handles firewall too |
| Using `dnf install tailscale` | Use `ujust enable-tailscale` — already pre-installed |
| Manual `snapper` setup | Use `ujust configure-snapshots enable` — pre-configured |
| Editing `/etc/default/grub` | Use `ujust configure-grub show` — handles immutable FS |
| Running `podman system prune` manually | Use `ujust clean-system` — cleans everything |
| Trying `rpm-ostree install` for ujust apps | Use `ujust install-*` — handles deps and config |
