#!/bin/bash

USER=$1
PASSWORD=$2
REGISTRY="registry.targoninc.com"
REPO=$3

# Obtain a token to access the registry
TOKEN=$(curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${USER}"'", "password": "'"${PASSWORD}"'"}' https://${REGISTRY}/v2/users/login/ | jq -r .token)

# Get list of all image tags
TAG_LIST=$(curl -s -H "Authorization: Bearer ${TOKEN}" https://${REGISTRY}/v2/"${REPO}"/tags/list | jq -r .tags[] | sort -n)

# Count number of tags
COUNT=$(echo "${TAG_LIST}" | wc -l)

# If more than 10 tags, delete the oldest
if [ "${COUNT}" -gt 10 ]; then
  DELETE_COUNT=$((COUNT - 10))
  echo "Deleting ${DELETE_COUNT} images"

  for TAG in ${TAG_LIST}; do
    if [ "${DELETE_COUNT}" -gt 0 ]; then
      # Obtain Docker image digest
      DIGEST=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" -H "Authorization: Bearer ${TOKEN}" -X GET https://${REGISTRY}/v2/"${REPO}"/manifests/"${TAG}" | jq -r .config.digest)

      # Delete Docker image
      curl -H "Authorization: Bearer ${TOKEN}" -X DELETE https://${REGISTRY}/v2/"${REPO}"/manifests/"${DIGEST}"

      DELETE_COUNT=$((DELETE_COUNT - 1))
      echo "Deleted ${REPO}:${TAG}"
    else
      break
    fi
  done

  echo "Done"
fi
