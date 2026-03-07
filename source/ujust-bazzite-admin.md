---
name: ujust-bazzite-admin
description: Use when performing system administration, configuration, troubleshooting, or installing software on a Bazzite (immutable Fedora atomic) host. Use when user mentions ujust, system updates, boot logs, GRUB, SSH, Tailscale, snapshots, NVIDIA drivers, virtualization, audio fixes, or gaming setup on Bazzite.
---

# ujust — Bazzite System Administration

Always prefer `ujust` over manual `systemctl`/`rpm-ostree`/`dnf` — recipes handle edge cases, SELinux, firewall, and immutable-OS constraints.

**Non-interactive mode required:** Always pass ACTION directly (`ujust toggle-ssh enable`, not `ujust toggle-ssh`). Discover actions: `ujust <recipe> help`

**Autonomy:** {{tool:file_read}}-only commands (`--list`, `help`, `logs-*`, `*-info`, `changelogs`, `benchmark`) are safe. Confirm with user for any `configure-*`, `toggle-*`, `setup-*`, `enable-*`, `install-*`, `update`, `clean-system`, or reboot-requiring recipe.

## Quick Reference — System

| Action | Command | Notes |
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

| Action | Command | Actions |
|------|---------|---------|
| GRUB visibility | `ujust configure-grub <action>` | `show`, `hide`, `unhide`, `help` |
| Home snapshots | `ujust configure-snapshots <action>` | `enable`, `disable`, `wipe`, `help` |
| Watchdog | `ujust configure-watchdog <action>` | `enable`, `disable`, `help` |
| BTRFS dedup (beesd) | `ujust configure-beesd <action>` | Pass `help` for options |
| Regenerate GRUB | `ujust regenerate-grub` | For dual-boot OS detection |
| BTRFS deduplication | `ujust enable-deduplication` | One-time enable |

## Quick Reference — Network

| Action | Command | Actions |
|------|---------|---------|
| SSH | `ujust toggle-ssh <action>` | `enable`, `disable`, `help` |
| Tailscale | `ujust enable-tailscale` | Enables + starts tailscaled |
| Wake-on-LAN | `ujust toggle-wol <action>` | `enable`, `disable` |
| IWD (replace wpa_supplicant) | `ujust toggle-iwd` | Toggle |

## Quick Reference — Hardware & Drivers

| Action | Command | Actions |
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

| Action | Command | Notes |
|------|---------|-------|
| Fix audio issues | `ujust restart-pipewire` | Fixes crackling/no sound |
| Virtual channels | `ujust setup-virtual-channels <action>` | Game/Voice/Browser/Music sinks |
| Virtual surround | `ujust setup-virtual-surround <action>` | 7.1 for headphones |
| Bluetooth mic toggle | `ujust toggle-bt-mic` | Prevents poor-quality headset mode |

## Quick Reference — Gaming

| Action | Command | Notes |
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

| Action | Command | Notes |
|------|---------|-------|
| Virtualization | `ujust setup-virtualization <action>` | `virt-on`, `virt-off`, `group`, `vfio-on`, `vfio-off`, `help` |
| Waydroid (Android) | `ujust setup-waydroid <action>` | Android container |
| DaVinci Resolve | `ujust install-resolve` | Video editor |
| JetBrains Toolbox | `ujust install-jetbrains-toolbox` | IDE manager |
| CoolerControl | `ujust install-coolercontrol` | Fan/sensor GUI |
| OpenRGB | `ujust install-openrgb` | RGB lighting |
| OpenRazer | `ujust install-openrazer` | Razer hardware |

## Quick Reference — Automounting

| Action | Command |
|------|---------|
| Enable all automounting | `ujust enable-automount-all` |
| Disable all automounting | `ujust disable-automount-all` |
| BTRFS/EXT4 automount on | `ujust enable-automounting` |
| BTRFS/EXT4 automount off | `ujust disable-automounting` |
| SteamOS automount on | `ujust enable-steamos-automount` |
| SteamOS automount off | `ujust disable-steamos-automount` |

## Quick Reference — Other

| Action | Command | Notes |
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

## Common Mistakes

| Mistake | Use Instead |
|---------|------------|
| `ujust toggle-ssh` (no action) | `ujust toggle-ssh enable` |
| `systemctl enable sshd` | `ujust toggle-ssh enable` (handles firewall) |
| `dnf install tailscale` | `ujust enable-tailscale` (pre-installed) |
| Manual `snapper` setup | `ujust configure-snapshots enable` |
| Editing `/etc/default/grub` | `ujust configure-grub show` (immutable FS) |
| `podman system prune` | `ujust clean-system` (cleans everything) |
| `rpm-ostree install` for ujust apps | `ujust install-*` (handles deps) |
