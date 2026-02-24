# Backend

This Node/Express application is configured via environment variables.  A couple of
useful ones are already documented in `src/config/env.js`, including:

* `PORT` – HTTP port (default `3000`)
* `HOST` – host to bind (default `0.0.0.0`)
* `CORS_ORIGINS` – comma-separated list of allowed origins

### HTTPS support

To enable HTTPS we added the following optional variables:

* `SSL_KEY_PATH` – path to a PEM-encoded private key file
* `SSL_CERT_PATH` – path to a PEM-encoded certificate file
* `HTTPS_PORT` – port to listen on for HTTPS (defaults to `PORT + 1` to avoid binding conflicts; you can set to the same value if you only want HTTPS active).

When both `SSL_KEY_PATH` and `SSL_CERT_PATH` are provided the server will start a
second listener using the same Express `app`.  Socket.io connections are attached to
all active servers.

### Using mkcert (local development)

For local HTTPS you can create trusted certificates with [mkcert](https://github.com/FiloSottile/mkcert).
Install it on your machine, then generate a key/cert pair for the host you use to reach
the backend (e.g. `10.0.0.48`):

```sh
mkcert -install
mkcert 10.0.0.48
```

This produces files like `10.0.0.48.pem` and `10.0.0.48-key.pem`; set the environment
variables accordingly, for example (relative paths are resolved from the process
working directory):

```env
SSL_KEY_PATH=./certs/10.0.0.48-key.pem
SSL_CERT_PATH=./certs/10.0.0.48.pem
HTTPS_PORT=5443   # or leave empty -> defaults to PORT+1
```

If the certificates cannot be loaded, the server will log an error and fail to start.
Look at the `Falha ao carregar certificados HTTPS` message which includes the paths
attempted.  Also check the new `HTTPS configuration detected` log entry to confirm the
port being used.

The logic of the system is unchanged; you can keep using plain HTTP in development
and switch to HTTPS in production by setting the variables above.
