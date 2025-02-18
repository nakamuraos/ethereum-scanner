# Ethereum Scanner

- Generate wallets based on random mnemonic phrase with no hope.
- For PoC purposes only.

![Preview](./images/preview-terminal.png)

# Setup

- Configure: `config/default.yaml` / `config/local.yaml`.
- Using `RPC endpoint` for discovery wallet's balance. Support dynamic chain configuration.

# Get Started

- Pure NodeJS

```bash
# install depends
yarn
# run
yarn start
```

- Docker

```bash
docker-compose up -d
```

- Docker compose

```yaml
services:
  ethereum_scanner:
    container_name: ethereum_scanner
    image: thinhhv/ethereum-scanner:latest
    restart: always
    network_mode: bridge
    volumes:
      - ./config/default.yaml:/app/config/production.yaml
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
```

# Maintainer

- ThinhHV <thinh@thinhhv.com>
