---
name: release-management
description: Use when preparing releases, creating changelogs, tagging versions, publishing packages, or managing release branches.
argument-hint: "[major|minor|patch]"
disable-model-invocation: true
allowed-tools: Bash(*)
---

# Release Management

## Versioning

Follow **Semantic Versioning** (semver):
- `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

Pre-release tags: `1.0.0-alpha.1`, `1.0.0-beta.2`, `1.0.0-rc.1`

## Release Process

### 1. Pre-Release Checks
- All tests passing on main branch
- No critical/high security vulnerabilities
- CHANGELOG updated
- Version bumped in package.json / pyproject.toml / Cargo.toml / go.mod

### 2. Create Release
```bash
# Update version
npm version patch  # or minor/major (Node.js)
# OR manually bump version in config files

# Create annotated tag
git tag -a v1.2.3 -m "Release v1.2.3: brief description"

# Push with tags
git push origin main --tags
```

### 3. Changelog

Use **Conventional Commits** format for auto-generation:
```
feat: add user authentication
fix: resolve memory leak in worker
docs: update API reference
chore: upgrade dependencies
BREAKING CHANGE: remove deprecated API endpoint
```

Generate changelog:
```bash
# Using git-cliff
git cliff --latest > CHANGELOG.md

# Manual from git log
git log v1.1.0..v1.2.0 --oneline --no-merges
```

### 4. GitHub Release
```bash
# Create release from tag
gh release create v1.2.3 \
  --title "v1.2.3" \
  --notes-file CHANGELOG.md

# With build artifacts
gh release create v1.2.3 ./dist/*.tar.gz \
  --title "v1.2.3" \
  --notes-file CHANGELOG.md
```

## Branching Strategy

### For Most Projects (GitHub Flow)
- `main` is always deployable
- Feature branches off main
- PR + review + merge to main
- Tag releases on main

### For Larger Projects (Git Flow)
- `main` — production releases only
- `develop` — integration branch
- `feature/*` — new features
- `release/*` — release prep
- `hotfix/*` — production fixes

## Rollback

```bash
# Revert to previous release
git revert <commit-sha>  # preferred — creates new commit

# Emergency: reset to previous tag
git checkout v1.2.2
# Create hotfix branch from there
git checkout -b hotfix/critical-fix
```

## Publishing

### npm (Node.js)
```bash
npm publish  # public package
npm publish --access public  # scoped package
```

### PyPI (Python)
```bash
python -m build
twine upload dist/*
```

### Container Images
```bash
podman build -t myapp:v1.2.3 .
podman tag myapp:v1.2.3 ghcr.io/user/myapp:v1.2.3
podman push ghcr.io/user/myapp:v1.2.3
```

## Checklist

Before any release:
- [ ] All tests pass
- [ ] Version number bumped
- [ ] CHANGELOG updated
- [ ] Security scan clean
- [ ] Documentation reflects changes
- [ ] Breaking changes documented in migration guide
- [ ] Tag created and pushed
- [ ] GitHub release created
- [ ] Downstream consumers notified (if breaking)
