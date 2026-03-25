# list-changed-packages

This GitHub Action lists all monorepo packages that contain at least one changed
file in the current pull request.

For context, this was initially created to only run lint checks on changed
packages inside a `pnpm` monorepo. But this should work just fine in any `npm` /
`yarn` / `bun` monorepo.

🟣 Edit: If you use **pnpm**, you can probably achieve the same thing with `pnpm list`.

This GitHub Action was initialized from
[this template](https://github.com/actions/typescript-action).

You can find the [original `README.md` file](./template_README.md).

## Use

Job example:

```yaml
jobs:
  list-changed:
    runs-on: ubuntu-22.04
    outputs:
      changed_packages: ${{ steps.changed-packages.outputs.changed_packages }}
      changed_packages_one_line: ${{ steps.changed-packages.outputs.changed_packages_one_line }}
      pnpm_filters_changed_packages: ${{ steps.changed-packages.outputs.pnpm_filters_changed_packages }}
      pnpm_filters_changed_and_down_packages: ${{ steps.changed-packages.outputs.pnpm_filters_changed_and_down_packages }}
      has_lock_file_changed: ${{ steps.changed-packages.outputs.has_lock_file_changed }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Find changed packages
        uses: cedric25/list-changed-packages@v1.1.0
        id: changed-packages

      - name: See result
        shell: bash
        run: |
          echo ""
          echo "changed_packages:"
          echo "${{ steps.changed-packages.outputs.changed_packages }}"
          echo ""
          echo "changed_packages_one_line:"
          echo "${{ steps.changed-packages.outputs.changed_packages_one_line }}"
          echo ""
          echo "pnpm_filters_changed_packages:"
          echo "${{ steps.changed-packages.outputs.pnpm_filters_changed_packages }}"
          echo ""
          echo "pnpm_filters_changed_and_down_packages:"
          echo "${{ steps.changed-packages.outputs.pnpm_filters_changed_and_down_packages }}"
          echo ""
          echo "has_lock_file_changed:"
          echo "${{ steps.changed-packages.outputs.has_lock_file_changed }}"
```

## Outputs

Imagine having:

```text
root/
├── apps/
│   ├── app-a/
│   │   ├── src/**
│   │   └── package.json (name = "@my-corp/app-a")
├── packages/
│   ├── package-a/
│   │   ├── src/**
│   │   ├── package.json (name = "@my-corp/package-a")
│   └── package-b/
│       ├── src/**
│       ├── package.json (name = "@my-corp/package-b")
```

and your current pull request contains changes in:

- `apps/app-a/src/someFile.ts`,
- `packages/package-a/src/someFile.ts`,

this GitHub Action will return 5 items as its output:

**changed_packages**:

```text
@my-corp/app-a
@my-corp/package-a
```

**changed_packages_one_line**:

```text
@my-corp/app-a @my-corp/package-a
```

**pnpm_filters_changed_packages**:

```text
--filter @my-corp/app-a --filter @my-corp/package-a
```

**pnpm_filters_changed_and_down_packages**:

```text
--filter @my-corp/app-a... --filter @my-corp/package-a...
```

**has_lock_file_changed**:

```text
false
```

## Ignored files

- Any file from inside `docs/` folders.
- Any file with the `.md` extension.

## Methodology

1️⃣ List all changed files with:

```text
git diff --name-only $(git merge-base HEAD origin/main)
```

2️⃣ Find all `package.json` files.

3️⃣ Loop over all `package.json` files and check if one changed file path is
inside a package.

## Directly with `pnpm list`

Use:

```shell
pnpm list --recursive --depth -1 --filter="[origin/main]" --json
```

Or to avoid listing packages that have changed on `origin/main` since you checked out your branch:

```shell
base_commit_hash=$(git merge-base HEAD origin/main)
packages_json=$(pnpm list --recursive --depth -1 --filter='[${base_commit_hash}]' --json)
```

```yaml
jobs:
  list-changed:
    runs-on: ubuntu-22.04
    outputs:
      changed_packages: ${{ steps.changed-packages.outputs.changed_packages }}
      pnpm_filters_changed_packages: ${{ steps.changed-packages.outputs.pnpm_filters_changed_packages }}
      pnpm_filters_changed_and_down_packages: ${{ steps.changed-packages.outputs.pnpm_filters_changed_and_down_packages }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v6
        with:
          fetch-depth: 0
          filter: blob:none

      - name: Setup pnpm
        uses: ./.github/actions/pnpm-setup
        with:
          node-version: 22.19.0

      - name: Find changed packages
        id: changed-packages
        run: |
          base_commit_hash=$(git merge-base HEAD origin/main)
          packages_json=$(pnpm list --recursive --depth -1 --filter='[${base_commit_hash}]' --json)
          changed_packages=$(echo "$packages_json" | jq -c '[.[].name]')
          echo "changed_packages=$changed_packages" >> "$GITHUB_OUTPUT"

          pnpm_filters_changed_packages=$(echo "$changed_packages" | jq -r 'map("--filter " + .) | join(" ")')
          echo "pnpm_filters_changed_packages=$pnpm_filters_changed_packages" >> "$GITHUB_OUTPUT"

          pnpm_filters_changed_and_down_packages=$(echo "$changed_packages" | jq -r 'map("--filter " + . + "...") | join(" ")')
          echo "pnpm_filters_changed_and_down_packages=$pnpm_filters_changed_and_down_packages" >> "$GITHUB_OUTPUT"

      - name: See result
        shell: bash
        run: |
          echo ''
          echo "changed_packages:"
          echo "${{ steps.changed-packages.outputs.changed_packages }}"
          echo ''
          echo "pnpm_filters_changed_packages:"
          echo "${{ steps.changed-packages.outputs.pnpm_filters_changed_packages }}"
          echo ''
          echo "pnpm_filters_changed_and_down_packages:"
          echo "${{ steps.changed-packages.outputs.pnpm_filters_changed_and_down_packages }}"
```
