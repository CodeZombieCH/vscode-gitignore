# Changelog

## v0.6.0

- Supported multi root workspace.
- Upgraded typescript version.
- Contributed by [@hangxingliu](https://github.com/hangxingliu)

## v0.5.0

- Implemented proxy support for requests made by this extension (resolves #1 requested by @LaurentChardin, @ibigpapa). A proxy can be set by Visual Studio Code settings (`http.proxy`) or by declaring environment variables (`HTTPS_PROXY`, `HTTP_PROXY`)
- Added progress bar while retrieving the list of available `.gitignore` files (resolves #6)


## v0.4.0

- Added support to append to or overwrite an existing `.gitignore` file. This new feature allows creating `.gitignore` files based on multiple `.gitignore` files from the repository (resolves #4 requested by @Sidneys1).
- Added Travis CI integration


## v0.3.1

- Fixed bug listing the `.gitignore` files from the root directory twice after running the "Add .gitignore" operation more than once (caching issue)


## v0.3.0

- Added support to pull `.gitignore` files from subdirectories inside the github/gitignore repository (resolves #3 requested by @russinow)


## v0.2.0

- Added language support for `.gitignore` files


## v0.1.5

- Properly declared the exposed settings in the package.json. This way the user gets support from Visual Studio Code when authoring the settings files.


## v0.1.4

- Fixed url to github repository
- Added url to github issues
- Exposed a setting named "gitignore.cacheExpirationInterval" that controls how long the `.gitignore` files retrieved from the github repository are stored in cache. Defaults to 3600 seconds.
- Fixed cancellation of the `Add gitignore` command not beeing handled correctly


## v0.1.3

- Added icon


## v0.1.2

- Fixed unhandled error in the case no workspace is open


## v0.1.0

- Basic implementation that allows pulling a single `.gitignore` file
