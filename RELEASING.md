# Preparing a new release

This library will be published as a npm package on npmjs.com.
It should be available [here](https://www.npmjs.com/package/@xray-app/xray-automation).

## Preliminary ad-hoc validations

The following validations can be done at any time. They may be included automatically as part of the publishing process.

Run lint and tests:

```bash
npm run lint && npm test
```

### Hooks

There are several hooks: at git level and at [npm "scripts" lifecycle level](https://docs.npmjs.com/cli/v9/using-npm/scripts#life-cycle-scripts).
#### git commit

** using `husky`, runs linting and tests.

#### package.json `scripts`: prepare

**prepare** will run both BEFORE the package is packed and published, and on local npm install.

We use this to generate the multiple JavaScript flavours of this library and also the types for TypeScript.

#### package.json `scripts`: prepublishOnly

**prepublishOnly** will run BEFORE prepare and ONLY on npm publish. 

We use this to run linting and the tests.

#### package.json `scripts`: preversion

**preversion** will run BEFORE a new version has been bumped using `npm version ...`.

We use this to run linting.

#### package.json `scripts`: version

**version** will run AFTER a new version has been bumped using `npm version ...`.

We use this to prettify the code and add the source code to git.

## Publishing a beta release

1. Edit the version on package.json to something like `"version": "x.y.z-beta.1"`. Increase the last digits if another beta needs to be released

2. Publish using the `beta`tag, using: `npm publish --tag beta`
Due to the `prepublishOnly` configuration on `package.json`, this will implicity:

- run the tests, using `npm test`
- run linting, using `npm run int`

## Publishing a new release

Bump the version in package.json file:

```bash
npm version [patch|minor|major|<version_no>]
```

This will automatically run the scripts defined in package.json for `preversion`, `version`, and `postversion`.

Generate coverage badges:

```bash
npm run test:badges
```

Commit badges:

```bash
git status
git add coverage
git commit -m "update coverage badges"
git push
```

Publish it to npmjs.com:

```bash
npm publish --access public
```

## Removing a published verson

```bash
npm unpublish @xray-app/xray-automation@x.y.z
```
