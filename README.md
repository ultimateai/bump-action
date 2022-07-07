# merge-bump-release

GitHub action to be applied on merged pull-request, to bump a semver and create a new release. Optionally, it can also bump version on changelog and package.json/version.txt

## Setting up in your workflow:

The best explanation is by example. Please have a look at this project's [`pr.yml` file](./.github/workflows/pr.yml)
to see how this project is dogfooding the action in order to bump-release itself.

## Features

Out of the box, this action will always bump your release with a patch, unless configured
to do otherwise. This action can decide what part of the SemVer so increment depending on 
the way it's configured.

**If provided with `bump: <patch | minor | major>`** as input it will use this input to bump and ignore any other configuration.

**If provided with `infer_bump_from_commit: true`** as input it will try to guess the right one depending on the commit message. Right now the logic is a commit header that starts with the words _'patch', 'minor' or 'major'_.

## Options

Please refer to [`action.yml`](./action.yml) in this repository to see all available options.

## Contributing

If you need more features, please submit an issue or a pull request.

## How to add additional features and/or test

1. Modify/add whatever you need from [`index.ts`](./src/index.ts)
2. npm run build 
3. Add, commit and push your commits to a different branch
4. Invoke this action with your branch --> uses: ultimateai/bump-action@{Your_branch}