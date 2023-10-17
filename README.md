# Expose a Kubernetes application from Namespace

This repository hosts a GitHub action that exposes a Kubernetes application from Namespace.
It also generates an bearer token to access the authenticated preview via HTTP.

## Example

```yaml
jobs:
  deploy:
    name: Ephemeral cluster
    runs-on: ubuntu-latest
    # These permissions are needed to interact with GitHub's OIDC Token endpoint.
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Configure access to Namespace
        uses: namespacelabs/nscloud-setup@v0
      - name: Create Cluster
        id: create-cluster
        uses: namespacelabs/nscloud-cluster-action@v0
      - name: Deploy NGINX
        run: |
          kubectl run nginx --image=nginx
          kubectl expose pod nginx --type=LoadBalancer --port=80
      - name: Expose application
        uses: namespacelabs/nscloud-expose-kubernetes-action@v0
        with:
          instance-id: ${{ steps.create-cluster.outputs.instance-id }}
          namespace: default
          service: nginx
```

### Using Namespace GitHub Runners

[Namespace GitHub Runners](https://cloud.namespace.so/docs/features/faster-github-actions) are already authenticated with Namespace.
Hence, no token exchange is needed and `id-token: write` permissions can be skipped.

```yaml
jobs:
  deploy:
    name: Ephemeral cluster
    runs-on: nscloud
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Configure access to Namespace
        uses: namespacelabs/nscloud-setup@v0
      - name: Create Cluster
        id: create-cluster
        uses: namespacelabs/nscloud-cluster-action@v0
      - name: Deploy NGINX
        run: |
          kubectl run nginx --image=nginx
          kubectl expose pod nginx --type=LoadBalancer --port=80
      - name: Expose application
        uses: namespacelabs/nscloud-expose-kubernetes-action@v0
        with:
          instance-id: ${{ steps.create-cluster.outputs.instance-id }}
          namespace: default
          service: nginx
```

## Requirements

Namespace federates with GitHub's using the OIDC protocol.
Please ensure to grant `id-token: write` for your workflow (see [example](#example)).

When [Namespace GitHub Runners](https://cloud.namespace.so/docs/features/faster-github-actions) are used, no token exchange is needed and `id-token: write` permissions can be skipped (see [example](#using-namespace-github-runners)).
