# Preparing a new release

This library will be published as a npm package on npmjs.com.
It should be available [here](https://www.npmjs.com/package/@xray-app/xray-automation).

## Preliminary ad-hoc validations

The following validations can be done at any time. They may be included automatically as part of the publishing process.

Run lint and tests:

```bash
npm run lint && npm test
```

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
