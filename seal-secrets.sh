#!/bin/bash

kubectl create secret generic -n spotcord-dev bot-env-secret --from-env-file=./bot/.env --dry-run=client -o yaml | kubeseal | jq 'del(..|nulls)' | yq -y >kube/dev/bot-env-secret.yaml
kubectl create secret generic -n spotcord-prod bot-env-secret --from-env-file=./bot/.env.prod --dry-run=client -o yaml | kubeseal | jq 'del(..|nulls)' | yq -y >kube/prod/bot-env-secret.yaml
