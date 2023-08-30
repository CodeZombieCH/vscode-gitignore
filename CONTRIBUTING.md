# Contributing

## Prerequisites

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/)

## Getting Started

Clone the repository and install dependencies:

```sh
git clone https://github.com/CodeZombieCH/vscode-gitignore.git
cd vscode-gitignore
npm i
```

## Debugging

To debug the extension, run the following command to compile and watch for changes:

```
npm run watch
```

You'll find the output from Webpack in the `dist/` directory, these are the sources that's bundled into the extension, so put breakpoints here.

## Testing

Before pushing back any changes or opening a pull request, you should run the tests locally.

```sh
npm run test
```

If you're on Linux and have [xvfb](https://www.x.org/releases/X11R7.7/doc/man/man1/Xvfb.1.xhtml) installed, you can run the tests in a headless process:

```sh
npm run test:headless
```

Check your distributions package manager for how to install it. On Debian based distributions for example, you can use `apt-file` to search for packages that provide the `xvfb-run` binary.

```sh
apt-file search xvfb-run
```
