---
name: arr-media-stack
description: Use when managing the Docker *arr media stack, troubleshooting containers, viewing logs, updating images, adding services, or fixing permissions. Use when user mentions Radarr, Sonarr, Lidarr, Readarr, Whisparr, Bazarr, Prowlarr, qBittorrent, Jellyfin, Traefik, Homarr, FlareSolverr, Unpackerr, or the media stack.
---

# *Arr Media Stack Management

## Overview

Docker Compose media automation stack at `~/docker/`. Runs on **rootless Podman** (not Docker) via `podman-compose`. Uses `docker compose` (v2, no hyphen) which aliases to podman-compose. All services run on `media_network` bridge with Traefik reverse proxy. PUID/PGID=1000, TZ=America/New_York.

## Podman Constraints (Bazzite)

Bazzite uses rootless Podman. Key differences from Docker:

- **Socket path:** Podman socket is at `/run/user/1000/podman/podman.sock` (not `/var/run/docker.sock`). Services needing the Docker socket (Traefik, Homarr) mount the Podman socket in its place.
- **Privileged ports:** Rootless containers cannot bind below port 1024. Traefik uses `8880:80` and `8443:443` instead of direct 80/443.
- **Image registries:** Some `docker.io/linuxserver/` images lack proper tags. Readarr uses `lscr.io/linuxserver/readarr` (arch-prefixed nightly tags only, no `latest`). Whisparr uses `ghcr.io/hotio/whisparr:latest`.

## Helper Scripts

**Always prefer these over raw docker commands:**

| Task | Command |
|------|---------|
| Start stack | `~/docker/start-stack.sh` |
| Stop stack | `~/docker/stop-stack.sh` |
| Status + resources | `~/docker/status.sh` |
| Update all images | `~/docker/update-stack.sh` |
| Logs (all, tailing) | `~/docker/logs.sh` |
| Logs (one service) | `~/docker/logs.sh <service>` |

**WARNING:** `logs.sh` uses `-f` (follow mode) which hangs in Claude Code. For non-interactive log viewing:
```bash
cd ~/docker && docker compose logs --tail=100 <service>
```

## Services & Ports

| Service | Container | Host Port | Internal Port |
|---------|-----------|-----------|---------------|
| Traefik | traefik | 8080, 8880, 8443 | 8080, 80, 443 |
| Prowlarr | prowlarr | 9696 | 9696 |
| qBittorrent | qbittorrent | **8081** | 8080 |
| Radarr | radarr | 7878 | 7878 |
| Sonarr | sonarr | 8989 | 8989 |
| Lidarr | lidarr | 8686 | 8686 |
| Readarr | readarr | 8787 | 8787 |
| Whisparr | whisparr | 6969 | 6969 |
| Bazarr | bazarr | 6767 | 6767 |
| Jellyfin | jellyfin | 8096, 8920 | 8096 |
| Homarr | homarr | 7575 | 7575 |
| FlareSolverr | flaresolverr | 8191 | 8191 |
| Unpackerr | unpackerr | — | — |
| Gluetun VPN | gluetun | — | — (commented out) |

**Note:** qBittorrent host port is **8081** (remapped to avoid Traefik conflict).

## Directory Structure

```
~/docker/
├── docker-compose.yml
├── traefik/              # traefik.yml, dynamic.yml, acme.json
├── data/
│   ├── config/<service>/ # Per-service config
│   ├── downloads/        # Active downloads (movies/, tv/, music/, books/)
│   └── media/            # Completed media (movies/, tv/, music/, books/)
└── *.sh                  # Helper scripts
```

Config path pattern: `./data/config/<service-name>/:/config`
Media paths: `./data/media/<type>:/<type>` (movies, tv, music, books)

## Common Operations

Restart a single service:
```bash
cd ~/docker && docker compose restart sonarr
```

View logs (non-interactive, safe for Claude Code):
```bash
cd ~/docker && docker compose logs --tail=50 radarr
```

Check a specific container:
```bash
cd ~/docker && docker compose ps qbittorrent
```

Fix permissions:
```bash
sudo chown -R 1000:1000 ~/docker/data/downloads ~/docker/data/media
```

## Adding a New Service

Follow the existing pattern in `docker-compose.yml`:

```yaml
  service-name:
    image: lscr.io/linuxserver/service-name:latest
    container_name: service-name
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - ./data/config/service-name:/config
    networks:
      - media_network
    ports:
      - "HOST_PORT:CONTAINER_PORT"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.service-name.rule=Host(`service-name.localhost`)"
      - "traefik.http.routers.service-name.entrypoints=web"
      - "traefik.http.services.service-name.loadbalancer.server.port=CONTAINER_PORT"
```

If the service needs the Docker socket (e.g. dashboards), add:
```yaml
    volumes:
      - /run/user/1000/podman/podman.sock:/var/run/docker.sock:ro
```

Host ports must be >= 1024 (rootless Podman).

Then deploy: `cd ~/docker && docker compose up -d service-name`

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Container won't start | `cd ~/docker && docker compose logs <service>` |
| "bind: permission denied" on port | Rootless Podman can't bind <1024. Remap to higher port (e.g. `8880:80`) |
| "statfs /run/docker.sock: no such file" | Mount Podman socket: `/run/user/1000/podman/podman.sock:/var/run/docker.sock:ro` |
| "manifest unknown" pulling image | Image may lack `latest` tag. Check `podman search --list-tags <image>` for available tags |
| Web UI not loading | Verify correct host port in table above |
| Permission denied | `sudo chown -R 1000:1000 ~/docker/data` |
| Network issues between services | Services use container names as hostnames on `media_network` |
| Unpackerr not extracting | Check API keys are set in `docker-compose.yml` env vars |
| Reset a service | `cd ~/docker && docker compose rm -f <service> && docker compose up -d <service>` |

## Autonomy Rules

**Do freely:**
- `~/docker/status.sh` — read-only status check
- `docker compose ps`, `docker compose logs --tail=N` — read-only
- Read `docker-compose.yml` and config files

**Confirm with user first:**
- `start-stack.sh`, `stop-stack.sh` — starts/stops all services
- `update-stack.sh` — pulls new images, recreates containers
- `docker compose restart <service>` — restarts a service
- Editing `docker-compose.yml` — modifies stack configuration
- `docker compose rm` — removes containers
- Any `chown`/`chmod` on data directories

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `docker-compose` (hyphenated, v1) | Use `docker compose` (v2, space) |
| qBittorrent on port 8080 | Host port is **8081** (8080 is Traefik) |
| Paths like `~/docker/downloads/` | Correct: `~/docker/data/downloads/` |
| Config at `~/docker/service/` | Correct: `~/docker/data/config/service/` |
| `docker compose logs -f` in Claude Code | Use `docker compose logs --tail=N` (no `-f`) |
| Using `nano` to edit compose file | Use the Edit tool on `~/docker/docker-compose.yml` |
| Wrong network name | Network is `media_network` |
| Missing Traefik labels on new service | Copy label pattern from existing services |
| Mounting `/var/run/docker.sock` | Use `/run/user/1000/podman/podman.sock:/var/run/docker.sock:ro` |
| Binding port 80 or 443 | Rootless Podman can't. Use `8880:80` and `8443:443` |
| Using `docker.io/linuxserver/readarr:latest` | No `latest` tag. Use `lscr.io/linuxserver/readarr:amd64-nightly-version-<ver>` |
| Using `docker.io/linuxserver/whisparr:latest` | Access denied. Use `ghcr.io/hotio/whisparr:latest` |
