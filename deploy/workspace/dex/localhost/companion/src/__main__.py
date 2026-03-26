"""Entry point for the Dex companion proxy server."""

from http.server import ThreadingHTTPServer

from companion.src.config import BIND, PORT, UPSTREAM
from companion.src.handler import DexCompanionHandler


def main() -> None:
    """Start the companion HTTP server."""
    server = ThreadingHTTPServer(
        (BIND, PORT),
        DexCompanionHandler,
    )
    print(f"dex-companion listening on {BIND}:{PORT}, upstream={UPSTREAM}")
    server.serve_forever()  # NOSONAR


if __name__ == "__main__":
    main()
