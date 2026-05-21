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
  -t rilusmahmud/spl-custom-zone:main-1.0.4 \
  --push .
