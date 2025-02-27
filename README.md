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

## GitHub API Rate Limits

This extension makes API calls to the [GitHub REST API](https://docs.github.com/en/rest) which are subject to [rate limits](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting).

By default, requests sent to the GitHub REST API are unauthenticated. Although the rate limit for unauthenticated requests is low, this should usually not be an issue because of caching and the typical infrequent usage of this extension.

If you reach the rate limit (e.g. because you work inside a corporate network), the extension will ask you if you want to the Authenticaton Provider for GitHub. If you agree, the extension will use authenticated GitHub API calls, which come with a mich higher rate limit than unauthenticated calls.


## Roadmap

### v0.x
- Implement logging accroding to best practices
- Replace `https-proxy-agent` package by high level `proxy-agent` package
- Switch to fetch API (requires vscode v1.82)
- Further test and improve proxy support
- Add unit tests with active proxy


## Changelog

See [CHANGELOG.md](CHANGELOG.md)


## License

See [LICENSE](LICENSE)


## Credits

Icon based on the Git logo by Jason Long
