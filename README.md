# gitignore Extension for Visual Studio Code

An extension for Visual Studio Code that assists you in working with `.gitignore` files.


## Features

- Add local `.gitignore` file by pulling .gitignore templates from the [github/gitignore](https://github.com/github/gitignore) repository
- Language support for `.gitignore` files


## Usage

Start command palette (with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> or <kbd>F1</kbd>) and start typing `Add gitignore`


## Settings

### Visual Studio Code Settings

```JavaScript
{
    // Number of seconds the list of `.gitignore` files retrieved from github will be cached
    "gitignore.cacheExpirationInterval": 3600
}
```

### Authenticated GitHub API Requests

This extension makes API calls to the [GitHub REST API](https://docs.github.com/en/rest) which are subject to [rate limits](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting).

By default, requests sent to the GitHub REST API are unauthenticated. Although the rate limit for unauthenticated requests is low, this should usually not be an issue because of caching and the most likely infrequent usage of this extension.

If you reach the rate limit (e.g. because you work inside a corporate network), you can switch to [authenticated requests](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#authentication) by setting the `GITHUB_AUTHORIZATION` environment variable.

#### Examples

Using a [personal access token](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#oauth2-token-sent-in-a-header):

	export GITHUB_AUTHORIZATION='Token <oauth2-token>'
	code

Using an [OAuth2 key/secret](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#oauth2-keysecret)

	export GITHUB_AUTHORIZATION='Basic <base65-encoded-key-secret>'
	code


## Roadmap

### v0.1
- Basic implementation that allows to pull a single `.gitignore` file

### v0.2
- Add language support for `.gitignore` files

### v0.3
- Support reading `.gitignore` files from subdirectories in the github/gitignore repository

### v0.4
- Support adding multiple `.gitignore` files and merge it to a `.gitignore` file

### v0.5
- Support proxy

### v0.6
- Update extension to more recent vscode ecosystem
- Update dependencies

### v0.7
- Support multi-root workspaces (see contribution by @hangxingliu)

### v0.8
- Fix bugs
- Remove `github` dependency
- Update dependencies

### v0.x
- Switch to async/await
- Further improve proxy support
- Add unit tests with active proxy


## Changelog

See [CHANGELOG.md](CHANGELOG.md)


## License

See [LICENSE](LICENSE) file


## Credits

Icon based on the Git logo by Jason Long
