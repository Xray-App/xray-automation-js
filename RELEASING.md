# Preparing a new release

This library will be published as a npm package on npmjs.com.
It should be available [here](https://www.npmjs.com/package/@xray-app/xray-automation).

## Publishing a new release

Bump the version in package.json file:

```bash
npm version [patch|minor|major|<version_no>]
```

Run lint and tests:

```bash
npm run lint && npm test
```

Publish it to npmjs.com:

```bash
npm publish --access public
```

## Removing a published verson

```bash
npm unpublish @xray-app/xray-automation@x.y.z
```
