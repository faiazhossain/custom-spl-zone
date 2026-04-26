# Docker Buildx Multi-Platform Build Troubleshooting

## Problem
Running:
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t rilusmahmud/spl-custom-zone:main-1.0.2 --push .
```

## Common Issues and Solutions

---

### 1. Builder Not Created or Configured

**Error:** `multiple platforms feature is currently not supported`

**Solution:**
```bash
# Create a new builder instance
docker buildx create --name multiarch-builder --use

# Start the builder
docker buildx inspect --bootstrap

# Verify
docker buildx ls
```

---

### 2. QEMU Not Installed for Cross-Platform Emulation

**Error:** `exec format error` or build fails on arm64

**Solution:**
```bash
# Install QEMU for emulation
docker run --privileged --rm tonistiigi/binfmt --install all

# Verify
docker buildx inspect --bootstrap
```

---

### 3. Missing Build Arguments

**Your Dockerfile requires these ARGs:**
- `NEXT_PUBLIC_BARIKOI_API_URL`
- `NEXT_PUBLIC_BARIKOI_API_TOKEN`
- `NEXT_PUBLIC_MAP_STYLE_URL`
- `NEXT_PUBLIC_DEFAULT_LAT`
- `NEXT_PUBLIC_DEFAULT_LNG`
- `NEXT_PUBLIC_DEFAULT_ZOOM`
- `NEXT_PUBLIC_MIN_ZOOM`
- `NEXT_PUBLIC_MAX_ZOOM`
- `NEXT_PUBLIC_BASEPATH`

---

## Using .env File for Build Arguments

Docker buildx doesn't natively support `--env-file` for build arguments. Here are two solutions:

### Option A: Export .env Variables (Recommended)

```bash
# Export all variables from .env to current shell
export $(cat .env | grep -v '^#' | xargs)

# Now build with the exported variables
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg NEXT_PUBLIC_BARIKOI_API_URL=$NEXT_PUBLIC_BARIKOI_API_URL \
  --build-arg NEXT_PUBLIC_BARIKOI_API_TOKEN=$NEXT_PUBLIC_BARIKOI_API_TOKEN \
  --build-arg NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL \
  --build-arg NEXT_PUBLIC_DEFAULT_LAT=$NEXT_PUBLIC_DEFAULT_LAT \
  --build-arg NEXT_PUBLIC_DEFAULT_LNG=$NEXT_PUBLIC_DEFAULT_LNG \
  --build-arg NEXT_PUBLIC_DEFAULT_ZOOM=$NEXT_PUBLIC_DEFAULT_ZOOM \
  --build-arg NEXT_PUBLIC_MIN_ZOOM=$NEXT_PUBLIC_MIN_ZOOM \
  --build-arg NEXT_PUBLIC_MAX_ZOOM=$NEXT_PUBLIC_MAX_ZOOM \
  --build-arg NEXT_PUBLIC_BASEPATH=$NEXT_PUBLIC_BASEPATH \
  -t rilusmahmud/spl-custom-zone:main-1.0.2 \
  --push .
```

### Option B: One-Liner Using .env

```bash
# Export and build in one command
set -a && source .env && set +a && \
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg NEXT_PUBLIC_BARIKOI_API_URL=$NEXT_PUBLIC_BARIKOI_API_URL \
  --build-arg NEXT_PUBLIC_BARIKOI_API_TOKEN=$NEXT_PUBLIC_BARIKOI_API_TOKEN \
  --build-arg NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL \
  --build-arg NEXT_PUBLIC_DEFAULT_LAT=$NEXT_PUBLIC_DEFAULT_LAT \
  --build-arg NEXT_PUBLIC_DEFAULT_LNG=$NEXT_PUBLIC_DEFAULT_LNG \
  --build-arg NEXT_PUBLIC_DEFAULT_ZOOM=$NEXT_PUBLIC_DEFAULT_ZOOM \
  --build-arg NEXT_PUBLIC_MIN_ZOOM=$NEXT_PUBLIC_MIN_ZOOM \
  --build-arg NEXT_PUBLIC_MAX_ZOOM=$NEXT_PUBLIC_MAX_ZOOM \
  --build-arg NEXT_PUBLIC_BASEPATH=$NEXT_PUBLIC_BASEPATH \
  -t rilusmahmud/spl-custom-zone:main-1.0.2 \
  --push .
