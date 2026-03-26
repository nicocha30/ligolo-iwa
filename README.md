# Ligolo-IWA

A Ligolo-ng JavaScript agent working inside Chrome/Edge by leveraging Isolated Web Applications.

![Ligolo-IWA](docs/demo.png)

See the Ligolo-IWA doc for quick setup: [Ligolo-IWA (Setup/Quickstart)](https://iwa.ligolo.ng/)

And don't forget to read the Ligolo-ng documentation: [📑 Ligolo-ng Documentation (Setup/Quickstart)](https://docs.ligolo.ng/)

[![GPLv3](https://img.shields.io/badge/License-GPLv3-brightgreen.svg)](https://www.gnu.org/licenses/gpl-3.0)


## Local setup

Build the signed Isolated Web App bundle locally with:

```sh
make
```

The signed artifact is written to `out/ligolo-iwa.swbn`.

## Install on Chrome

Chrome's current IWA testing flow uses Web App Internals:

1. Use Chrome 120 or later.
2. Enable `chrome://flags/#enable-isolated-web-app-dev-mode`.
3. Open `chrome://web-app-internals`.
4. Choose `Install IWA from Signed Web Bundle`.
5. Select `out/ligolo-iwa.swbn`.

## Install on Edge

Microsoft Edge is Chromium-based, and the developer installation flow is generally the same for testing:

1. Enable `edge://flags/#enable-isolated-web-app-dev-mode`.
2. Open `edge://web-app-internals`.
3. Choose `Install IWA from Signed Web Bundle`.
4. Select `out/ligolo-iwa.swbn`.

Note: the Edge-specific internal URLs above are inferred from Chromium parity. If your Edge build does not expose them, use Chrome for installation and testing.