```

### Option C: Using a Build Script

Create `build.sh`:
```bash
#!/bin/bash
set -a && source .env && set +a

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg NEXT_PUBLIC_BARIKOI_API_URL=$NEXT_PUBLIC_BARIKOI_API_URL \
  --build-arg NEXT_PUBLIC_BARIKOI_API_TOKEN=$NEXT_PUBLIC_BARIKOI_API_TOKEN \
  --build-arg NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL \
  --build-arg NEXT_PUBLIC_DEFAULT_LAT=$NEXT_PUBLIC_DEFAULT_LAT \
  --build-arg NEXT_PUBLIC_DEFAULT_LNG=$NEXT_PUBLIC_DEFAULT_LNG \
  --build-arg NEXT_PUBLIC_DEFAULT_ZOOM=$NEXT_PUBLIC_DEFAULT_ZOOM \
  --build-arg NEXT_PUBLIC_MIN_ZOOM=$NEXT_PUBLIC_MIN_ZOOM \
  --build-arg NEXT_PUBLIC_MAX_ZOOM=$NEXT_PUBLIC_MAX_ZOOM \
  --build-arg NEXT_PUBLIC_BASEPATH=$NEXT_PUBLIC_BASEPATH \
  -t rilusmahmud/spl-custom-zone:main-1.0.2 \
  --push .
```

Then run:
```bash
chmod +x build.sh
./build.sh
```

---

### 4. Not Logged into Docker Registry

**Error:** `denied: requested access to the resource is denied`

**Solution:**
```bash
docker login
# Enter your Docker Hub credentials
```

---

### 5. Native Dependencies Issues (node_modules with native code)

**Error:** Build fails during `npm ci` with compilation errors

**Solution - Use platform-specific npm cache:**
```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --cache-from type=registry,ref=rilusmahmud/spl-custom-zone:cache \
  --cache-to type=registry,ref=rilusmahmud/spl-custom-zone:cache,mode=max \
  --build-arg NEXT_PUBLIC_BARIKOI_API_URL="your_value" \
  ... (other args) \
  -t rilusmahmud/spl-custom-zone:main-1.0.2 \
  --push .
```

---

### 6. Using Docker Build Cache

Speed up subsequent builds with cache:
```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --cache-from type=local,src=.buildx-cache \
  --cache-to type=local,dest=.buildx-cache \
  ... (other args)
```

---

### 7. Recommended Complete Command

```bash
# 1. Ensure builder is set up
docker buildx create --name multiarch-builder --use 2>/dev/null || docker buildx use multiarch-builder
docker buildx inspect --bootstrap

# 2. Login to registry
docker login

# 3. Build with all necessary arguments
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --provenance=false \
  --build-arg NEXT_PUBLIC_BARIKOI_API_URL="https://barikoi.com/api" \
  --build-arg NEXT_PUBLIC_BARIKOI_API_TOKEN="your_token" \
  --build-arg NEXT_PUBLIC_MAP_STYLE_URL="your_map_url" \
  --build-arg NEXT_PUBLIC_DEFAULT_LAT="23.8" \
  --build-arg NEXT_PUBLIC_DEFAULT_LNG="90.4" \
  --build-arg NEXT_PUBLIC_DEFAULT_ZOOM="12" \
  --build-arg NEXT_PUBLIC_MIN_ZOOM="10" \
  --build-arg NEXT_PUBLIC_MAX_ZOOM="18" \
  --build-arg NEXT_PUBLIC_BASEPATH="/custom-zone" \
  -t rilusmahmud/spl-custom-zone:main-1.0.2 \
  -t rilusmahmud/spl-custom-zone:latest \
  --push .
```

---

### 8. Alternative: Build Without ARGs (Make Them Optional)

If you want to build without passing all arguments, modify the Dockerfile:

```dockerfile
# Add default values to ARG declarations
ARG NEXT_PUBLIC_BARIKOI_API_URL=""
ARG NEXT_PUBLIC_BARIKOI_API_TOKEN=""
ARG NEXT_PUBLIC_MAP_STYLE_URL=""
ARG NEXT_PUBLIC_DEFAULT_LAT="23.8"
ARG NEXT_PUBLIC_DEFAULT_LNG="90.4"
ARG NEXT_PUBLIC_DEFAULT_ZOOM="12"
ARG NEXT_PUBLIC_MIN_ZOOM="10"
ARG NEXT_PUBLIC_MAX_ZOOM="18"
ARG NEXT_PUBLIC_BASEPATH="/custom-zone"
```

---

### 9. Debug Failed Builds

To debug without pushing:
```bash
# Load images locally after build
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --load \
  -t spl-custom-zone:test \
  .

# Note: --load only works with single platform
```

Or build one platform at a time:
```bash
# Build just amd64
docker buildx build --platform linux/amd64 -t test:amd64 --load .

# Build just arm64
docker buildx build --platform linux/arm64 -t test:arm64 --load .
```

---

## Quick Checklist

- [ ] Builder created and bootstrapped (`docker buildx create --use`)
- [ ] QEMU installed for emulation (`binfmt` container)
- [ ] Logged into Docker Hub (`docker login`)
- [ ] All required build arguments passed
- [ ] Tag format correct (username/imagename:tag)
- [ ] Network connectivity stable (multi-platform builds take time)

---

## Still Having Issues?

Run with verbose output:
```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --progress=plain \
  ... (other args)
```

Check builder status:
```bash
docker buildx inspect --bootstrap
```
